import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const watchlistItems = pgTable("watchlist_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ticker: text("ticker").notNull(),
  entryTarget: real("entry_target").notNull(),
  stopLoss: real("stop_loss").notNull(),
  takeProfit: real("take_profit").notNull(),
  signal: text("signal").notNull().default("WATCH"),
  sector: text("sector").default("Other"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const portfolioItems = pgTable("portfolio_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ticker: text("ticker").notNull(),
  shares: real("shares").notNull(),
  avgCost: real("avg_cost").notNull(),
  currentPrice: real("current_price").notNull(),
  sector: text("sector").default("Other"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trades = pgTable("trades", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  type: text("type").notNull(),
  ticker: text("ticker").notNull(),
  shares: real("shares").notNull(),
  price: real("price").notNull(),
  fees: real("fees").notNull().default(6.95),
  date: text("date").notNull(),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ticker: text("ticker").notNull(),
  signalType: text("signal_type").notNull(),
  urgency: text("urgency").notNull().default("medium"),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  accountSize: real("account_size").notNull().default(25000),
  riskPercentage: real("risk_percentage").notNull().default(2),
  email: text("email").default(""),
  analysisInterval: integer("analysis_interval").notNull().default(60),
});

export const insertWatchlistSchema = createInsertSchema(watchlistItems).omit({ id: true, createdAt: true });
export const insertPortfolioSchema = createInsertSchema(portfolioItems).omit({ id: true, createdAt: true });
export const insertTradeSchema = createInsertSchema(trades).omit({ id: true, createdAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });

export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type InsertWatchlistItem = z.infer<typeof insertWatchlistSchema>;
export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type InsertPortfolioItem = z.infer<typeof insertPortfolioSchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
