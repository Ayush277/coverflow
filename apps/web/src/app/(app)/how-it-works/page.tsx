"use client";
/** How CoverFlow Works — the problem, the architecture, and the live data flow. */
import { motion } from "framer-motion";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, Zap, ScrollText, WalletCards, ReceiptText, Clock3,
  Sparkles, ChartSpline, ShieldCheck, Database, Radio, Cloud, Cpu, Server, Lock, GitBranch,
} from "lucide-react";
import { Badge, Card, cx } from "@/components/ui";

const ease = [0.22, 1, 0.36, 1] as const;
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } };

const OLD_WAY = ["Purchase", "Forget", "Lose receipt", "Damage happens", "Google the benefits", "Call support", "Hunt for PDFs", "Fill the claim", "Rejected"];
const NEW_WAY = ["Purchase", "AI detects protection", "Receipt auto-saved", "Coverage activated", "Timeline begins", "Issue happens", "Claim pre-filled", "One-click approval"];

const ENGINES = [
  { icon: Zap, name: "Purchase Intelligence", role: "Consumes every card authorization in real time and hands it to the rules engine.", where: "events/consumers.ts" },
  { icon: ScrollText, name: "Benefit Knowledge", role: "Coverage rules live in the database as versioned configuration — new countries or cards are config, not code.", where: "benefit_rules table" },
  { icon: ShieldCheck, name: "Benefit Decision", role: "Evaluates each rule and emits an explainable trace, then activates, schedules a reminder, or defers to manual.", where: "engines/rules.ts" },
  { icon: WalletCards, name: "Digital Benefit Wallet", role: "Each protected purchase becomes an interactive card with its own Benefit Passport.", where: "benefits table" },
  { icon: ReceiptText, name: "Receipt Intelligence", role: "OCR extracts merchant, invoice, amount and serial number, then auto-links receipts to transactions.", where: "engines/ocr.ts" },
  { icon: Clock3, name: "Benefit Timeline", role: "Generates the lifecycle: protection start, return window, coverage end, claim deadline.", where: "timeline_events table" },
  { icon: Sparkles, name: "Claim Assistant", role: "Pre-fills every field from the passport, classifies the incident, scores confidence.", where: "engines/assistant.ts" },
  { icon: ChartSpline, name: "Benefit Insights", role: "Customer-facing value proof and executive analytics for the issuer.", where: "/analytics · /admin" },
];

const PIPELINE = [
  { label: "Card authorization", detail: "Demo Store checkout or Stripe Issuing mock", icon: Radio, tone: "#34D399" },
  { label: "Pub/Sub event", detail: "transactions.created published to the bus", icon: Cloud, tone: "#60A5FA" },
  { label: "Purchase Intelligence", detail: "Consumer picks up the event", icon: Zap, tone: "#818CF8" },
  { label: "Rule evaluation", detail: "Every active rule scored, trace recorded", icon: Cpu, tone: "#818CF8" },
  { label: "Benefit activated", detail: "Wallet card + timeline generated", icon: ShieldCheck, tone: "#F472B6" },
  { label: "Notification + SSE", detail: "Customer sees it live, no refresh", icon: Sparkles, tone: "#FBBF24" },
];

const STACK = [
  { layer: "Frontend", icon: Server, items: ["Next.js 15 App Router", "React 19 + TypeScript", "Tailwind v4 · Framer Motion", "Recharts · SSE client"] },
  { layer: "API Gateway", icon: GitBranch, items: ["Node + Express", "JWT access + refresh rotation", "Google OAuth", "RBAC middleware · Zod validation"] },
  { layer: "Business Services", icon: Cpu, items: ["Spring Boot 3 core service", "Decision Engine + JPA", "Flyway migrations", "JUnit rule tests"] },
  { layer: "AI Services", icon: Sparkles, items: ["Python FastAPI", "OCR pipeline", "RAG over policy library", "Claim classification"] },
  { layer: "Data", icon: Database, items: ["PostgreSQL + pgvector", "Redis cache", "SQLite for local dev", "Versioned migrations + seed"] },
  { layer: "Cloud & Events", icon: Cloud, items: ["Google Pub/Sub", "AWS Lambda × 3", "Docker Compose", "S3 receipt storage"] },
];

