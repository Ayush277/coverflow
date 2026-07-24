"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, useToast, cx } from "@/components/ui";
import { Bell, ShieldCheck, Sparkles, Moon } from "lucide-react";

const PREFS = [
  { key: "notifyProtection", icon: ShieldCheck, label: "Protection activations", desc: "Notify when a new purchase is automatically protected." },
  { key: "notifyExpiry", icon: Bell, label: "Expiry reminders", desc: "Warn before any coverage or claim window closes." },
  { key: "notifyInsights", icon: Sparkles, label: "Monthly insights", desc: "Send the monthly Benefit Insights report." },
  { key: "aiSuggestions", icon: Sparkles, label: "AI recommendations", desc: "Let the assistant suggest receipt uploads and claim opportunities." },
] as const;

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) setPrefs({ notifyProtection: true, notifyExpiry: true, notifyInsights: true, aiSuggestions: true, ...user.preferences });
  }, [user]);

  const toggle = (key: string) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const save = async () => {
    setBusy(true);
    try {
      await api("/api/auth/me", { method: "PATCH", body: JSON.stringify({ preferences: prefs }) });
      await refreshUser();
      toast({ tone: "success", title: "Preferences saved", body: "The Notification Engine adapts to these instantly." });
    } catch (e: any) { toast({ tone: "error", title: "Save failed", body: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="mono text-[11px] font-semibold uppercase tracking-widest text-primary">Settings</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Preferences</h1>
      </div>

      <Card>
        <h2 className="mb-1 text-[15px] font-semibold">Notifications & AI</h2>
        <p className="mb-5 text-[12.5px] text-muted">The Benefit Decision Engine respects these when scheduling reminders.</p>
        <div className="space-y-3">
          {PREFS.map(p => (
            <button key={p.key} onClick={() => toggle(p.key)}
              className="flex w-full cursor-pointer items-center gap-4 rounded-[12px] border border-border bg-bg/50 p-4 text-left transition-colors hover:border-[#3f3f46]">
              <p.icon size={17} className="shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium">{p.label}</p>
                <p className="text-[12px] text-muted">{p.desc}</p>
              </div>
              <span className={cx("relative h-6 w-11 shrink-0 rounded-full transition-colors", prefs[p.key] ? "bg-primary" : "bg-border")}>
                <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", prefs[p.key] ? "left-[22px]" : "left-0.5")} />
              </span>
            </button>
          ))}
        </div>
        <Button className="mt-5" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save preferences"}</Button>
      </Card>

      <Card className="flex items-center gap-4">
        <Moon size={17} className="text-primary" />
        <div className="flex-1">
          <p className="text-[13.5px] font-medium">Dark premium theme</p>
          <p className="text-[12px] text-muted">CoverFlow ships in the Aurora dark theme by design — the way a premium card product should look.</p>
        </div>
        <span className="mono rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">Always on</span>
      </Card>
    </div>
  );
}
