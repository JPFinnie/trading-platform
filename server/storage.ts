import {
  watchlistItems, portfolioItems, trades, alerts, chatMessages, settings,
  type WatchlistItem, type InsertWatchlistItem,
  type PortfolioItem, type InsertPortfolioItem,
  type Trade, type InsertTrade,
  type Alert, type InsertAlert,
  type ChatMessage, type InsertChatMessage,
  type Settings, type InsertSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getWatchlist(): Promise<WatchlistItem[]>;
  addWatchlistItem(item: InsertWatchlistItem): Promise<WatchlistItem>;
  updateWatchlistItem(id: number, item: Partial<InsertWatchlistItem>): Promise<WatchlistItem | undefined>;
  deleteWatchlistItem(id: number): Promise<void>;

  getPortfolio(): Promise<PortfolioItem[]>;
  addPortfolioItem(item: InsertPortfolioItem): Promise<PortfolioItem>;
  updatePortfolioItem(id: number, item: Partial<InsertPortfolioItem>): Promise<PortfolioItem | undefined>;
  deletePortfolioItem(id: number): Promise<void>;

  getTrades(): Promise<Trade[]>;
  addTrade(trade: InsertTrade): Promise<Trade>;
  deleteTrade(id: number): Promise<void>;

  getAlerts(): Promise<Alert[]>;
  addAlert(alert: InsertAlert): Promise<Alert>;
  markAlertRead(id: number): Promise<void>;
  markAllAlertsRead(): Promise<void>;
  clearAlerts(): Promise<void>;

  getChatMessages(): Promise<ChatMessage[]>;
  addChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  clearChatMessages(): Promise<void>;

  getSettings(): Promise<Settings>;
  updateSettings(s: Partial<InsertSettings>): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  async getWatchlist(): Promise<WatchlistItem[]> {
    return db.select().from(watchlistItems).orderBy(desc(watchlistItems.createdAt));
  }

  async addWatchlistItem(item: InsertWatchlistItem): Promise<WatchlistItem> {
    const [result] = await db.insert(watchlistItems).values(item).returning();
    return result;
  }

  async updateWatchlistItem(id: number, item: Partial<InsertWatchlistItem>): Promise<WatchlistItem | undefined> {
    const [result] = await db.update(watchlistItems).set(item).where(eq(watchlistItems.id, id)).returning();
    return result;
  }

  async deleteWatchlistItem(id: number): Promise<void> {
    await db.delete(watchlistItems).where(eq(watchlistItems.id, id));
  }

  async getPortfolio(): Promise<PortfolioItem[]> {
    return db.select().from(portfolioItems).orderBy(desc(portfolioItems.createdAt));
  }

  async addPortfolioItem(item: InsertPortfolioItem): Promise<PortfolioItem> {
    const [result] = await db.insert(portfolioItems).values(item).returning();
    return result;
  }

  async updatePortfolioItem(id: number, item: Partial<InsertPortfolioItem>): Promise<PortfolioItem | undefined> {
    const [result] = await db.update(portfolioItems).set(item).where(eq(portfolioItems.id, id)).returning();
    return result;
  }

  async deletePortfolioItem(id: number): Promise<void> {
    await db.delete(portfolioItems).where(eq(portfolioItems.id, id));
  }

  async getTrades(): Promise<Trade[]> {
    return db.select().from(trades).orderBy(desc(trades.createdAt));
  }

  async addTrade(trade: InsertTrade): Promise<Trade> {
    const [result] = await db.insert(trades).values(trade).returning();
    return result;
  }

  async deleteTrade(id: number): Promise<void> {
    await db.delete(trades).where(eq(trades.id, id));
  }

  async getAlerts(): Promise<Alert[]> {
    return db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }

  async addAlert(alert: InsertAlert): Promise<Alert> {
    const [result] = await db.insert(alerts).values(alert).returning();
    return result;
  }

  async markAlertRead(id: number): Promise<void> {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, id));
  }

  async markAllAlertsRead(): Promise<void> {
    await db.update(alerts).set({ isRead: true });
  }

  async clearAlerts(): Promise<void> {
    await db.delete(alerts);
  }

  async getChatMessages(): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).orderBy(chatMessages.createdAt);
  }

  async addChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [result] = await db.insert(chatMessages).values(message).returning();
    return result;
  }

  async clearChatMessages(): Promise<void> {
    await db.delete(chatMessages);
  }

  async getSettings(): Promise<Settings> {
    const rows = await db.select().from(settings);
    if (rows.length === 0) {
      const [result] = await db.insert(settings).values({
        accountSize: 25000,
        riskPercentage: 2,
        email: "",
        analysisInterval: 60,
      }).returning();
      return result;
    }
    return rows[0];
  }

  async updateSettings(s: Partial<InsertSettings>): Promise<Settings> {
    const current = await this.getSettings();
    const [result] = await db.update(settings).set(s).where(eq(settings.id, current.id)).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
