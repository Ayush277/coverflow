"use client";
/** Admin — Executive Financial Summary (Capital Overview composition). */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, compactMoney } from "@/lib/api";
import { Card, CardSkeleton, Stat } from "@/components/ui";
import { Bars, Donut, TrendArea, PALETTE } from "@/components/charts";

export default function AdminOverview() {
  const [a, setA] = useState<any>(null);
  useEffect(() => { api("/api/admin/analytics").then(setA).catch(() => {}); }, []);

  if (!a) return (
    <div className="space-y-6">
      <div className="skeleton h-8 w-72 rounded-[8px]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} rows={1} />)}</div>
    </div>
  );

  const t = a.totals;

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[11px] font-semibold uppercase tracking-widest text-accent">Executive Summary</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Benefit operations overview</h1>
      </div>

      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Coverage", value: compactMoney(t.active_coverage), sub: `${t.benefits} benefits activated`, accent: "#818cf8" },
          { label: "Customers", value: t.customers, sub: `${t.transactions} transactions monitored`, accent: "#34d399" },
          { label: "Claim Success Rate", value: `${a.claimRate}%`, sub: `${t.approved_claims} of ${t.claims} claims`, accent: "#f472b6" },
          { label: "Avg Processing", value: `${a.avgProcessingDays}d`, sub: `${t.pending_claims} in review now`, accent: "#fbbf24" },
        ].map(s => (
          <motion.div key={s.label} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}>
            <Stat {...s} />
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="mb-4 text-[15px] font-semibold">Transaction volume · 30 days</h2>
          <TrendArea data={a.daily} x="day" series={[{ key: "volume", label: "Volume", color: "#818CF8" }]} height={260} />
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-[15px] font-semibold">Volume by country</h2>
          <div className="space-y-3">
            {a.byCountry.map((c: any, i: number) => {
              const max = a.byCountry[0]?.volume ?? 1;
              return (
                <div key={c.country}>
                  <div className="mb-1 flex justify-between text-[12px]">
                    <span className="mono font-semibold uppercase tracking-wider">{c.country === "IN" ? "India" : c.country === "US" ? "United States" : c.country}</span>
                    <span className="text-muted">{compactMoney(c.volume)} · {c.benefits} benefits</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-border">
                    <motion.div className="h-full rounded-full" style={{ background: PALETTE[i % PALETTE.length] }}
                      initial={{ width: 0 }} animate={{ width: `${(c.volume / max) * 100}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
                  </div>
                </div>
              );
            })}
          </div>
          <h2 className="mb-3 mt-7 text-[15px] font-semibold">High-risk events</h2>
          <p className="text-3xl font-medium text-[#f87171]">{t.high_risk_events}</p>
          <p className="mt-1 text-[12px] text-muted">fraud scores ≥ 50 flagged for review</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-[15px] font-semibold">Benefit usage</h2>
          <div className="space-y-2.5">
            {a.benefitUsage.map((b: any, i: number) => (
              <div key={b.benefit_type} className="flex items-center gap-3 rounded-[10px] border border-border bg-bg/50 p-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                <span className="flex-1 text-[13px] font-medium">{b.benefit_type}</span>
                <span className="mono text-[11px] text-muted">activated <b className="text-text">{b.activated}</b></span>
                <span className="mono text-[11px] text-muted">claimed <b className="text-accent">{b.claimed}</b></span>
                <span className="mono text-[11px] text-muted">unused <b className="text-amber">{b.unused}</b></span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-[15px] font-semibold">Most-claimed merchants</h2>
          <Bars data={a.topMerchants} x="merchant" y="claims" money={false} color="#F472B6" horizontal height={a.topMerchants.length * 42 + 40} />
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-[15px] font-semibold">Category mix</h2>
        <div className="flex flex-wrap items-center gap-8">
          <div className="h-56 w-56"><Donut data={a.byCategory} nameKey="category" valueKey="volume" height={224} /></div>
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
            {a.byCategory.map((c: any, i: number) => (
              <div key={c.category} className="rounded-[10px] border border-border bg-bg/50 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="mono text-[10px] font-semibold uppercase tracking-wider text-muted">{c.category}</span>
                </div>
                <p className="mt-1.5 text-[15px] font-semibold">{compactMoney(c.volume)}</p>
                <p className="text-[10.5px] text-muted">{c.txns} transactions</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
