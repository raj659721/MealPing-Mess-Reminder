import { setAuthTokenGetter } from "@/lib/api";
import { supabase } from "./supabase-client";

async function getSupabaseToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

setAuthTokenGetter(getSupabaseToken);

export async function authFetch(
  input: RequestInfo | URL,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);

  if (!headers.has("authorization")) {
    const token = await getSupabaseToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return fetch(input, {
    ...options,
    headers,
    // Supabase Edge Functions return Allow-Origin: *, which fails with credentials: 'include'.
    // We rely on the Authorization header anyway, not cookies.
    credentials: options.credentials ?? "omit",
  });
}
