import { useState, useEffect, useMemo } from "react";
import {
  format, getDaysInMonth, startOfMonth, getDay,
  isToday, isFuture, startOfWeek, differenceInDays,
  subDays, parseISO,
} from "date-fns";
import { dismissReminder, snoozeReminder } from "@/hooks/use-notifications";
import {
  useGetTodayEntry,
  useGetMonthlySummary,
  useListEntries,
  useUpsertEntry,
  getGetTodayEntryQueryKey,
  getGetMonthlySummaryQueryKey,
  getListEntriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import Layout from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  Check, Coffee, Moon, TrendingUp, Calendar,
  IndianRupee, Zap, Utensils, X, Bell, BellOff,
  Sparkles, Copy, CalendarOff, AlarmClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mr } from "@/lib/i18n";
import { loadMealTimes } from "@/lib/meal-times";

// Show server/backend error with details when available
function showApiError(err: unknown) {
  console.error("API error:", err);
  const maybe = err as any;
  const backendMsg = maybe?.data?.error ?? maybe?.data?.message ?? maybe?.message ?? null;
  const description = backendMsg ?? "पुन्हा प्रयत्न करा.";
  toast({ title: "नोंद जतन झाली नाही", description, variant: "destructive" });
}

// ─── Types ─────────────────────────────────────────────────────────────────────
type EntryLike = {
  date: string;
  lunchTaken: boolean;
  dinnerTaken: boolean;
  lunchPresent: boolean;
  dinnerPresent: boolean;
  notes?: string | null;
};

// ─── Smart Insights Card ──────────────────────────────────────────────────────
function SmartInsightsCard({
  entries,
  summary,
  onSameAsYesterday,
  sameLoading,
}: {
  entries: EntryLike[];
  summary: { totalMealsTaken: number; mealCostPerMeal: number } | undefined;
  onSameAsYesterday: () => void;
  sameLoading: boolean;
}) {
  const now = new Date();
  const daysElapsed = now.getDate();
  const totalDays = getDaysInMonth(now);
  const daysLeft = totalDays - daysElapsed;

  // ── Pattern detection (last 30 days) ──
  const { lunchSkipRate, dinnerSkipRate, suggestions } = useMemo(() => {
    const recent = entries
      .filter((e) => {
        const d = parseISO(e.date);
        return d >= subDays(now, 30) && d <= now;
      });

    if (recent.length < 5) return { lunchSkipRate: 0, dinnerSkipRate: 0, suggestions: [] };

    const lunchSkipped = recent.filter((e) => !e.lunchTaken).length;
    const dinnerSkipped = recent.filter((e) => !e.dinnerTaken).length;
    const lsr = Math.round((lunchSkipped / recent.length) * 100);
    const dsr = Math.round((dinnerSkipped / recent.length) * 100);
    const s: string[] = [];

    if (dsr >= 60) s.push(`🌙 तुम्ही गेल्या महिन्यात ${dsr}% वेळा रात्रीचे जेवण सोडले`);
    if (lsr >= 60) s.push(`☀️ तुम्ही गेल्या महिन्यात ${lsr}% वेळा दुपारचे जेवण सोडले`);
    if (dsr < 20 && lsr < 20) s.push(`🎉 उत्तम! तुम्ही नियमितपणे जेवण घेत आहात`);

    return { lunchSkipRate: lsr, dinnerSkipRate: dsr, suggestions: s };
  }, [entries]);

  // ── Bill prediction ──
  const predictedBill = useMemo(() => {
    if (!summary || daysElapsed === 0) return null;
    const dailyRate = summary.totalMealsTaken / daysElapsed;
    const projected = Math.round((dailyRate * totalDays) * summary.mealCostPerMeal);
    const current   = Math.round(summary.totalMealsTaken * summary.mealCostPerMeal);
    return { current, projected, dailyRate: parseFloat(dailyRate.toFixed(1)) };
  }, [summary, daysElapsed, totalDays]);

  // ── Yesterday check ──
  const yesterdayStr = format(subDays(now, 1), "yyyy-MM-dd");
  const yesterday = entries.find((e) => e.date === yesterdayStr);
  const hasYesterday = !!yesterday && (yesterday.lunchTaken || yesterday.dinnerTaken);

  if (!suggestions.length && !predictedBill && !hasYesterday) return null;

  return (
    <Card className="p-5 rounded-3xl border-0 shadow-sm overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-xl bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">स्मार्ट अंतर्दृष्टी</p>
          <p className="text-sm font-bold text-foreground">पॅटर्न व अंदाज</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {/* Pattern chips */}
        {suggestions.map((s) => (
          <div key={s} className="flex items-start gap-2 rounded-2xl bg-purple-50 dark:bg-purple-950/20 px-3.5 py-2.5">
            <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed font-medium">{s}</p>
          </div>
        ))}

        {/* Bill prediction */}
        {predictedBill && (
          <div className="rounded-2xl bg-orange-50 dark:bg-orange-950/20 px-3.5 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-orange-700 dark:text-orange-300">या महिन्याचे अपेक्षित बिल</p>
              <IndianRupee className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <p className="text-2xl font-black text-orange-600 dark:text-orange-400">₹{predictedBill.projected}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              आत्तापर्यंत ₹{predictedBill.current} · {daysLeft} दिवस शिल्लक · {predictedBill.dailyRate} जेवण/दिवस
            </p>
          </div>
        )}

        {/* Same as yesterday */}
        {hasYesterday && (
          <button
            onClick={onSameAsYesterday}
            disabled={sameLoading}
            className="w-full flex items-center gap-2.5 rounded-2xl bg-green-50 dark:bg-green-950/20 px-3.5 py-3 text-left hover:bg-green-100 dark:hover:bg-green-950/30 active:scale-[0.98] transition-all"
          >
            <Copy className="h-4 w-4 text-green-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-green-700 dark:text-green-300">
                काल सारखेच नोंदवा
              </p>
              <p className="text-xs text-muted-foreground">
                काल: {yesterday!.lunchTaken ? "☀️ दुपार" : ""}{yesterday!.lunchTaken && yesterday!.dinnerTaken ? " + " : ""}{yesterday!.dinnerTaken ? "🌙 रात्र" : ""}
              </p>
            </div>
            <span className="ml-auto text-xs font-semibold text-green-600 shrink-0">→</span>
          </button>
        )}
      </div>
    </Card>
  );
}

