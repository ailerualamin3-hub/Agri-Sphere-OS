import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const communityQuestionsTable = pgTable("community_questions", {
  id: serial("id").primaryKey(),
  farmerId: integer("farmer_id").notNull(),
  farmerName: text("farmer_name").notNull(),
  farmerState: text("farmer_state"),
  category: text("category").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  viewCount: integer("view_count").notNull().default(0),
  answerCount: integer("answer_count").notNull().default(0),
  isResolved: boolean("is_resolved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communityAnswersTable = pgTable("community_answers", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  farmerId: integer("farmer_id"),
  farmerName: text("farmer_name").notNull(),
  isAi: boolean("is_ai").notNull().default(false),
  body: text("body").notNull(),
  helpfulCount: integer("helpful_count").notNull().default(0),
  isAccepted: boolean("is_accepted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
