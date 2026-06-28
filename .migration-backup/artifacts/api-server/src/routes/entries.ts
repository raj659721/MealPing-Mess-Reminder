import { Router } from "express";
import {
  UpsertEntryBody,
  ListEntriesQueryParams,
  GetEntryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { supabase, mapEntry, MessEntryRow } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const parseResult = ListEntriesQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid query params", details: parseResult.error });
    return;
  }
  const { year, month } = parseResult.data;
  const userId = req.userId!;

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("mess_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");

  if (error) {
    logger.error({ err: error, userId, query: { year, month } }, "Failed to list entries from Supabase");
    res.status(500).json({ error: error.message, details: { message: error.message, code: (error as any)?.code, hint: (error as any)?.hint } });
    return;
  }
  res.json((data as MessEntryRow[]).map(mapEntry));
});

router.post("/", requireAuth, async (req, res) => {
  const parseResult = UpsertEntryBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid body", details: parseResult.error });
    return;
  }

  const { date, lunchTaken, dinnerTaken, lunchPresent, dinnerPresent, notes } =
    parseResult.data;
  const userId = req.userId!;

  logger.info({ userId, body: req.body }, "Upsert entry request");

  const { data, error } = await supabase
    .from("mess_entries")
    .upsert(
      {
        user_id: userId,
        date,
        lunch_taken: lunchTaken,
        dinner_taken: dinnerTaken,
        lunch_present: lunchPresent,
        dinner_present: dinnerPresent,
        notes: notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" },
    )
    .select()
    .single();

  if (error) {
    logger.error({ err: error, userId, body: req.body }, "Failed to upsert entry to Supabase");
    res.status(500).json({ error: error.message, details: { message: error.message, code: (error as any)?.code, hint: (error as any)?.hint } });
    return;
  }
  res.json(mapEntry(data as MessEntryRow));
});

router.get("/today", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("mess_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, userId }, "Failed to fetch today's entry from Supabase");
    res.status(500).json({ error: error.message, details: { message: error.message, code: (error as any)?.code, hint: (error as any)?.hint } });
    return;
  }
  res.json({ entry: data ? mapEntry(data as MessEntryRow) : null });
});

router.get("/:date", requireAuth, async (req, res) => {
  const parseResult = GetEntryParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const userId = req.userId!;
  const { date } = parseResult.data;

  const { data, error } = await supabase
    .from("mess_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, userId, date }, "Failed to fetch entry by date from Supabase");
    res.status(500).json({ error: error.message, details: { message: error.message, code: (error as any)?.code, hint: (error as any)?.hint } });
    return;
  }
  res.json({ entry: data ? mapEntry(data as MessEntryRow) : null });
});

export default router;
