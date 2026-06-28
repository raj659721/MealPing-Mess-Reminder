import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/components/theme-provider";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sun, Moon, LayoutDashboard, History, Settings,
  LogOut, Utensils, BarChart2, CalendarRange, ShieldCheck, User,
} from "lucide-react";
import { mr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/use-user-role";

const USER_NAV = [
  { to: "/dashboard", label: mr.nav.dashboard, icon: LayoutDashboard },
  { to: "/analytics", label: mr.nav.analytics,  icon: BarChart2 },
  { to: "/range",     label: mr.nav.range,       icon: CalendarRange },
  { to: "/history",   label: mr.nav.history,     icon: History },
  { to: "/settings",  label: mr.nav.settings,    icon: Settings },
];

function RoleBadge({ role }: { role: "admin" | "user" | null }) {
  if (!role) return null;
  return role === "admin" ? (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/30 text-orange-600 uppercase">
      Admin
    </span>
  ) : (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/30 text-blue-600 uppercase">
      User
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
      <span className="text-xs font-semibold text-primary">{initials || "U"}</span>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const { role, profile, isAdmin } = useUserRole();

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const displayName =
    profile?.firstName
    || profile?.email?.split("@")[0]
    || mr.common.account;

  const NAV = isAdmin
    ? [...USER_NAV, { to: "/admin", label: "Admin", icon: ShieldCheck }]
    : USER_NAV;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Top header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4" style={{ height: "3.75rem" }}>

          {/* Logo */}
          <Link to={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Utensils className="h-4 w-4 text-primary" />
            </div>
            <span className="hidden sm:inline text-sm font-bold tracking-tight text-foreground">
              Mess Manager
            </span>
            <span className="hidden sm:flex">
              <RoleBadge role={role} />
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}>
                <button className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150",
                  location === to
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="h-8 w-8 rounded-xl border border-border bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>

            {profile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl pl-1 pr-2 py-1 border border-border hover:bg-muted/50 transition-all">
                    <Avatar name={displayName} />
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-xs font-medium text-foreground max-w-[100px] truncate leading-tight">
                        {displayName}
                      </span>
                      <RoleBadge role={role} />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
                  <div className="px-2 py-2.5 mb-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Avatar name={displayName} />
                      <div>
                        <p className="text-xs font-semibold text-foreground">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                          {profile.email}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium",
                      isAdmin
                        ? "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300"
                        : "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300"
                    )}>
                      {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {isAdmin ? "Administrator" : "User"}
                    </div>
                  </div>

                  <DropdownMenuSeparator className="my-1" />

                  {NAV.map(({ to, label, icon: Icon }) => (
                    <Link key={to} to={to}>
                      <DropdownMenuItem className="cursor-pointer gap-2 rounded-xl text-xs px-2 py-2">
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </DropdownMenuItem>
                    </Link>
                  ))}

                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="cursor-pointer gap-2 rounded-xl text-xs px-2 py-2 text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {mr.nav.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* ── Page content ──────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 sm:pb-8">
        {children}
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-md border-t border-border">
        <div className="flex px-1 py-1.5">
          {NAV.slice(0, 5).map(({ to, label, icon: Icon }) => {
            const active = location === to;
            return (
              <Link key={to} to={to} className="flex-1">
                <button className="w-full flex flex-col items-center gap-0.5 py-1.5 px-1">
                  <div className={cn("flex items-center justify-center h-7 w-7 rounded-xl transition-all", active ? "bg-primary/15" : "")}>
                    <Icon className={cn("h-4 w-4 transition-colors", active ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <span className={cn("text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                    {label}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
