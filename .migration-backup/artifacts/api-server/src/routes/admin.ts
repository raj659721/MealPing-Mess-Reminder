import { Router } from "express";
import { requireAdmin } from "../middlewares/requireAdmin";
import { supabase, mapEntry, mapSettings, MessEntryRow, UserSettingsRow } from "../lib/supabase";

const router = Router();

router.get("/overview", requireAdmin, async (req, res) => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: todayEntries, error: e1 } = await supabase
    .from("mess_entries").select("user_id,lunch_taken,dinner_taken")
    .eq("date", today);
  if (e1) { res.status(500).json({ error: e1.message }); return; }

  const { data: monthEntries, error: e2 } = await supabase
    .from("mess_entries").select("user_id,lunch_taken,dinner_taken")
    .gte("date", monthStart).lte("date", monthEnd);
  if (e2) { res.status(500).json({ error: e2.message }); return; }

  const { data: allSettings, error: e3 } = await supabase
    .from("user_settings").select("user_id,meal_cost_per_meal");
  if (e3) { res.status(500).json({ error: e3.message }); return; }

  const settingsMap = new Map(
    (allSettings ?? []).map((s: { user_id: string; meal_cost_per_meal: string }) => [s.user_id, parseFloat(s.meal_cost_per_meal)])
  );

  const allUserIds = new Set([
    ...(monthEntries ?? []).map((e: { user_id: string }) => e.user_id),
    ...(allSettings ?? []).map((s: { user_id: string }) => s.user_id),
  ]);

  const todayLunch = (todayEntries ?? []).filter((e: { lunch_taken: boolean }) => e.lunch_taken).length;
  const todayDinner = (todayEntries ?? []).filter((e: { dinner_taken: boolean }) => e.dinner_taken).length;
  const todayUnique = new Set((todayEntries ?? []).map((e: { user_id: string }) => e.user_id)).size;

  let monthRevenue = 0;
  let monthMeals = 0;
  for (const entry of (monthEntries ?? []) as { user_id: string; lunch_taken: boolean; dinner_taken: boolean }[]) {
    const cost = settingsMap.get(entry.user_id) ?? 50;
    const meals = (entry.lunch_taken ? 1 : 0) + (entry.dinner_taken ? 1 : 0);
    monthRevenue += meals * cost;
    monthMeals += meals;
  }

  res.json({
    totalUsers: allUserIds.size,
    todayLunch,
    todayDinner,
    todayActiveUsers: todayUnique,
    monthMeals,
    monthRevenue: parseFloat(monthRevenue.toFixed(2)),
    year,
    month,
  });
});

router.get("/daily", requireAdmin, async (req, res) => {
  const date = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().split("T")[0];

  const { data: entries, error } = await supabase
    .from("mess_entries").select("*").eq("date", date).order("user_id");
  if (error) { res.status(500).json({ error: error.message }); return; }

  res.json((entries as MessEntryRow[]).map(mapEntry));
});

router.get("/users", requireAdmin, async (req, res) => {
  const year  = parseInt(String(req.query.year  ?? new Date().getFullYear()));
  const month = parseInt(String(req.query.month ?? new Date().getMonth() + 1));

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay    = new Date(year, month, 0).getDate();
  const monthEnd   = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const [{ data: entries, error: e1 }, { data: settings, error: e2 }] = await Promise.all([
    supabase.from("mess_entries").select("*").gte("date", monthStart).lte("date", monthEnd),
    supabase.from("user_settings").select("*"),
  ]);

  if (e1) { res.status(500).json({ error: e1.message }); return; }
  if (e2) { res.status(500).json({ error: e2.message }); return; }

  const settingsMap = new Map(
    (settings as UserSettingsRow[]).map((s) => [s.user_id, parseFloat(s.meal_cost_per_meal)])
  );

  const userMap = new Map<string, { lunch: number; dinner: number; days: number }>();
  for (const entry of (entries as MessEntryRow[])) {
    const u = userMap.get(entry.user_id) ?? { lunch: 0, dinner: 0, days: 0 };
    if (entry.lunch_taken) u.lunch++;
    if (entry.dinner_taken) u.dinner++;
    u.days++;
    userMap.set(entry.user_id, u);
  }

  for (const s of (settings as UserSettingsRow[])) {
    if (!userMap.has(s.user_id)) {
      userMap.set(s.user_id, { lunch: 0, dinner: 0, days: 0 });
    }
  }

  const users = Array.from(userMap.entries()).map(([userId, stats]) => {
    const cost = settingsMap.get(userId) ?? 50;
    const totalMeals = stats.lunch + stats.dinner;
    return {
      userId,
      totalLunch: stats.lunch,
      totalDinner: stats.dinner,
      totalMeals,
      daysWithEntry: stats.days,
      costPerMeal: cost,
      totalCost: parseFloat((totalMeals * cost).toFixed(2)),
      attendanceRate: lastDay > 0 ? parseFloat(((stats.days / lastDay) * 100).toFixed(1)) : 0,
    };
  });

  res.json({ users, year, month });
});

router.post("/entries", requireAdmin, async (req, res) => {
  const { userId, date, lunchTaken, dinnerTaken, lunchPresent, dinnerPresent, notes } = req.body;
  if (!userId || !date) {
    res.status(400).json({ error: "userId and date are required" });
    return;
  }

  const { data, error } = await supabase
    .from("mess_entries")
    .upsert(
      {
        user_id: userId, date,
        lunch_taken: !!lunchTaken, dinner_taken: !!dinnerTaken,
        lunch_present: !!lunchPresent, dinner_present: !!dinnerPresent,
        notes: notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" },
    )
    .select().single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(mapEntry(data as MessEntryRow));
});

export default router;
