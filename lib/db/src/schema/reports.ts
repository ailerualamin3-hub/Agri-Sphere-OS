import { pgTable, text, serial, timestamp, real, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const farmReportsTable = pgTable("farm_reports", {
  id: serial("id").primaryKey(),
  farmerId: integer("farmer_id").notNull(),
  title: text("title").notNull(),
  shareToken: text("share_token").notNull().unique(),
  snapshot: jsonb("snapshot").notNull(),
  isPublic: boolean("is_public").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const financialRecordsTable = pgTable("financial_records", {
  id: serial("id").primaryKey(),
  farmerId: integer("farmer_id").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amountNgn: real("amount_ngn").notNull(),
  recordDate: timestamp("record_date", { withTimezone: true }).notNull().defaultNow(),
  farmId: integer("farm_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const farmDocumentsTable = pgTable("farm_documents", {
  id: serial("id").primaryKey(),
  farmerId: integer("farmer_id").notNull(),
  title: text("title").notNull(),
  docType: text("doc_type").notNull(),
  fileDataUrl: text("file_data_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
