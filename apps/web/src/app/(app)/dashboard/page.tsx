"use client";
/* Protection Dashboard — operational density on the duotone system:
   crisp bordered surfaces, mono labels, tabular numerals, one deep navy panel. */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Zap, ShieldCheck, Clock3, CreditCard, Plus, Store, Sparkles } from "lucide-react";
import { api, compactMoney, money, fmtDate, daysLeft } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Badge, Button, Count, Empty, Progress, useToast, cx } from "@/components/ui";
import { TrendArea } from "@/components/charts";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [a, setA] = useState<any>(null);
  const [benefits, setBenefits] = useState<any[] | null>(null);
  const [txns, setTxns] = useState<any[] | null>(null);
  const [cards, setCards] = useState<any[] | null>(null);
  const [simBusy, setSimBusy] = useState(false);

  const load = useCallback(() => {
    api("/api/analytics").then(setA).catch(() => {});
    api<{ benefits: any[] }>("/api/benefits").then(d => setBenefits(d.benefits)).catch(() => setBenefits([]));
    api<{ transactions: any[] }>("/api/transactions?limit=6").then(d => setTxns(d.transactions)).catch(() => setTxns([]));
    api<{ cards: any[] }>("/api/cards").then(d => setCards(d.cards.filter((c: any) => c.status === "ACTIVE"))).catch(() => setCards([]));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    const h = () => setTimeout(load, 600);
    window.addEventListener("cf:benefit", h);
    window.addEventListener("cf:transaction", h);
    return () => { window.removeEventListener("cf:benefit", h); window.removeEventListener("cf:transaction", h); };
  }, [load]);

  const simulate = async () => {
    setSimBusy(true);
    try { await api("/api/transactions/simulate", { method: "POST" }); }
    catch (e: any) { toast({ tone: "error", title: "Simulation failed", body: e.message }); }
    finally { setTimeout(() => setSimBusy(false), 800); }
  };

  const active = benefits?.filter(b => ["ACTIVE", "EXPIRING"].includes(b.status)) ?? [];
  const expiring = active.filter(b => daysLeft(b.coverageEnd) <= 14);
  const pending = benefits?.filter(b => b.status === "PENDING_ACTIVATION") ?? [];

  const metrics = a ? [
    { l: "Coverage value", n: a.coverageValue, fmt: (n: number) => compactMoney(n), d: `${a.protectedCount} active protections` },
    { l: "Protection rate", n: a.protectionRate, suffix: "%", d: `${compactMoney(a.protectedSpend30d)} of ${compactMoney(a.spend30d)}` },
    { l: "Expiring soon", n: a.expiringSoon, d: "within 14 days" },
    { l: "Recovered", n: a.claims.recovered, fmt: (n: number) => compactMoney(n), d: `${a.claims.approved} of ${a.claims.total} claims approved` },
  ] : null;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="ping text-mint" />
            <span className="label text-faint">System online</span>
          </div>
          <h1 className="mt-2.5 text-[26px] font-semibold tracking-[-0.03em]">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {user?.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">Here's what your card is protecting right now.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/store"><Button variant="outline"><Store size={15} strokeWidth={1.9} /> Demo Store</Button></Link>
          <Button onClick={simulate} disabled={simBusy}><Zap size={15} strokeWidth={2} /> {simBusy ? "Streaming…" : "Simulate purchase"}</Button>
        </div>
      </div>

      {/* ── Metric row — single bordered strip, hairline dividers ── */}
      <div className="grid gap-px overflow-hidden rounded-[16px] border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {(metrics ?? Array.from({ length: 4 }, (_, i) => ({ l: "", n: 0, d: "", skeleton: true, key: i } as any))).map((m: any, i: number) => (
          <motion.div key={m.l || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.5, ease: EASE }}
            className="bg-surface/70 px-5 py-5 backdrop-blur-xl">
            {!metrics ? (
              <>
                <div className="skeleton h-2.5 w-20 rounded" />
                <div className="skeleton mt-4 h-7 w-24 rounded" />
                <div className="skeleton mt-3 h-2.5 w-28 rounded" />
              </>
            ) : (
              <>
                <p className="label text-faint">{m.l}</p>
                <p className="tnum mt-3 text-[28px] font-medium leading-none tracking-[-0.03em]">
                  <Count to={m.n} suffix={m.suffix} format={m.fmt} delay={0.15 + i * 0.06} duration={1.3} />
                </p>
                <p className="mt-2 text-[12px] text-faint">{m.d}</p>
              </>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Protected purchases ── */}
        <section className="glass-card overflow-hidden lg:col-span-2">
          <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-[14px] font-semibold tracking-[-0.01em]">Protected purchases</h2>
            <Link href="/wallet" className="flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline">
              Benefit wallet <ArrowRight size={12} />
            </Link>
          </header>

          {benefits === null ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="px-5 py-4"><div className="skeleton h-9 w-full rounded" /></div>)}
            </div>
          ) : active.length === 0 ? (
            <div className="p-5">
              <Empty icon={<ShieldCheck size={26} strokeWidth={1.5} />} title="No active protections yet"
                hint="Simulate a purchase — the intelligence engine detects and protects it instantly."
                action={<Button size="sm" onClick={simulate}><Zap size={13} /> Simulate purchase</Button>} />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {active.slice(0, 6).map((b, i) => {
                const left = daysLeft(b.coverageEnd);
                const total = Math.max(1, (new Date(b.coverageEnd).getTime() - new Date(b.coverageStart).getTime()) / 86400_000);
                return (
                  <motion.div key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04, duration: 0.4 }}>
                    <Link href={`/wallet/${b.id}`} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-bg-subtle">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium">{b.description}</p>
                        <p className="mono mt-0.5 truncate text-[11px] text-faint">{b.merchant} · {b.benefitType}</p>
                      </div>
                      <div className="hidden w-32 shrink-0 sm:block">
                        <Progress value={(left / total) * 100} tone={left <= 14 ? "var(--warn)" : "var(--brand)"} />
                        <p className="tnum mt-1.5 text-right text-[11px] text-faint">{left}d left</p>
                      </div>
                      <span className="tnum hidden w-24 shrink-0 text-right text-[13px] text-muted md:block">{money(b.amount)}</span>
                      <Badge tone={b.status}>{b.status}</Badge>
                      <ArrowUpRight size={14} className="shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Right rail ── */}
        <div className="space-y-6">
          {/* deep panel — needs action */}
          {(pending.length > 0 || expiring.length > 0) && (
            <section className="deep overflow-hidden rounded-[16px]">
              <header className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5">
                <Clock3 size={14} className="text-primary" />
                <h2 className="text-[13.5px] font-semibold text-white">Needs attention</h2>
              </header>
              <div className="divide-y divide-white/[0.07]">
                {pending.slice(0, 2).map(b => (
                  <Link key={b.id} href={`/wallet/${b.id}`} className="block px-5 py-3.5 transition-colors hover:bg-white/[0.04]">
                    <p className="truncate text-[13px] font-medium text-white">{b.description}</p>
                    <p className="mono mt-0.5 text-[11px] text-white/45">
                      {b.decision === "REMINDER" ? "Upload receipt to activate" : "Manual activation required"}
                    </p>
                  </Link>
                ))}
                {expiring.slice(0, 2).map(b => (
                  <Link key={b.id} href={`/wallet/${b.id}`} className="block px-5 py-3.5 transition-colors hover:bg-white/[0.04]">
                    <p className="truncate text-[13px] font-medium text-white">{b.description}</p>
                    <p className="mono mt-0.5 text-[11px] text-white/45">Coverage ends {fmtDate(b.coverageEnd)} · {daysLeft(b.coverageEnd)}d</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* cards */}
          <section className="glass-card overflow-hidden">
            <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="text-[14px] font-semibold tracking-[-0.01em]">Connected cards</h2>
              <Link href="/cards" className="text-[12.5px] font-medium text-primary hover:underline">Manage</Link>
            </header>
            {cards === null ? <div className="p-5"><div className="skeleton h-12 w-full rounded" /></div>
              : cards.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-[13px] text-muted">No card connected.</p>
                  <Link href="/cards"><Button size="sm" variant="outline" className="mt-3"><Plus size={13} /> Connect a card</Button></Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {cards.map(c => (
                    <Link key={c.id} href="/cards" className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-bg-subtle">
                      <CreditCard size={16} className="shrink-0 text-faint" strokeWidth={1.9} />
                      <div className="min-w-0 flex-1">
                        <p className="mono text-[12.5px] font-medium">{c.tier} ···· {c.last4}</p>
                        <p className="text-[11.5px] text-faint">{c.txn_count} purchases monitored</p>
                      </div>
                      {c.is_default === 1 && <span className="label rounded-full border border-border bg-bg-subtle px-1.5 py-0.5 text-[9px] text-faint">Default</span>}
                    </Link>
                  ))}
                </div>
              )}
          </section>

          {/* claims CTA */}
          <section className="glass-card p-5">
            <Sparkles size={16} className="text-primary" strokeWidth={2} />
            <h2 className="mt-3.5 text-[14px] font-semibold tracking-[-0.01em]">Something went wrong?</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              Your claim is already prepared — merchant, receipt and coverage are filled in.
            </p>
            <Link href="/claims/new"><Button size="sm" className="mt-4">File a claim <ArrowRight size={13} /></Button></Link>
          </section>
        </div>
      </div>

      {/* ── Spend vs protected ── */}
      <section className="glass-card overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-[14px] font-semibold tracking-[-0.01em]">Spend vs protected</h2>
          <Link href="/analytics" className="flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline">Insights <ArrowRight size={12} /></Link>
        </header>
        <div className="p-5">
          {a?.monthly?.length
            ? <TrendArea data={a.monthly} x="month" series={[{ key: "spend", label: "Total spend", color: "var(--ink-3)" }, { key: "protected", label: "Protected", color: "var(--brand)" }]} />
            : <div className="skeleton h-56 w-full rounded" />}
        </div>
      </section>

      {/* ── Recent transactions ── */}
      <section className="glass-card overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-[14px] font-semibold tracking-[-0.01em]">Recent transactions</h2>
          <span className="label text-faint">Live</span>
        </header>
        {txns === null ? (
          <div className="divide-y divide-border">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="px-5 py-4"><div className="skeleton h-7 w-full rounded" /></div>)}</div>
        ) : txns.length === 0 ? (
          <div className="p-5"><Empty title="No transactions yet" hint="Simulated purchases appear here in real time." /></div>
        ) : (
          <div className="divide-y divide-border">
            {txns.map(t => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">{t.description}</p>
                  <p className="mono mt-0.5 truncate text-[11px] text-faint">{t.merchant} · ····{t.card_last4} · {fmtDate(t.occurred_at)}</p>
                </div>
                <span className="tnum text-[13px] font-medium">{money(t.amount)}</span>
                <span className={cx("label w-24 shrink-0 text-right", t.benefit_count > 0 ? "text-mint" : "text-faint")}>
                  {t.benefit_count > 0 ? `${t.benefit_count} protection${t.benefit_count > 1 ? "s" : ""}` : "no cover"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
