import { useState, useEffect } from "react";
import {
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey,
} from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { Capacitor } from "@capacitor/core";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Bell, IndianRupee, User, LogOut, ShieldCheck, Clock, Sun, Moon, Globe, MonitorSmartphone } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/contexts/language-context";
import { testNotification } from "@/hooks/use-notifications";
import { 
  loadMealTimes,
  saveMealTimes,
  isValidTime,
  formatTime12h,
  DEFAULT_LUNCH_TIME,
  DEFAULT_DINNER_TIME,
} from "@/lib/meal-times";

// ─── Meal Time Card ───────────────────────────────────────────────────────────
function MealTimeCard() {
  const { t } = useLanguage();
  const [lunchTime, setLunchTime] = useState(DEFAULT_LUNCH_TIME);
  const [dinnerTime, setDinnerTime] = useState(DEFAULT_DINNER_TIME);
  const [saving, setSaving] = useState(false);
  const [lunchError, setLunchError] = useState(false);
  const [dinnerError, setDinnerError] = useState(false);

  useEffect(() => {
    const saved = loadMealTimes();
    setLunchTime(saved.lunchTime);
    setDinnerTime(saved.dinnerTime);
  }, []);

  const handleSave = () => {
    const lunchOk = isValidTime(lunchTime);
    const dinnerOk = isValidTime(dinnerTime);
    setLunchError(!lunchOk);
    setDinnerError(!dinnerOk);

    if (!lunchOk || !dinnerOk) {
      toast({
        title: t.settings.invalidTime,
        description: t.settings.invalidTimeDesc,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    saveMealTimes({ lunchTime, dinnerTime });
    
    // Reset acknowledgment state so the user can test the new times today
    try {
      const raw = localStorage.getItem("mess_reminder_v2");
      if (raw) {
        const s = JSON.parse(raw);
        s.lunchAcknowledged = false;
        s.dinnerAcknowledged = false;
        s.lunchActive = false;
        s.dinnerActive = false;
        localStorage.setItem("mess_reminder_v2", JSON.stringify(s));
      }
    } catch (e) {}

    setTimeout(() => {
      setSaving(false);
      toast({
        title: t.settings.timesSaved,
        description: t.settings.timesUpdated,
      });
    }, 300);
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-sm text-foreground">{t.settings.mealTimes}</h2>
      </div>
      <Separator />

      <p className="text-xs text-muted-foreground">{t.settings.mealTimesDesc}</p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="lunch-time" className="text-sm font-medium text-foreground flex items-center gap-2">
            ☀️ {t.settings.lunchTimeLabel}
          </Label>
          <div className="flex items-center gap-3">
            <input
              id="lunch-time"
              type="time"
              value={lunchTime}
              onChange={(e) => {
                setLunchTime(e.target.value);
                setLunchError(false);
              }}
              className={`rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-36 ${
                lunchError ? "border-red-400" : "border-border"
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {isValidTime(lunchTime) ? formatTime12h(lunchTime) : "—"}
            </span>
          </div>
          {lunchError && (
            <p className="text-xs text-destructive">{t.settings.invalidTimeDesc}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dinner-time" className="text-sm font-medium text-foreground flex items-center gap-2">
            🌙 {t.settings.dinnerTimeLabel}
          </Label>
          <div className="flex items-center gap-3">
            <input
              id="dinner-time"
              type="time"
              value={dinnerTime}
              onChange={(e) => {
                setDinnerTime(e.target.value);
                setDinnerError(false);
              }}
              className={`rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-36 ${
                dinnerError ? "border-red-400" : "border-border"
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {isValidTime(dinnerTime) ? formatTime12h(dinnerTime) : "—"}
            </span>
          </div>
          {dinnerError && (
            <p className="text-xs text-destructive">{t.settings.invalidTimeDesc}</p>
          )}
        </div>

        {(() => {
          const saved = loadMealTimes();
          return (
            <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
              <p>
                ☀️ {t.settings.currentLunch}:{" "}
                <strong className="text-foreground">{formatTime12h(saved.lunchTime)}</strong>
              </p>
              <p>
                🌙 {t.settings.currentDinner}:{" "}
                <strong className="text-foreground">{formatTime12h(saved.dinnerTime)}</strong>
              </p>
            </div>
          );
        })()}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full" variant="outline">
        {saving ? t.common.saving : t.settings.saveTimes}
      </Button>
    </Card>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const qc = useQueryClient();
  const updateSettings = useUpdateSettings();

  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });

  const [costPerMeal, setCostPerMeal] = useState<string>("50");
  const [lunchEnabled, setLunchEnabled] = useState(false);
  const [dinnerEnabled, setDinnerEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setCostPerMeal(String(settings.mealCostPerMeal));
    setLunchEnabled(settings.lunchReminderEnabled);
    setDinnerEnabled(settings.dinnerReminderEnabled);
  }, [settings]);

  const handleSave = async () => {
    const cost = parseFloat(costPerMeal);
    if (isNaN(cost) || cost < 0) {
      toast({ title: t.settings.invalidCost, description: t.settings.invalidCostDesc, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Force request native Android permission when they explicitly try to enable reminders
      if (Capacitor.isNativePlatform() && (lunchEnabled || dinnerEnabled)) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.requestPermissions();
      }

      await updateSettings.mutateAsync({
        data: {
          mealCostPerMeal: cost,
          lunchReminderEnabled: lunchEnabled,
          dinnerReminderEnabled: dinnerEnabled,
        },
      });
      await qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      toast({ title: t.settings.settingsSaved, description: t.settings.settingsUpdated });
    } catch {
      toast({ title: t.settings.saveFailed, description: t.settings.saveTryAgain, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const notifStatus = Capacitor.isNativePlatform()
    ? "granted" // Capacitor handles native permissions automatically
    : typeof Notification === "undefined"
    ? "unsupported"
    : Notification.permission;

  const email = user?.email ?? "";
  const displayName = email.split("@")[0] || t.common.noData;

  return (
    <Layout>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t.nav.settings}</h1>
        <p className="text-muted-foreground text-sm">{t.settings.subtitle}</p>
      </div>

      <div className="space-y-4 max-w-xl">
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-foreground">{t.settings.costPerMeal}</h2>
          </div>
          <Separator />
          {isLoading ? (
            <Skeleton className="h-10 rounded" />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="cost" className="text-sm text-muted-foreground">
                {t.settings.costLabel}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">₹</span>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.5"
                  value={costPerMeal}
                  onChange={(e) => setCostPerMeal(e.target.value)}
                  className="w-28"
                  placeholder="50"
                />
                <span className="text-sm text-muted-foreground">{t.settings.perMealSuffix}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.settings.costHint}</p>
            </div>
          )}
        </Card>

        <MealTimeCard />

        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm text-foreground">{t.settings.reminders}</h2>
            </div>
            <Button size="sm" variant="outline" onClick={testNotification}>Test Alarm</Button>
          </div>
          <Separator />

          {notifStatus === "denied" && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
              {t.settings.notifBlocked}
            </div>
          )}

          {notifStatus === "unsupported" && (
            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              {t.settings.notifUnsupported}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 rounded" />
              <Skeleton className="h-8 rounded" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-foreground">{t.settings.lunchReminder}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.settings.lunchReminderDesc}</p>
                </div>
                <Switch
                  checked={lunchEnabled}
                  onCheckedChange={setLunchEnabled}
                  disabled={notifStatus === "denied" || notifStatus === "unsupported"}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-foreground">{t.settings.dinnerReminder}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.settings.dinnerReminderDesc}</p>
                </div>
                <Switch
                  checked={dinnerEnabled}
                  onCheckedChange={setDinnerEnabled}
                  disabled={notifStatus === "denied" || notifStatus === "unsupported"}
                />
              </div>

              {(lunchEnabled || dinnerEnabled) && notifStatus !== "granted" && notifStatus !== "denied" && (
                <p className="text-xs text-primary">{t.settings.notifPermissionNote}</p>
              )}
            </div>
          )}
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? t.common.saving : t.settings.saveSettings}
        </Button>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-foreground">App Preferences</h2>
          </div>
          <Separator />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  Dark Mode
                </Label>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Language
                </Label>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-muted text-foreground text-xs rounded-lg px-2 py-1.5 outline-none border border-border"
              >
                <option value="en">English</option>
                <option value="mr">मराठी</option>
                <option value="hi">हिंदी</option>
                <option value="gu">ગુજરાતી</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-foreground">{t.settings.accountSection}</h2>
          </div>
          <Separator />
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">{t.common.name}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{displayName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.common.email}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{email || t.common.noData}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
              <p className="text-xs text-green-700 dark:text-green-400">
                {t.settings.securedWith}
              </p>
            </div>
          </div>
          <Separator />
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut()}
            className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            <LogOut className="h-4 w-4" />
            {t.settings.signOut}
          </Button>
        </Card>
      </div>
    </Layout>
  );
}
