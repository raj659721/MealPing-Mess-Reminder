import { Router } from "express";
import { UpdateSettingsBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { supabase, mapSettings, UserSettingsRow } from "../lib/supabase";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId!;

  let { data: settings, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }

  if (!settings) {
    const { data: created, error: createError } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: userId, meal_cost_per_meal: "50.00", lunch_reminder_enabled: false, dinner_reminder_enabled: false },
        { onConflict: "user_id" },
      )
      .select()
      .single();
    if (createError) { res.status(500).json({ error: createError.message }); return; }
    settings = created;
  }

  res.json(mapSettings(settings as UserSettingsRow));
});

router.put("/", requireAuth, async (req, res) => {
  const parseResult = UpdateSettingsBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid body", details: parseResult.error });
    return;
  }

  const { mealCostPerMeal, lunchReminderEnabled, dinnerReminderEnabled } =
    parseResult.data;
  const userId = req.userId!;

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        meal_cost_per_meal: String(mealCostPerMeal),
        lunch_reminder_enabled: lunchReminderEnabled,
        dinner_reminder_enabled: dinnerReminderEnabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(mapSettings(data as UserSettingsRow));
});

export default router;
