import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase-client";

export type UserRole = "superadmin" | "admin" | "user";

export type UserProfile = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  role: UserRole;
};

async function fetchMe(): Promise<UserProfile> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not logged in");

  const role = user.email === 'admin@admin.com' ? 'superadmin' : (user.user_metadata?.role || "user");

  return {
    userId: user.id,
    email: user.email || "",
    firstName: user.user_metadata?.firstName || "",
    lastName: user.user_metadata?.lastName || "",
    imageUrl: user.user_metadata?.imageUrl || "",
    role: role as UserRole,
  };
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
    isSuperAdmin: query.data?.role === "superadmin",
    isAdmin: query.data?.role === "admin" || query.data?.role === "superadmin",
    isUser: query.data?.role === "user",
    isLoading: query.isLoading || query.isFetching,
    isError: query.isError,
  };
}
