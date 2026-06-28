import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/components/theme-provider";
import { useLanguage, Language } from "@/contexts/language-context";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sun, Moon, LayoutDashboard, History, Settings,
  LogOut, Utensils, BarChart2, CalendarRange, ShieldCheck, User, Globe, Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/use-user-role";

function RoleBadge({ role }: { role: "superadmin" | "admin" | "user" | null }) {
  if (!role) return null;
  if (role === "superadmin") {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/30 text-purple-600 uppercase flex items-center gap-1">
        <Crown className="h-3 w-3" /> Super Admin
      </span>
    );
  }
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
  const { t, language, setLanguage } = useLanguage();
  const [location] = useLocation();
  const { role, profile, isAdmin, isSuperAdmin } = useUserRole();

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const displayName =
    profile?.firstName
    || profile?.email?.split("@")[0]
    || t.common.account;

  const USER_NAV = [
    { to: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
    { to: "/analytics", label: t.nav.analytics, icon: BarChart2 },
    { to: "/range", label: t.nav.range, icon: CalendarRange },
    { to: "/history", label: t.nav.history, icon: History },
    { to: "/settings", label: t.nav.settings, icon: Settings },
  ];

  let NAV = USER_NAV;
  if (isSuperAdmin) {
    NAV = [
      { to: "/super-admin", label: "Super Admin", icon: Crown },
      { to: "/admin", label: "Admin", icon: ShieldCheck },
    ];
  } else if (isAdmin) {
    NAV = [
      { to: "/admin", label: "Admin", icon: ShieldCheck },
    ];
  }

  const languages = [
    { code: "en", name: "English" },
    { code: "mr", name: "मराठी" },
    { code: "hi", name: "हिंदी" },
    { code: "gu", name: "ગુજરાતી" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Top header ─────────────────────────────────────────── */}
      <header className="hidden sm:block sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4" style={{ height: "3.75rem" }}>

          {/* Logo */}
          <Link to={isSuperAdmin ? "/super-admin" : isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-2.5">
            <img src="/logo.png" alt="MealPing Logo" className="h-8 w-8 rounded-lg shadow-sm" />
            <span className="hidden sm:inline text-sm font-bold tracking-tight text-foreground">
              MealPing
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
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/60 transition-all">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase">{language}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[120px] rounded-2xl p-1">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code as Language)}
                    className={cn(
                      "cursor-pointer rounded-xl text-xs px-3 py-2",
                      language === lang.code && "bg-primary/10 text-primary font-bold"
                    )}
                  >
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
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
                      isSuperAdmin
                        ? "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300"
                        : isAdmin
                          ? "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300"
                          : "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300"
                    )}>
                      {isSuperAdmin ? <Crown className="h-3 w-3" /> : isAdmin ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {isSuperAdmin ? "Super Admin" : isAdmin ? "Administrator" : "User"}
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
                    {t.nav.signOut}
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

      {/* ── Mobile bottom nav (Premium Morphing Dock) ───────────────────────── */}
      <div className="sm:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-full px-4 pb-[env(safe-area-inset-bottom)] pointer-events-none">
        <nav className="mx-auto max-w-[340px] bg-white/90 dark:bg-[#111111]/90 backdrop-blur-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[2.5rem] p-1.5 flex justify-between items-center border border-neutral-200/50 dark:border-white/10 pointer-events-auto h-[72px]">
          {NAV.slice(0, 5).map(({ to, label, icon: Icon }) => {
            const active = location === to;
            return (
              <Link key={to} to={to} className="relative z-10 flex-1 h-full">
                <button className="flex flex-col items-center justify-center outline-none w-full h-full relative group">
                  {/* Sliding Active Background */}
                  {active && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-1 bg-primary/15 dark:bg-primary/20 rounded-[2rem]"
                      transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                    />
                  )}

                  {/* Icon */}
                  <Icon
                    className={cn(
                      "h-6 w-6 relative z-10 transition-colors duration-300",
                      active ? "text-primary" : "text-neutral-400 group-hover:text-neutral-600 dark:text-neutral-500"
                    )}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </button>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
