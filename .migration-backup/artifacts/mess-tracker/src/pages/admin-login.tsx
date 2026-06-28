import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/contexts/auth-context";
import { useUserRole } from "@/hooks/use-user-role";
import { ShieldCheck, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { role, isLoading } = useUserRole();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || isLoading || !role) return;
    if (role === "admin") setLocation("/admin", { replace: true });
  }, [isLoaded, isSignedIn, isLoading, role, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setLocation("/admin-login/callback");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(248,250,252,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(248,250,252,0.5) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-slate-700/30 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link to="/sign-in">
          <button className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition-colors">
            <ArrowLeft className="h-4 w-4" />
            User Login
          </button>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-800 rounded-lg px-2.5 py-1">
          <Lock className="h-3 w-3" />
          Secure Admin Portal
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 gap-8 pb-12">
        <div className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shadow-lg shadow-orange-500/10">
            <ShieldCheck className="h-8 w-8 text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">Admin Portal</h1>
            <p className="text-slate-400 text-sm mt-1">Authorized personnel only</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-slate-500">Restricted access — Admin credentials required</span>
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl w-[420px] max-w-full overflow-hidden shadow-2xl border border-slate-700/60 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="border-slate-600 rounded-xl bg-slate-800 text-slate-100 focus:border-orange-500 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="border-slate-600 rounded-xl bg-slate-800 text-slate-100 focus:border-orange-500 placeholder:text-slate-500"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-950/50 border border-red-800/60 rounded-xl px-3 py-2">{error}</p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold"
            >
              {loading ? "Verifying…" : "Sign In as Admin"}
            </Button>
          </form>
        </div>

        <p className="text-xs text-slate-600 text-center max-w-xs">
          Only users with admin email access can log in here. Regular users should use the{" "}
          <Link to="/sign-in">
            <span className="text-slate-400 hover:text-slate-200 underline cursor-pointer">standard login</span>
          </Link>.
        </p>
      </div>
    </div>
  );
}
