import { useMemo } from "react";
import { format, getDaysInMonth } from "date-fns";
import {
  useGetMonthlySummary,
  useListEntries,
  getGetMonthlySummaryQueryKey,
  getListEntriesQueryKey,
} from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Utensils, IndianRupee,
  CalendarX, Percent, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mr } from "@/lib/i18n";

type Entry = {
  id: number;
  date: string;
  lunchTaken: boolean;
  dinnerTaken: boolean;
  lunchPresent: boolean;
  dinnerPresent: boolean;
};

function getWeeklyData(entries: Entry[], year: number, month: number) {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const entryMap = new Map(entries.map((e) => [e.date, e]));
  const weeks = [
    { label: mr.analytics.week[0], start: 1, end: 7 },
    { label: mr.analytics.week[1], start: 8, end: 14 },
    { label: mr.analytics.week[2], start: 15, end: 21 },
    { label: mr.analytics.week[3], start: 22, end: 28 },
    { label: mr.analytics.week[4], start: 29, end: daysInMonth },
  ].filter((w) => w.start <= daysInMonth);

  return weeks.map(({ label, start, end }) => {
    let lunch = 0;
    let dinner = 0;
    for (let d = start; d <= Math.min(end, daysInMonth); d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const entry = entryMap.get(dateStr);
      if (entry?.lunchTaken) lunch++;
      if (entry?.dinnerTaken) dinner++;
    }
    return { label, [mr.common.lunch]: lunch, [mr.common.dinner]: dinner };
  });
}

function getDailyData(entries: Entry[], year: number, month: number) {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const entryMap = new Map(entries.map((e) => [e.date, e]));
  const data = [];
  const today = new Date();
  const todayDay = today.getDate();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const limit = isCurrentMonth ? todayDay : daysInMonth;

  for (let d = 1; d <= limit; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const entry = entryMap.get(dateStr);
    data.push({
      day: d,
      [mr.analytics.mealsLabel]: entry
        ? (entry.lunchTaken ? 1 : 0) + (entry.dinnerTaken ? 1 : 0)
        : 0,
    });
  }
  return data;
}

const STAT_CONFIGS = [
  { key: "mealsTaken",  color: "bg-green-50 dark:bg-green-950/30",  iconColor: "text-green-600",  valColor: "text-green-700 dark:text-green-300",  icon: Utensils  },
  { key: "skipped",    color: "bg-red-50 dark:bg-red-950/30",    iconColor: "text-red-500",    valColor: "text-red-600 dark:text-red-300",    icon: CalendarX },
  { key: "attendance", color: "bg-blue-50 dark:bg-blue-950/30",   iconColor: "text-blue-600",   valColor: "text-blue-700 dark:text-blue-300",   icon: Percent   },
  { key: "totalBill",  color: "bg-orange-50 dark:bg-orange-950/30", iconColor: "text-orange-600", valColor: "text-orange-700 dark:text-orange-300", icon: IndianRupee},
] as const;

