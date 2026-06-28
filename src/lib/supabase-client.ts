import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function createStubClient(): SupabaseClient<never> {
  const err = new Error("VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Check your environment variables.");
  return new Proxy({} as SupabaseClient<never>, {
    get(_target, prop) {
      if (prop === "auth") {
        return new Proxy({} as never, {
          get() {
            throw err;
          },
        });
      }
      throw err;
    },
  });
}

export const supabase: SupabaseClient<never> =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : createStubClient();
