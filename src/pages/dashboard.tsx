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
  useApplyLeave,
  useGetMyLeaves,
} from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import Layout from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  Check, Coffee, Moon, TrendingUp, Calendar,
  IndianRupee, Zap, Utensils, X, Bell, BellOff,
  Sparkles, Copy, CalendarOff, AlarmClock, Plane, Send, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useMealTimes, formatTime12h } from "@/lib/meal-times";

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

// ─── Leave Vacation Card ────────────────────────────────────────────────────
function LeaveVacationCard() {
  const { t } = useLanguage();
  const { data: leaves = [], isLoading } = useGetMyLeaves();
  const applyLeave = useApplyLeave();
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const handleApply = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Error", description: "Please select both start and end dates.", variant: "destructive" });
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      toast({ title: "Error", description: "End date cannot be before start date.", variant: "destructive" });
      return;
    }

    try {
      await applyLeave.mutateAsync({ startDate, endDate, reason });
      toast({ title: "Success", description: "Leave applied successfully." });
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch (e) {
      showApiError(e);
    }
  };

  return (
    <Card className="p-4 sm:p-5 border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-background overflow-hidden relative">
      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
        <Plane className="w-32 h-32 text-blue-500" />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-xl text-blue-600 dark:text-blue-300">
          <Plane className="h-5 w-5" />
        </div>
        <h3 className="font-bold text-lg text-foreground tracking-tight">Vacation / Leave Mode</h3>
      </div>

      <div className="space-y-3 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full text-sm border-2 border-border rounded-xl p-2.5 bg-background focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">End Date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full text-sm border-2 border-border rounded-xl p-2.5 bg-background focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <input 
            type="text" 
            placeholder="Reason (Optional)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="flex-1 text-sm border-2 border-border rounded-xl p-2.5 bg-background focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button 
            onClick={handleApply}
            disabled={applyLeave.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            {applyLeave.isPending ? "..." : <><Send className="w-4 h-4" /> Apply</>}
          </button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-16 w-full mt-4 rounded-xl" />
      ) : leaves.length > 0 ? (
        <div className="mt-5 space-y-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Your Leaves</h4>
          <div className="space-y-2">
            {leaves.map(leave => {
              const isPast = new Date(leave.end_date) < new Date();
              return (
                <div key={leave.id} className={cn(
                  "p-3 rounded-xl border flex justify-between items-center",
                  isPast ? "bg-muted/50 border-border/50 opacity-70" : "bg-card border-border shadow-sm"
                )}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">
                        {format(parseISO(leave.start_date), "dd MMM")} - {format(parseISO(leave.end_date), "dd MMM")}
                      </p>
                      {leave.status === 'approved' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-1.5 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </span>
                      )}
                    </div>
                    {leave.reason && <p className="text-xs text-muted-foreground mt-0.5">{leave.reason}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

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
  const { t } = useLanguage();
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

    if (dsr >= 60) s.push(t.dashboard.smartInsights.dinnerSkipped.replace("{rate}", dsr.toString()));
    if (lsr >= 60) s.push(t.dashboard.smartInsights.lunchSkipped.replace("{rate}", lsr.toString()));
    if (dsr < 20 && lsr < 20) s.push(t.dashboard.smartInsights.goodHabit);

    return { lunchSkipRate: lsr, dinnerSkipRate: dsr, suggestions: s };
  }, [entries]);

  // ── Bill prediction ──
  const predictedBill = useMemo(() => {
    if (!summary || daysElapsed === 0) return null;
    const dailyRate = summary.totalMealsTaken / daysElapsed;
    const projected = Math.round((dailyRate * totalDays) * summary.mealCostPerMeal);
    const current = Math.round(summary.totalMealsTaken * summary.mealCostPerMeal);
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
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t.dashboard.smartInsights.title}</p>
          <p className="text-sm font-bold text-foreground">{t.dashboard.smartInsights.subtitle}</p>
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
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 px-3.5 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">{t.dashboard.smartInsights.predictedBill}</p>
              <IndianRupee className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">₹{predictedBill.projected}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.dashboard.smartInsights.billDetails
                .replace("{current}", predictedBill.current.toString())
                .replace("{daysLeft}", daysLeft.toString())
                .replace("{dailyRate}", predictedBill.dailyRate.toString())}
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
                {t.dashboard.smartInsights.sameAsYesterday}
              </p>
              <p className="text-xs text-muted-foreground">
                {yesterday!.lunchTaken ? `☀️ ${t.common.lunch}` : ""}{yesterday!.lunchTaken && yesterday!.dinnerTaken ? " + " : ""}{yesterday!.dinnerTaken ? `🌙 ${t.common.dinner}` : ""}
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
  const { t } = useLanguage();
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

  // Compute past meal times from localStorage reactively
  const times = useMealTimes();
  const lunchH = parseInt(times.lunchTime.split(":")[0]);
  const lunchM = parseInt(times.lunchTime.split(":")[1]);
  const dinnerH = parseInt(times.dinnerTime.split(":")[0]);
  const dinnerM = parseInt(times.dinnerTime.split(":")[1]);
  const isPastLunch = currentHour > lunchH || (currentHour === lunchH && currentMin >= lunchM);
  const isPastDinner = currentHour > dinnerH || (currentHour === dinnerH && currentMin >= dinnerM);

  // Missed meal alert: meal time passed but not marked at all
  const lunchMissed = isPastLunch && !entry?.lunchTaken && entry?.lunchPresent === undefined;
  const dinnerMissed = isPastDinner && !entry?.dinnerTaken && entry?.dinnerPresent === undefined;

  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: getGetTodayEntryQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey({ year, month }) }),
      qc.invalidateQueries({ queryKey: getListEntriesQueryKey({ year, month }) }),
    ]);

  // Listen for Service Worker messages for background update
  useEffect(() => {
    if (isLoading) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_MEAL') {
        const { mealType, status } = event.data;
        if (status === 'taken') {
          mark(mealType as "lunch" | "dinner");
        } else if (status === 'skip') {
          markSkipped(mealType as "lunch" | "dinner");
        }
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [isLoading, entry]);

  // Auto-mark from deep link URL
  useEffect(() => {
    if (isLoading) return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const markTaken = params.get("markTaken"); // Legacy fallback
    const mealType = params.get("type") as "lunch" | "dinner" | null;

    // Support both new `?action=taken&type=lunch` and legacy `?markTaken=lunch`
    const finalAction = action || (markTaken ? "taken" : null);
    const finalType = mealType || (markTaken as "lunch" | "dinner" | null);

    if (finalType && (finalAction === "taken" || finalAction === "skip")) {
      // Remove it from URL so we don't trigger it again on refresh
      window.history.replaceState({}, document.title, window.location.pathname);

      // Give a tiny delay to let UI render before showing toast
      setTimeout(() => {
        if (finalAction === "taken") {
          mark(finalType);
        } else if (finalAction === "skip") {
          markSkipped(finalType);
        }
      }, 500);
    }
  }, [isLoading, entry]);

  const mark = async (type: "lunch" | "dinner") => {
    if (type === "lunch" ? entry?.lunchTaken : entry?.dinnerTaken) return;
    dismissReminder(type);

    // Optimistic UI update so it instantly turns green
    qc.setQueryData(getGetTodayEntryQueryKey(), (old: any) => ({
      entry: {
        ...(old?.entry || {}),
        date: today,
        lunchTaken: type === "lunch" ? true : (old?.entry?.lunchTaken ?? false),
        dinnerTaken: type === "dinner" ? true : (old?.entry?.dinnerTaken ?? false),
        lunchPresent: type === "lunch" ? true : (old?.entry?.lunchPresent ?? false),
        dinnerPresent: type === "dinner" ? true : (old?.entry?.dinnerPresent ?? false),
      }
    }));

    try {
      await upsert.mutateAsync({
        data: {
          date: today,
          lunchTaken: type === "lunch" ? true : (entry?.lunchTaken ?? false),
          dinnerTaken: type === "dinner" ? true : (entry?.dinnerTaken ?? false),
          lunchPresent: type === "lunch" ? true : (entry?.lunchPresent ?? false),
          dinnerPresent: type === "dinner" ? true : (entry?.dinnerPresent ?? false),
        },
      });
      await invalidate();
      toast({
        title: type === "lunch" ? t.dashboard.lunchMarked : t.dashboard.dinnerMarked,
        description: t.dashboard.recordedToday,
      });
    } catch (err) {
      showApiError(err);
      await invalidate(); // Revert on failure
    }
  };

  const markSkipped = async (type: "lunch" | "dinner") => {
    dismissReminder(type);

    // Optimistic UI update so it instantly turns red/skipped
    qc.setQueryData(getGetTodayEntryQueryKey(), (old: any) => ({
      entry: {
        ...(old?.entry || {}),
        date: today,
        lunchTaken: type === "lunch" ? false : (old?.entry?.lunchTaken ?? false),
        dinnerTaken: type === "dinner" ? false : (old?.entry?.dinnerTaken ?? false),
        lunchPresent: type === "lunch" ? false : (old?.entry?.lunchPresent ?? false),
        dinnerPresent: type === "dinner" ? false : (old?.entry?.dinnerPresent ?? false),
      }
    }));

    try {
      await upsert.mutateAsync({
        data: {
          date: today,
          lunchTaken: type === "lunch" ? false : (entry?.lunchTaken ?? false),
          dinnerTaken: type === "dinner" ? false : (entry?.dinnerTaken ?? false),
          lunchPresent: type === "lunch" ? false : (entry?.lunchPresent ?? false),
          dinnerPresent: type === "dinner" ? false : (entry?.dinnerPresent ?? false),
        },
      });
      await invalidate();
      toast({
        title: type === "lunch" ? t.dashboard.lunchSkipped : t.dashboard.dinnerSkipped,
        description: t.dashboard.reminderStopped,
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
          lunchTaken: false,
          dinnerTaken: false,
          lunchPresent: false,
          dinnerPresent: false,
          notes: "छुट्टी",
        },
      });
      await invalidate();
      toast({ title: t.dashboard.holidayMarked, description: t.dashboard.holidayDesc });
    } catch (err) {
      showApiError(err);
    }
  };

  const cancelHoliday = async () => {
    try {
      await upsert.mutateAsync({
        data: {
          date: today,
          lunchTaken: false,
          dinnerTaken: false,
          lunchPresent: false,
          dinnerPresent: false,
          notes: null, // Clear the holiday note
        },
      });
      await invalidate();
      toast({ title: t.dashboard.holidayCancelled });
    } catch (err) {
      showApiError(err);
    }
  };

  const isHoliday = entry?.notes === "छुट्टी";

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

  const lunchSkipped = entry?.lunchTaken === false && entry?.lunchPresent === false && entry !== null;
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
    const taken = type === "lunch" ? entry?.lunchTaken : entry?.dinnerTaken;
    const skipped = type === "lunch" ? lunchSkipped : dinnerSkipped;
    const isPast = type === "lunch" ? isPastLunch : isPastDinner;
    const missed = type === "lunch" ? lunchMissed : dinnerMissed;

    return (
      <div className="flex flex-col gap-2">
        {/* Missed meal alert banner */}
        {missed && !taken && !skipped && (
          <div className="flex items-center gap-1.5 rounded-xl bg-red-50 dark:bg-red-950/20 px-2.5 py-1.5 animate-pulse">
            <Bell className="h-3 w-3 text-red-500 shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{t.dashboard.mealNotRecorded}</p>
          </div>
        )}

        {/* Main meal card */}
        <button
          onClick={() => mark(type)}
          disabled={!!taken || skipped || upsert.isPending || isHoliday}
          className={cn(
            "meal-btn w-full text-left",
            taken ? "meal-btn-taken" :
              skipped ? "meal-btn-skipped" :
                isHoliday ? "meal-btn-skipped" :
                  missed ? "border-2 border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/10" :
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

          {taken && <p className="text-xs font-medium text-green-600 mt-2">{t.dashboard.mealTakenShort}</p>}
          {skipped && !isHoliday && <p className="text-xs font-medium text-red-400 mt-2">{t.dashboard.mealNotTakenShort}</p>}
          {isHoliday && <p className="text-xs font-medium text-orange-500 mt-2">{t.dashboard.holidayShort}</p>}
          {!taken && !skipped && !isHoliday && (
            <p className="text-xs text-primary mt-2 font-medium">{t.common.tapToMark}</p>
          )}
        </button>

        {/* Action buttons — shown only when pending + not holiday */}
        {!taken && !skipped && !isHoliday && isPast && (
          <div className="grid grid-cols-1 gap-1.5">
            <button
              onClick={() => mark(type)}
              disabled={upsert.isPending}
              className="w-full h-11 rounded-xl text-sm font-semibold bg-green-500 text-white active:bg-green-600 active:scale-[0.97] transition-all shadow-sm"
            >
              {t.dashboard.iTookMeal}
            </button>
            <button
              onClick={() => markSkipped(type)}
              disabled={upsert.isPending}
              className="w-full h-11 rounded-xl text-sm font-semibold bg-red-50 text-red-600 border border-red-200 active:bg-red-100 active:scale-[0.97] transition-all dark:bg-red-950/20 dark:border-red-800 dark:text-red-400"
            >
              ✕ {t.common.didntEat}
            </button>
            {/* Snooze button */}
            <button
              onClick={() => {
                snoozeReminder(type, 5);
                toast({ title: type === "lunch" ? t.dashboard.snoozeLunch : t.dashboard.snoozeDinner });
              }}
              disabled={upsert.isPending}
              className="w-full h-10 rounded-xl text-xs font-medium text-muted-foreground bg-muted/50 active:bg-muted active:scale-[0.97] transition-all flex items-center justify-center gap-1.5"
            >
              <AlarmClock className="h-3 w-3" /> {t.dashboard.snoozeBtn}
            </button>
          </div>
        )}

        {/* Pre-meal tap to mark */}
        {!taken && !skipped && !isHoliday && !isPast && (
          <div className="grid grid-cols-1 gap-1.5">
            <button
              onClick={() => mark(type)}
              disabled={upsert.isPending}
              className="w-full h-11 rounded-xl text-sm font-semibold bg-primary/10 text-primary border border-primary/20 active:bg-primary/20 active:scale-[0.97] transition-all"
            >
              {t.dashboard.iTookMeal}
            </button>
            <button
              onClick={() => markSkipped(type)}
              disabled={upsert.isPending}
              className="w-full h-11 rounded-xl text-sm font-semibold bg-muted/30 text-muted-foreground border border-muted-foreground/20 active:bg-muted/50 active:scale-[0.97] transition-all"
            >
              ✕ {t.common.didntEat}
            </button>
          </div>
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
            {t.common.today}
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
              title={t.dashboard.holidayTooltip}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-orange-50 dark:bg-orange-950/20 text-orange-600 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 active:scale-[0.97] transition-all"
            >
              <CalendarOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.dashboard.holidayBtn}</span>
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
          <div className="flex-1">
            <p className="text-sm font-bold text-orange-700 dark:text-orange-300">{t.dashboard.todayHoliday}</p>
            <p className="text-xs text-muted-foreground">{t.dashboard.todayHolidayDesc}</p>
          </div>
          <button
            onClick={cancelHoliday}
            disabled={upsert.isPending}
            className="p-2 rounded-xl text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/40 active:scale-95 transition-all flex items-center justify-center shrink-0"
            title="Cancel Holiday"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* आजचे जेवण divider */}
      {!isHoliday && (
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold text-muted-foreground px-2">{t.dashboard.todaysMeals}</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {/* Meal buttons */}
      {!isHoliday && (
        <div className="grid grid-cols-2 gap-3">
          <MealButton type="lunch" icon={Coffee} label={t.common.lunch} timeLabel={formatTime12h(times.lunchTime)} />
          <MealButton type="dinner" icon={Moon} label={t.common.dinner} timeLabel={formatTime12h(times.dinnerTime)} />
        </div>
      )}
    </Card>
  );
}

// ─── Weekly Snapshot ─────────────────────────────────────────────────────────
function WeeklySnapshot() {
  const { t } = useLanguage();
  const now = new Date();
  const year = now.getFullYear();
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

  const lunchTaken = weekEntries.filter((e) => e.lunchTaken).length;
  const dinnerTaken = weekEntries.filter((e) => e.dinnerTaken).length;
  const totalTaken = lunchTaken + dinnerTaken;
  const daysSoFar = differenceInDays(now, weekStart) + 1;
  const skipped = daysSoFar * 2 - totalTaken;

  return (
    <Card className="p-5 shadow-sm rounded-3xl border-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{t.dashboard.thisWeek}</p>
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
          <p className="text-xs text-muted-foreground mt-0.5">{t.dashboard.lunches}</p>
        </div>
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{dinnerTaken}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t.dashboard.dinners}</p>
        </div>
        <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 p-3 text-center">
          <p className="text-2xl font-black text-red-500 dark:text-red-400">{skipped}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t.dashboard.skippedCount}</p>
        </div>
      </div>
    </Card>
  );
}

// ─── Monthly Summary ─────────────────────────────────────────────────────────
function MonthlySummaryCard() {
  const { t } = useLanguage();
  const now = new Date();
  const year = now.getFullYear();
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

  const todayDay = now.getDate();
  const totalDays = getDaysInMonth(now);
  const daysLeft = totalDays - todayDay;
  const avgPerDay = todayDay > 0
    ? (summary.totalMealsTaken * summary.mealCostPerMeal / todayDay).toFixed(0)
    : "0";
  const maxPossible = totalDays * 2 * summary.mealCostPerMeal;
  const moneySaved = maxPossible - summary.totalCost;

  const stats = [
    {
      label: t.dashboard.mealsTaken,
      value: summary.totalMealsTaken,
      icon: Utensils,
      bg: "bg-green-50 dark:bg-green-950/30",
      iconColor: "text-green-600 dark:text-green-400",
      valColor: "text-green-700 dark:text-green-300",
    },
    {
      label: t.dashboard.daysPresent,
      value: summary.daysPresent,
      icon: Calendar,
      bg: "bg-blue-50 dark:bg-blue-950/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      valColor: "text-blue-700 dark:text-blue-300",
    },
    {
      label: t.common.totalCost,
      value: `₹${summary.totalCost.toFixed(0)}`,
      icon: IndianRupee,
      bg: "bg-amber-50 dark:bg-amber-950/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      valColor: "text-amber-700 dark:text-amber-300",
    },
    {
      label: t.dashboard.moneySaved,
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{t.dashboard.thisMonth}</p>
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
          {t.dashboard.lunchTag} <strong className="text-foreground">{summary.totalLunchTaken}</strong>
        </span>
        <span className="text-muted-foreground">
          {t.dashboard.dinnerTag} <strong className="text-foreground">{summary.totalDinnerTaken}</strong>
        </span>
        <span className="text-muted-foreground">
          {t.dashboard.avgTag} <strong className="text-foreground">₹{avgPerDay}/दिवस</strong>
        </span>
      </div>

      <div className="flex items-start gap-2 rounded-2xl bg-primary/5 border border-primary/10 px-3.5 py-2.5">
        <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-foreground leading-relaxed">
          {summary.totalMealsTaken === 0
            ? t.dashboard.noMealsYet
            : `${summary.totalMealsTaken} जेवणे · ₹${avgPerDay}/दिवस · ${daysLeft} दिवस शिल्लक`}
        </p>
      </div>
    </Card>
  );
}

// ─── Interactive Calendar ─────────────────────────────────────────────────────
function InteractiveCalendar() {
  const { t } = useLanguage();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const [editDate, setEditDate] = useState<string | null>(null);

  const { data: entries } = useListEntries(
    { year, month },
    { query: { queryKey: getListEntriesQueryKey({ year, month }) } }
  );

  const upsert = useUpsertEntry();
  const qc = useQueryClient();

  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const firstDayOfWeek = getDay(startOfMonth(new Date(year, month - 1)));
  const entryMap = new Map(entries?.map((e) => [(e as EntryLike).date, e as EntryLike]) ?? []);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfWeek });

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
          lunchTaken: type === "lunch" ? !cur : (e?.lunchTaken ?? false),
          dinnerTaken: type === "dinner" ? !cur : (e?.dinnerTaken ?? false),
          lunchPresent: type === "lunch" ? !cur : (e?.lunchPresent ?? false),
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
      toast({ title: isHol ? t.dashboard.holidayCancelled : t.dashboard.holidayMarked });
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
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> {t.dashboard.calendarBoth}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-200 inline-block" /> {t.dashboard.calendarOne}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-300 inline-block" /> {t.dashboard.calendarHoliday}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-300 inline-block" /> {t.dashboard.calendarMissedStatus}</span>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {t.dashboard.weekDays.map((d) => (
          <div key={d} className="text-xs font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map((day) => {
          const status = getStatus(day);
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const todayDay = isToday(new Date(year, month - 1, day));
          const future = isFuture(new Date(year, month - 1, day)) && !todayDay;
          const pastMissed = !todayDay && !future && status === "none";
          const selected = editDate === dateStr;

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
                status === "both" && "bg-green-500 text-white shadow-sm",
                status === "partial" && "bg-green-200 text-green-800 dark:bg-green-800/50 dark:text-green-200",
                status === "holiday" && "bg-orange-200 text-orange-700 dark:bg-orange-800/40 dark:text-orange-300",
                pastMissed && "bg-red-100 text-red-500 dark:bg-red-950/50 dark:text-red-400",
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
  const { t } = useLanguage();
  const { data: todayRes } = useGetTodayEntry({
    query: { queryKey: getGetTodayEntryQueryKey() },
  });
  const upsert = useUpsertEntry();
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const now = new Date();
  const year = now.getFullYear();
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
          lunchTaken: type === "lunch" ? true : (entry?.lunchTaken ?? false),
          dinnerTaken: type === "dinner" ? true : (entry?.dinnerTaken ?? false),
          lunchPresent: type === "lunch" ? true : (entry?.lunchPresent ?? false),
          dinnerPresent: type === "dinner" ? true : (entry?.dinnerPresent ?? false),
        },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: getGetTodayEntryQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey({ year, month }) }),
        qc.invalidateQueries({ queryKey: getListEntriesQueryKey({ year, month }) }),
      ]);
      toast({ title: type === "lunch" ? t.dashboard.lunchMarked : t.dashboard.dinnerMarked });
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
                ☀️ {t.common.lunch}
                <span className="text-xs text-green-600 font-bold">घेतले</span>
              </button>
            )}
            {!entry?.dinnerTaken && (
              <button
                onClick={() => quickMark("dinner")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border shadow-lg text-sm font-semibold text-foreground hover:bg-muted transition-all active:scale-95"
              >
                🌙 {t.common.dinner}
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
  const { t } = useLanguage();
  const { user } = useAuth();
  const now = new Date();
  const year = now.getFullYear();
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
  const yesterday = format(subDays(now, 1), "yyyy-MM-dd");
  const yesterdayData = Array.isArray(entries) ? (entries as EntryLike[]).find((e) => e.date === yesterday) : undefined;
  const [sameLoading, setSameLoading] = useState(false);

  const sameAsYesterday = async () => {
    if (!yesterdayData) return;
    setSameLoading(true);
    try {
      const today = format(now, "yyyy-MM-dd");
      await upsert.mutateAsync({
        data: {
          date: today,
          lunchTaken: yesterdayData.lunchTaken,
          dinnerTaken: yesterdayData.dinnerTaken,
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
      if (yesterdayData.lunchTaken) dismissReminder("lunch");
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
          {t.dashboard.greeting}
          {name ? `, ${name}` : ""}!
        </p>
        <h1 className="text-2xl font-black text-foreground">{t.dashboard.subtitle}</h1>
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
        <LeaveVacationCard />
        <InteractiveCalendar />
      </div>

      <FAB />
    </Layout>
  );
}
