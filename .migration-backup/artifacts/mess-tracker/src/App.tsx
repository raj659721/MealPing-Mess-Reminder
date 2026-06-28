import { useEffect, useRef, useState } from "react";
import {
  Switch, Route, Router as WouterRouter,
  Redirect, useLocation,
} from "wouter";
import {
  QueryClient, QueryClientProvider, useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import Chatbot from "@/components/chatbot";
import { Toaster } from "@/components/ui/toaster";
import { useNotifications } from "@/hooks/use-notifications";
import { useUserRole } from "@/hooks/use-user-role";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import HistoryPage from "@/pages/history";
import SettingsPage from "@/pages/settings";
import AnalyticsPage from "@/pages/analytics";
import RangeTrackerPage from "@/pages/range-tracker";
import AdminPage from "@/pages/admin";
import AdminLoginPage from "@/pages/admin-login";
import AdminLoginCallback from "@/pages/admin-login-callback";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function getOAuthRedirectUrl() {
  return window.location.origin + basePath + "/sign-in/callback";
}

// ─── Google Button ────────────────────────────────────────────────────────────
function GoogleButton({ label = "Google ने सुरू करा" }: { label?: string }) {
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getOAuthRedirectUrl() },
    });
  };

  return (
    <button
      type="button"
      onClick={handleGoogle}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-sm font-medium text-slate-700 disabled:opacity-60"
    >
      <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {loading ? "Redirecting…" : label}
    </button>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-xs text-slate-400 font-medium">किंवा</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

// ─── Sign In Page ─────────────────────────────────────────────────────────────
function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        setError("Email किंवा password चुकीचे आहे. नवीन खाते असल्यास आधी email confirm करा.");
      } else {
        setError(error.message);
      }
    } else {
      setLocation("/sign-in/callback");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-background to-background px-4 gap-6">
      <div className="text-center mb-2">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
          <span className="text-2xl">🍽️</span>
        </div>
        <h1 className="text-2xl font-black text-foreground">Mess Manager</h1>
        <p className="text-muted-foreground text-sm mt-1">तुमच्या खात्यात लॉग इन करा</p>
      </div>

      <div className="bg-white rounded-3xl w-[440px] max-w-full overflow-hidden shadow-lg border border-slate-100 p-8">
        <GoogleButton label="Google ने लॉग इन करा" />
        <OrDivider />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "लॉग इन होत आहे…" : "लॉग इन करा"}
          </Button>
        </form>
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            खाते नाही?{" "}
            <a href={`${basePath}/sign-up`} className="text-green-600 hover:text-green-700 font-medium">
              नोंदणी करा
            </a>
          </p>
          <a href={`${basePath}/forgot-password`} className="text-sm text-muted-foreground hover:text-foreground">
            Password विसरलात?
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Sign Up Page ─────────────────────────────────────────────────────────────
function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-background to-background px-4 gap-6">
        <div className="bg-white rounded-3xl w-[440px] max-w-full shadow-lg border border-slate-100 p-8 text-center space-y-3">
          <div className="text-4xl">✉️</div>
          <h2 className="text-lg font-bold">Email Confirm करा</h2>
          <p className="text-muted-foreground text-sm">
            <strong>{email}</strong> वर confirmation link पाठवला. Inbox तपासा आणि link वर click करा.
          </p>
          <a href={`${basePath}/sign-in`} className="text-green-600 hover:text-green-700 font-medium text-sm">
            लॉग इन करा
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-background to-background px-4 gap-6">
      <div className="text-center mb-2">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
          <span className="text-2xl">🍽️</span>
        </div>
        <h1 className="text-2xl font-black text-foreground">Mess Manager</h1>
        <p className="text-muted-foreground text-sm mt-1">नवीन खाते तयार करा</p>
      </div>

      <div className="bg-white rounded-3xl w-[440px] max-w-full overflow-hidden shadow-lg border border-slate-100 p-8">
        <GoogleButton label="Google ने नोंदणी करा" />
        <OrDivider />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
              minLength={6}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "खाते तयार होत आहे…" : "खाते तयार करा"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          आधीच खाते आहे?{" "}
          <a href={`${basePath}/sign-in`} className="text-green-600 hover:text-green-700 font-medium">
            लॉग इन करा
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Forgot Password Page ────────────────────────────────────────────────────
function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + basePath + "/reset-password",
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-background to-background px-4">
        <div className="bg-white rounded-3xl w-[440px] max-w-full shadow-lg border border-slate-100 p-8 text-center space-y-3">
          <div className="text-4xl">📧</div>
          <h2 className="text-lg font-bold">Email पाठवला!</h2>
          <p className="text-muted-foreground text-sm">
            <strong>{email}</strong> वर password reset link पाठवला आहे. Inbox तपासा.
          </p>
          <a href={`${basePath}/sign-in`} className="text-green-600 hover:text-green-700 font-medium text-sm block pt-2">
            ← लॉग इन करा
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-background to-background px-4 gap-6">
      <div className="text-center mb-2">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
          <span className="text-2xl">🔑</span>
        </div>
        <h1 className="text-2xl font-black text-foreground">Password विसरलात?</h1>
        <p className="text-muted-foreground text-sm mt-1">Email टाका, reset link पाठवतो</p>
      </div>

      <div className="bg-white rounded-3xl w-[440px] max-w-full shadow-lg border border-slate-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "पाठवत आहे…" : "Reset Link पाठवा"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          <a href={`${basePath}/sign-in`} className="text-green-600 hover:text-green-700 font-medium">
            ← परत लॉग इन करा
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Reset Password Page ──────────────────────────────────────────────────────
function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords जुळत नाहीत.");
      return;
    }
    if (password.length < 6) {
      setError("Password किमान 6 characters असणे आवश्यक आहे.");
      return;
    }
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => setLocation("/sign-in"), 2500);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-background to-background px-4">
        <div className="bg-white rounded-3xl w-[440px] max-w-full shadow-lg border border-slate-100 p-8 text-center space-y-3">
          <div className="text-4xl">✅</div>
          <h2 className="text-lg font-bold">Password बदलला!</h2>
          <p className="text-muted-foreground text-sm">तुम्हाला आता लॉग इन पेजवर नेत आहे…</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse mx-auto">
            <span className="text-xl">🔑</span>
          </div>
          <p className="text-sm text-muted-foreground">Reset link verify होत आहे…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-background to-background px-4 gap-6">
      <div className="text-center mb-2">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
          <span className="text-2xl">🔐</span>
        </div>
        <h1 className="text-2xl font-black text-foreground">नवीन Password सेट करा</h1>
      </div>

      <div className="bg-white rounded-3xl w-[440px] max-w-full shadow-lg border border-slate-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">नवीन Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Password Confirm करा</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "बदलत आहे…" : "Password बदला"}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── Role-based redirect after successful login ───────────────────────────────
