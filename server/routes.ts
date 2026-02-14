import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertWatchlistSchema,
  insertPortfolioSchema,
  insertTradeSchema,
  insertAlertSchema,
  insertChatMessageSchema,
  insertSettingsSchema,
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import OpenAI from "openai";
import { getSnapshot, getAggregates, getPreviousClose } from "./massive";

const DEFAULT_MODEL_STR = "gpt-4o-mini";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Watchlist
  app.get("/api/watchlist", async (_req, res) => {
    const items = await storage.getWatchlist();
    res.json(items);
  });

  app.post("/api/watchlist", async (req, res) => {
    const parsed = insertWatchlistSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: fromZodError(parsed.error).message });
    }
    const item = await storage.addWatchlistItem(parsed.data);
    res.json(item);
  });

  app.patch("/api/watchlist/:id", async (req, res) => {
    const parsed = insertWatchlistSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: fromZodError(parsed.error).message });
    }
    const item = await storage.updateWatchlistItem(parseInt(req.params.id), parsed.data);
    if (!item) return res.status(404).json({ message: "Watchlist item not found" });
    res.json(item);
  });

  app.delete("/api/watchlist/:id", async (req, res) => {
    await storage.deleteWatchlistItem(parseInt(req.params.id));
    res.json({ success: true });
  });

  // Portfolio
  app.get("/api/portfolio", async (_req, res) => {
    const items = await storage.getPortfolio();
    res.json(items);
  });

  app.post("/api/portfolio", async (req, res) => {
    const parsed = insertPortfolioSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: fromZodError(parsed.error).message });
    }
    const item = await storage.addPortfolioItem(parsed.data);
    res.json(item);
  });

  app.patch("/api/portfolio/:id", async (req, res) => {
    const parsed = insertPortfolioSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: fromZodError(parsed.error).message });
    }
    const item = await storage.updatePortfolioItem(parseInt(req.params.id), parsed.data);
    if (!item) return res.status(404).json({ message: "Portfolio item not found" });
    res.json(item);
  });

  app.delete("/api/portfolio/:id", async (req, res) => {
    await storage.deletePortfolioItem(parseInt(req.params.id));
    res.json({ success: true });
  });

  // Trades
  app.get("/api/trades", async (_req, res) => {
    const items = await storage.getTrades();
    res.json(items);
  });

  app.post("/api/trades", async (req, res) => {
    const parsed = insertTradeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: fromZodError(parsed.error).message });
    }
    const trade = await storage.addTrade(parsed.data);
    res.json(trade);
  });

  app.delete("/api/trades/:id", async (req, res) => {
    await storage.deleteTrade(parseInt(req.params.id));
    res.json({ success: true });
  });

  // Alerts
  app.get("/api/alerts", async (_req, res) => {
    const items = await storage.getAlerts();
    res.json(items);
  });

  app.post("/api/alerts", async (req, res) => {
    const parsed = insertAlertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: fromZodError(parsed.error).message });
    }
    const alert = await storage.addAlert(parsed.data);
    res.json(alert);
  });

  app.patch("/api/alerts/:id/read", async (req, res) => {
    await storage.markAlertRead(parseInt(req.params.id));
    res.json({ success: true });
  });

  app.post("/api/alerts/read-all", async (_req, res) => {
    await storage.markAllAlertsRead();
    res.json({ success: true });
  });

  app.delete("/api/alerts", async (_req, res) => {
    await storage.clearAlerts();
    res.json({ success: true });
  });

  // Chat Messages
  app.get("/api/chat", async (_req, res) => {
    const messages = await storage.getChatMessages();
    res.json(messages);
  });

  app.delete("/api/chat", async (_req, res) => {
    await storage.clearChatMessages();
    res.json({ success: true });
  });

  // AI Chat endpoint
  app.post("/api/chat", async (req, res) => {
    const { message, includePortfolioAnalysis } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    await storage.addChatMessage({ role: "user", content: message.trim() });

    if (!process.env.OPENAI_API_KEY) {
      const standbyMsg = "AI features are in standby mode. Please add your OpenAI API key in Settings to enable Strategy AI analysis.";
      const saved = await storage.addChatMessage({ role: "assistant", content: standbyMsg });
      return res.json(saved);
    }

    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      let systemPrompt = `You are FinX Strategy Bot, a Canadian stock trading assistant specialized in TSX (Toronto Stock Exchange) stocks.

You provide analysis on Canadian equities, trading strategies, and portfolio management advice. All prices are in CAD. Commission is $6.95 per trade.

Keep responses concise but actionable. When making recommendations, include specific entry, stop-loss, and take-profit levels where appropriate.

If you identify actionable trade signals in your response, end your message with a section formatted exactly like this:
---ALERTS---
[{"ticker":"TICKER","signalType":"BUY|SELL|HOLD","urgency":"high|medium|low","message":"Brief alert message"}]
---END_ALERTS---`;

      if (includePortfolioAnalysis) {
        const watchlist = await storage.getWatchlist();
        const portfolio = await storage.getPortfolio();
        const settingsData = await storage.getSettings();

        systemPrompt += `\n\nCurrent Portfolio Data:
Account Size: $${settingsData.accountSize} CAD
Risk Per Trade: ${settingsData.riskPercentage}%

Watchlist (${watchlist.length} items):
${watchlist.map(w => `${w.ticker}: Entry $${w.entryTarget}, SL $${w.stopLoss}, TP $${w.takeProfit}, Signal: ${w.signal}`).join("\n")}

Holdings (${portfolio.length} positions):
${portfolio.map(p => `${p.ticker}: ${p.shares} shares @ $${p.avgCost} avg, Current: $${p.currentPrice}, Sector: ${p.sector}`).join("\n")}

Provide a comprehensive portfolio analysis with specific actionable recommendations.`;
      }

      const chatHistory = await storage.getChatMessages();
      const recentMessages = chatHistory.slice(-20).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const response = await openai.chat.completions.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 2048,
        messages: [
          { role: "system", content: systemPrompt },
          ...recentMessages,
        ],
      });

      let assistantContent = response.choices[0]?.message?.content || "";

      const alertMatch = assistantContent.match(/---ALERTS---\n?([\s\S]*?)\n?---END_ALERTS---/);
      if (alertMatch) {
        try {
          const alertsData = JSON.parse(alertMatch[1]);
          for (const a of alertsData) {
            await storage.addAlert({
              ticker: a.ticker,
              signalType: a.signalType,
              urgency: a.urgency,
              message: a.message,
            });
          }
        } catch { }
        assistantContent = assistantContent.replace(/---ALERTS---[\s\S]*?---END_ALERTS---/, "").trim();
      }

      const saved = await storage.addChatMessage({ role: "assistant", content: assistantContent });
      res.json(saved);
    } catch (error: any) {
      const errMsg = `AI Error: ${error.message || "Failed to get response from Claude."}`;
      const saved = await storage.addChatMessage({ role: "assistant", content: errMsg });
      res.json(saved);
    }
  });

  // ─── Market Data (Massive API proxy) ───

  app.get("/api/market/snapshot/:ticker", async (req, res) => {
    if (!process.env.MASSIVE_API_KEY) {
      return res.status(503).json({ message: "Market data unavailable — MASSIVE_API_KEY not configured" });
    }
    try {
      const data = await getSnapshot(req.params.ticker);
      res.json(data);
    } catch (err: any) {
      console.error("Massive snapshot error:", err.message);
      res.status(502).json({ message: err.message });
    }
  });

  app.get("/api/market/chart/:ticker", async (req, res) => {
    if (!process.env.MASSIVE_API_KEY) {
      return res.status(503).json({ message: "Market data unavailable — MASSIVE_API_KEY not configured" });
    }
    try {
      const { multiplier = "1", timespan = "day", from, to } = req.query;
      if (!from || !to) {
        return res.status(400).json({ message: "Query params 'from' and 'to' are required (YYYY-MM-DD)" });
      }
      const data = await getAggregates(
        req.params.ticker,
        parseInt(multiplier as string),
        timespan as string,
        from as string,
        to as string,
        { adjusted: true, sort: "asc" }
      );
      res.json(data);
    } catch (err: any) {
      console.error("Massive chart error:", err.message);
      res.status(502).json({ message: err.message });
    }
  });

  app.get("/api/market/previous/:ticker", async (req, res) => {
    if (!process.env.MASSIVE_API_KEY) {
      return res.status(503).json({ message: "Market data unavailable — MASSIVE_API_KEY not configured" });
    }
    try {
      const data = await getPreviousClose(req.params.ticker);
      res.json(data);
    } catch (err: any) {
      console.error("Massive previous-close error:", err.message);
      res.status(502).json({ message: err.message });
    }
  });

  // Settings
  app.get("/api/settings", async (_req, res) => {
    const s = await storage.getSettings();
    res.json(s);
  });

  app.patch("/api/settings", async (req, res) => {
    const parsed = insertSettingsSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: fromZodError(parsed.error).message });
    }
    const s = await storage.updateSettings(parsed.data);
    res.json(s);
  });

  // AI Status
  app.get("/api/ai-status", async (_req, res) => {
    res.json({ connected: !!process.env.OPENAI_API_KEY });
  });

  // Seed data endpoint (development only)
  app.post("/api/seed", async (_req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Seed endpoint disabled in production" });
    }
    const existing = await storage.getWatchlist();
    if (existing.length > 0) {
      return res.json({ message: "Data already seeded" });
    }

    await storage.addWatchlistItem({ ticker: "RY.TO", entryTarget: 145.50, stopLoss: 140.00, takeProfit: 158.00, signal: "BUY", sector: "Financials", notes: "Strong earnings momentum" });
    await storage.addWatchlistItem({ ticker: "SHOP.TO", entryTarget: 105.00, stopLoss: 95.00, takeProfit: 125.00, signal: "WATCH", sector: "Technology", notes: "Waiting for pullback to support" });
    await storage.addWatchlistItem({ ticker: "CNR.TO", entryTarget: 165.00, stopLoss: 158.00, takeProfit: 180.00, signal: "HOLD", sector: "Industrials", notes: "Rail volume increasing" });
    await storage.addWatchlistItem({ ticker: "ENB.TO", entryTarget: 52.00, stopLoss: 49.50, takeProfit: 57.00, signal: "BUY", sector: "Energy", notes: "Dividend yield attractive" });
    await storage.addWatchlistItem({ ticker: "TD.TO", entryTarget: 82.00, stopLoss: 78.00, takeProfit: 90.00, signal: "SELL", sector: "Financials", notes: "Approaching resistance" });

    await storage.addPortfolioItem({ ticker: "RY.TO", shares: 50, avgCost: 142.30, currentPrice: 147.85, sector: "Financials" });
    await storage.addPortfolioItem({ ticker: "CNR.TO", shares: 30, avgCost: 160.50, currentPrice: 168.20, sector: "Industrials" });
    await storage.addPortfolioItem({ ticker: "BCE.TO", shares: 100, avgCost: 48.75, currentPrice: 46.90, sector: "Telecom" });
    await storage.addPortfolioItem({ ticker: "BMO.TO", shares: 40, avgCost: 125.00, currentPrice: 131.40, sector: "Financials" });

    await storage.addTrade({ type: "BUY", ticker: "RY.TO", shares: 50, price: 142.30, fees: 6.95, date: "2025-12-15", notes: "Initial position on breakout" });
    await storage.addTrade({ type: "BUY", ticker: "CNR.TO", shares: 30, price: 160.50, fees: 6.95, date: "2025-12-20", notes: "Dip buy opportunity" });
    await storage.addTrade({ type: "SELL", ticker: "SU.TO", shares: 75, price: 55.20, fees: 6.95, date: "2026-01-08", notes: "Hit take profit target" });
    await storage.addTrade({ type: "BUY", ticker: "BCE.TO", shares: 100, price: 48.75, fees: 6.95, date: "2026-01-15", notes: "Dividend play" });
    await storage.addTrade({ type: "BUY", ticker: "BMO.TO", shares: 40, price: 125.00, fees: 6.95, date: "2026-01-28", notes: "Banking sector rotation" });

    await storage.addAlert({ ticker: "RY.TO", signalType: "BUY", urgency: "high", message: "Royal Bank breaking above 200-day MA with strong volume" });
    await storage.addAlert({ ticker: "SHOP.TO", signalType: "WATCH", urgency: "medium", message: "Shopify approaching key support level at $100" });
    await storage.addAlert({ ticker: "ENB.TO", signalType: "BUY", urgency: "low", message: "Enbridge dividend yield now above 7%, historically attractive entry" });

    res.json({ message: "Seed data created" });
  });

  return httpServer;
}
