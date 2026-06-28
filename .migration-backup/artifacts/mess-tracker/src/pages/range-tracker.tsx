import { useState, useMemo } from "react";
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isToday,
  isBefore,
  parseISO,
  addMonths,
} from "date-fns";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  getListEntriesQueryOptions,
  getListEntriesQueryKey,
  useUpsertEntry,
  useGetSettings,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Coffee, Moon, CalendarRange, Utensils, IndianRupee, CalendarX, X, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { mr } from "@/lib/i18n";

type Entry = {
  id: number;
  date: string;
  lunchTaken: boolean;
  dinnerTaken: boolean;
  lunchPresent: boolean;
  dinnerPresent: boolean;
  notes?: string | null;
};

function getMonthsInRange(startDate: Date, endDate: Date) {
  const months: { year: number; month: number }[] = [];
  let cursor = startOfMonth(startDate);
  while (cursor <= endDate) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor = addMonths(cursor, 1);
  }
  return months.slice(0, 6);
}

function useRangeEntries(startDate: Date, endDate: Date) {
  const months = useMemo(
    () => getMonthsInRange(startDate, endDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startDate.toISOString().slice(0, 7), endDate.toISOString().slice(0, 7)],
  );

  const results = useQueries({
    queries: months.map(({ year, month }) =>
      getListEntriesQueryOptions({ year, month }),
    ),
  });

  const entryMap = useMemo(() => {
    const map = new Map<string, Entry>();
    results.forEach((r) => {
      if (Array.isArray(r.data)) {
        (r.data as Entry[]).forEach((e) => map.set(e.date, e));
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.map((r) => r.dataUpdatedAt).join(",")]);

  return {
    entryMap,
    isLoading: results.some((r) => r.isLoading),
  };
}

// ─── DayRow ───────────────────────────────────────────────────────────────────

function DayRow({
  date,
  entry,
  costPerMeal,
}: {
  date: Date;
  entry: Entry | undefined;
  costPerMeal: number;
}) {
  const dateStr = format(date, "yyyy-MM-dd");
  const qc = useQueryClient();
  const upsert = useUpsertEntry();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const todayFlag = isToday(date);

  const [localEntry, setLocalEntry] = useState<Entry | undefined>(entry);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(entry?.notes ?? "");
  const [savingNote, setSavingNote] = useState(false);

  const effectiveEntry = localEntry ?? entry;

  const toggle = async (field: "lunchTaken" | "dinnerTaken") => {
    const base: Entry = effectiveEntry ?? {
      id: 0,
      date: dateStr,
      lunchTaken: false,
      dinnerTaken: false,
      lunchPresent: false,
      dinnerPresent: false,
    };
    const updated: Entry = {
      ...base,
      [field]: !base[field],
      lunchPresent: field === "lunchTaken" ? !base.lunchTaken : base.lunchPresent,
      dinnerPresent: field === "dinnerTaken" ? !base.dinnerTaken : base.dinnerPresent,
    };
    setLocalEntry(updated);

    await upsert.mutateAsync({
      data: {
        date: dateStr,
        lunchTaken: updated.lunchTaken,
        dinnerTaken: updated.dinnerTaken,
        lunchPresent: updated.lunchPresent,
        dinnerPresent: updated.dinnerPresent,
        notes: updated.notes ?? undefined,
      },
    });

    await qc.invalidateQueries({ queryKey: getListEntriesQueryKey({ year, month }) });
  };

  const saveNote = async () => {
    setSavingNote(true);
    const base: Entry = effectiveEntry ?? {
      id: 0,
      date: dateStr,
      lunchTaken: false,
      dinnerTaken: false,
      lunchPresent: false,
      dinnerPresent: false,
    };
    try {
      await upsert.mutateAsync({
        data: {
          date: dateStr,
          lunchTaken: base.lunchTaken,
          dinnerTaken: base.dinnerTaken,
          lunchPresent: base.lunchPresent,
          dinnerPresent: base.dinnerPresent,
          notes: noteText || undefined,
        },
      });
      setLocalEntry({ ...base, notes: noteText });
      await qc.invalidateQueries({ queryKey: getListEntriesQueryKey({ year, month }) });
      toast({ title: mr.range.noteSaved });
      setShowNote(false);
    } finally {
      setSavingNote(false);
    }
  };

  const lunchTaken = effectiveEntry?.lunchTaken ?? false;
  const dinnerTaken = effectiveEntry?.dinnerTaken ?? false;
  const meals = (lunchTaken ? 1 : 0) + (dinnerTaken ? 1 : 0);

  return (
    <div
      className={cn(
        "border-b border-border last:border-0 py-3",
        todayFlag && "bg-primary/5 rounded-lg px-2",
      )}
    >
      <div className="flex items-center gap-2">
        {/* तारीख */}
        <div className="w-28 shrink-0">
          <p className={cn("text-sm font-medium", todayFlag ? "text-primary font-semibold" : "text-foreground")}>
            {format(date, "dd MMM")}
            {todayFlag && (
              <span className="ml-1 text-[10px] bg-primary text-white rounded-full px-1.5 py-0.5">
                {mr.common.today}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{format(date, "EEEE")}</p>
        </div>

        {/* दुपारचे जेवण टॉगल */}
        <div className="flex items-center gap-1 flex-1">
          <Coffee className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <button
            onClick={() => toggle("lunchTaken")}
            disabled={upsert.isPending}
            className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full border transition-all",
              lunchTaken
                ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800"
                : "text-muted-foreground border-border hover:border-orange-300 hover:text-orange-600",
            )}
          >
            {lunchTaken ? mr.range.takenLabel : mr.range.notTakenLabel}
          </button>
        </div>

        {/* रात्रीचे जेवण टॉगल */}
        <div className="flex items-center gap-1 flex-1">
          <Moon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <button
            onClick={() => toggle("dinnerTaken")}
            disabled={upsert.isPending}
            className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full border transition-all",
              dinnerTaken
                ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800"
                : "text-muted-foreground border-border hover:border-orange-300 hover:text-orange-600",
            )}
          >
            {dinnerTaken ? mr.range.takenLabel : mr.range.notTakenLabel}
          </button>
        </div>

        {/* खर्च + नोंद */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block w-12 text-right">
            {meals > 0 ? `₹${meals * costPerMeal}` : mr.common.noData}
          </span>
          <button
            onClick={() => setShowNote((v) => !v)}
            title={mr.range.addNote}
            className={cn(
              "p-1 rounded transition-colors",
              showNote || effectiveEntry?.notes
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {showNote ? <X className="h-3.5 w-3.5" /> : <StickyNote className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {effectiveEntry?.notes && !showNote && (
        <p className="text-xs text-muted-foreground italic mt-1 ml-28 truncate">
          "{effectiveEntry.notes}"
        </p>
      )}

      {showNote && (
        <div className="flex gap-2 mt-2 ml-28">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={mr.common.addNote + "..."}
            rows={2}
            className="flex-1 text-xs border border-border rounded-lg p-2 resize-none bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <Button
            size="sm"
            onClick={saveNote}
            disabled={savingNote}
            className="shrink-0 h-auto py-1.5"
          >
            {savingNote ? "…" : mr.common.save}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Range Tracker Page ───────────────────────────────────────────────────────

export default function RangeTrackerPage() {
  const now = new Date();

  const [startStr, setStartStr] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [endStr, setEndStr] = useState(format(now, "yyyy-MM-dd"));

  const startDate = useMemo(() => parseISO(startStr), [startStr]);
  const endDate = useMemo(() => parseISO(endStr), [endStr]);

  const dateError = isBefore(endDate, startDate)
    ? mr.range.dateError
    : null;

  const validRange = !dateError;
  const days = useMemo(
    () => validRange ? eachDayOfInterval({ start: startDate, end: endDate }) : [],
    [startDate, endDate, validRange],
  );

  const { entryMap, isLoading } = useRangeEntries(startDate, endDate);

  const { data: settings } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });
  const costPerMeal = settings?.mealCostPerMeal ?? 50;

  const stats = useMemo(() => {
    let mealsTaken = 0;
    let mealsSkipped = 0;
    days.forEach((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      const entry = entryMap.get(dateStr);
      const lunch = entry?.lunchTaken ? 1 : 0;
      const dinner = entry?.dinnerTaken ? 1 : 0;
      mealsTaken += lunch + dinner;
      mealsSkipped += (1 - lunch) + (1 - dinner);
    });
    return { mealsTaken, mealsSkipped, totalCost: mealsTaken * costPerMeal, days: days.length };
  }, [days, entryMap, costPerMeal]);

  const resetToCurrentMonth = () => {
    setStartStr(format(startOfMonth(now), "yyyy-MM-dd"));
    setEndStr(format(now, "yyyy-MM-dd"));
  };

  return (
    <Layout>
      {/* शीर्षक */}
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarRange className="h-6 w-6 text-primary" />
          {mr.range.title}
        </h1>
        <p className="text-muted-foreground text-sm">{mr.range.subtitle}</p>
      </div>

      {/* तारीख कालावधी निवडक */}
      <Card className="p-5 mb-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {mr.range.startDate}
            </label>
            <input
              type="date"
              value={startStr}
              max={format(now, "yyyy-MM-dd")}
              onChange={(e) => setStartStr(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {mr.range.endDate}
            </label>
            <input
              type="date"
              value={endStr}
              max={format(now, "yyyy-MM-dd")}
              onChange={(e) => setEndStr(e.target.value)}
              className={cn(
                "w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30",
                dateError ? "border-red-400" : "border-border",
              )}
            />
          </div>
        </div>

        {dateError && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <X className="h-3 w-3" /> {dateError}
          </p>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {validRange
              ? days.length === 1 ? mr.range.daySelected : mr.range.daysSelected.replace("{n}", String(days.length))
              : mr.common.noData}
          </span>
          <button onClick={resetToCurrentMonth} className="text-xs text-primary hover:underline ml-auto">
            {mr.range.resetMonth}
          </button>
        </div>
      </Card>

      {/* सारांश कार्डे */}
      {validRange && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: mr.range.totalDays, value: stats.days, icon: CalendarRange, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20" },
            { label: mr.range.mealsTaken, value: stats.mealsTaken, icon: Utensils, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
            { label: mr.range.mealsSkipped, value: stats.mealsSkipped, icon: CalendarX, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20" },
            { label: mr.range.totalCost, value: `₹${stats.totalCost}`, icon: IndianRupee, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className={cn("p-4 space-y-2", bg)}>
              <Icon className={cn("h-4 w-4", color)} />
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* दैनंदिन नोंद तक्ता */}
      {validRange && (
        <Card className="p-4">
          <div className="flex items-center gap-2 pb-2 mb-1 border-b border-border">
            <div className="w-28 shrink-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{mr.range.tableDate}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Coffee className="h-3 w-3" /> {mr.common.lunch}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Moon className="h-3 w-3" /> {mr.common.dinner}
              </p>
            </div>
            <div className="shrink-0 w-20 text-right">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{mr.range.tableCost}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3 pt-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
            </div>
          ) : days.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{mr.range.selectRange}</p>
          ) : (
            <div>
              {[...days].reverse().map((date) => (
                <DayRow
                  key={format(date, "yyyy-MM-dd")}
                  date={date}
                  entry={entryMap.get(format(date, "yyyy-MM-dd"))}
                  costPerMeal={costPerMeal}
                />
              ))}
            </div>
          )}
        </Card>
      )}
    </Layout>
  );
}
