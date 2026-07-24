"use client";
/**
 * Digital Benefit Wallet — bento glass cards (Aurora reference).
 * Each protection is a glass card with an embedded mini protection-preview UI;
 * the most valuable active protection is featured as a gradient highlight card.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Search, Clock3, ReceiptText, Sparkles, ArrowUpRight, CircleCheck, CircleDashed } from "lucide-react";
import { api, compactMoney, money, fmtDate, daysLeft } from "@/lib/api";
import { Badge, Card, Empty, Progress, cx } from "@/components/ui";
import { Photo, CATEGORY_IMAGE } from "@/components/media";

const FILTERS = ["ALL", "ACTIVE", "EXPIRING", "PENDING_ACTIVATION", "CLAIMED", "EXPIRED"] as const;
const ease = [0.22, 1, 0.36, 1] as const;

const typeTone: Record<string, string> = {
  "Purchase Protection": "#6366f1", "Extended Warranty": "#34d399",
  "Return Protection": "#06b6d4", "Travel Insurance": "#60a5fa",
};

const pct = (b: any) => {
  const total = Math.max(1, (new Date(b.coverageEnd).getTime() - new Date(b.coverageStart).getTime()) / 86400_000);
  return Math.max(0, Math.min(100, (daysLeft(b.coverageEnd) / total) * 100));
};

export default function Wallet() {
  const [benefits, setBenefits] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [q, setQ] = useState("");

  useEffect(() => {
    setBenefits(null);
    const params = new URLSearchParams();
    if (filter !== "ALL") params.set("status", filter);
    if (q) params.set("q", q);
    const t = setTimeout(() => api<{ benefits: any[] }>(`/api/benefits?${params}`).then(d => setBenefits(d.benefits)).catch(() => setBenefits([])), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [filter, q]);

  // feature the highest-limit active protection when browsing everything
  const featured = filter === "ALL" && !q && benefits
    ? benefits.filter(b => ["ACTIVE", "EXPIRING"].includes(b.status)).sort((a, b) => b.coverageLimit - a.coverageLimit)[0]
    : null;
  const rest = benefits?.filter(b => b.id !== featured?.id) ?? [];

  return (
    <div className="space-y-6">
      <div className="fade-in">
        <div className="mono inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-medium text-text/70 ring-1 ring-border">
          <ShieldCheck size={13} className="text-primary" /> Digital Benefit Wallet
        </div>
        <h1 className="mt-4 text-4xl font-normal tracking-tighter">Your <span className="grad-text">protections</span></h1>
        <p className="mt-2 text-[15px] text-muted">Every eligible purchase, turned into a living protection card.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search purchases…"
            className="h-10 w-64 rounded-[12px] border border-border bg-surface-2 pl-10 pr-3 text-[13px] outline-none backdrop-blur-sm transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/25" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cx("mono cursor-pointer rounded-full px-3.5 py-2 text-[10.5px] font-semibold uppercase tracking-wide ring-1 transition-all",
                filter === f ? "bg-surface-2 text-text ring-border" : "text-muted ring-border hover:text-text hover:bg-surface-2")}>
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {benefits === null ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-64 rounded-[24px]" />)}</div>
      ) : benefits.length === 0 ? (
        <Empty icon={<ShieldCheck size={32} strokeWidth={1.5} />} title="No protections match"
          hint={q || filter !== "ALL" ? "Try a different search or filter." : "Buy something in the Demo Store to see the wallet fill up."} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {featured && <FeaturedCard b={featured} />}
          {rest.map((b, i) => <WalletCard key={b.id} b={b} i={i} />)}
        </div>
      )}
    </div>
  );
}

/* Highlight card — gradient + oversized product glyph, spans two columns (cards.md middle card). */
function FeaturedCard({ b }: { b: any }) {
  const tone = typeTone[b.benefitType] ?? "#6366f1";
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}
      className="lg:col-span-2 lg:row-span-1">
      <Link href={`/wallet/${b.id}`} className="group relative block h-full overflow-hidden rounded-[24px] ring-1 ring-border lift">
        <img src={CATEGORY_IMAGE[b.category]} alt="" aria-hidden loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-40 transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${tone}44, rgba(3,7,18,0.55) 55%, ${tone}22)` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/60 to-[#030712]/20" />
        <div className="relative flex h-full flex-col justify-between p-6 md:p-8">
          <div className="flex items-start justify-between">
            <div className="mono inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-white/90 ring-1 ring-white/20 backdrop-blur">
              <Sparkles size={12} style={{ color: "#fff" }} /> Featured protection
            </div>
            <Badge tone={b.status}>{b.status.replace("_", " ")}</Badge>
          </div>
          <div className="mt-10">
            <h3 className="text-2xl font-normal tracking-tighter text-white md:text-3xl">{b.description}</h3>
            <p className="mt-1.5 text-sm text-white/70">{b.merchant} · {b.card.tier} ••{b.card.last4} · {fmtDate(b.purchasedAt)}</p>
            <div className="mt-6 grid max-w-md grid-cols-3 gap-4">
              {[
                { k: "Coverage", v: b.benefitType, c: "#c7d2fe" },
                { k: "Limit", v: compactMoney(b.coverageLimit) },
                { k: b.status === "EXPIRED" ? "Ended" : "Remaining", v: b.status === "EXPIRED" ? "—" : `${daysLeft(b.coverageEnd)}d` },
              ].map(s => (
                <div key={s.k}>
                  <p className="mono text-[10px] uppercase tracking-widest text-white/60">{s.k}</p>
                  <p className="mt-1 truncate text-[15px] font-semibold text-white" style={s.c ? { color: s.c } : undefined}>{s.v}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 max-w-md"><Progress value={pct(b)} tone={b.status === "EXPIRING" ? "#fbbf24" : undefined} /></div>
            <div className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-white/90">
              Open Benefit Passport <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* Standard bento card with an embedded mini protection-preview panel (cards.md card 1 & 3). */
function WalletCard({ b, i }: { b: any; i: number }) {
  const tone = typeTone[b.benefitType] ?? "#6366f1";
  const receiptStored = !!b.receipt;
  const steps = [
    { label: "Protection active", done: true },
    { label: b.status === "EXPIRED" ? "Coverage ended" : "Coverage running", done: b.status === "EXPIRED" },
    { label: "Claim window", done: b.status === "CLAIMED" },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: Math.min(i * 0.06, 0.5), ease }}>
      <Link href={`/wallet/${b.id}`}>
        <Card hover className="group h-full !p-5">
          <div className="flex items-start justify-between gap-3">
            <Photo category={b.category} alt={b.description} rounded="rounded-[14px]" className="h-12 w-12 shrink-0" />
            <Badge tone={b.status}>{b.status.replace("_", " ")}</Badge>
          </div>
          <h3 className="mt-4 truncate text-xl font-normal tracking-tighter">{b.description}</h3>
          <p className="mt-1 text-[13px] text-muted">{b.merchant} · {fmtDate(b.purchasedAt)}</p>

          {/* embedded mini protection-preview UI */}
          <div className="glass-inset mt-4 rounded-[16px] p-4">
            <div className="flex items-center justify-between">
              <span className="mono inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide" style={{ color: tone }}>
                <ShieldCheck size={12} /> {b.benefitType}
              </span>
              <span className="mono inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2 py-0.5 text-[9.5px] uppercase tracking-wide text-text/60 ring-1 ring-border">
                <span className={cx("h-1.5 w-1.5 rounded-full", b.status === "EXPIRED" ? "bg-muted" : b.status === "EXPIRING" ? "bg-amber" : "bg-mint")} />
                {b.status === "EXPIRED" ? "ended" : `${daysLeft(b.coverageEnd)}d left`}
              </span>
            </div>
            <div className="mt-3"><Progress value={pct(b)} tone={b.status === "EXPIRING" ? "#fbbf24" : b.status === "EXPIRED" ? "#3f3f46" : tone} /></div>
            <div className="mt-3 space-y-1.5">
              {steps.map(s => (
                <div key={s.label} className="flex items-center gap-2 text-[11px] text-text/70">
                  {s.done ? <CircleCheck size={12} style={{ color: tone }} /> : <CircleDashed size={12} className="text-text/30" />}
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          <div className="mono mt-3 flex items-center justify-between text-[10.5px] uppercase tracking-wide text-muted">
            <span className="inline-flex items-center gap-1.5">
              <ReceiptText size={12} className={receiptStored ? "text-mint" : "text-text/30"} />
              {receiptStored ? "receipt stored" : "no receipt"}
            </span>
            <span>limit {compactMoney(b.coverageLimit)}</span>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
