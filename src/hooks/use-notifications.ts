import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSettings,
  getGetSettingsQueryKey,
  getTodayEntry,
  getGetTodayEntryQueryKey,
} from "@/lib/api";
import { translations, Language } from "@/lib/i18n";
import { loadMealTimes, parseTime } from "@/lib/meal-times";
import { authFetch } from "@/lib/api-fetch";
import { supabase } from "@/lib/supabase-client";

// Helper to convert VAPID key
function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getActiveLanguage() {
  const stored = localStorage.getItem("app-language");
  if (stored && (stored === "en" || stored === "mr" || stored === "hi" || stored === "gu")) {
    return stored as Language;
  }
  return "mr"; // default
}
function getT() {
  return translations[getActiveLanguage()];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const INTERVAL_MS = 5 * 60 * 1000; // 5-min repeat
const SNOOZE_MS = 5 * 60 * 1000; // 5-min snooze
const LS_KEY = "mess_reminder_v2";
const LS_SNOOZE_KEY = "mess_reminder_snooze_v1";

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// ─── Module-level state ───────────────────────────────────────────────────────
const intervals = new Map<"lunch" | "dinner", ReturnType<typeof setInterval>>();
let _qc: ReturnType<typeof useQueryClient> | null = null;
let _userId: string | undefined = undefined;

// ─── Sound (Web Audio API) ────────────────────────────────────────────────────
function playNotificationSound() {
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
    return; // Skip playing sound to avoid browser console warnings
  }
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
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
      const osc2 = ctx2.createOscillator();
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
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
    return; // Skip vibrating to avoid browser console warnings
  }
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  } catch (e) {
    // ignore
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
  else s.dinnerUntil = Date.now() + minutes * 60_000;
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
async function sendBrowserNotification(type: "lunch" | "dinner") {
  const isLunch = type === "lunch";
  const title = isLunch ? "Lunch Reminder" : "Dinner Reminder";
  const bodyText = isLunch ? "दुपारचे जेवण घेतले का? (Lunch time!)" : "रात्रीचे जेवण घेतले का? (Dinner time!)";

  if (Capacitor.isNativePlatform()) {
    LocalNotifications.schedule({
      notifications: [
        {
          title: title,
          body: bodyText,
          id: type === "lunch" ? 1 : 2,
          schedule: { at: new Date(Date.now() + 1000) },
          sound: undefined,
          attachments: undefined,
          actionTypeId: "",
          extra: null
        }
      ]
    });
    return;
  }

  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    const n = new Notification(title, {
      body: bodyText,
      icon: "/logo.svg",
      tag: `mess-reminder-${type}`,
      requireInteraction: true,
    });
    n.onclick = (e) => { 
      e.preventDefault();
      window.focus(); 
      n.close(); 
      window.location.assign("/");
    };
  }

  // Trigger Edge Function to send Native Web Push
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl && _userId) {
      await authFetch(`${supabaseUrl}/functions/v1/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body: bodyText, userId: _userId, type }),
        credentials: "omit",
      }).then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          console.error("Notify Edge Function returned error:", res.status, text);
        }
      }).catch((e) => {
        console.error("Network error hitting notify:", e);
      });
    }
  } catch (err) {
    console.error("Push notification trigger error:", err);
  }
}

export async function testNotification() {
  playNotificationSound();
  vibrate();
  const t = getT();
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    const n = new Notification("Test: " + t.notifications.dinnerTitle, {
      body: "This is a test notification. It is working correctly!",
      icon: "/logo.svg",
      tag: `mess-reminder-test`,
      requireInteraction: true,
    });
    n.onclick = (e) => { 
      e.preventDefault();
      window.focus(); 
      n.close(); 
      window.location.assign("/");
    };
  } else if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
    alert("Browser notifications are blocked. But sound/vibration is working!");
  }
}

async function subscribeToPushNotifications(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    // Check existing subscription
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapidKey)
      });
    }

    const subJSON = sub.toJSON();
    if (!subJSON.endpoint || !subJSON.keys) return;

    // Save to Supabase
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subJSON.endpoint,
      keys_auth: subJSON.keys.auth,
      keys_p256dh: subJSON.keys.p256dh
    }, { onConflict: 'endpoint' });

  } catch (err) {
    console.error("Failed to subscribe to web push:", err);
  }
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

  useEffect(() => {
    _qc = qc;
    _userId = userId;
    return () => { _qc = null; _userId = undefined; };
  }, [qc, userId]);

  // Register service worker (PWA + push support)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => { });
  }, []);

  // Request notification permission on load
  useEffect(() => {
    if (!userId) return;

    if (Capacitor.isNativePlatform()) {
      LocalNotifications.checkPermissions().then(status => {
        if (status.display !== 'granted') {
          LocalNotifications.requestPermissions();
        }
      });
    } else if (typeof Notification !== "undefined") {
      if (Notification.permission === "default") {
        Notification.requestPermission().then(perm => {
          if (perm === "granted") subscribeToPushNotifications(userId);
        });
      } else if (Notification.permission === "granted") {
        subscribeToPushNotifications(userId);
      }
    }
  }, [settings, userId]);

  // Auto-stop when meal marked in React Query cache
  useEffect(() => {
    const unsub = qc.getQueryCache().subscribe((event) => {
      if (event.type !== "updated") return;
      const keyArr = event.query.queryKey as unknown[];
      if (!keyArr.some((k) => typeof k === "string" && k.includes("/api/entries/today"))) return;
      const data = event.query.state.data as { entry: { lunchTaken?: boolean; dinnerTaken?: boolean } | null } | undefined;
      if (!data?.entry) return;
      if (data.entry.lunchTaken && intervals.has("lunch")) stopInterval("lunch");
      if (data.entry.dinnerTaken && intervals.has("dinner")) stopInterval("dinner");
    });
    return () => unsub();
  }, [qc]);

  // Main check loop for Web (and scheduling for Native)
  useEffect(() => {
    if (!settings) return;

    const times = loadMealTimes();
    const lunch = parseTime(times.lunchTime);
    const dinner = parseTime(times.dinnerTime);

    // If native Android, schedule the alarms directly with the OS so they work when the app is completely closed
    if (Capacitor.isNativePlatform()) {
      // Force Android to use a HIGH IMPORTANCE channel (like Zomato) so the popup drops down from the top of the screen
      LocalNotifications.createChannel({
        id: 'mealping-alerts',
        name: 'Meal Alerts',
        description: 'High priority meal reminders',
        importance: 5, // 5 = High importance (Heads-up notification)
        visibility: 1, // 1 = Public (Shows on lock screen)
        vibration: true,
      }).then(() => {
        LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }] }).then(() => {
          const notificationsToSchedule = [];
          if (settings.lunchReminderEnabled) {
            notificationsToSchedule.push({
              title: "Lunch Reminder",
              body: "दुपारचे जेवण घेतले का? (Lunch time!)",
              id: 1,
              channelId: 'mealping-alerts',
              schedule: { allowWhileIdle: true, on: { hour: lunch.hours, minute: lunch.minutes } },
            });
          }
          if (settings.dinnerReminderEnabled) {
            notificationsToSchedule.push({
              title: "Dinner Reminder",
              body: "रात्रीचे जेवण घेतले का? (Dinner time!)",
              id: 2,
              channelId: 'mealping-alerts',
              schedule: { allowWhileIdle: true, on: { hour: dinner.hours, minute: dinner.minutes } },
            });
          }
          if (notificationsToSchedule.length > 0) {
            LocalNotifications.schedule({ notifications: notificationsToSchedule });
          }
        });
      });
    }

    // Resume persisted active reminders (Web only)
    const saved = loadState();
    if (saved.lunchActive && settings.lunchReminderEnabled) startReminderInterval("lunch");
    if (saved.dinnerActive && settings.dinnerReminderEnabled) startReminderInterval("dinner");

    const checkTime = () => {
      // Don't run the manual JS checker on native since the OS handles it now
      if (Capacitor.isNativePlatform()) return;

      const now = new Date();
      const h = now.getHours(), m = now.getMinutes();

      const nowMins = h * 60 + m;
      const lunchMins = lunch.hours * 60 + lunch.minutes;
      const dinnerMins = dinner.hours * 60 + dinner.minutes;

      if (settings.lunchReminderEnabled && nowMins >= lunchMins && !intervals.has("lunch")) {
        const s = loadState();
        if (!s.lunchAcknowledged) {
          startReminderInterval("lunch");
        }
      }
      if (settings.dinnerReminderEnabled && nowMins >= dinnerMins && !intervals.has("dinner")) {
        const s = loadState();
        if (!s.dinnerAcknowledged) {
          startReminderInterval("dinner");
        }
      }
    };

    checkTime();
    
    // Poll every 10 seconds for web users
    const timer = setInterval(checkTime, 10_000);
    return () => clearInterval(timer);
  }, [settings]);

  // Global Notifications (Realtime) listener
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('global-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'global_notifications' },
        (payload) => {
          const message = payload.new.message;
          playNotificationSound();
          vibrate();
          
          if (Capacitor.isNativePlatform()) {
            LocalNotifications.schedule({
              notifications: [
                {
                  title: "Admin Announcement",
                  body: message,
                  id: Math.floor(Math.random() * 100000),
                  schedule: { at: new Date(Date.now() + 1000) },
                }
              ]
            });
          } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            const n = new Notification("Admin Announcement", {
              body: message,
              icon: "/logo.svg",
              requireInteraction: true,
            });
            n.onclick = (e) => { 
              e.preventDefault();
              window.focus(); 
              n.close(); 
            };
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
