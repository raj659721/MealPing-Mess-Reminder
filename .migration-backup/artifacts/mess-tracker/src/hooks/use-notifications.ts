import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSettings,
  getGetSettingsQueryKey,
  getTodayEntry,
  getGetTodayEntryQueryKey,
} from "@workspace/api-client-react";
import { mr } from "@/lib/i18n";
import { loadMealTimes, parseTime } from "@/lib/meal-times";

// ─── Constants ────────────────────────────────────────────────────────────────
const INTERVAL_MS   = 2 * 60 * 1000; // 2-min repeat
const SNOOZE_MS     = 5 * 60 * 1000; // 5-min snooze
const LS_KEY        = "mess_reminder_v2";
const LS_SNOOZE_KEY = "mess_reminder_snooze_v1";

// ─── Module-level state ───────────────────────────────────────────────────────
const intervals = new Map<"lunch" | "dinner", ReturnType<typeof setInterval>>();
let _qc: ReturnType<typeof useQueryClient> | null = null;

// ─── Sound (Web Audio API) ────────────────────────────────────────────────────
function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);

    // Two-tone ding
    setTimeout(() => {
      const ctx2 = new AudioContext();
      const osc2  = ctx2.createOscillator();
      const gain2 = ctx2.createGain();
      osc2.connect(gain2); gain2.connect(ctx2.destination);
      osc2.type = "sine"; osc2.frequency.value = 1100;
      gain2.gain.setValueAtTime(0.2, ctx2.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.5);
      osc2.start(ctx2.currentTime); osc2.stop(ctx2.currentTime + 0.5);
    }, 150);
  } catch {
    // Web Audio unavailable — ignore
  }
}

function vibrate() {
  if ("vibrate" in navigator) {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }
}

// ─── Snooze ───────────────────────────────────────────────────────────────────
type SnoozeState = { lunchUntil: number; dinnerUntil: number };

function loadSnooze(): SnoozeState {
  try {
    return JSON.parse(localStorage.getItem(LS_SNOOZE_KEY) ?? "{}") as SnoozeState;
  } catch { return { lunchUntil: 0, dinnerUntil: 0 }; }
}

function saveSnooze(s: SnoozeState) {
  localStorage.setItem(LS_SNOOZE_KEY, JSON.stringify(s));
}

/** Snooze a reminder for `minutes` minutes (default 5). */
export function snoozeReminder(type: "lunch" | "dinner", minutes = 5) {
  stopInterval(type);
  const s = loadSnooze();
  if (type === "lunch") s.lunchUntil = Date.now() + minutes * 60_000;
  else                  s.dinnerUntil = Date.now() + minutes * 60_000;
  saveSnooze(s);
}

function isSnoozed(type: "lunch" | "dinner"): boolean {
  const s = loadSnooze();
  const until = type === "lunch" ? s.lunchUntil : s.dinnerUntil;
  return Date.now() < (until ?? 0);
}

// ─── localStorage state ───────────────────────────────────────────────────────
type PersistedState = {
  date: string;
  lunchActive: boolean;
  dinnerActive: boolean;
  lunchAcknowledged: boolean;
  dinnerAcknowledged: boolean;
};

function todayStr() { return new Date().toISOString().split("T")[0]; }
function freshState(): PersistedState {
  return { date: todayStr(), lunchActive: false, dinnerActive: false, lunchAcknowledged: false, dinnerAcknowledged: false };
}
function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return freshState();
    const s = JSON.parse(raw) as PersistedState;
    return s.date !== todayStr() ? freshState() : s;
  } catch { return freshState(); }
}
function saveState(s: PersistedState) { localStorage.setItem(LS_KEY, JSON.stringify(s)); }

// ─── Browser notification ─────────────────────────────────────────────────────
function sendBrowserNotification(type: "lunch" | "dinner") {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const title = type === "lunch" ? mr.notifications.lunchTitle : mr.notifications.dinnerTitle;
  const n = new Notification(title, {
    body: mr.notifications.body,
    icon: "/logo.svg",
    tag: `mess-reminder-${type}`,
    requireInteraction: true,
  });
  n.onclick = () => { window.focus(); n.close(); };
}

