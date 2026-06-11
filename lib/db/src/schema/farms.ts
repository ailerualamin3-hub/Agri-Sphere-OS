import { pgTable, text, serial, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const farmsTable = pgTable("farms", {
  id: serial("id").primaryKey(),
  farmerId: integer("farmer_id").notNull().default(1),
  name: text("name").notNull(),
  sizeHectares: real("size_hectares").notNull(),
  state: text("state").notNull(),
  lga: text("lga").notNull(),
  lat: real("lat"),
  lng: real("lng"),
  farmType: text("farm_type").notNull().default("mixed"),
  healthScore: real("health_score").notNull().default(80),
  soilType: text("soil_type"),
  irrigationType: text("irrigation_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFarmSchema = createInsertSchema(farmsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFarm = z.infer<typeof insertFarmSchema>;
export type Farm = typeof farmsTable.$inferSelect;
