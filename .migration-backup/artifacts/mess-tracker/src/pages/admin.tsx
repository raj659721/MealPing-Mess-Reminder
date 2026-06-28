import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import Layout from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import {
  Users, Utensils, IndianRupee, CalendarDays,
  ChevronLeft, ChevronRight, ShieldAlert, RefreshCw,
  Coffee, Moon, Download, Check, X, Loader2, Lock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type AdminOverview = {
  totalUsers: number;
  todayLunch: number;
  todayDinner: number;
  todayActiveUsers: number;
  monthMeals: number;
  monthRevenue: number;
  year: number;
  month: number;
};

type AdminEntry = {
  id: number;
  userId: string;
  date: string;
  lunchTaken: boolean;
  dinnerTaken: boolean;
  lunchPresent: boolean;
  dinnerPresent: boolean;
  notes?: string | null;
};

type AdminUserStat = {
  userId: string;
  totalLunch: number;
  totalDinner: number;
  totalMeals: number;
  daysWithEntry: number;
  costPerMeal: number;
  totalCost: number;
  attendanceRate: number;
};

// ─── API helpers ──────────────────────────────────────────────────────────────
async function adminFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const { authFetch } = await import("@/lib/api-fetch");
  const res = await authFetch(`/api/admin${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

function shortId(id: string) { return id.slice(0, 12) + "…"; }

// ─── Overview Cards ───────────────────────────────────────────────────────────
function OverviewCards({ data }: { data: AdminOverview }) {
  const cards = [
    { label: "एकूण वापरकर्ते", value: data.totalUsers, icon: Users, color: "bg-blue-50 dark:bg-blue-950/30 text-blue-600" },
    { label: "आज लंच/डिनर", value: `${data.todayLunch} / ${data.todayDinner}`, icon: Utensils, color: "bg-green-50 dark:bg-green-950/30 text-green-600" },
    { label: "या महिन्याचे जेवण", value: data.monthMeals, icon: CalendarDays, color: "bg-purple-50 dark:bg-purple-950/30 text-purple-600" },
    { label: "या महिन्याचे उत्पन्न", value: `₹${data.monthRevenue.toFixed(0)}`, icon: IndianRupee, color: "bg-orange-50 dark:bg-orange-950/30 text-orange-600" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className={cn("rounded-2xl p-4 shadow-sm flex flex-col gap-2", color)}>
          <Icon className="h-4 w-4" />
          <p className="text-2xl font-black text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Daily Report ─────────────────────────────────────────────────────────────
function DailyReport() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const qc = useQueryClient();

  const { data: entries = [], isLoading } = useQuery<AdminEntry[]>({
    queryKey: ["admin-daily", date],
    queryFn: () => adminFetch(`/daily?date=${date}`),
  });

  const markMutation = useMutation({
    mutationFn: (body: Partial<AdminEntry>) =>
      adminFetch<AdminEntry>("/entries", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-daily", date] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({ title: "जेवण अपडेट केले" });
    },
    onError: (e) => toast({ title: "अयशस्वी", description: (e as Error).message, variant: "destructive" }),
  });

  const prevDay = () => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split("T")[0]);
  };
  const nextDay = () => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split("T")[0]);
  };

  const exportCSV = () => {
    if (!entries.length) return;
    const header = "User ID,Lunch,Dinner,Notes";
    const rows = entries.map((e) => `${e.userId},${e.lunchTaken},${e.dinnerTaken},"${e.notes ?? ""}"`);
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `report-${date}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-5 rounded-3xl border-0 shadow-sm mb-4">
      {/* Date nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={prevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm font-bold bg-transparent border-0 focus:outline-none text-foreground"
          />
          <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={nextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
        दैनंदिन अहवाल — {entries.length} नोंदी
      </p>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 rounded-xl" />)}</div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">या तारखेला कोणत्याही नोंदी नाहीत.</p>
      ) : (
        <div className="space-y-1">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-2 py-1 text-xs text-muted-foreground font-semibold">
            <span>User ID</span>
            <span className="flex items-center gap-1"><Coffee className="h-3 w-3" /> लंच</span>
            <span className="flex items-center gap-1"><Moon className="h-3 w-3" /> डिनर</span>
            <span>खर्च</span>
            <span></span>
          </div>
          {entries.map((entry) => (
            <div key={entry.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center rounded-xl bg-muted/30 px-3 py-2.5">
              <span className="text-xs font-mono text-muted-foreground">{shortId(entry.userId)}</span>

              {/* Lunch toggle */}
              <button
                onClick={() => markMutation.mutate({ ...entry, lunchTaken: !entry.lunchTaken, lunchPresent: !entry.lunchPresent })}
                className={cn("h-6 w-6 rounded-lg flex items-center justify-center transition-all",
                  entry.lunchTaken ? "bg-green-500 text-white" : "bg-muted text-muted-foreground hover:bg-primary/10")}
              >
                {entry.lunchTaken ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </button>

              {/* Dinner toggle */}
              <button
                onClick={() => markMutation.mutate({ ...entry, dinnerTaken: !entry.dinnerTaken, dinnerPresent: !entry.dinnerPresent })}
                className={cn("h-6 w-6 rounded-lg flex items-center justify-center transition-all",
                  entry.dinnerTaken ? "bg-green-500 text-white" : "bg-muted text-muted-foreground hover:bg-primary/10")}
              >
                {entry.dinnerTaken ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </button>

              <span className="text-xs text-muted-foreground">
                ₹{((entry.lunchTaken ? 1 : 0) + (entry.dinnerTaken ? 1 : 0)) * 50}
              </span>

              <span></span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Users Table ──────────────────────────────────────────────────────────────
function UsersTable() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading } = useQuery<{ users: AdminUserStat[]; year: number; month: number }>({
    queryKey: ["admin-users", year, month],
    queryFn: () => adminFetch(`/users?year=${year}&month=${month}`),
  });

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  const exportCSV = () => {
    if (!data?.users.length) return;
    const header = "User ID,Lunch,Dinner,Total Meals,Days,Cost/Meal,Total Cost,Attendance%";
    const rows = data.users.map((u) =>
      `${u.userId},${u.totalLunch},${u.totalDinner},${u.totalMeals},${u.daysWithEntry},${u.costPerMeal},${u.totalCost},${u.attendanceRate}`
    );
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-5 rounded-3xl border-0 shadow-sm">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-bold text-foreground">
            {format(new Date(year, month - 1), "MMMM yyyy")}
          </p>
          <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
        वापरकर्ता आकडेवारी — {data?.users.length ?? 0} वापरकर्ते
      </p>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 rounded-xl" />)}</div>
      ) : !data?.users.length ? (
        <p className="text-sm text-muted-foreground py-6 text-center">या महिन्यात कोणतेही वापरकर्ते नाहीत.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground font-semibold">
                <th className="text-left py-2 px-2">User ID</th>
                <th className="text-right py-2 px-2">☀️</th>
                <th className="text-right py-2 px-2">🌙</th>
                <th className="text-right py-2 px-2">जेवणे</th>
                <th className="text-right py-2 px-2">खर्च</th>
                <th className="text-right py-2 px-2">उपस्थिती</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.users
                .sort((a, b) => b.totalMeals - a.totalMeals)
                .map((u) => (
                  <tr key={u.userId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-2 font-mono text-muted-foreground">{shortId(u.userId)}</td>
                    <td className="py-2.5 px-2 text-right text-green-600 font-semibold">{u.totalLunch}</td>
                    <td className="py-2.5 px-2 text-right text-blue-600 font-semibold">{u.totalDinner}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-foreground">{u.totalMeals}</td>
                    <td className="py-2.5 px-2 text-right text-orange-600 font-semibold">₹{u.totalCost}</td>
                    <td className="py-2.5 px-2 text-right">
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg font-semibold",
                        u.attendanceRate >= 70 ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300"
                          : u.attendanceRate >= 40 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300"
                          : "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-300"
                      )}>
                        {u.attendanceRate}%
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── Admin Page ───────────────────────────────────────────────────────────────
export default function AdminPage() {
  const qc = useQueryClient();
  const { isAdmin, isLoading: roleLoading, profile } = useUserRole();

  const { data: overview, isLoading, error } = useQuery<AdminOverview>({
    queryKey: ["admin-overview"],
    queryFn: () => adminFetch("/overview"),
    enabled: isAdmin,
    retry: false,
  });

  // Loading role
  if (roleLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Role तपासत आहे…</p>
        </div>
      </Layout>
    );
  }

  // Not admin — show access denied with helpful setup instructions
  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
          <div className="h-16 w-16 rounded-3xl bg-destructive/10 flex items-center justify-center">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">Access Denied</h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs">
              हे पेज फक्त Admin साठी आहे. तुमच्याकडे Admin अधिकार नाहीत.
            </p>
          </div>

          {/* Setup instructions */}
          <div className="bg-muted/50 border border-border rounded-2xl p-4 text-left max-w-sm w-full space-y-3">
            <p className="text-xs font-bold text-foreground uppercase tracking-widest">Admin access कसे मिळवायचे?</p>
            <ol className="text-xs text-muted-foreground space-y-2 list-decimal pl-4">
              <li>Replit च्या left sidebar मध्ये <span className="font-bold text-foreground">🔒 Secrets</span> उघडा.</li>
              <li>
                नवीन secret जोडा:<br />
                Key: <code className="bg-background border border-border rounded px-1 font-mono">ADMIN_EMAILS</code><br />
                Value: <code className="bg-background border border-border rounded px-1 font-mono break-all">{profile?.email || "तुमचा email"}</code>
              </li>
              <li>API Server restart करा.</li>
            </ol>
            {profile?.email && (
              <div className="bg-background border border-border rounded-xl px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">तुमचा Email</p>
                <p className="text-xs font-mono font-semibold text-foreground break-all mt-0.5">{profile.email}</p>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-lg bg-orange-100 dark:bg-orange-950/30 text-orange-600 text-xs font-bold">ADMIN</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">सर्व वापरकर्त्यांचे जेवण व बिल व्यवस्थापन.</p>
        </div>
        <Button
          variant="ghost" size="icon" className="rounded-xl"
          onClick={() => { qc.invalidateQueries({ queryKey: ["admin-overview"] }); qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["admin-daily"] }); }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Overview */}
      {isLoading
        ? <div className="grid grid-cols-2 gap-3 mb-5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        : overview && <OverviewCards data={overview} />
      }

      {/* Daily report */}
      <div className="mb-1">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">दैनंदिन अहवाल</p>
        <DailyReport />
      </div>

      {/* Users table */}
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">वापरकर्ता यादी</p>
        <UsersTable />
      </div>
    </Layout>
  );
}
