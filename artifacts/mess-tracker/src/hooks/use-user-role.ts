import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { authFetch } from "@/lib/api-fetch";

export type UserRole = "admin" | "user";

export type UserProfile = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  role: UserRole;
};

async function fetchMe(): Promise<UserProfile> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await authFetch("/api/auth/me", { signal: controller.signal });
    if (!res.ok) throw new Error(`Auth API returned ${res.status}`);
    return res.json() as Promise<UserProfile>;
  } finally {
    clearTimeout(timeout);
  }
}

export function useUserRole() {
  const { isSignedIn, isLoaded } = useAuth();

  const query = useQuery<UserProfile>({
    queryKey: ["auth-me"],
    queryFn: fetchMe,
    enabled: isLoaded && !!isSignedIn,
    staleTime: 5 * 60_000,
    retry: 1,
    retryDelay: 1000,
  });

  return {
    role: query.data?.role ?? null,
    profile: query.data ?? null,
    isAdmin: query.data?.role === "admin",
    isUser: query.data?.role === "user",
    isLoading: query.isLoading || query.isFetching,
    isError: query.isError,
  };
}