// ─── Today Card ────────────────────────────────────────────────────────────────
function TodayCard() {
  const { data: todayRes, isLoading } = useGetTodayEntry({
    query: { queryKey: getGetTodayEntryQueryKey() },
  });
  const upsert = useUpsertEntry();
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [currentMin, setCurrentMin] = useState(() => new Date().getMinutes());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
      setCurrentMin(new Date().getMinutes());
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  const entry = todayRes?.entry;

  // Compute past meal times from localStorage
  const times = loadMealTimes();
  const lunchH = parseInt(times.lunchTime.split(":")[0]);
  const lunchM = parseInt(times.lunchTime.split(":")[1]);
  const dinnerH = parseInt(times.dinnerTime.split(":")[0]);
  const dinnerM = parseInt(times.dinnerTime.split(":")[1]);
  const isPastLunch  = currentHour > lunchH  || (currentHour === lunchH  && currentMin >= lunchM);
  const isPastDinner = currentHour > dinnerH || (currentHour === dinnerH && currentMin >= dinnerM);

  // Missed meal alert: meal time passed but not marked at all
  const lunchMissed  = isPastLunch  && !entry?.lunchTaken  && entry?.lunchPresent  === undefined;
  const dinnerMissed = isPastDinner && !entry?.dinnerTaken && entry?.dinnerPresent === undefined;

  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: getGetTodayEntryQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey({ year, month }) }),
      qc.invalidateQueries({ queryKey: getListEntriesQueryKey({ year, month }) }),
    ]);

  const mark = async (type: "lunch" | "dinner") => {
    if (type === "lunch" ? entry?.lunchTaken : entry?.dinnerTaken) return;
    dismissReminder(type);
    try {
      await upsert.mutateAsync({
        data: {
          date: today,
          lunchTaken:   type === "lunch"  ? true : (entry?.lunchTaken   ?? false),
          dinnerTaken:  type === "dinner" ? true : (entry?.dinnerTaken  ?? false),
          lunchPresent: type === "lunch"  ? true : (entry?.lunchPresent ?? false),
          dinnerPresent: type === "dinner" ? true : (entry?.dinnerPresent ?? false),
        },
      });
      await invalidate();
      toast({
        title: type === "lunch" ? mr.dashboard.lunchMarked : mr.dashboard.dinnerMarked,
        description: mr.dashboard.recordedToday,
      });
    } catch (err) {
      showApiError(err);
    }
  };

  const markSkipped = async (type: "lunch" | "dinner") => {
    dismissReminder(type);
    try {
      await upsert.mutateAsync({
        data: {
          date: today,
          lunchTaken:   type === "lunch"  ? false : (entry?.lunchTaken   ?? false),
          dinnerTaken:  type === "dinner" ? false : (entry?.dinnerTaken  ?? false),
          lunchPresent: type === "lunch"  ? false : (entry?.lunchPresent ?? false),
          dinnerPresent: type === "dinner" ? false : (entry?.dinnerPresent ?? false),
        },
      });
      await invalidate();
      toast({
        title: type === "lunch" ? mr.dashboard.lunchSkipped : mr.dashboard.dinnerSkipped,
        description: mr.dashboard.reminderStopped,
      });
    } catch (err) {
      showApiError(err);
    }
  };

  // ── Mark छुट्टी (full day holiday — skip all meals) ──────────────────────
  const markHoliday = async () => {
    dismissReminder("lunch");
    dismissReminder("dinner");
    try {
      await upsert.mutateAsync({
        data: {
          date: today,
          lunchTaken:    false,
          dinnerTaken:   false,
          lunchPresent:  false,
          dinnerPresent: false,
          notes: "छुट्टी",
        },
      });
      await invalidate();
      toast({ title: "🏖️ छुट्टी नोंदवली", description: "आजचे दोन्ही जेवण सोडले आहेत." });
    } catch (err) {
      showApiError(err);
    }
  };

  const isHoliday = entry?.notes === "छुट्टी" || (
    entry !== undefined &&
    entry !== null &&
    !entry.lunchTaken && !entry.dinnerTaken &&
    !entry.lunchPresent && !entry.dinnerPresent
  );

  if (isLoading) {
    return (
      <Card className="p-6 space-y-5 shadow-md rounded-3xl border-0">
        <Skeleton className="h-5 w-40 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </Card>
    );
  }

  const lunchSkipped  = entry?.lunchTaken  === false && entry?.lunchPresent  === false && entry !== null;
  const dinnerSkipped = entry?.dinnerTaken === false && entry?.dinnerPresent === false && entry !== null;

  const MealButton = ({
    type,
    icon: Icon,
    label,
    timeLabel,
  }: {
    type: "lunch" | "dinner";
    icon: React.ElementType;
    label: string;
    timeLabel: string;
  }) => {
    const taken   = type === "lunch" ? entry?.lunchTaken   : entry?.dinnerTaken;
    const skipped = type === "lunch" ? lunchSkipped        : dinnerSkipped;
    const isPast  = type === "lunch" ? isPastLunch         : isPastDinner;
    const missed  = type === "lunch" ? lunchMissed         : dinnerMissed;

    return (
      <div className="flex flex-col gap-2">
        {/* Missed meal alert banner */}
        {missed && !taken && !skipped && (
          <div className="flex items-center gap-1.5 rounded-xl bg-red-50 dark:bg-red-950/20 px-2.5 py-1.5 animate-pulse">
            <Bell className="h-3 w-3 text-red-500 shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400 font-semibold">जेवण नोंदवलेले नाही!</p>
          </div>
        )}

        {/* Main meal card */}
        <button
          onClick={() => mark(type)}
          disabled={!!taken || skipped || upsert.isPending || isHoliday}
          className={cn(
            "meal-btn w-full text-left",
            taken    ? "meal-btn-taken"   :
            skipped  ? "meal-btn-skipped" :
            isHoliday ? "meal-btn-skipped" :
            missed   ? "border-2 border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/10" :
            "meal-btn-default"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={cn(
              "h-10 w-10 rounded-2xl flex items-center justify-center",
              taken ? "bg-green-500/15" : skipped || isHoliday ? "bg-red-400/10" : "bg-muted"
            )}>
              <Icon className={cn(
                "h-5 w-5",
                taken ? "text-green-600" : skipped || isHoliday ? "text-red-400" : "text-muted-foreground"
              )} />
            </div>
            {taken && (
              <span className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
              </span>
            )}
            {(skipped || isHoliday) && !taken && (
              <span className="h-6 w-6 rounded-full bg-red-400 flex items-center justify-center shadow-sm">
                <X className="h-3.5 w-3.5 text-white" strokeWidth={3} />
              </span>
            )}
          </div>

          <p className="font-semibold text-sm text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{timeLabel}</p>

          {taken      && <p className="text-xs font-medium text-green-600 mt-2">✓ जेवण घेतले</p>}
          {skipped && !isHoliday && <p className="text-xs font-medium text-red-400 mt-2">✕ जेवण नाही</p>}
          {isHoliday  && <p className="text-xs font-medium text-orange-500 mt-2">🏖️ छुट्टी</p>}
          {!taken && !skipped && !isHoliday && (
            <p className="text-xs text-primary mt-2 font-medium">{mr.common.tapToMark}</p>
          )}
        </button>

        {/* Action buttons — shown only when pending + not holiday */}
        {!taken && !skipped && !isHoliday && isPast && (
          <div className="grid grid-cols-1 gap-1.5">
            <button
              onClick={() => mark(type)}
              disabled={upsert.isPending}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-green-500 text-white hover:bg-green-600 active:scale-[0.97] transition-all shadow-sm"
            >
              ✓ मी जेवण घेतले
            </button>
            <button
              onClick={() => markSkipped(type)}
              disabled={upsert.isPending}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-[0.97] transition-all dark:bg-red-950/20 dark:border-red-800 dark:text-red-400"
            >
              ✕ {mr.common.didntEat}
            </button>
            {/* Snooze button */}
            <button
              onClick={() => {
                snoozeReminder(type, 5);
                toast({ title: `⏰ ${type === "lunch" ? "दुपारची" : "रात्रीची"} सूचना ५ मिनिटांसाठी पुढे ढकलली` });
              }}
              disabled={upsert.isPending}
              className="w-full py-2 rounded-xl text-xs font-medium text-muted-foreground bg-muted/50 hover:bg-muted active:scale-[0.97] transition-all flex items-center justify-center gap-1.5"
            >
              <AlarmClock className="h-3 w-3" /> ५ मिनिटे नंतर
            </button>
          </div>
        )}

        {/* Pre-meal tap to mark */}
        {!taken && !skipped && !isHoliday && !isPast && (
          <button
            onClick={() => mark(type)}
            disabled={upsert.isPending}
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 active:scale-[0.97] transition-all"
          >
            ✓ मी जेवण घेतले
          </button>
        )}
      </div>
    );
  };

  return (
    <Card className="p-5 shadow-md rounded-3xl border-0 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-0.5">
            {mr.common.today}
          </p>
          <p className="text-lg font-bold text-foreground">
            {format(new Date(), "EEEE, d MMMM")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* छुट्टी button */}
          {!isHoliday && (
            <button
              onClick={markHoliday}
              disabled={upsert.isPending}
              title="छुट्टी — दोन्ही जेवणे सोडा"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-orange-50 dark:bg-orange-950/20 text-orange-600 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 active:scale-[0.97] transition-all"
            >
              <CalendarOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">छुट्टी</span>
            </button>
          )}
          <div className="h-10 w-10 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center">
            <Calendar className="h-4.5 w-4.5 text-primary" style={{ height: "1.125rem", width: "1.125rem" }} />
          </div>
        </div>
      </div>

      {/* Holiday banner */}
      {isHoliday && (
        <div className="flex items-center gap-2 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 px-3.5 py-3 mb-4">
          <span className="text-xl">🏖️</span>
          <div>
            <p className="text-sm font-bold text-orange-700 dark:text-orange-300">आज छुट्टी आहे</p>
            <p className="text-xs text-muted-foreground">दोन्ही जेवणे सोडलेली आहेत.</p>
          </div>
        </div>
      )}

      {/* आजचे जेवण divider */}
      {!isHoliday && (
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold text-muted-foreground px-2">आजचे जेवण</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {/* Meal buttons */}
      {!isHoliday && (
        <div className="grid grid-cols-2 gap-3">
          <MealButton type="lunch"  icon={Coffee} label={mr.common.lunch}  timeLabel={mr.dashboard.lunchTime}  />
          <MealButton type="dinner" icon={Moon}   label={mr.common.dinner} timeLabel={mr.dashboard.dinnerTime} />
        </div>
      )}
    </Card>
  );
}

// ─── Weekly Snapshot ─────────────────────────────────────────────────────────
function WeeklySnapshot() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  const { data: entries } = useListEntries(
    { year, month },
    { query: { queryKey: getListEntriesQueryKey({ year, month }) } }
  );

  const weekEntries = (entries ?? []).filter((e) => {
    const d = new Date((e as { date: string }).date + "T12:00:00");
    return d >= weekStart && d <= now;
  }) as EntryLike[];

  const lunchTaken  = weekEntries.filter((e) => e.lunchTaken).length;
  const dinnerTaken = weekEntries.filter((e) => e.dinnerTaken).length;
  const totalTaken  = lunchTaken + dinnerTaken;
  const daysSoFar   = differenceInDays(now, weekStart) + 1;
  const skipped     = daysSoFar * 2 - totalTaken;

  return (
    <Card className="p-5 shadow-sm rounded-3xl border-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{mr.dashboard.thisWeek}</p>
          <p className="text-base font-bold text-foreground mt-0.5">
            {format(weekStart, "MMM d")} – {format(now, "MMM d")}
          </p>
        </div>
        <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-green-50 dark:bg-green-950/30 p-3 text-center">
          <p className="text-2xl font-black text-green-600 dark:text-green-400">{lunchTaken}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{mr.dashboard.lunches}</p>
        </div>
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{dinnerTaken}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{mr.dashboard.dinners}</p>
        </div>
        <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 p-3 text-center">
          <p className="text-2xl font-black text-red-500 dark:text-red-400">{skipped}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{mr.dashboard.skippedCount}</p>
        </div>
      </div>
    </Card>
  );
}

// ─── Monthly Summary ─────────────────────────────────────────────────────────
function MonthlySummaryCard() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: summary, isLoading } = useGetMonthlySummary(
    { year, month },
    { query: { queryKey: getGetMonthlySummaryQueryKey({ year, month }) } }
  );

  if (isLoading) {
    return (
      <Card className="p-5 shadow-sm rounded-3xl border-0 space-y-4">
        <Skeleton className="h-5 w-40 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      </Card>
    );
  }

  if (!summary) return null;

  const todayDay  = now.getDate();
  const totalDays = getDaysInMonth(now);
  const daysLeft  = totalDays - todayDay;
  const avgPerDay = todayDay > 0
    ? (summary.totalMealsTaken * summary.mealCostPerMeal / todayDay).toFixed(0)
    : "0";
  const maxPossible = totalDays * 2 * summary.mealCostPerMeal;
  const moneySaved  = maxPossible - summary.totalCost;

  const stats = [
    {
      label: mr.dashboard.mealsTaken,
      value: summary.totalMealsTaken,
      icon: Utensils,
      bg: "bg-green-50 dark:bg-green-950/30",
      iconColor: "text-green-600 dark:text-green-400",
      valColor: "text-green-700 dark:text-green-300",
    },
    {
      label: mr.dashboard.daysPresent,
      value: summary.daysPresent,
      icon: Calendar,
      bg: "bg-blue-50 dark:bg-blue-950/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      valColor: "text-blue-700 dark:text-blue-300",
    },
    {
      label: mr.common.totalCost,
      value: `₹${summary.totalCost.toFixed(0)}`,
      icon: IndianRupee,
      bg: "bg-orange-50 dark:bg-orange-950/30",
      iconColor: "text-orange-600 dark:text-orange-400",
      valColor: "text-orange-700 dark:text-orange-300",
    },
    {
      label: "वाचवलेले पैसे",
      value: `₹${moneySaved.toFixed(0)}`,
      icon: Zap,
      bg: "bg-purple-50 dark:bg-purple-950/30",
      iconColor: "text-purple-600 dark:text-purple-400",
      valColor: "text-purple-700 dark:text-purple-300",
    },
  ];

  return (
    <Card className="p-5 shadow-sm rounded-3xl border-0 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{mr.dashboard.thisMonth}</p>
          <p className="text-base font-bold text-foreground mt-0.5">
            {format(new Date(year, month - 1), "MMMM yyyy")}
          </p>
        </div>
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {stats.map(({ label, value, icon: Icon, bg, iconColor, valColor }) => (
          <div key={label} className={cn("rounded-2xl p-3.5 space-y-2", bg)}>
            <Icon className={cn("h-4 w-4", iconColor)} />
            <p className={cn("text-2xl font-black", valColor)}>{value}</p>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-muted/50 px-4 py-3 flex flex-wrap justify-between gap-y-1 gap-x-3 text-xs">
        <span className="text-muted-foreground">
          ☀️ दुपार: <strong className="text-foreground">{summary.totalLunchTaken}</strong>
        </span>
        <span className="text-muted-foreground">
          🌙 रात्र: <strong className="text-foreground">{summary.totalDinnerTaken}</strong>
        </span>
        <span className="text-muted-foreground">
          सरासरी: <strong className="text-foreground">₹{avgPerDay}/दिवस</strong>
        </span>
      </div>

      <div className="flex items-start gap-2 rounded-2xl bg-primary/5 border border-primary/10 px-3.5 py-2.5">
        <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-foreground leading-relaxed">
          {summary.totalMealsTaken === 0
            ? mr.dashboard.noMealsYet
            : `${summary.totalMealsTaken} जेवणे · ₹${avgPerDay}/दिवस · ${daysLeft} दिवस शिल्लक`}
        </p>
      </div>
    </Card>
  );
}

// ─── Interactive Calendar ─────────────────────────────────────────────────────
function InteractiveCalendar() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  const [editDate, setEditDate] = useState<string | null>(null);

  const { data: entries } = useListEntries(
    { year, month },
    { query: { queryKey: getListEntriesQueryKey({ year, month }) } }
  );

  const upsert = useUpsertEntry();
  const qc     = useQueryClient();

  const daysInMonth  = getDaysInMonth(new Date(year, month - 1));
  const firstDayOfWeek = getDay(startOfMonth(new Date(year, month - 1)));
  const entryMap = new Map(entries?.map((e) => [(e as EntryLike).date, e as EntryLike]) ?? []);
  const days     = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks   = Array.from({ length: firstDayOfWeek });

  const getStatus = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const e = entryMap.get(dateStr);
    if (!e) return "none";
    if (e.notes === "छुट्टी" || (!e.lunchTaken && !e.dinnerTaken && !e.lunchPresent && !e.dinnerPresent)) return "holiday";
    if (e.lunchTaken && e.dinnerTaken) return "both";
    if (e.lunchTaken || e.dinnerTaken) return "partial";
    return "none";
  };

  const selectedEntry = editDate ? entryMap.get(editDate) : null;

  const handleDayClick = (day: number) => {
    const d = new Date(year, month - 1, day);
    if (isFuture(d) && !isToday(d)) return;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setEditDate(editDate === dateStr ? null : dateStr);
  };

  const toggleMeal = async (type: "lunch" | "dinner") => {
    if (!editDate) return;
    const e = entryMap.get(editDate);
    const cur = type === "lunch" ? (e?.lunchTaken ?? false) : (e?.dinnerTaken ?? false);
    try {
      await upsert.mutateAsync({
        data: {
          date: editDate,
          lunchTaken:    type === "lunch"  ? !cur : (e?.lunchTaken   ?? false),
          dinnerTaken:   type === "dinner" ? !cur : (e?.dinnerTaken  ?? false),
          lunchPresent:  type === "lunch"  ? !cur : (e?.lunchPresent ?? false),
          dinnerPresent: type === "dinner" ? !cur : (e?.dinnerPresent ?? false),
          notes: e?.notes ?? undefined,
        },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: getListEntriesQueryKey({ year, month }) }),
        qc.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey({ year, month }) }),
        qc.invalidateQueries({ queryKey: getGetTodayEntryQueryKey() }),
      ]);
    } catch (err) {
      showApiError(err);
    }
  };

  const toggleHoliday = async () => {
    if (!editDate) return;
    const e = entryMap.get(editDate);
    const isHol = e?.notes === "छुट्टी" || (!e?.lunchTaken && !e?.dinnerTaken && !e?.lunchPresent && !e?.dinnerPresent && e !== undefined);
    try {
      await upsert.mutateAsync({
        data: {
          date: editDate,
          lunchTaken: false, dinnerTaken: false,
          lunchPresent: false, dinnerPresent: false,
          notes: isHol ? null : "छुट्टी",
        },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: getListEntriesQueryKey({ year, month }) }),
        qc.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey({ year, month }) }),
        qc.invalidateQueries({ queryKey: getGetTodayEntryQueryKey() }),
      ]);
      toast({ title: isHol ? "छुट्टी रद्द केली" : "🏖️ छुट्टी नोंदवली" });
    } catch (err) {
      showApiError(err);
    }
  };

  return (
    <Card className="p-5 shadow-sm rounded-3xl border-0 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-base font-bold text-foreground">
          {format(new Date(year, month - 1), "MMMM yyyy")}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> दोन्ही</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-200 inline-block" /> एक</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-300 inline-block" /> छुट्टी</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-300 inline-block" /> चुकले</span>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {mr.dashboard.weekDays.map((d) => (
          <div key={d} className="text-xs font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map((day) => {
          const status    = getStatus(day);
          const dateStr   = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const todayDay  = isToday(new Date(year, month - 1, day));
          const future    = isFuture(new Date(year, month - 1, day)) && !todayDay;
          const pastMissed = !todayDay && !future && status === "none";
          const selected  = editDate === dateStr;

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              disabled={future}
              className={cn(
                "relative h-9 w-9 mx-auto flex items-center justify-center rounded-2xl text-xs font-medium transition-all",
                todayDay && "ring-2 ring-primary ring-offset-1 ring-offset-card font-bold",
                selected && "ring-2 ring-primary scale-110 shadow-md z-10",
                future && "opacity-25 text-muted-foreground cursor-default",
                status === "both"    && "bg-green-500 text-white shadow-sm",
                status === "partial" && "bg-green-200 text-green-800 dark:bg-green-800/50 dark:text-green-200",
                status === "holiday" && "bg-orange-200 text-orange-700 dark:bg-orange-800/40 dark:text-orange-300",
                pastMissed           && "bg-red-100 text-red-500 dark:bg-red-950/50 dark:text-red-400",
                status === "none" && !pastMissed && !future && "text-foreground hover:bg-muted",
                !future && !selected && "cursor-pointer hover:scale-105"
              )}
            >
              {day}
              {status === "partial" && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400 border-2 border-card" />
              )}
            </button>
          );
        })}
      </div>

      {/* Edit panel for selected day */}
      {editDate && (
        <div className="rounded-2xl bg-muted/40 border border-border p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">
              {format(parseISO(editDate), "d MMMM yyyy")}
            </p>
            <button onClick={() => setEditDate(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Lunch */}
            <button
              onClick={() => toggleMeal("lunch")}
              disabled={upsert.isPending}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all",
                selectedEntry?.lunchTaken
                  ? "bg-green-500 text-white"
                  : "bg-card border border-border text-foreground hover:bg-green-50 hover:border-green-300"
              )}
            >
              <Coffee className="h-3.5 w-3.5" />
              दुपारचे जेवण
              {selectedEntry?.lunchTaken && <Check className="h-3 w-3 ml-auto" strokeWidth={3} />}
            </button>

            {/* Dinner */}
            <button
              onClick={() => toggleMeal("dinner")}
              disabled={upsert.isPending}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all",
                selectedEntry?.dinnerTaken
                  ? "bg-green-500 text-white"
                  : "bg-card border border-border text-foreground hover:bg-green-50 hover:border-green-300"
              )}
            >
              <Moon className="h-3.5 w-3.5" />
              रात्रीचे जेवण
              {selectedEntry?.dinnerTaken && <Check className="h-3 w-3 ml-auto" strokeWidth={3} />}
            </button>
          </div>

          {/* Holiday toggle */}
          <button
            onClick={toggleHoliday}
            disabled={upsert.isPending}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all",
              selectedEntry?.notes === "छुट्टी" || (!selectedEntry?.lunchTaken && !selectedEntry?.dinnerTaken && selectedEntry !== undefined)
                ? "bg-orange-200 text-orange-700 dark:bg-orange-800/40 dark:text-orange-300"
                : "bg-card border border-dashed border-orange-300 text-orange-600 hover:bg-orange-50"
            )}
          >
            <CalendarOff className="h-3.5 w-3.5" />
            छुट्टी {(selectedEntry?.notes === "छुट्टी") ? "(रद्द करा)" : "नोंदवा"}
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        दिवसावर दाबा → जेवण बदला · हिरव्यावरील ठिपका = फक्त एक जेवण
      </p>
    </Card>
  );
}