export default function AnalyticsPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayDay = now.getDate();

  const { data: summary, isLoading: summaryLoading } = useGetMonthlySummary(
    { year, month },
    { query: { queryKey: getGetMonthlySummaryQueryKey({ year, month }) } },
  );

  const { data: rawEntries, isLoading: entriesLoading } = useListEntries(
    { year, month },
    { query: { queryKey: getListEntriesQueryKey({ year, month }) } },
  );

  const entries = (rawEntries ?? []) as Entry[];

  const weeklyData = useMemo(() => getWeeklyData(entries, year, month), [entries, year, month]);
  const dailyData  = useMemo(() => getDailyData(entries, year, month),  [entries, year, month]);

  const pastDays       = todayDay;
  const possibleMeals  = pastDays * 2;
  const mealsTaken     = summary?.totalMealsTaken ?? 0;
  const mealsSkipped   = possibleMeals - mealsTaken;
  const avgMealsPerDay = mealsTaken > 0 ? (mealsTaken / pastDays).toFixed(1) : "0";
  const avgCostPerDay  = summary ? ((summary.totalMealsTaken * summary.mealCostPerMeal) / pastDays).toFixed(0) : "0";
  const lunchRate      = summary ? Math.round((summary.totalLunchTaken / pastDays) * 100) : 0;
  const dinnerRate     = summary ? Math.round((summary.totalDinnerTaken / pastDays) * 100) : 0;

  const statValues = [mealsTaken, mealsSkipped, `${summary?.attendanceRate ?? 0}%`, `₹${summary?.totalCost?.toFixed(0) ?? 0}`];
  const statLabels = [mr.analytics.mealsTaken, mr.analytics.mealsSkipped, mr.common.attendance, mr.analytics.totalBill];

  const insights = summary ? [
    {
      icon: Utensils, color: "text-green-600",
      text: `या महिन्यात ${mealsTaken} जेवणे घेतली — ${mealsSkipped > 0 ? `${mealsSkipped} सोडली` : "एकही सोडले नाही"}.`,
    },
    {
      icon: IndianRupee, color: "text-orange-600",
      text: `दैनंदिन सरासरी मेस खर्च ₹${avgCostPerDay}/दिवस आहे.`,
    },
    {
      icon: TrendingUp, color: "text-blue-600",
      text: `दुपारचे जेवण: ${lunchRate}% · रात्रीचे जेवण: ${dinnerRate}% दिवसांचे.`,
    },
    {
      icon: mealsSkipped > pastDays ? TrendingDown : Lightbulb,
      color: mealsSkipped > pastDays ? "text-red-600" : "text-purple-600",
      text: mealsSkipped > pastDays
        ? `खूप जेवणे चुकत आहेत — सर्व घेतल्यास ₹${(mealsSkipped * (summary?.mealCostPerMeal ?? 50)).toFixed(0)} जास्त.`
        : `उत्तम सातत्य! दररोज सरासरी ${avgMealsPerDay} जेवणे.`,
    },
  ] : [];

  const isLoading = summaryLoading || entriesLoading;
  const tooltipStyle = {
    background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
    borderRadius: "14px", fontSize: "12px",
  };

  return (
    <Layout>
      <div className="mb-5">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">विश्लेषण</p>
        <h1 className="text-2xl font-black text-foreground">{mr.analytics.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {format(new Date(year, month - 1), "MMMM yyyy")} — {mr.analytics.subtitle}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {isLoading
          ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          : STAT_CONFIGS.map((cfg, i) => {
              const Icon = cfg.icon;
              return (
                <div key={cfg.key} className={cn("rounded-2xl p-4 shadow-sm space-y-2", cfg.color)}>
                  <Icon className={cn("h-4 w-4", cfg.iconColor)} />
                  <p className={cn("text-2xl font-black", cfg.valColor)}>{statValues[i]}</p>
                  <p className="text-xs text-muted-foreground font-medium">{statLabels[i]}</p>
                </div>
              );
            })}
      </div>

      {/* Weekly bar chart */}
      <Card className="p-5 mb-4 rounded-3xl border-0 shadow-sm">
        <p className="text-sm font-bold text-foreground mb-4">{mr.analytics.weeklyBreakdown}</p>
        {isLoading ? <Skeleton className="h-44 rounded-2xl" /> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey={mr.common.lunch}  fill="hsl(142 71% 35%)"      radius={[6, 6, 0, 0]} />
              <Bar dataKey={mr.common.dinner} fill="hsl(142 71% 35% / 0.4)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Daily bar chart */}
      <Card className="p-5 mb-4 rounded-3xl border-0 shadow-sm">
        <p className="text-sm font-bold text-foreground mb-4">{mr.analytics.dailyMeals}</p>
        {isLoading ? <Skeleton className="h-44 rounded-2xl" /> : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} domain={[0, 2]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} जेवण${v !== 1 ? "े" : ""}`, ""]} />
              <Bar dataKey={mr.analytics.mealsLabel} radius={[4, 4, 0, 0]} fill="hsl(142 71% 35%)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Smart Insights */}
      <Card className="p-5 rounded-3xl border-0 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-xl bg-yellow-100 dark:bg-yellow-950/30 flex items-center justify-center">
            <Lightbulb className="h-3.5 w-3.5 text-yellow-500" />
          </div>
          <p className="text-sm font-bold text-foreground">{mr.analytics.smartInsights}</p>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-2.5">
            {insights.map(({ icon: Icon, color, text }, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl bg-muted/40">
                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", color)} />
                <p className="text-sm text-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Layout>
  );
}
