"use client";
/** Aggregate Benefit Timeline — travel through every protection's lifecycle. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock3, ShieldCheck, ShoppingBag, AlertTriangle, Flag } from "lucide-react";
import { api, fmtDate, daysLeft } from "@/lib/api";
import { Card, Empty, cx } from "@/components/ui";

const kindMeta: Record<string, { icon: any; tone: string }> = {
  purchase: { icon: ShoppingBag, tone: "#a1a1aa" },
  protection_start: { icon: ShieldCheck, tone: "#34d399" },
  return_end: { icon: Flag, tone: "#f472b6" },
  coverage_end: { icon: AlertTriangle, tone: "#fbbf24" },
  claim_deadline: { icon: Clock3, tone: "#f87171" },
};

export default function Timeline() {
  const [events, setEvents] = useState<any[] | null>(null);
  const [view, setView] = useState<"upcoming" | "past" | "all">("upcoming");

  useEffect(() => {
    api<{ events: any[] }>("/api/timeline").then(d => setEvents(d.events)).catch(() => setEvents([]));
  }, []);

  const now = Date.now();
  const filtered = (events ?? []).filter(e => {
    const t = new Date(e.at).getTime();
    return view === "all" ? true : view === "upcoming" ? t >= now : t < now;
  });
  const sorted = view === "past" ? [...filtered].reverse() : filtered;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono text-[11px] font-semibold uppercase tracking-widest text-primary">Benefit Timeline</p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">Your protection lifecycle</h1>
        </div>
        <div className="flex gap-1.5">
          {(["upcoming", "past", "all"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cx("mono cursor-pointer rounded-full border px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide transition-colors",
                view === v ? "border-primary/40 bg-primary/12 text-primary" : "border-border text-muted hover:text-white")}>{v}</button>
          ))}
        </div>
      </div>

      {events === null ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-[14px]" />)}</div>
      ) : sorted.length === 0 ? (
        <Empty icon={<Clock3 size={32} strokeWidth={1.5} />} title={`No ${view} events`} hint="Protected purchases generate lifecycle events automatically." />
      ) : (
        <Card className="!p-8">
          <div className="relative ml-2 border-l border-border pl-8">
            {sorted.map((ev, i) => {
              const meta = kindMeta[ev.kind] ?? kindMeta.purchase;
              const past = new Date(ev.at).getTime() < now;
              return (
                <motion.div key={ev.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.6), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="relative pb-8 last:pb-0">
                  <span className="absolute -left-[45px] flex h-7 w-7 items-center justify-center rounded-full border-2 bg-surface"
                    style={{ borderColor: past ? "#27272a" : meta.tone, color: past ? "#a1a1aa" : meta.tone }}>
                    <meta.icon size={13} />
                  </span>
                  <Link href={`/wallet/${ev.benefit_id}`} className="group block">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <p className={cx("text-[14px] font-medium transition-colors group-hover:text-primary", past && "text-muted")}>{ev.label}</p>
                      <span className="mono text-[10.5px] uppercase tracking-wide text-muted">
                        {fmtDate(ev.at)}{!past && ` · in ${daysLeft(ev.at)}d`}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-muted">{ev.description} · {ev.merchant} · {ev.benefit_type}</p>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
