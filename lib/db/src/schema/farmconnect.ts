import { pgTable, text, serial, timestamp, real, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const communityPostsTable = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull().default(1),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const farmerGroupsTable = pgTable("farmer_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  memberCount: integer("member_count").notNull().default(1),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const labourExchangeTable = pgTable("labour_exchange", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").notNull().default(1),
  title: text("title").notNull(),
  description: text("description").notNull(),
  activityType: text("activity_type").notNull(),
  location: text("location").notNull(),
  dateNeeded: date("date_needed", { mode: "string" }).notNull(),
  workersNeeded: integer("workers_needed").notNull().default(1),
  creditsOffered: integer("credits_offered").notNull().default(10),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const equipmentExchangeTable = pgTable("equipment_exchange", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().default(1),
  equipmentType: text("equipment_type").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  pricePerDayNgn: real("price_per_day_ngn").notNull(),
  depositNgn: real("deposit_ngn").notNull(),
  location: text("location").notNull(),
  availableFrom: date("available_from", { mode: "string" }).notNull(),
  availableTo: date("available_to", { mode: "string" }).notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("available"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const seedExchangeTable = pgTable("seed_exchange", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull().default(1),
  cropType: text("crop_type").notNull(),
  variety: text("variety"),
  listingType: text("listing_type").notNull(),
  quantityKg: real("quantity_kg").notNull(),
  priceNgn: real("price_ngn"),
  location: text("location").notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("available"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communityEventsTable = pgTable("community_events", {
  id: serial("id").primaryKey(),
  organizerId: integer("organizer_id").notNull().default(1),
  title: text("title").notNull(),
  description: text("description").notNull(),
  eventType: text("event_type").notNull(),
  location: text("location").notNull(),
  eventDate: date("event_date", { mode: "string" }).notNull(),
  rsvpCount: integer("rsvp_count").notNull().default(0),
  maxAttendees: integer("max_attendees"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCommunityPostSchema = createInsertSchema(communityPostsTable).omit({ id: true, createdAt: true });
export const insertFarmerGroupSchema = createInsertSchema(farmerGroupsTable).omit({ id: true, createdAt: true });
export const insertLabourExchangeSchema = createInsertSchema(labourExchangeTable).omit({ id: true, createdAt: true });
export const insertEquipmentExchangeSchema = createInsertSchema(equipmentExchangeTable).omit({ id: true, createdAt: true });
export const insertSeedExchangeSchema = createInsertSchema(seedExchangeTable).omit({ id: true, createdAt: true });
export const insertCommunityEventSchema = createInsertSchema(communityEventsTable).omit({ id: true, createdAt: true });

export type CommunityPost = typeof communityPostsTable.$inferSelect;
export type FarmerGroup = typeof farmerGroupsTable.$inferSelect;
export type LabourExchange = typeof labourExchangeTable.$inferSelect;
export type EquipmentExchange = typeof equipmentExchangeTable.$inferSelect;
export type SeedExchange = typeof seedExchangeTable.$inferSelect;
export type CommunityEvent = typeof communityEventsTable.$inferSelect;
