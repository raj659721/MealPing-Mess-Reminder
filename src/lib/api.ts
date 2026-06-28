import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase-client";
import { format, startOfMonth, endOfMonth } from "date-fns";

export type EntryLike = {
  date: string;
  lunchTaken: boolean;
  dinnerTaken: boolean;
  lunchPresent: boolean;
  dinnerPresent: boolean;
  notes?: string | null;
};

export type SettingsLike = {
  mealCostPerMeal: number;
  lunchReminderEnabled: boolean;
  dinnerReminderEnabled: boolean;
};

// ─── Query Keys ─────────────────────────────────────────────────────────────
export const getGetTodayEntryQueryKey = () => ["today-entry"];
export const getGetMonthlySummaryQueryKey = (params: { year: number; month: number }) => [
  "monthly-summary",
  params.year,
  params.month,
];
export const getListEntriesQueryKey = (params: { year: number; month: number }) => [
  "list-entries",
  params.year,
  params.month,
];
export const getGetSettingsQueryKey = () => ["user-settings"];

// ─── Helper for User Session ────────────────────────────────────────────────
async function getUserId() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user) {
    throw new Error("Not authenticated");
  }
  return session.user.id;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export async function getTodayEntry() {
  const userId = await getUserId();
  const today = format(new Date(), "yyyy-MM-dd");
  
  const { data, error } = await supabase
    .from("meal_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (error) throw error;
  return { entry: data as EntryLike | null };
}

export function useGetTodayEntry(options?: { query?: { queryKey?: string[] } }) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getGetTodayEntryQueryKey(),
    queryFn: getTodayEntry,
  });
}

export function useGetMonthlySummary(
  params: { year: number; month: number },
  options?: { query?: { queryKey?: any[] } }
) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getGetMonthlySummaryQueryKey(params),
    queryFn: async () => {
      const userId = await getUserId();
      
      const startDate = format(new Date(params.year, params.month - 1, 1), "yyyy-MM-dd");
      const endDate = format(endOfMonth(new Date(params.year, params.month - 1, 1)), "yyyy-MM-dd");

      const { data: entries, error: entriesError } = await supabase
        .from("meal_entries")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate);
      
      if (entriesError) throw entriesError;

      const { data: settings, error: settingsError } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
        
      if (settingsError) throw settingsError;

      const mealCostPerMeal = settings?.mealCostPerMeal ?? 50;

      let totalLunchTaken = 0;
      let totalDinnerTaken = 0;
      let daysPresent = 0;

      for (const row of (entries || [])) {
        if (row.lunchTaken) totalLunchTaken++;
        if (row.dinnerTaken) totalDinnerTaken++;
        if (row.lunchTaken || row.dinnerTaken || row.lunchPresent || row.dinnerPresent) {
          daysPresent++;
        }
      }

      const totalMealsTaken = totalLunchTaken + totalDinnerTaken;

      return {
        totalMealsTaken,
        mealCostPerMeal,
        daysPresent,
        totalCost: totalMealsTaken * mealCostPerMeal,
        totalLunchTaken,
        totalDinnerTaken,
      };
    },
  });
}

export function getListEntriesQueryOptions(params: { year: number; month: number }) {
  return {
    queryKey: getListEntriesQueryKey(params),
    queryFn: async () => {
      const userId = await getUserId();
      const startDate = format(new Date(params.year, params.month - 1, 1), "yyyy-MM-dd");
      const endDate = format(endOfMonth(new Date(params.year, params.month - 1, 1)), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("meal_entries")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate);
      
      if (error) throw error;
      return data as EntryLike[];
    },
  };
}

export function useListEntries(
  params: { year: number; month: number },
  options?: { query?: { queryKey?: any[] } }
) {
  const queryOptions = getListEntriesQueryOptions(params);
  return useQuery({
    ...queryOptions,
    queryKey: options?.query?.queryKey ?? queryOptions.queryKey,
  });
}

// Fetch all students for Super Admin view
export function useGetAllStudents() {
  return useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_students');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'user' }) => {
      const { error } = await supabase.rpc('set_user_role', { target_user_id: userId, new_role: role });
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-students'] });
    }
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('delete_user', { target_user_id: userId });
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-students'] });
    }
  });
}


export function useUpsertEntry() {
  return useMutation({
    mutationFn: async ({ data }: { data: EntryLike }) => {
      const userId = await getUserId();

      const { error } = await supabase
        .from("meal_entries")
        .upsert(
          {
            user_id: userId,
            date: data.date,
            lunchTaken: data.lunchTaken ?? false,
            dinnerTaken: data.dinnerTaken ?? false,
            lunchPresent: data.lunchPresent ?? false,
            dinnerPresent: data.dinnerPresent ?? false,
            notes: data.notes ?? null,
          },
          { onConflict: "user_id, date" }
        );
      
      if (error) throw error;
      return true;
    },
  });
}

export function useGetSettings(options?: { query?: { queryKey?: string[] } }) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getGetSettingsQueryKey(),
    queryFn: async () => {
      const userId = await getUserId();

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error; // ignore no rows error for maybeSingle? Actually maybeSingle returns null.

      return (data || {
        mealCostPerMeal: 50,
        lunchReminderEnabled: false,
        dinnerReminderEnabled: false,
      }) as SettingsLike;
    },
  });
}

export function useUpdateSettings() {
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<SettingsLike> }) => {
      const userId = await getUserId();

      const { error } = await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: userId,
            ...data,
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;
      return true;
    },
  });
}

export function useSendGlobalNotification() {
  return useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase
        .from("global_notifications")
        .insert({ message });
      if (error) throw error;
      return true;
    },
  });
}

// ─── Leave / Vacation Mode ──────────────────────────────────────────────────

export type LeaveLike = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
  status: string;
};

export function useApplyLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { startDate: string; endDate: string; reason?: string }) => {
      const userId = await getUserId();
      const { error } = await supabase
        .from("user_leaves")
        .insert({
          user_id: userId,
          start_date: data.startDate,
          end_date: data.endDate,
          reason: data.reason || null,
          status: 'approved' // Automatically approved for now
        });
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-leaves"] });
    }
  });
}

export function useGetMyLeaves() {
  return useQuery({
    queryKey: ["my-leaves"],
    queryFn: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from("user_leaves")
        .select("*")
        .eq("user_id", userId)
        .order("start_date", { ascending: false });
        
      if (error) throw error;
      return (data || []) as LeaveLike[];
    }
  });
}

export function useGetAllActiveLeaves(dateStr: string) {
  // dateStr format: YYYY-MM-DD
  return useQuery({
    queryKey: ["all-active-leaves", dateStr],
    queryFn: async () => {
      // Find all leaves where the date falls between start_date and end_date
      const { data, error } = await supabase
        .from("user_leaves")
        .select("*, users:user_id(email, raw_user_meta_data)")
        .lte("start_date", dateStr)
        .gte("end_date", dateStr);
        
      if (error) throw error;
      return data;
    }
  });
}

// ─── Set Base URL (No-op now) ───────────────────────────────────────────────
export function setAuthTokenGetter(_fn: any) {}
export function setBaseUrl(_url: string) {}

// ─── Tracking API (Admin) ───────────────────────────────────────────────
export const getUserLocations = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_locations')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return data;
};

export const getUserContacts = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_contacts')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};
