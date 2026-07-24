"use client";
/**
 * Card wallet — connect the cards CoverFlow monitors.
 * Only the last four digits are ever sent to storage; the demo number is
 * validated (Luhn) and discarded. No PAN, CVV or expiry is persisted anywhere.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CreditCard, Plus, ShieldCheck, Star, Trash2, Lock, Activity } from "lucide-react";
import { api, fmtDate } from "@/lib/api";
import { Badge, Button, Card, Empty, Input, Modal, Select, useToast, cx } from "@/components/ui";

const tierGradient: Record<string, string> = {
  PLATINUM: "linear-gradient(135deg, #52525b, #18181c 55%, #3f3f46)",
  GOLD: "linear-gradient(135deg, #b8860b, #18181c 55%, #7c5c10)",
  GREEN: "linear-gradient(135deg, #166534, #18181c 55%, #14532d)",
};
const tierPerks: Record<string, string[]> = {
  PLATINUM: ["Purchase Protection up to ₹1,00,000", "Extended Warranty +1 year", "Return Protection", "Travel Insurance ₹5,00,000"],
  GOLD: ["Purchase Protection up to ₹50,000", "Extended Warranty +1 year", "Travel Insurance ₹5,00,000"],
  GREEN: ["Purchase Protection up to ₹50,000"],
};

export default function Cards() {
  const { toast } = useToast();
  const [cards, setCards] = useState<any[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ number: "", tier: "PLATINUM" });
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<any>(null);

  const load = useCallback(() => {
    api<{ cards: any[] }>("/api/cards").then(d => setCards(d.cards)).catch(() => setCards([]));
  }, []);
  useEffect(load, [load]);

  const formatNumber = (v: string) => v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();

  const connect = async () => {
    setBusy(true);
    try {
      await api("/api/cards", { method: "POST", body: JSON.stringify({ number: form.number, tier: form.tier }) });
      toast({ tone: "success", title: "Card connected", body: "Eligible purchases on this card are now protected automatically." });
      setAddOpen(false); setForm({ number: "", tier: "PLATINUM" }); load();
    } catch (e: any) { toast({ tone: "error", title: "Could not connect card", body: e.message }); }
    finally { setBusy(false); }
  };

  const makeDefault = async (id: string) => {
    await api(`/api/cards/${id}/default`, { method: "POST" });
    toast({ tone: "success", title: "Default card updated" });
    load();
  };

  const remove = async () => {
    try {
      const r = await api<{ message: string }>(`/api/cards/${removing.id}`, { method: "DELETE" });
      toast({ tone: "info", title: "Card removed", body: r.message });
      setRemoving(null); load();
    } catch (e: any) { toast({ tone: "error", title: "Could not remove", body: e.message }); }
  };

  const active = cards?.filter(c => c.status === "ACTIVE") ?? [];
  const inactive = cards?.filter(c => c.status !== "ACTIVE") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="fade-in">
          <div className="mono inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-medium text-text/70 ring-1 ring-border">
            <CreditCard size={13} className="text-primary" /> Card Wallet
          </div>
          <h1 className="mt-4 text-4xl font-normal tracking-tighter">Connected <span className="grad-text">cards</span></h1>
          <p className="mt-2 text-[15px] text-muted">Every purchase on these cards is monitored by the Purchase Intelligence Engine.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus size={15} /> Connect card</Button>
      </div>

      {cards === null ? (
        <div className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-64 rounded-[16px]" />)}</div>
      ) : active.length === 0 ? (
        <Empty icon={<CreditCard size={32} strokeWidth={1.5} />} title="No cards connected"
          hint="Connect a card so CoverFlow can detect and protect eligible purchases."
          action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus size={13} /> Connect card</Button>} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {active.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <Card className="space-y-4">
                <div className="relative overflow-hidden rounded-[16px] p-6" style={{ background: tierGradient[c.tier] }}>
                  <div className="flex items-start justify-between">
                    <ShieldCheck size={22} className="text-text/70" />
                    <div className="text-right">
                      <span className="mono text-[10px] font-bold uppercase tracking-widest text-text/70">{c.network}</span>
                      {c.is_default === 1 && <p className="mono mt-1 text-[9px] font-bold uppercase tracking-widest text-mint">default</p>}
                    </div>
                  </div>
                  <p className="mono mt-8 text-[17px] tracking-[0.22em] text-text">•••• •••• •••• {c.last4}</p>
                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <p className="mono text-[9px] uppercase tracking-widest text-text/50">Tier</p>
                      <p className="mono text-[12px] font-bold uppercase tracking-widest text-text">{c.tier}</p>
                    </div>
                    <Badge tone="ACTIVE">{c.status}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[12px] text-muted">
                  <span className="flex items-center gap-1.5"><Activity size={13} /> {c.txn_count} transaction{c.txn_count === 1 ? "" : "s"}</span>
                  <span>connected {fmtDate(c.created_at)}</span>
                </div>

                <div>
                  <p className="mono mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">Benefits on this tier</p>
                  <div className="space-y-1.5">
                    {(tierPerks[c.tier] ?? []).map(p => (
                      <div key={p} className="flex items-center gap-2 text-[12.5px] text-text/85">
                        <ShieldCheck size={12} className="shrink-0 text-mint" /> {p}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 border-t border-border pt-4">
                  {c.is_default !== 1 && <Button size="sm" variant="outline" onClick={() => makeDefault(c.id)}><Star size={13} /> Make default</Button>}
                  <Button size="sm" variant="danger" className="ml-auto" onClick={() => setRemoving(c)}><Trash2 size={13} /> Remove</Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <h2 className="mono mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted">Deactivated</h2>
          <div className="space-y-2">
            {inactive.map(c => (
              <Card key={c.id} className="flex items-center gap-4 !py-3.5 opacity-60">
                <CreditCard size={16} className="text-muted" />
                <span className="mono flex-1 text-[13px]">{c.tier} •••• {c.last4}</span>
                <span className="text-[12px] text-muted">{c.txn_count} purchases kept in your wallet</span>
                <Badge>{c.status}</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card className="flex items-start gap-3.5 border-primary/20 bg-primary/[0.04]">
        <Lock size={17} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <p className="text-[13.5px] font-medium">How card data is handled</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            CoverFlow stores <b className="text-text">only the last four digits and the tier</b>. The demo number you enter is
            checksum-validated in memory and discarded — there is no database column for a full card number, CVV or expiry.
            A production deployment replaces this form with Stripe Issuing / network tokenization and keeps only the token reference.
          </p>
        </div>
      </Card>

      {/* connect card */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Connect a card">
        <div className="space-y-4">
          <div className="rounded-[10px] border border-amber/25 bg-amber/8 p-3 text-[12px] leading-relaxed text-amber">
            Demo environment — use a test number like <span className="mono">4242 4242 4242 4242</span>. Never enter a real card.
          </div>
          <Input label="Card number" value={form.number} inputMode="numeric" placeholder="4242 4242 4242 4242"
            onChange={e => setForm({ ...form, number: formatNumber(e.target.value) })} className="mono" />
          <Select label="Card tier" value={form.tier} onChange={(e: any) => setForm({ ...form, tier: e.target.value })}>
            <option value="PLATINUM">Platinum — widest coverage</option>
            <option value="GOLD">Gold</option>
            <option value="GREEN">Green</option>
          </Select>
          <div>
            <p className="mono mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">Activates</p>
            <div className="space-y-1">
              {(tierPerks[form.tier] ?? []).map(p => (
                <div key={p} className="flex items-center gap-2 text-[12.5px] text-muted"><ShieldCheck size={12} className="text-mint" /> {p}</div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-1">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button disabled={busy || form.number.replace(/\D/g, "").length < 13} onClick={connect}>{busy ? "Connecting…" : "Connect card"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!removing} onClose={() => setRemoving(null)} title="Remove this card?">
        <p className="text-[13px] leading-relaxed text-muted">
          {removing?.txn_count > 0
            ? `This card has ${removing.txn_count} transactions. It will be deactivated — monitoring stops, but its protected purchases and claim history stay in your wallet.`
            : "This card has no transactions and will be removed completely."}
        </p>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button>
          <Button variant="danger" onClick={remove}>Remove card</Button>
        </div>
      </Modal>
    </div>
  );
}
