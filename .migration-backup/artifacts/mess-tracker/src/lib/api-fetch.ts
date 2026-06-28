import { setAuthTokenGetter } from "@workspace/api-client-react";
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
    credentials: options.credentials ?? "include",
  });
}
