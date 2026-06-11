import { pgTable, text, serial, timestamp, real, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cropsTable = pgTable("crops", {
  id: serial("id").primaryKey(),
  farmId: integer("farm_id").notNull(),
  name: text("name").notNull(),
  variety: text("variety"),
  stage: text("stage").notNull().default("planted"),
  plantingDate: date("planting_date", { mode: "string" }).notNull(),
  expectedHarvestDate: date("expected_harvest_date", { mode: "string" }),
  healthStatus: text("health_status").notNull().default("good"),
  healthScore: real("health_score").notNull().default(80),
  plotSizeHectares: real("plot_size_hectares"),
  expectedYieldKg: real("expected_yield_kg").notNull().default(0),
  actualYieldKg: real("actual_yield_kg"),
  fertilizerSchedule: text("fertilizer_schedule"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCropSchema = createInsertSchema(cropsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCrop = z.infer<typeof insertCropSchema>;
export type Crop = typeof cropsTable.$inferSelect;