export default function HowItWorks() {
  return (
    <div className="space-y-14 pb-10">
      {/* header */}
      <motion.div initial="hidden" animate="show" variants={rise}>
        <p className="mono text-[11px] font-semibold uppercase tracking-widest text-primary">Architecture & Product Documentation</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-medium leading-tight tracking-tight">
          How CoverFlow turns a card swipe into <span className="text-primary">active protection</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
          This page documents the problem we set out to solve, the architecture that solves it, and the exact
          path a single transaction takes through the system. Everything described here is running live — you
          can trigger it yourself from the <Link href="/store" className="text-primary hover:underline">Demo Store</Link>.
        </p>
      </motion.div>

      {/* problem */}
      <motion.section initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={rise}>
        <div className="mb-5 flex items-center gap-2.5">
          <AlertTriangle size={17} className="text-[#f87171]" />
          <h2 className="text-xl font-medium tracking-tight">The problem</h2>
        </div>
        <Card className="border-[#f87171]/20">
          <p className="text-[14px] leading-relaxed text-text/85">
            Premium cards bundle genuinely valuable protection — purchase protection, extended warranty, return
            protection, travel cover. Almost nobody uses it. The benefits are invisible at the moment of purchase
            and only surface after something has already gone wrong, by which point the receipt is gone, the
            coverage window has often closed, and the customer doesn't know what they were entitled to.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              { stat: "After the fact", label: "Benefits activate only when a customer files a claim" },
              { stat: "Receipt lost", label: "The single most common reason claims get rejected" },
              { stat: "Window closed", label: "Coverage silently expires while customers are unaware" },
            ].map(s => (
              <div key={s.stat} className="rounded-[12px] border border-border bg-bg/50 p-4">
                <p className="text-[15px] font-semibold text-[#f87171]">{s.stat}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[14px] leading-relaxed text-text/85">
            The result is bad for both sides: customers don't feel the value of the annual fee, and the issuer
            carries the cost of a benefit programme that drives neither retention nor engagement.
          </p>
        </Card>
      </motion.section>

      {/* the shift */}
      <motion.section initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={rise}>
        <h2 className="mb-5 text-xl font-medium tracking-tight">The shift: activate at purchase, not at claim</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <Badge tone="REJECTED">Today</Badge>
            <div className="mt-4 space-y-1.5">
              {OLD_WAY.map((s, i) => (
                <div key={s} className="flex items-center gap-2.5">
                  <span className="mono w-5 shrink-0 text-[10px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span className={cx("text-[13px]", i >= OLD_WAY.length - 2 ? "text-[#f87171]" : "text-muted")}>{s}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="border-mint/25">
            <Badge tone="APPROVED">CoverFlow</Badge>
            <div className="mt-4 space-y-1.5">
              {NEW_WAY.map((s, i) => (
                <div key={s} className="flex items-center gap-2.5">
                  <span className="mono w-5 shrink-0 text-[10px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span className={cx("text-[13px]", i >= NEW_WAY.length - 2 ? "text-mint" : "text-text/85")}>{s}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-border pt-3 text-[12.5px] leading-relaxed text-muted">
              Steps 2–5 happen with zero user action, within milliseconds of the authorization landing.
            </p>
          </Card>
        </div>
      </motion.section>

      {/* live pipeline */}
      <motion.section initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={rise}>
        <h2 className="mb-2 text-xl font-medium tracking-tight">The live data flow</h2>
        <p className="mb-5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
          One transaction, end to end. This is not a diagram of an intended design — it is the actual call path,
          and you can watch it fire by checking out in the Demo Store or hitting <b className="text-text">Simulate live purchase</b>.
        </p>
        <Card className="dotgrid">
          <div className="grid gap-3 lg:grid-cols-6">
            {PIPELINE.map((p, i) => (
              <motion.div key={p.label} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5, ease }} className="relative">
                <div className="h-full rounded-[12px] border border-border bg-bg/70 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: `${p.tone}1c`, color: p.tone }}>
                    <p.icon size={16} />
                  </div>
                  <p className="mono mt-3 text-[9.5px] font-bold uppercase tracking-widest text-muted">step {i + 1}</p>
                  <p className="mt-1 text-[13px] font-semibold leading-tight">{p.label}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{p.detail}</p>
                </div>
                {i < PIPELINE.length - 1 && (
                  <ArrowRight size={13} className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-muted/40 lg:block" />
                )}
              </motion.div>
            ))}
          </div>
          <div className="mono mt-5 overflow-x-auto rounded-[10px] border border-border bg-bg/80 p-4 text-[11.5px] leading-relaxed text-muted">
            <span className="text-mint">POST /api/store/checkout</span>{"  →  "}
            <span className="text-text">transactions</span> row{"  →  "}
            <span className="text-blue">bus.publish(&quot;transactions.created&quot;)</span>{"  →  "}
            <span className="text-text">evaluateTransaction()</span>{"  →  "}
            <span className="text-primary">activateBenefits()</span>{"  →  "}
            <span className="text-text">benefits</span> + <span className="text-text">timeline_events</span> rows{"  →  "}
            <span className="text-accent">notify()</span> + <span className="text-accent">sseBroadcast()</span>{"  →  "}
            browser toast
          </div>
        </Card>
      </motion.section>

      {/* engines */}
      <motion.section initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={rise}>
        <h2 className="mb-5 text-xl font-medium tracking-tight">The eight engines</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {ENGINES.map((e, i) => (
            <motion.div key={e.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: (i % 2) * 0.07, duration: 0.5, ease }}>
              <Card hover className="h-full">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary/12 text-primary"><e.icon size={17} /></div>
                  <div>
                    <h3 className="text-[14px] font-semibold">{e.name}</h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{e.role}</p>
                    <p className="mono mt-2 text-[10px] uppercase tracking-wide text-primary/70">{e.where}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* stack */}
      <motion.section initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={rise}>
        <h2 className="mb-5 text-xl font-medium tracking-tight">Architecture layers</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map(s => (
            <Card key={s.layer} hover className="h-full">
              <div className="flex items-center gap-2.5">
                <s.icon size={16} className="text-primary" />
                <h3 className="mono text-[11px] font-bold uppercase tracking-widest">{s.layer}</h3>
              </div>
              <div className="mt-3.5 space-y-1.5">
                {s.items.map(i => (
                  <p key={i} className="flex items-start gap-2 text-[12.5px] text-muted">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" /> {i}
                  </p>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </motion.section>

      {/* design decisions */}
      <motion.section initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={rise}>
        <h2 className="mb-5 text-xl font-medium tracking-tight">Decisions worth defending</h2>
        <div className="space-y-3">
          {[
            { title: "Rules are data, not code", body: "Coverage lives in the benefit_rules table with versioning. Adding a country, tier or product category is an admin action — no deploy, no engineer. Open Admin → Benefit Rules and edit one; the very next transaction is evaluated against it.", icon: ScrollText },
            { title: "Every decision is explainable", body: "Each activated benefit stores the full rule-evaluation trace. The Benefit Passport's \"Why is this covered?\" renders it check by check — tier, category, country, amount, exclusions. No black box, which matters for a regulated financial product.", icon: ShieldCheck },
            { title: "Consumers are idempotent", body: "A UNIQUE(transaction_id, rule_id) constraint means a replayed Pub/Sub event physically cannot double-activate coverage. At-least-once delivery is safe by construction rather than by careful coding.", icon: GitBranch },
            { title: "AI degrades gracefully", body: "With an OpenAI key the assistant generates; with the FastAPI service it runs real OCR; with neither it falls back to deterministic retrieval grounded in the same policy library and live user data. The product never shows a broken feature.", icon: Sparkles },
            { title: "Card data is never stored", body: "Only the last four digits and the tier are persisted. There is no column for a PAN, CVV or expiry — the demo number is checksum-validated in memory and discarded. Production swaps the form for network tokenization.", icon: Lock },
          ].map((d, i) => (
            <motion.div key={d.title} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.45, ease }}>
              <Card className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent/12 text-accent"><d.icon size={16} /></div>
                <div>
                  <h3 className="text-[14px] font-semibold">{d.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{d.body}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* business value */}
      <motion.section initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={rise}>
        <h2 className="mb-5 text-xl font-medium tracking-tight">What the issuer gets</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { v: "Higher utilisation", d: "Benefits activate themselves, so usage stops depending on customer awareness." },
            { v: "Retention", d: "\"Your card protected ₹11L this month\" is a concrete answer to the annual-fee question." },
            { v: "Lower support load", d: "Claims arrive pre-filled and pre-validated, with receipts already attached." },
            { v: "Product intelligence", d: "Which benefits get used, which never do, where fraud clusters — feeding the next card design." },
          ].map(b => (
            <Card key={b.v} hover className="h-full">
              <p className="text-[14px] font-semibold text-primary">{b.v}</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{b.d}</p>
            </Card>
          ))}
        </div>
      </motion.section>

      {/* try it */}
      <motion.section initial="hidden" whileInView="show" viewport={{ once: true }} variants={rise}>
        <Card className="bg-gradient-to-br from-primary/12 to-accent/8 text-center">
          <h2 className="text-xl font-medium tracking-tight">See it happen</h2>
          <p className="mx-auto mt-2 max-w-lg text-[13.5px] leading-relaxed text-muted">
            Buy a MacBook in the Demo Store and watch the toast fire, the wallet card appear, the timeline
            generate and the receipt attach — in under a second, with no page refresh.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/store"><button className="flex h-10 cursor-pointer items-center gap-2 rounded-[8px] bg-primary px-5 text-sm font-semibold text-[#0e0e10] transition-colors hover:bg-[#818cf8]">Open Demo Store <ArrowRight size={15} /></button></Link>
            <Link href="/wallet"><button className="flex h-10 cursor-pointer items-center rounded-[8px] border border-border px-5 text-sm font-medium transition-colors hover:bg-surface-2">Benefit Wallet</button></Link>
          </div>
        </Card>
      </motion.section>
    </div>
  );
}
