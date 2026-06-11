import { pgTable, text, serial, timestamp, real, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const livestockTable = pgTable("livestock", {
  id: serial("id").primaryKey(),
  farmId: integer("farm_id").notNull(),
  species: text("species").notNull(),
  breed: text("breed"),
  count: integer("count").notNull().default(1),
  healthStatus: text("health_status").notNull().default("good"),
  healthScore: real("health_score").notNull().default(82),
  avgWeightKg: real("avg_weight_kg"),
  lastVaccinationDate: date("last_vaccination_date", { mode: "string" }),
  nextVaccinationDate: date("next_vaccination_date", { mode: "string" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLivestockSchema = createInsertSchema(livestockTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLivestock = z.infer<typeof insertLivestockSchema>;
export type Livestock = typeof livestockTable.$inferSelect;
