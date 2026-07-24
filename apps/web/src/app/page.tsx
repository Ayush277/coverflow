"use client";
/* CoverFlow — marketing site.
   Design system merged from Aether Protocol · Nexura · Nimbus:
   white page punctuated by deep navy panels, single blue accent,
   Inter display against JetBrains Mono labels, crisp 1px borders. */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  ArrowRight, ArrowUpRight, Check, Minus, Zap, ShieldCheck, ReceiptText, Clock3,
  Sparkles, ChartSpline, ScrollText, WalletCards, Radar,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { CoverFlowMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { CATEGORY_IMAGE } from "@/components/media";

const EASE = [0.22, 1, 0.36, 1] as const;

/* Scroll reveal — one primitive, used everywhere. Restrained. */
function Rise({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 18 }} animate={seen ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

function SectionHead({ index, kicker, title, lead, dark }: { index: string; kicker: string; title: string; lead?: string; dark?: boolean }) {
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3">
        <span className={`label ${dark ? "text-white/40" : "text-faint"}`}>{index}</span>
        <span className={`h-px w-8 ${dark ? "bg-white/20" : "bg-border"}`} />
        <span className="label text-primary">{kicker}</span>
      </div>
      <h2 className={`h2 mt-5 ${dark ? "text-white" : "text-text"}`}>{title}</h2>
      {lead && <p className={`lead mt-4 ${dark ? "text-white/60" : ""}`}>{lead}</p>}
    </div>
  );
}

const MERCHANTS = ["Apple Store", "Amazon", "Croma", "Reliance Digital", "Tanishq", "MakeMyTrip", "Taj Hotels", "Nike", "IKEA", "B&H Photo"];

const ENGINES = [
  { icon: Zap, name: "Purchase Intelligence", desc: "Reads every card authorization the moment it clears." },
  { icon: ScrollText, name: "Benefit Knowledge", desc: "Coverage rules stored as versioned configuration, not code." },
  { icon: ShieldCheck, name: "Decision Engine", desc: "Activates protection with a full, explainable evaluation trace." },
  { icon: ReceiptText, name: "Receipt Intelligence", desc: "OCR captures merchant, invoice, serial number and warranty." },
  { icon: Clock3, name: "Benefit Timeline", desc: "Return window, warranty, coverage end and claim deadline." },
  { icon: Sparkles, name: "Claim Assistant", desc: "Pre-fills the claim; you answer one question." },
  { icon: Radar, name: "Fraud Detection", desc: "Risk-scores every claim with named, auditable flags." },
  { icon: ChartSpline, name: "Benefit Insights", desc: "Shows exactly what the card protected each month." },
];

/* Real coverage terms from the platform's seeded rule set — not invented. */
const TIERS = [
  {
    name: "Green", tagline: "Everyday cover",
    rows: [["Purchase Protection", "₹50,000"], ["Extended Warranty", false], ["Return Protection", false], ["Travel Insurance", false]],
  },
  {
    name: "Gold", tagline: "Most purchases", featured: false,
    rows: [["Purchase Protection", "₹50,000"], ["Extended Warranty", "+1 year"], ["Return Protection", false], ["Travel Insurance", "₹5,00,000"]],
  },
  {
    name: "Platinum", tagline: "Full coverage", featured: true,
    rows: [["Purchase Protection", "₹1,00,000"], ["Extended Warranty", "+1 year"], ["Return Protection", "₹25,000"], ["Travel Insurance", "₹5,00,000"]],
  },
];

const STEPS = [
  { n: "01", t: "Purchase detected", d: "A card authorization arrives and is matched against your active coverage rules." },
  { n: "02", t: "Protection activated", d: "The right benefit switches on automatically and the receipt is attached." },
  { n: "03", t: "Lifecycle tracked", d: "Return window, warranty and claim deadline are monitored for you." },
  { n: "04", t: "Claim prepared", d: "If something happens, the claim is already filled in — you just confirm." },
];

export default function Landing() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="bg-bg">
      {/* ═══ Nav ═══ */}
      <motion.header
        initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, ease: EASE }}
        className="fixed inset-x-0 top-3 z-50 flex justify-center px-4 md:top-5">
        <motion.div animate={{ scale: scrolled ? 0.985 : 1 }} transition={{ duration: 0.35, ease: EASE }}
          className="nav-blob flex items-center gap-2 rounded-full py-2 pl-3 pr-2 md:gap-5 md:pl-5 md:pr-2.5">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <CoverFlowMark size={26} glow={false} />
            <span className="text-[14.5px] font-semibold tracking-[-0.02em]">CoverFlow</span>
          </Link>

          <span className="hidden h-5 w-px bg-border md:block" />

          <nav className="hidden items-center gap-1 md:flex">
            {[["Platform", "#platform"], ["Engines", "#engines"], ["Coverage", "#coverage"], ["Lifecycle", "#lifecycle"]].map(([l, h]) => (
              <a key={l} href={h}
                className="rounded-full px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-bg-subtle hover:text-text">{l}</a>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <ThemeToggle className="!h-8 !w-8 !rounded-full !border-0 !bg-transparent hover:!bg-bg-subtle" />
            {user ? (
              <Link href="/dashboard" className="btn-shine flex h-8.5 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-medium text-white shadow-[0_4px_14px_-4px_rgba(45,140,255,.8)] transition-all hover:brightness-[1.06]">
                <span>Dashboard</span> <ArrowRight size={13} />
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden h-8.5 items-center rounded-full px-3 text-[13px] text-muted transition-colors hover:bg-bg-subtle hover:text-text sm:flex">Log in</Link>
                <Link href="/register" className="btn-shine flex h-8.5 items-center rounded-full bg-primary px-4 text-[13px] font-medium text-white shadow-[0_4px_14px_-4px_rgba(45,140,255,.8)] transition-all hover:brightness-[1.06]">
                  <span>Get started</span>
                </Link>
              </>
            )}
          </div>
        </motion.div>
      </motion.header>

      {/* ═══ Hero ═══ */}
      <Hero user={user} />

      {/* ═══ Trust strip ═══ */}
      <section className="border-b border-border bg-bg-subtle py-7">
        <p className="label mb-5 text-center text-faint">Monitoring eligible purchases across</p>
        <div className="marquee-mask overflow-hidden">
          <div className="flex w-max animate-marquee items-center gap-10 px-5">
            {[...MERCHANTS, ...MERCHANTS].map((m, i) => (
              <span key={i} className="whitespace-nowrap text-[15px] font-medium tracking-[-0.01em] text-faint">{m}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 01 Platform — light band, asymmetric ═══ */}
      <section id="platform" className="mx-auto max-w-[1180px] px-5 py-24 md:px-8 md:py-32">
        <Rise><SectionHead index="01" kicker="Platform"
          title="Protection is decided at checkout, not at claim time."
          lead="The moment an authorization lands, CoverFlow evaluates it against your card's coverage rules and activates what applies — no forms, no reminders, no user action." /></Rise>

        <div className="mt-14 grid gap-px overflow-hidden rounded-[16px] border border-border bg-border md:grid-cols-3">
          {[
            { k: "Detects", t: "Every authorization", d: "Merchant, category, country, amount and card tier are read in real time.", icon: Zap },
            { k: "Decides", t: "Against live rules", d: "Configurable coverage rules produce an explainable activation trace.", icon: ShieldCheck },
            { k: "Delivers", t: "A ready claim", d: "Receipt attached, timeline running, claim pre-filled from day one.", icon: Sparkles },
          ].map((c, i) => (
            <Rise key={c.k} delay={i * 0.08}>
              <div className="h-full bg-surface p-7">
                <c.icon size={18} className="text-primary" strokeWidth={2} />
                <p className="label mt-5 text-faint">{c.k}</p>
                <h3 className="h3 mt-2">{c.t}</h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{c.d}</p>
              </div>
            </Rise>
          ))}
        </div>
      </section>

      {/* ═══ 02 Wallet — DEEP band ═══ */}
      <section className="deep relative overflow-hidden border-x-0">
        <div className="dotgrid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid max-w-[1180px] items-center gap-14 px-5 py-24 md:px-8 md:py-32 lg:grid-cols-2">
          <Rise>
            <SectionHead dark index="02" kicker="Digital benefit wallet"
              title="Purchases become living protection records."
              lead="Not a transaction list — a wallet of protections. Each one carries its coverage window, stored receipt, full timeline and a one-tap claim." />
            <ul className="mt-8 space-y-3.5">
              {["Coverage window tracked automatically", "Receipts captured, parsed and attached", "Claim prepared before anything goes wrong"].map(p => (
                <li key={p} className="flex items-start gap-3 text-[14.5px] text-white/80">
                  <Check size={15} className="mt-1 shrink-0 text-primary" strokeWidth={2.5} /> {p}
                </li>
              ))}
            </ul>
            <Link href="/login" className="mt-9 inline-flex items-center gap-1.5 text-[14px] font-medium text-white transition-colors hover:text-primary">
              Explore the wallet <ArrowUpRight size={15} />
            </Link>
          </Rise>
          <Rise delay={0.12}><WalletPanel /></Rise>
        </div>
      </section>

      {/* ═══ 03 Engines bento ═══ */}
      <section id="engines" className="mx-auto max-w-[1180px] px-5 py-24 md:px-8 md:py-32">
        <Rise><SectionHead index="03" kicker="Architecture" title="Eight engines, one continuous lifecycle." /></Rise>
        <div className="mt-14 grid gap-px overflow-hidden rounded-[16px] border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {ENGINES.map((e, i) => (
            <Rise key={e.name} delay={(i % 4) * 0.06}>
              <div className="group h-full bg-surface p-6 transition-colors hover:bg-bg-subtle">
                <e.icon size={17} className="text-muted transition-colors group-hover:text-primary" strokeWidth={1.9} />
                <h3 className="mt-5 text-[14.5px] font-semibold tracking-[-0.01em]">{e.name}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{e.desc}</p>
              </div>
            </Rise>
          ))}
        </div>
      </section>

      {/* ═══ 04 Coverage comparison ═══ */}
      <section id="coverage" className="border-y border-border bg-bg-subtle">
        <div className="mx-auto max-w-[1180px] px-5 py-24 md:px-8 md:py-32">
          <Rise><SectionHead index="04" kicker="Coverage"
            title="What each card tier already includes."
            lead="These are the live rules running in the platform's Benefit Knowledge Engine — editable by an administrator without a deploy." /></Rise>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {TIERS.map((t, i) => (
              <Rise key={t.name} delay={i * 0.08}>
                <div className={`flex h-full flex-col rounded-[16px] border p-7 ${t.featured ? "border-primary bg-surface shadow-[0_1px_3px_rgba(17,24,39,.06),0_16px_40px_-20px_rgba(45,140,255,.35)]" : "border-border bg-surface"}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{t.name}</h3>
                    {t.featured && <span className="label rounded-full bg-primary px-2 py-1 text-[9.5px] text-white">Widest</span>}
                  </div>
                  <p className="mt-1 text-[13.5px] text-muted">{t.tagline}</p>
                  <div className="mt-7 space-y-0">
                    {t.rows.map(([label, val], ri) => (
                      <div key={ri} className="flex items-center justify-between border-t border-border py-3 first:border-t-0 first:pt-0">
                        <span className="text-[13.5px] text-muted">{label as string}</span>
                        {val ? (
                          <span className="tnum text-[13.5px] font-medium text-text">{val as string}</span>
                        ) : (
                          <Minus size={14} className="text-faint" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Rise>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 05 Lifecycle ═══ */}
      <section id="lifecycle" className="mx-auto max-w-[1180px] px-5 py-24 md:px-8 md:py-32">
        <Rise><SectionHead index="05" kicker="Lifecycle" title="You never think about insurance again." /></Rise>
        <div className="mt-14 grid gap-px overflow-hidden rounded-[16px] border border-border bg-border md:grid-cols-4">
          {STEPS.map((s, i) => (
            <Rise key={s.n} delay={i * 0.08}>
              <div className="h-full bg-surface p-7">
                <span className="mono text-[26px] font-medium leading-none tracking-tight text-primary">{s.n}</span>
                <h3 className="mt-6 text-[14.5px] font-semibold tracking-[-0.01em]">{s.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.d}</p>
              </div>
            </Rise>
          ))}
        </div>
      </section>

      {/* ═══ CTA — deep ═══ */}
      <section className="deep relative overflow-hidden">
        <div className="dotgrid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-[1180px] px-5 py-24 text-center md:px-8 md:py-32">
          <Rise>
            <CoverFlowMark size={44} className="mx-auto" glow={false} />
            <h2 className="display-s mx-auto mt-8 max-w-2xl text-white">Every purchase, quietly protected.</h2>
            <p className="mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-white/60">
              Sign in with the demo account and watch a live purchase turn into activated coverage in under a second.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={user ? "/dashboard" : "/register"} className="group flex h-11 items-center justify-center gap-2 rounded-[8px] bg-primary px-6 text-[14.5px] font-medium text-white transition-all hover:brightness-[1.08]">
                Get started <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/login" className="flex h-11 items-center justify-center rounded-[8px] border border-white/20 px-6 text-[14.5px] font-medium text-white transition-colors hover:bg-white/10">
                Live demo
              </Link>
            </div>
          </Rise>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-border bg-bg">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-2.5">
            <CoverFlowMark size={24} glow={false} />
            <span className="text-[14px] font-semibold tracking-[-0.02em]">CoverFlow</span>
          </div>
          <p className="label text-faint">Benefit Intelligence Platform · American Express Hackathon</p>
          <div className="flex gap-7">
            {[["Platform", "#platform"], ["Coverage", "#coverage"], ["Log in", "/login"]].map(([l, h]) => (
              <a key={l} href={h} className="text-[13px] text-muted transition-colors hover:text-text">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Hero — animated mesh, word-stagger headline, parallax glass ── */
function Hero({ user }: { user: any }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const slowX = useTransform(sx, v => v * 14);
  const slowY = useTransform(sy, v => v * 14);
  // 3D tilt for the live panel
  const tiltY = useTransform(sx, v => v * 9);   // rotateY follows horizontal
  const tiltX = useTransform(sy, v => v * -6);  // rotateX follows vertical (inverted)

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const words = "Card benefits that use themselves.".split(" ");

  return (
    <section onMouseMove={onMove} className="relative overflow-hidden border-b border-border">
      <div className="mesh"><span className="m1" /><span className="m2" /><span className="m3" /></div>
      <div className="gridlines pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,#000_15%,transparent_65%)]" />

      <div className="relative mx-auto max-w-[1180px] px-5 pt-32 md:px-8 md:pt-40">
        <div className="max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
            className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5">
            <span className="ping text-primary" />
            <span className="label text-muted">Benefit intelligence platform</span>
          </motion.div>

          {/* word-by-word masked reveal */}
          <h1 className="display mt-7 text-text [overflow-wrap:anywhere]">
            {words.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <motion.span className="inline-block" initial={{ y: "110%" }} animate={{ y: 0 }}
                  transition={{ duration: 0.85, delay: 0.1 + i * 0.075, ease: EASE }}>
                  {w === "themselves." ? <span className="grad-text">{w}</span> : w}
                  {i < words.length - 1 && " "}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
            className="lead mt-6 max-w-xl">
            CoverFlow reads every purchase in real time, switches on the protection your card
            already includes, files the receipt, and keeps the claim ready before you need it.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6, ease: EASE }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href={user ? "/dashboard" : "/register"}
              className="btn-shine group flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-[14.5px] font-medium text-white shadow-[0_10px_28px_-8px_rgba(45,140,255,.95)] transition-all hover:brightness-[1.06]">
              <span>Start protecting purchases</span> <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/login" className="glass-chip flex h-11 items-center justify-center gap-2 rounded-full px-6 text-[14.5px] font-medium text-text transition-colors hover:bg-bg-subtle">
              View live demo
            </Link>
            <span className="mono text-[12px] text-faint sm:ml-2">demo@coverflow.app</span>
          </motion.div>
        </div>

        {/* product panel — 3D tilt on mouse */}
        <motion.div style={{ x: slowX, y: slowY }} className="tilt-scene mt-16 md:mt-20"
          initial={{ opacity: 0, y: 34 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.7, ease: EASE }}>
          <motion.div className="tilt-target" style={{ rotateX: tiltX, rotateY: tiltY }}>
            <ProductPanel />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* Count-up number — animates to its value, then holds. */
function Count({ to, prefix = "", suffix = "", duration = 1.6, delay = 0.8 }: { to: number; prefix?: string; suffix?: string; duration?: number; delay?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now() + delay * 1000;
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / (duration * 1000)));
      // easeOutExpo
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setN(Math.round(to * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, delay]);
  return <>{prefix}{n.toLocaleString("en-IN")}{suffix}</>;
}

/* ── Hero product panel — deep navy, real app language ── */
const FEED_POOL = [
  { t: "MacBook Pro 14″", m: "Apple Store", a: 189000, s: "Purchase Protection", ok: true, img: CATEGORY_IMAGE.ELECTRONICS },
  { t: "Sony WH-1000XM5", m: "Croma", a: 26990, s: "Extended Warranty", ok: true, img: CATEGORY_IMAGE.ELECTRONICS },
  { t: "Flight DEL → SIN", m: "MakeMyTrip", a: 48500, s: "Travel Insurance", ok: true, img: CATEGORY_IMAGE.TRAVEL },
  { t: "Dyson V15 Detect", m: "Reliance Digital", a: 62900, s: "Extended Warranty", ok: true, img: CATEGORY_IMAGE.APPLIANCES },
  { t: "Diamond Pendant 18K", m: "Tanishq", a: 84000, s: "Purchase Protection", ok: true, img: CATEGORY_IMAGE.JEWELRY },
  { t: "Air Jordan 1 Retro", m: "Nike", a: 16995, s: "Purchase Protection", ok: true, img: CATEGORY_IMAGE.FASHION },
  { t: "Taj Palace · 2 nights", m: "Taj Hotels", a: 38000, s: "Travel Insurance", ok: true, img: CATEGORY_IMAGE.TRAVEL },
  { t: "Coffee & Croissant", m: "Starbucks", a: 850, s: "No coverage", ok: false, img: CATEGORY_IMAGE.DINING },
];

function ProductPanel() {
  // rolling live feed — a new authorization lands every few seconds
  const [cursor, setCursor] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const feed = setInterval(() => setCursor(c => (c + 1) % FEED_POOL.length), 3400);
    const clock = setInterval(() => setTick(t => t + 1), 1000);
    return () => { clearInterval(feed); clearInterval(clock); };
  }, []);

  const visible = Array.from({ length: 4 }, (_, i) => {
    const item = FEED_POOL[(cursor - i + FEED_POOL.length * 2) % FEED_POOL.length];
    return { ...item, key: `${cursor - i}`, age: i === 0 ? tick % 60 : i * 47 + (tick % 13) };
  });
  const ago = (s: number) => (s < 5 ? "just now" : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`);

  return (
    <div className="deep overflow-hidden rounded-[16px] shadow-[0_40px_80px_-32px_rgba(17,24,39,.45)]">
      {/* panel head */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="ping text-mint" />
          <span className="label text-white/60">Live protection feed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="label hidden text-white/30 sm:block">Streaming</span>
          <span className="flex gap-[3px]">
            {[0, 1, 2].map(i => (
              <motion.span key={i} className="h-3 w-[2px] rounded-full bg-primary/70"
                animate={{ scaleY: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.15, ease: "easeInOut" }} />
            ))}
          </span>
        </div>
      </div>

      {/* metrics — counting up */}
      <div className="grid gap-px bg-white/10 sm:grid-cols-3">
        <div className="bg-[var(--deep)] px-6 py-5">
          <p className="label text-white/40">Coverage value</p>
          <p className="tnum mt-2.5 text-[26px] font-medium leading-none tracking-[-0.03em] text-white">
            <Count to={970183} prefix="₹" delay={0.9} />
          </p>
          <p className="mt-1.5 text-[12px] text-white/45"><Count to={17} delay={1.1} duration={1.2} /> active protections</p>
        </div>
        <div className="bg-[var(--deep)] px-6 py-5">
          <p className="label text-white/40">Protection rate</p>
          <p className="tnum mt-2.5 text-[26px] font-medium leading-none tracking-[-0.03em] text-white">
            <Count to={99} suffix="%" delay={1} duration={1.4} />
          </p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-[#22d3ee]"
              initial={{ width: 0 }} animate={{ width: "99%" }} transition={{ delay: 1.1, duration: 1.5, ease: EASE }} />
          </div>
        </div>
        <div className="bg-[var(--deep)] px-6 py-5">
          <p className="label text-white/40">Claims ready</p>
          <p className="tnum mt-2.5 text-[26px] font-medium leading-none tracking-[-0.03em] text-white">
            <Count to={2} delay={1.15} duration={1} />
          </p>
          <p className="mt-1.5 text-[12px] text-white/45">pre-filled &amp; waiting</p>
        </div>
      </div>

      {/* streaming rows */}
      <div className="relative border-t border-white/10">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((r, i) => (
            <motion.div key={r.key} layout
              initial={{ opacity: 0, y: -22, scale: 0.98 }}
              animate={{ opacity: i === 3 ? 0.45 : 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex items-center gap-3.5 border-b border-white/[0.06] px-6 py-3 last:border-b-0">
              <img src={r.img} alt="" aria-hidden loading="lazy"
                className="h-9 w-9 shrink-0 rounded-[7px] object-cover ring-1 ring-white/15" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-white">{r.t}</p>
                <p className="mono truncate text-[11px] text-white/40">{r.m} · {ago(r.age)}</p>
              </div>
              <span className="tnum hidden text-[13px] text-white/70 sm:block">₹{r.a.toLocaleString("en-IN")}</span>
              <span className={`label shrink-0 rounded-full border px-2 py-1 text-[9.5px] ${r.ok ? "border-primary/35 bg-primary/15 text-[#7fb8ff]" : "border-white/10 bg-white/5 text-white/35"}`}>
                {r.ok ? r.s : "no cover"}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Wallet panel (inside the deep band) ── */
function WalletPanel() {
  return (
    <div className="rounded-[16px] border border-white/12 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="label text-white/40">Benefit passport</p>
          <h4 className="mt-2 text-[19px] font-semibold tracking-[-0.02em] text-white">Sony A7 IV Camera Body</h4>
          <p className="mono mt-1 text-[11.5px] text-white/45">B&H Photo · Platinum ••3005</p>
        </div>
        <span className="label rounded-full border border-[#34d399]/30 bg-[#34d399]/15 px-2 py-1 text-[9.5px] text-[#6ee7b7]">Active</span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {[["Coverage", "Extended Warranty"], ["Limit", "₹1,50,000"], ["Remaining", "365d"]].map(([k, v]) => (
          <div key={k}>
            <p className="label text-white/35">{k}</p>
            <p className="mt-1.5 text-[13px] font-medium text-white">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-primary" style={{ width: "78%" }} />
        </div>
      </div>

      <div className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
        {[["Purchase completed", true], ["Protection activated", true], ["Receipt attached", true], ["Claim window closes", false]].map(([l, done], i) => (
          <div key={i} className="flex items-center gap-2.5 text-[12.5px]">
            {done ? <Check size={13} className="text-primary" strokeWidth={2.5} /> : <Clock3 size={13} className="text-white/30" />}
            <span className={done ? "text-white/80" : "text-white/40"}>{l as string}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
