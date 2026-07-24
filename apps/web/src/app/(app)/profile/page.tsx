"use client";
import { useEffect, useState } from "react";
import { api, fmtDate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Badge, Button, Card, Input, useToast } from "@/components/ui";
import { CreditCard, ShieldCheck } from "lucide-react";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [cards, setCards] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) setName(user.name); }, [user]);
  useEffect(() => { api<{ cards: any[] }>("/api/cards").then(d => setCards(d.cards)).catch(() => {}); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await api("/api/auth/me", { method: "PATCH", body: JSON.stringify({ name }) });
      await refreshUser();
      toast({ tone: "success", title: "Profile updated" });
    } catch (err: any) { toast({ tone: "error", title: "Update failed", body: err.message }); }
    finally { setBusy(false); }
  };

  if (!user) return null;
  const tierGradient: Record<string, string> = {
    PLATINUM: "linear-gradient(135deg, #3f3f46, #18181c 60%, #52525b)",
    GOLD: "linear-gradient(135deg, #7c5c10, #18181c 60%, #b8860b)",
    GREEN: "linear-gradient(135deg, #14532d, #18181c 60%, #166534)",
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="mono text-[11px] font-semibold uppercase tracking-widest text-primary">Profile</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Your account</h1>
      </div>

      <Card className="flex items-center gap-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-[18px] text-xl font-bold text-[#0e0e10]" style={{ background: user.avatarColor }}>
          {user.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
        </span>
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold">{user.name}</h2>
            <Badge tone={user.role === "ADMIN" ? "APPROVED" : "NORMAL"}>{user.role}</Badge>
          </div>
          <p className="text-sm text-muted">{user.email}</p>
          <p className="mono mt-1 text-[10.5px] uppercase tracking-wide text-muted">Member since {fmtDate(user.createdAt)}</p>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-[15px] font-semibold">Edit profile</h2>
        <form onSubmit={save} className="space-y-4">
          <Input label="Full name" value={name} onChange={e => setName(e.target.value)} minLength={2} required />
          <Input label="Email" value={user.email} disabled className="opacity-60" />
          <Button type="submit" disabled={busy || name === user.name}>{busy ? "Saving…" : "Save changes"}</Button>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Connected cards</h2>
          <CreditCard size={15} className="text-muted" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map(c => (
            <div key={c.id} className="relative overflow-hidden rounded-[16px] border border-border p-5" style={{ background: tierGradient[c.tier] }}>
              <div className="flex items-center justify-between">
                <ShieldCheck size={18} className="text-text/70" />
                <span className="mono text-[10px] font-bold uppercase tracking-widest text-text/70">{c.network}</span>
              </div>
              <p className="mono mt-6 text-[15px] tracking-[0.2em] text-text">•••• •••• •••• {c.last4}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="mono text-[10px] font-semibold uppercase tracking-widest text-text/60">{c.tier}</span>
                <Badge tone="ACTIVE">{c.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
