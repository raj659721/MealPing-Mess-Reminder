import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Utensils, CalendarCheck, IndianRupee, Bell,
  ArrowRight, Sparkles, ShieldCheck, Check, Coffee, Moon,
  TrendingUp, Users,
} from "lucide-react";
import { mr } from "@/lib/i18n";

const FEATURES = [
  {
    icon: CalendarCheck,
    title: mr.landing.features.attendance.title,
    desc: mr.landing.features.attendance.desc,
    color: "bg-green-100 dark:bg-green-950/40 text-green-600",
  },
  {
    icon: IndianRupee,
    title: mr.landing.features.bill.title,
    desc: mr.landing.features.bill.desc,
    color: "bg-orange-100 dark:bg-orange-950/40 text-orange-600",
  },
  {
    icon: Bell,
    title: mr.landing.features.reminders.title,
    desc: mr.landing.features.reminders.desc,
    color: "bg-blue-100 dark:bg-blue-950/40 text-blue-600",
  },
];

function AppPreviewCard() {
  return (
    <div className="relative w-full max-w-sm mx-auto lg:mx-0 lg:ml-auto">
      {/* Glow */}
      <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl" />

      {/* Main card */}
      <div className="relative bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
        {/* Card header */}
        <div className="px-5 pt-5 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Utensils className="h-3 w-3 text-primary" />
            </div>
            <span className="text-xs font-bold text-foreground">Mess Manager</span>
          </div>
          <p className="text-[11px] text-muted-foreground">आजचे जेवण — शुक्रवार, २ मे</p>
        </div>

        {/* Today's meals */}
        <div className="px-5 py-4 space-y-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">आजचे जेवण</p>

          {/* Lunch row */}
          <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <Coffee className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">दुपारचे जेवण</p>
                <p className="text-[10px] text-muted-foreground">₹60 · दुपारी १२:३०</p>
              </div>
            </div>
            <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="h-3 w-3 text-white" />
            </div>
          </div>

          {/* Dinner row */}
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/20 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Moon className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">रात्रीचे जेवण</p>
                <p className="text-[10px] text-muted-foreground">₹70 · रात्री ७:३०</p>
              </div>
            </div>
            <div className="h-6 w-6 rounded-full bg-border flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            </div>
          </div>
        </div>

        {/* Monthly summary strip */}
        <div className="px-5 pb-5">
          <div className="bg-primary/5 border border-primary/15 rounded-2xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">मे महिना</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-primary">₹1,820</p>
              <p className="text-[10px] text-muted-foreground">२८ जेवण</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge — users */}
      <div className="absolute -bottom-4 -left-4 bg-card border border-border rounded-2xl shadow-lg px-3 py-2 flex items-center gap-2">
        <div className="h-7 w-7 rounded-xl bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center">
          <Users className="h-3.5 w-3.5 text-orange-600" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-foreground">१२ वापरकर्ते</p>
          <p className="text-[9px] text-muted-foreground">आज सक्रिय</p>
        </div>
      </div>

      {/* Floating badge — saved */}
      <div className="absolute -top-4 -right-4 bg-green-500 text-white rounded-2xl shadow-lg px-3 py-2">
        <p className="text-[10px] font-bold">✓ नोंद झाली!</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Utensils className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-sm text-foreground">Mess Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin-login">
              <Button variant="ghost" size="sm" className="rounded-xl text-xs font-semibold gap-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin
              </Button>
            </Link>
            <Link to="/sign-in">
              <Button variant="ghost" size="sm" className="rounded-xl text-xs font-semibold">
                {mr.landing.signIn}
              </Button>
            </Link>
            <Link to="/sign-up">
              <Button size="sm" className="rounded-xl text-xs font-semibold gap-1">
                {mr.landing.getStarted}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero — two-column ───────────────────────────────────── */}
      <section className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-24 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

        {/* Left — text + CTA */}
        <div className="flex-1 flex flex-col items-start text-left">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-xs text-primary font-semibold mb-6">
            <Sparkles className="h-3 w-3" />
            {mr.landing.tagline}
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground tracking-tight leading-[1.1]">
            {mr.landing.heroTitle1}
            <br />
            <span className="text-primary">{mr.landing.heroTitle2}</span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-md leading-relaxed">
            {mr.landing.heroDesc}
          </p>

          {/* CTA buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link to="/sign-up">
              <Button size="lg" className="px-8 rounded-2xl gap-2 shadow-lg shadow-primary/25 font-bold text-base h-12">
                {mr.landing.startFree}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/sign-in">
              <Button variant="outline" size="lg" className="px-8 rounded-2xl font-semibold text-base h-12">
                {mr.landing.signIn}
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600 text-[9px]">✓</span>
              मोफत वापर
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 text-[9px]">🔒</span>
              सुरक्षित
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 text-[9px]">📱</span>
              मोबाइल-फ्रेंडली
            </span>
          </div>
        </div>

        {/* Right — app preview */}
        <div className="w-full lg:w-auto lg:flex-shrink-0 lg:w-[380px] pb-6 lg:pb-0">
          <AppPreviewCard />
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="bg-muted/30 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              सगळं एकाच ठिकाणी
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">तुमच्या मेसचे व्यवस्थापन आता सोपे</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-card rounded-3xl p-6 shadow-sm flex flex-col gap-4 border border-border/50 hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────── */}
      <section className="bg-primary">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-primary-foreground">आजच सुरुवात करा</h2>
            <p className="text-sm text-primary-foreground/75 mt-1">मोफत खाते तयार करा. क्रेडिट कार्ड नाही.</p>
          </div>
          <Link to="/sign-up">
            <Button size="lg" variant="secondary" className="rounded-2xl font-bold px-8 h-12 gap-2 shadow-lg">
              मोफत सुरू करा
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">{mr.landing.footer}</p>
        </div>
      </footer>
    </div>
  );
}
