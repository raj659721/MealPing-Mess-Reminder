import {
  pgTable,
  serial,
  text,
  boolean,
  numeric,
  timestamp,
  date,
  uniqueIndex,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Daily meal/attendance entries per user
export const messEntriesTable = pgTable(
  "mess_entries",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    date: date("date").notNull(), // stored as YYYY-MM-DD
    lunchTaken: boolean("lunch_taken").notNull().default(false),
    dinnerTaken: boolean("dinner_taken").notNull().default(false),
    lunchPresent: boolean("lunch_present").notNull().default(false),
    dinnerPresent: boolean("dinner_present").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("mess_entries_user_date_idx").on(table.userId, table.date),
  ],
);

export const insertMessEntrySchema = createInsertSchema(messEntriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMessEntry = z.infer<typeof insertMessEntrySchema>;
export type MessEntry = typeof messEntriesTable.$inferSelect;

// Per-user settings (meal price, notification preferences)
export const userSettingsTable = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  mealCostPerMeal: numeric("meal_cost_per_meal", {
    precision: 10,
    scale: 2,
  })
    .notNull()
    .default("50.00"),
  lunchReminderEnabled: boolean("lunch_reminder_enabled")
    .notNull()
    .default(false),
  dinnerReminderEnabled: boolean("dinner_reminder_enabled")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSettingsSchema = createInsertSchema(
  userSettingsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettingsTable.$inferSelect;
