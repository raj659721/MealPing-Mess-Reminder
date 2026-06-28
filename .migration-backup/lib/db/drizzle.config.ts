import { defineConfig } from "drizzle-kit";
import path from "path";

const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
const supabasePassword = process.env.SUPABASE_DB_PASSWORD;

const connectionString =
  (supabaseUrl && supabaseUrl.startsWith("postgresql://") ? supabaseUrl : undefined) ??
  (supabasePassword
    ? `postgresql://postgres.wopoptpbfyyphzhmuotu:${supabasePassword}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
    : undefined) ??
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("SUPABASE_DB_PASSWORD or DATABASE_URL must be set");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