function SignInCallback() {
  const { isSignedIn, isLoaded } = useAuth();
  const { role, isLoading, isError } = useUserRole();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (!isLoading && (role || isError)) {
      setLocation(role === "admin" ? "/admin" : "/dashboard", { replace: true });
    }
  }, [isLoaded, isSignedIn, isLoading, role, isError, setLocation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation("/dashboard", { replace: true });
    }, 10_000);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
          <span className="text-xl">🍽️</span>
        </div>
        <p className="text-sm text-muted-foreground">लॉग इन होत आहे…</p>
      </div>
    </div>
  );
}

// ─── Home redirect (role-aware) ───────────────────────────────────────────────
function HomeRedirect() {
  const { isSignedIn, isLoaded } = useAuth();
  const { role, isLoading } = useUserRole();

  if (!isLoaded) return null;

  if (!isSignedIn) return <LandingPage />;

  if (isLoading) return null;

  return <Redirect to={role === "admin" ? "/admin" : "/dashboard"} />;
}

// ─── Protected route ──────────────────────────────────────────────────────────
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  return isSignedIn ? <Component /> : <Redirect to="/sign-in" />;
}

// ─── Admin-only route ─────────────────────────────────────────────────────────
function AdminRoute() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  return isSignedIn ? <AdminPage /> : <Redirect to="/sign-in" />;
}

// ─── Cache invalidation on sign-out ──────────────────────────────────────────
function AuthCacheInvalidator() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const prevIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const id = user?.id ?? null;
    if (prevIdRef.current !== undefined && prevIdRef.current !== id) {
      qc.clear();
    }
    prevIdRef.current = id;
  }, [user?.id, qc]);

  return null;
}

function NotificationController() {
  const { user } = useAuth();
  useNotifications(user?.id);
  return null;
}

// ─── Routes ───────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthCacheInvalidator />
      <NotificationController />
      <Switch>
        <Route path="/"                     component={HomeRedirect} />
        <Route path="/sign-in/callback"     component={SignInCallback} />
        <Route path="/sign-in/*?"           component={SignInPage} />
        <Route path="/sign-up/*?"           component={SignUpPage} />
        <Route path="/forgot-password"      component={ForgotPasswordPage} />
        <Route path="/reset-password"       component={ResetPasswordPage} />
        <Route path="/admin-login/callback" component={AdminLoginCallback} />
        <Route path="/admin-login/*?"       component={AdminLoginPage} />
        <Route path="/dashboard"            component={() => <ProtectedRoute component={DashboardPage} />} />
        <Route path="/analytics"            component={() => <ProtectedRoute component={AnalyticsPage} />} />
        <Route path="/range"                component={() => <ProtectedRoute component={RangeTrackerPage} />} />
        <Route path="/history"              component={() => <ProtectedRoute component={HistoryPage} />} />
        <Route path="/settings"             component={() => <ProtectedRoute component={SettingsPage} />} />
        <Route path="/admin"                component={AdminRoute} />
        <Route component={NotFound} />
      </Switch>
      <Chatbot />
      <Toaster />
    </QueryClientProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="mess-tracker-theme">
      <AuthProvider>
        <WouterRouter base={basePath}>
          <AppRoutes />
        </WouterRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
