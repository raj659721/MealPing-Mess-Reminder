/**
 * Meal time preferences — stored in localStorage.
 * Notifications are inherently browser/device-specific, so localStorage is the
 * right storage layer for these per-device preferences.
 */

const LS_KEY = "mess_meal_times_v1";

export const DEFAULT_LUNCH_TIME = "12:00";
export const DEFAULT_DINNER_TIME = "20:00";

export type MealTimes = {
  lunchTime: string;  // HH:MM (24-h)
  dinnerTime: string; // HH:MM (24-h)
};

export function loadMealTimes(): MealTimes {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { lunchTime: DEFAULT_LUNCH_TIME, dinnerTime: DEFAULT_DINNER_TIME };
    const parsed = JSON.parse(raw) as MealTimes;
    // Validate format HH:MM
    if (!isValidTime(parsed.lunchTime) || !isValidTime(parsed.dinnerTime)) {
      return { lunchTime: DEFAULT_LUNCH_TIME, dinnerTime: DEFAULT_DINNER_TIME };
    }
    return parsed;
  } catch {
    return { lunchTime: DEFAULT_LUNCH_TIME, dinnerTime: DEFAULT_DINNER_TIME };
  }
}

export function saveMealTimes(times: MealTimes): void {
  localStorage.setItem(LS_KEY, JSON.stringify(times));
}

/** Validate HH:MM format (24-hour) */
export function isValidTime(value: string): boolean {
  if (!value) return false;
  const [h, m] = value.split(":").map(Number);
  return (
    value.length === 5 &&
    value[2] === ":" &&
    !isNaN(h) && h >= 0 && h <= 23 &&
    !isNaN(m) && m >= 0 && m <= 59
  );
}

/** Parse "HH:MM" into { hours, minutes } */
export function parseTime(value: string): { hours: number; minutes: number } {
  const [h, m] = value.split(":").map(Number);
  return { hours: h, minutes: m };
}

/** Format 24h HH:MM to 12-hour display like "12:00 PM" */
export function formatTime12h(value: string): string {
  const { hours, minutes } = parseTime(value);
  const suffix = hours < 12 ? "AM" : "PM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}
