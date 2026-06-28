import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useUserRole } from "@/hooks/use-user-role";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";

export default function AdminLoginCallback() {
  const { isSignedIn, isLoaded } = useAuth();
  const { role, profile, isLoading } = useUserRole();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || isLoading || !role) return;
    if (role !== "admin") return;
    const t = setTimeout(() => setLocation("/admin", { replace: true }), 1200);
    return () => clearTimeout(t);
  }, [isLoaded, isSignedIn, isLoading, role, setLocation]);

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
        <div className="h-14 w-14 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
          <Loader2 className="h-7 w-7 text-orange-400 animate-spin" />
        </div>
        <p className="text-slate-400 text-sm">Verifying admin credentials…</p>
      </div>
    );
  }

  if (role === "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
        <div className="h-14 w-14 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center animate-bounce">
          <ShieldCheck className="h-7 w-7 text-green-400" />
        </div>
        <div className="text-center">
          <p className="text-slate-100 font-bold">Admin access confirmed</p>
          <p className="text-slate-400 text-sm mt-1">Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 gap-6">
      <div className="h-16 w-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
        <ShieldAlert className="h-8 w-8 text-red-400" />
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-black text-slate-100">Access Denied</h1>
        <p className="text-slate-400 text-sm mt-2 max-w-xs">
          This account does not have admin privileges.
        </p>
      </div>

      {profile?.email && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-center">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Signed in as</p>
          <p className="text-sm font-mono text-slate-300 mt-1">{profile.email}</p>
          <p className="text-xs text-red-400 mt-2">This email is not in the admin list</p>
        </div>
      )}

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 max-w-sm w-full space-y-2.5">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">To get admin access:</p>
        <ol className="text-xs text-slate-500 space-y-1.5 list-decimal pl-4">
          <li>Open <span className="text-slate-300 font-medium">Replit Secrets</span> (🔒 in left sidebar)</li>
          <li>Add key <code className="bg-slate-800 border border-slate-700 rounded px-1 text-orange-400">ADMIN_EMAILS</code></li>
          <li>Set value to <code className="bg-slate-800 border border-slate-700 rounded px-1 text-orange-400 break-all">{profile?.email ?? "your-email@example.com"}</code></li>
          <li>Restart the API Server</li>
        </ol>
      </div>

      <div className="flex gap-3">
        <Link to="/admin-login">
          <button className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors">
            Try Again
          </button>
        </Link>
        <Link to="/sign-in">
          <button className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors">
            User Login
          </button>
        </Link>
      </div>
    </div>
  );
}
