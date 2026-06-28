import { Router } from "express";
import { GetMonthlySummaryQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { supabase, MessEntryRow, UserSettingsRow } from "../lib/supabase";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const parseResult = GetMonthlySummaryQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const { year, month } = parseResult.data;
  const userId = req.userId!;

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: entriesData, error: entriesError } = await supabase
    .from("mess_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (entriesError) { res.status(500).json({ error: entriesError.message }); return; }
  const entries = (entriesData ?? []) as MessEntryRow[];

  const { data: settingsData } = await supabase
    .from("user_settings")
    .select("meal_cost_per_meal")
    .eq("user_id", userId)
    .maybeSingle();

  const mealCostPerMeal = settingsData
    ? parseFloat((settingsData as UserSettingsRow).meal_cost_per_meal)
    : 50;

  let totalLunchTaken = 0;
  let totalDinnerTaken = 0;
  let totalLunchPresent = 0;
  let totalDinnerPresent = 0;
  let daysPresent = 0;

  for (const entry of entries) {
    if (entry.lunch_taken) totalLunchTaken++;
    if (entry.dinner_taken) totalDinnerTaken++;
    if (entry.lunch_present) totalLunchPresent++;
    if (entry.dinner_present) totalDinnerPresent++;
    if (entry.lunch_present || entry.dinner_present) daysPresent++;
  }

  const totalMealsTaken = totalLunchTaken + totalDinnerTaken;
  const totalCost = totalMealsTaken * mealCostPerMeal;
  const attendanceRate = lastDay > 0 ? (daysPresent / lastDay) * 100 : 0;

  res.json({
    year,
    month,
    totalDays: lastDay,
    daysPresent,
    daysAbsent: lastDay - daysPresent,
    totalLunchTaken,
    totalDinnerTaken,
    totalMealsTaken,
    totalLunchPresent,
    totalDinnerPresent,
    mealCostPerMeal,
    totalCost,
    attendanceRate: Math.round(attendanceRate * 10) / 10,
  });
});

export default router;