// ─── FAB (Floating Action Button) ────────────────────────────────────────────
function FAB() {
  const { data: todayRes } = useGetTodayEntry({
    query: { queryKey: getGetTodayEntryQueryKey() },
  });
  const upsert = useUpsertEntry();
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  const [open, setOpen] = useState(false);

  const entry = todayRes?.entry;
  const bothDone = entry?.lunchTaken && entry?.dinnerTaken;
  if (bothDone) return null;

  const quickMark = async (type: "lunch" | "dinner") => {
    setOpen(false);
    dismissReminder(type);
    try {
      await upsert.mutateAsync({
        data: {
          date: today,
          lunchTaken:    type === "lunch"  ? true : (entry?.lunchTaken   ?? false),
          dinnerTaken:   type === "dinner" ? true : (entry?.dinnerTaken  ?? false),
          lunchPresent:  type === "lunch"  ? true : (entry?.lunchPresent ?? false),
          dinnerPresent: type === "dinner" ? true : (entry?.dinnerPresent ?? false),
        },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: getGetTodayEntryQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey({ year, month }) }),
        qc.invalidateQueries({ queryKey: getListEntriesQueryKey({ year, month }) }),
      ]);
      toast({ title: type === "lunch" ? mr.dashboard.lunchMarked : mr.dashboard.dinnerMarked });
    } catch (err) {
      showApiError(err);
    }
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <div className="fixed bottom-20 right-4 sm:bottom-8 sm:right-6 z-50 flex flex-col items-end gap-2">
        {open && (
          <div className="flex flex-col gap-2 items-end animate-in slide-in-from-bottom-2 duration-200">
            {!entry?.lunchTaken && (
              <button
                onClick={() => quickMark("lunch")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border shadow-lg text-sm font-semibold text-foreground hover:bg-muted transition-all active:scale-95"
              >
                ☀️ {mr.common.lunch}
                <span className="text-xs text-green-600 font-bold">घेतले</span>
              </button>
            )}
            {!entry?.dinnerTaken && (
              <button
                onClick={() => quickMark("dinner")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border shadow-lg text-sm font-semibold text-foreground hover:bg-muted transition-all active:scale-95"
              >
                🌙 {mr.common.dinner}
                <span className="text-xs text-green-600 font-bold">घेतले</span>
              </button>
            )}
          </div>
        )}
        <button
          onClick={() => setOpen((p) => !p)}
          className={cn(
            "h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95",
            open
              ? "bg-muted text-foreground rotate-45"
              : "bg-primary text-white hover:bg-primary/90"
          )}
        >
          <span className="text-xl">{open ? "✕" : "+"}</span>
        </button>
      </div>
    </>
  );
}