// ─── Core interval logic ──────────────────────────────────────────────────────
async function reminderTick(type: "lunch" | "dinner") {
  const s = loadState();
  const acked = type === "lunch" ? s.lunchAcknowledged : s.dinnerAcknowledged;
  if (acked) { stopInterval(type); return; }
  if (isSnoozed(type)) return; // silently skip while snoozed

  // Check if meal already taken
  if (_qc) {
    try {
      const data = await _qc.fetchQuery({
        queryKey: getGetTodayEntryQueryKey(),
        queryFn: () => getTodayEntry(),
        staleTime: 60_000,
      });
      const taken = type === "lunch" ? data?.entry?.lunchTaken : data?.entry?.dinnerTaken;
      if (taken) { stopInterval(type); return; }
    } catch { /* network error — notify anyway */ }
  }

  playNotificationSound();
  vibrate();
  sendBrowserNotification(type);
}

function stopInterval(type: "lunch" | "dinner") {
  const id = intervals.get(type);
  if (id !== undefined) { clearInterval(id); intervals.delete(type); }
  const s = loadState();
  if (type === "lunch") s.lunchActive = false;
  else s.dinnerActive = false;
  saveState(s);
}

function startReminderInterval(type: "lunch" | "dinner") {
  if (intervals.has(type)) return;
  const s = loadState();
  if (type === "lunch") s.lunchActive = true;
  else s.dinnerActive = true;
  saveState(s);
  reminderTick(type);
  const id = setInterval(() => reminderTick(type), INTERVAL_MS);
  intervals.set(type, id);
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function dismissReminder(type: "lunch" | "dinner") {
  stopInterval(type);
  const s = loadState();
  if (type === "lunch") s.lunchAcknowledged = true;
  else s.dinnerAcknowledged = true;
  saveState(s);
}

export function isReminderActive(type: "lunch" | "dinner") { return intervals.has(type); }

export { SNOOZE_MS };

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useNotifications(userId?: string) {
  const qc = useQueryClient();
  const { data: settings } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey(), enabled: !!userId },
  });

  useEffect(() => { _qc = qc; return () => { _qc = null; }; }, [qc]);

  // Register service worker (PWA + push support)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // Request notification permission when reminders enabled
  useEffect(() => {
    if (!settings) return;
    if (!settings.lunchReminderEnabled && !settings.dinnerReminderEnabled) return;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [settings]);

  // Auto-stop when meal marked in React Query cache
  useEffect(() => {
    const unsub = qc.getQueryCache().subscribe((event) => {
      if (event.type !== "updated") return;
      const keyArr = event.query.queryKey as unknown[];
      if (!keyArr.some((k) => typeof k === "string" && k.includes("/api/entries/today"))) return;
      const data = event.query.state.data as { entry: { lunchTaken?: boolean; dinnerTaken?: boolean } | null } | undefined;
      if (!data?.entry) return;
      if (data.entry.lunchTaken  && intervals.has("lunch"))  stopInterval("lunch");
      if (data.entry.dinnerTaken && intervals.has("dinner")) stopInterval("dinner");
    });
    return () => unsub();
  }, [qc]);

  // Main check loop
  useEffect(() => {
    if (!settings) return;

    // Resume persisted active reminders
    const saved = loadState();
    if (saved.lunchActive  && settings.lunchReminderEnabled)  startReminderInterval("lunch");
    if (saved.dinnerActive && settings.dinnerReminderEnabled) startReminderInterval("dinner");

    const checkTime = () => {
      const now = new Date();
      const h = now.getHours(), m = now.getMinutes();
      const times  = loadMealTimes();
      const lunch  = parseTime(times.lunchTime);
      const dinner = parseTime(times.dinnerTime);

      if (settings.lunchReminderEnabled && h === lunch.hours && m === lunch.minutes && !intervals.has("lunch")) {
        const s = loadState();
        if (!s.lunchAcknowledged) startReminderInterval("lunch");
      }
      if (settings.dinnerReminderEnabled && h === dinner.hours && m === dinner.minutes && !intervals.has("dinner")) {
        const s = loadState();
        if (!s.dinnerAcknowledged) startReminderInterval("dinner");
      }
    };

    const timer = setInterval(checkTime, 60_000);
    return () => clearInterval(timer);
  }, [settings]);
}
