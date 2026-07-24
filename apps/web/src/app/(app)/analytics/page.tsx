"use client";
/** Benefit Insights — "Your card protected ₹X this month." */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, compactMoney, money } from "@/lib/api";
import { Card, CardSkeleton, Stat } from "@/components/ui";
import { Bars, Donut, TrendArea, PALETTE } from "@/components/charts";

export default function Insights() {
  const [a, setA] = useState<any>(null);

  useEffect(() => { api("/api/analytics").then(setA).catch(() => {}); }, []);

  if (!a) return (
    <div className="space-y-6">
      <div className="skeleton h-8 w-64 rounded-[8px]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} rows={2} />)}</div>
      <div className="grid gap-6 lg:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-72 rounded-[16px]" />)}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[11px] font-semibold uppercase tracking-widest text-primary">Benefit Insights</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">
          Your card protected <span className="text-primary">{compactMoney(a.protectedSpend30d)}</span> of purchases this month
        </h1>
      </div>

      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Protection Rate", value: `${a.protectionRate}%`, sub: "of eligible spend covered", accent: "#34d399" },
          { label: "Active Coverage Value", value: compactMoney(a.coverageValue), sub: `${a.protectedCount} protections`, accent: "#818cf8" },
          { label: "Potential Savings", value: compactMoney(a.potentialSavings), sub: "estimated annual value", accent: "#f472b6" },
          { label: "Unused Benefits", value: a.unusedBenefits, sub: "waiting for activation", accent: "#fbbf24" },
        ].map(s => (
          <motion.div key={s.label} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}>
            <Stat {...s} />
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-[15px] font-semibold">Monthly spend vs protected</h2>
          <TrendArea data={a.monthly} x="month" series={[{ key: "spend", label: "Spend", color: "#3f3f46" }, { key: "protected", label: "Protected", color: "#818CF8" }]} />
        </Card>
        <Card>
          <h2 className="mb-4 text-[15px] font-semibold">Coverage by category</h2>
          {a.byCategory.length ? (
            <div className="grid items-center gap-4 sm:grid-cols-[1fr_10rem]">
              <div className="h-60 min-w-0"><Donut data={a.byCategory} nameKey="category" valueKey="coverage" /></div>
              <div className="space-y-2">
                {a.byCategory.slice(0, 6).map((c: any, i: number) => (
                  <div key={c.category} className="flex items-center gap-2 text-[11.5px]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="mono flex-1 truncate uppercase tracking-wide text-muted">{c.category}</span>
                    <span className="font-semibold">{compactMoney(c.coverage)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="py-16 text-center text-sm text-muted">No coverage yet.</p>}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-[15px] font-semibold">Benefits per category</h2>
          <Bars data={a.byCategory} x="category" y="benefits" money={false} color="#F472B6" />
        </Card>
        <Card className="flex flex-col justify-center bg-gradient-to-br from-primary/12 to-accent/8 text-center">
          <p className="mono text-[11px] font-semibold uppercase tracking-widest text-muted">Recovered via claims</p>
          <p className="mt-3 text-4xl font-medium text-mint">{money(a.claims.recovered)}</p>
          <p className="mt-2 text-[13px] text-muted">{a.claims.approved} of {a.claims.total} claims approved</p>
          <p className="mono mt-6 text-[11px] uppercase tracking-widest text-muted">Coverage expiring ≤ 14 days</p>
          <p className="mt-1 text-2xl font-medium text-amber">{a.expiringSoon}</p>
        </Card>
      </div>
    </div>
  );
}