// ─── Dashboard Page ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: entries = [] } = useListEntries(
    { year, month },
    { query: { queryKey: getListEntriesQueryKey({ year, month }) } }
  );
  const { data: summary } = useGetMonthlySummary(
    { year, month },
    { query: { queryKey: getGetMonthlySummaryQueryKey({ year, month }) } }
  );

  const upsert = useUpsertEntry();
  const qc = useQueryClient();

  // Same as yesterday handler
  const yesterday     = format(subDays(now, 1), "yyyy-MM-dd");
  const yesterdayData = Array.isArray(entries) ? (entries as EntryLike[]).find((e) => e.date === yesterday) : undefined;
  const [sameLoading, setSameLoading] = useState(false);

  const sameAsYesterday = async () => {
    if (!yesterdayData) return;
    setSameLoading(true);
    try {
      const today = format(now, "yyyy-MM-dd");
      await upsert.mutateAsync({
        data: {
          date:         today,
          lunchTaken:   yesterdayData.lunchTaken,
          dinnerTaken:  yesterdayData.dinnerTaken,
          lunchPresent: yesterdayData.lunchPresent,
          dinnerPresent: yesterdayData.dinnerPresent,
        },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: getGetTodayEntryQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey({ year, month }) }),
        qc.invalidateQueries({ queryKey: getListEntriesQueryKey({ year, month }) }),
      ]);
      toast({ title: "✓ कालची नोंद आजसाठी लागू केली", description: "आजचे जेवण कालप्रमाणेच नोंदवले." });
      if (yesterdayData.lunchTaken)  dismissReminder("lunch");
      if (yesterdayData.dinnerTaken) dismissReminder("dinner");
    } catch (err) {
      showApiError(err);
    } finally {
      setSameLoading(false);
    }
  };

  const name = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "";

  return (
    <Layout>
      {/* Greeting */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-0.5">
          {mr.dashboard.greeting}
          {name ? `, ${name}` : ""}!
        </p>
        <h1 className="text-2xl font-black text-foreground">{mr.dashboard.subtitle}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {format(now, "EEEE, d MMMM yyyy")}
        </p>
      </div>

      <div className="space-y-4">
        <TodayCard />
        <SmartInsightsCard
          entries={entries as EntryLike[]}
          summary={summary}
          onSameAsYesterday={sameAsYesterday}
          sameLoading={sameLoading}
        />
        <WeeklySnapshot />
        <MonthlySummaryCard />
        <InteractiveCalendar />
      </div>

      <FAB />
    </Layout>
  );
}
