import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cropTreatmentsTable = pgTable("crop_treatments", {
  id: serial("id").primaryKey(),
  cropId: integer("crop_id").notNull(),
  farmerId: integer("farmer_id").notNull(),
  treatmentType: text("treatment_type").notNull(), // pesticide, fungicide, fertilizer, irrigation, pruning, other
  productName: text("product_name"),
  dosage: text("dosage"),
  applicationMethod: text("application_method"),
  disease: text("disease"),
  notes: text("notes"),
  appliedDate: date("applied_date", { mode: "string" }).notNull(),
  followUpDate: date("follow_up_date", { mode: "string" }),
  status: text("status").notNull().default("active"), // active, recovered, monitoring, failed
  recoveryNotes: text("recovery_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCropTreatmentSchema = createInsertSchema(cropTreatmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCropTreatment = z.infer<typeof insertCropTreatmentSchema>;
export type CropTreatment = typeof cropTreatmentsTable.$inferSelect;
