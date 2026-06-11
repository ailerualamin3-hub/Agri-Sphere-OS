import { pgTable, text, serial, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const marketPricesTable = pgTable("market_prices", {
  id: serial("id").primaryKey(),
  commodity: text("commodity").notNull(),
  pricePerKg: real("price_per_kg").notNull(),
  unit: text("unit").notNull().default("kg"),
  market: text("market").notNull(),
  state: text("state").notNull(),
  trend: text("trend").notNull().default("stable"),
  changePercent: real("change_percent"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marketListingsTable = pgTable("market_listings", {
  id: serial("id").primaryKey(),
  farmerId: integer("farmer_id").notNull().default(1),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priceNgn: real("price_ngn").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMarketListingSchema = createInsertSchema(marketListingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMarketListing = z.infer<typeof insertMarketListingSchema>;
export type MarketListing = typeof marketListingsTable.$inferSelect;
export type MarketPrice = typeof marketPricesTable.$inferSelect;
