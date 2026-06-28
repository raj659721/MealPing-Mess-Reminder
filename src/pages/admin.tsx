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
import { useGetAllActiveLeaves } from "@/lib/api";
import {
  Users, Utensils, IndianRupee, CalendarDays,
  ChevronLeft, ChevronRight, ShieldAlert, RefreshCw,
  Coffee, Moon, Download, Check, X, Loader2, Lock, Plane,
  MapPin, Phone
} from "lucide-react";
import { getUserLocations, getUserContacts } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserTrackingModal } from "@/components/user-tracking-modal";

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

// ─── Removed Overview Cards ───

// ─── Removed Daily Report ───

// ─── Active Leaves Today ──────────────────────────────────────────────────────
function ActiveLeavesSection() {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { data: leaves = [], isLoading } = useGetAllActiveLeaves(todayStr);

  if (isLoading) return <Skeleton className="h-20 w-full rounded-2xl mb-6" />;
  
  if (leaves.length === 0) {
    return (
      <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl text-primary">
            <Plane className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">No users on leave today</p>
            <p className="text-xs text-muted-foreground">Everyone is expected for meals.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-2xl p-4 mb-6 relative overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none">
        <Plane className="w-24 h-24 text-blue-500" />
      </div>
      
      <div className="flex items-center gap-2 mb-3 relative z-10">
        <Plane className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100">Users on Leave Today ({leaves.length})</h3>
      </div>
      
      <div className="space-y-2 relative z-10">
        {leaves.map((l: any) => {
          const email = l.users?.email || "Unknown User";
          const name = l.users?.raw_user_meta_data?.firstName || email.split("@")[0];
          return (
            <div key={l.id} className="bg-background border border-border rounded-xl p-3 flex justify-between items-center shadow-sm">
              <div>
                <p className="text-sm font-bold text-foreground">{name}</p>
                {l.reason && <p className="text-xs text-muted-foreground mt-0.5">Reason: {l.reason}</p>}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-2 py-1 rounded-md">
                  On Leave
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
                <th className="text-right py-2 px-2">Track</th>
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
                    <td className="py-2.5 px-2 text-right">
                      <UserTrackingModal userId={u.userId} userName={shortId(u.userId)} />
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

      {/* Removed Overview & Daily Report */}

      {/* Users on leave */}
      <ActiveLeavesSection />

      {/* Users table */}
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">वापरकर्ता यादी</p>
        <UsersTable />
      </div>
    </Layout>
  );
}
