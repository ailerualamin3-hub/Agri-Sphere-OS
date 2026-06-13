import { pgTable, text, serial, timestamp, real, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const governmentOpportunitiesTable = pgTable("government_opportunities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  provider: text("provider").notNull(),
  providerType: text("provider_type").notNull().default("government"),
  opportunityType: text("opportunity_type").notNull(),
  eligibleFarmTypes: text("eligible_farm_types").array().notNull().default([]),
  targetStates: text("target_states").array().notNull().default([]),
  amountNgn: real("amount_ngn"),
  amountDescription: text("amount_description"),
  deadline: timestamp("deadline", { withTimezone: true }),
  applicationUrl: text("application_url"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  requirements: text("requirements").array().notNull().default([]),
  benefits: text("benefits").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const scanResultsTable = pgTable("scan_results", {
  id: serial("id").primaryKey(),
  farmerId: integer("farmer_id").notNull().default(1),
  scanType: text("scan_type").notNull(),
  imageUrl: text("image_url"),
  diagnosis: text("diagnosis").notNull(),
  confidence: real("confidence").notNull(),
  severity: text("severity").notNull(),
  description: text("description").notNull(),
  recommendations: text("recommendations").array().notNull().default([]),
  rawResult: text("raw_result"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOpportunitySchema = createInsertSchema(governmentOpportunitiesTable).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true });
export const insertScanResultSchema = createInsertSchema(scanResultsTable).omit({ id: true, createdAt: true });

export type GovernmentOpportunity = typeof governmentOpportunitiesTable.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type ScanResult = typeof scanResultsTable.$inferSelect;
export type InsertScanResult = z.infer<typeof insertScanResultSchema>;
