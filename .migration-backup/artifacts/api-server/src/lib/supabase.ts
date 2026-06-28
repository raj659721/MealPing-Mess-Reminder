import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  "https://wopoptpbfyyphzhmuotu.supabase.co";

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";

if (!SUPABASE_SERVICE_KEY) {
  logger.error("SUPABASE_SERVICE_KEY environment variable is not set.");
  throw new Error("SUPABASE_SERVICE_KEY environment variable is not set.");
}

// Log that supabase config was loaded (mask the key)
logger.info({ supabaseUrl: SUPABASE_URL, hasServiceKey: !!SUPABASE_SERVICE_KEY }, "Supabase client configured");

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// Row types from Supabase (snake_case)
export type MessEntryRow = {
  id: number;
  user_id: string;
  date: string;
  lunch_taken: boolean;
  dinner_taken: boolean;
  lunch_present: boolean;
  dinner_present: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type UserSettingsRow = {
  id: number;
  user_id: string;
  meal_cost_per_meal: string;
  lunch_reminder_enabled: boolean;
  dinner_reminder_enabled: boolean;
  created_at: string;
  updated_at: string;
};

// Mappers to camelCase for API responses
export function mapEntry(row: MessEntryRow) {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    lunchTaken: row.lunch_taken,
    dinnerTaken: row.dinner_taken,
    lunchPresent: row.lunch_present,
    dinnerPresent: row.dinner_present,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSettings(row: UserSettingsRow) {
  return {
    id: row.id,
    userId: row.user_id,
    mealCostPerMeal: parseFloat(row.meal_cost_per_meal),
    lunchReminderEnabled: row.lunch_reminder_enabled,
    dinnerReminderEnabled: row.dinner_reminder_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
