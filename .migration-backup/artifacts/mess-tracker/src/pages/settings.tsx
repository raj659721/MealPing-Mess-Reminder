import { useState, useEffect } from "react";
import {
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Bell, IndianRupee, User, LogOut, ShieldCheck, Clock } from "lucide-react";
import { mr } from "@/lib/i18n";
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
        title: mr.settings.invalidTime,
        description: mr.settings.invalidTimeDesc,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    saveMealTimes({ lunchTime, dinnerTime });
    setTimeout(() => {
      setSaving(false);
      toast({
        title: mr.settings.timesSaved,
        description: mr.settings.timesUpdated,
      });
    }, 300);
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-sm text-foreground">{mr.settings.mealTimes}</h2>
      </div>
      <Separator />

      <p className="text-xs text-muted-foreground">{mr.settings.mealTimesDesc}</p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="lunch-time" className="text-sm font-medium text-foreground flex items-center gap-2">
            ☀️ {mr.settings.lunchTimeLabel}
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
            <p className="text-xs text-destructive">{mr.settings.invalidTimeDesc}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dinner-time" className="text-sm font-medium text-foreground flex items-center gap-2">
            🌙 {mr.settings.dinnerTimeLabel}
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
            <p className="text-xs text-destructive">{mr.settings.invalidTimeDesc}</p>
          )}
        </div>

        {(() => {
          const saved = loadMealTimes();
          return (
            <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
              <p>
                ☀️ {mr.settings.currentLunch}:{" "}
                <strong className="text-foreground">{formatTime12h(saved.lunchTime)}</strong>
              </p>
              <p>
                🌙 {mr.settings.currentDinner}:{" "}
                <strong className="text-foreground">{formatTime12h(saved.dinnerTime)}</strong>
              </p>
            </div>
          );
        })()}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full" variant="outline">
        {saving ? mr.common.saving : mr.settings.saveTimes}
      </Button>
    </Card>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
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
      toast({ title: mr.settings.invalidCost, description: mr.settings.invalidCostDesc, variant: "destructive" });
      return;
    }

    if ((lunchEnabled || dinnerEnabled) && Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast({ title: mr.settings.notifBlockedTitle, description: mr.settings.notifBlockedDesc, variant: "destructive" });
      }
    }

    setSaving(true);
    try {
      await updateSettings.mutateAsync({
        data: {
          mealCostPerMeal: cost,
          lunchReminderEnabled: lunchEnabled,
          dinnerReminderEnabled: dinnerEnabled,
        },
      });
      await qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      toast({ title: mr.settings.settingsSaved, description: mr.settings.settingsUpdated });
    } catch {
      toast({ title: mr.settings.saveFailed, description: mr.settings.saveTryAgain, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const notifStatus =
    typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission;

  const email = user?.email ?? "";
  const displayName = email.split("@")[0] || mr.common.noData;

  return (
    <Layout>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold text-foreground">{mr.nav.settings}</h1>
        <p className="text-muted-foreground text-sm">{mr.settings.subtitle}</p>
      </div>

      <div className="space-y-4 max-w-xl">
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-foreground">{mr.settings.costPerMeal}</h2>
          </div>
          <Separator />
          {isLoading ? (
            <Skeleton className="h-10 rounded" />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="cost" className="text-sm text-muted-foreground">
                {mr.settings.costLabel}
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
                <span className="text-sm text-muted-foreground">{mr.settings.perMealSuffix}</span>
              </div>
              <p className="text-xs text-muted-foreground">{mr.settings.costHint}</p>
            </div>
          )}
        </Card>

        <MealTimeCard />

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-foreground">{mr.settings.reminders}</h2>
          </div>
          <Separator />

          {notifStatus === "denied" && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
              {mr.settings.notifBlocked}
            </div>
          )}

          {notifStatus === "unsupported" && (
            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              {mr.settings.notifUnsupported}
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
                  <Label className="text-sm font-medium text-foreground">{mr.settings.lunchReminder}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{mr.settings.lunchReminderDesc}</p>
                </div>
                <Switch
                  checked={lunchEnabled}
                  onCheckedChange={setLunchEnabled}
                  disabled={notifStatus === "denied" || notifStatus === "unsupported"}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-foreground">{mr.settings.dinnerReminder}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{mr.settings.dinnerReminderDesc}</p>
                </div>
                <Switch
                  checked={dinnerEnabled}
                  onCheckedChange={setDinnerEnabled}
                  disabled={notifStatus === "denied" || notifStatus === "unsupported"}
                />
              </div>

              {(lunchEnabled || dinnerEnabled) && notifStatus !== "granted" && notifStatus !== "denied" && (
                <p className="text-xs text-primary">{mr.settings.notifPermissionNote}</p>
              )}
            </div>
          )}
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? mr.common.saving : mr.settings.saveSettings}
        </Button>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-foreground">{mr.settings.accountSection}</h2>
          </div>
          <Separator />
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">{mr.common.name}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{displayName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{mr.common.email}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{email || mr.common.noData}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
              <p className="text-xs text-green-700 dark:text-green-400">
                {mr.settings.securedWith}
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
            {mr.settings.signOut}
          </Button>
        </Card>
      </div>
    </Layout>
  );
}
