import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function getConnectionString(): string {
  // Option 1: full Supabase URL provided directly
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
  if (supabaseUrl && supabaseUrl.startsWith("postgresql://")) {
    return supabaseUrl;
  }

  // Option 2: build from Supabase password using Session Pooler (IPv4)
  const supabasePassword = process.env.SUPABASE_DB_PASSWORD;
  if (supabasePassword) {
    return `postgresql://postgres.wopoptpbfyyphzhmuotu:${supabasePassword}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`;
  }

  // Option 3: fall back to Replit's built-in Postgres
  const fallback = process.env.DATABASE_URL;
  if (fallback) return fallback;

  throw new Error(
    "No database connection configured. Set SUPABASE_DB_PASSWORD or DATABASE_URL.",
  );
}

const connectionString = getConnectionString();
const isSupabase =
  connectionString.includes("supabase.co");

export const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
