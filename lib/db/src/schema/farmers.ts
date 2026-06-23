import { pgTable, text, serial, timestamp, real, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const farmersTable = pgTable("farmers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry", { withTimezone: true }),
  phoneOtp: text("phone_otp"),
  phoneOtpExpiry: timestamp("phone_otp_expiry", { withTimezone: true }),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  avatarUrl: text("avatar_url"),
  state: text("state").notNull().default(""),
  lga: text("lga").notNull().default(""),
  farmingType: text("farming_type").notNull().default("mixed"),
  verificationStatus: text("verification_status").notNull().default("verified"),
  neuroScore: real("neuro_score").notNull().default(0),
  communityReputation: text("community_reputation").notNull().default("Bronze"),
  credits: integer("credits").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFarmerSchema = createInsertSchema(farmersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFarmer = z.infer<typeof insertFarmerSchema>;
export type Farmer = typeof farmersTable.$inferSelect;
