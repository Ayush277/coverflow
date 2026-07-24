"use client";
/**
 * Atmospheric "global infrastructure" layers (Seamless Integrations + Global
 * Infrastructure references). Rebuilt with the Canvas 2D API + SVG so they stay
 * performant and dependency-free, and sit strictly behind the interface.
 *
 *  IntegrationField — drifting node/connection particle field (the seamless-
 *                     integrations effect). `variant` tunes density/opacity so
 *                     the same layer works as a bright hero or a faint ambient
 *                     background app-wide.
 *  GlobalMesh       — the hero focal: merchants, card networks and protection
 *                     engines orbiting a central CoverFlow core, with data
 *                     packets travelling the links ("deploy globally").
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, Zap, ReceiptText, Cpu, Plane, Gem, Headphones, ShoppingBag, Lock, ChartSpline, Globe } from "lucide-react";

/* ── Particle connection field ─────────────────────────────────────────────── */
export function IntegrationField({
  className = "", variant = "hero", interactive = false,
}: { className?: string; variant?: "hero" | "ambient"; interactive?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduce) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // colours + alpha come from theme CSS vars so the field flips with light/dark
    const css = getComputedStyle(document.documentElement);
    const node = css.getPropertyValue("--field-node").trim() || "99,102,241";
    const line = css.getPropertyValue("--field-line").trim() || "129,140,248";
    const tA = parseFloat(css.getPropertyValue("--field-alpha")) || 0.5;
    const cfg = variant === "hero"
      ? { per: 12000, max: 150, link: 140, dot: 1.6, node, line, nodeA: 0.7 * tA, lineA: 0.5 * tA }
      : { per: 22000, max: 120, link: 120, dot: 1.2, node, line, nodeA: 0.55 * tA, lineA: 0.35 * tA };

    let raf = 0, w = 0, h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const mouse = { x: -9999, y: -9999 };
    let pts: { x: number; y: number; vx: number; vy: number }[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      w = parent?.clientWidth ?? window.innerWidth;
      h = parent?.clientHeight ?? window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(cfg.max, Math.floor((w * h) / cfg.per));
      pts = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    };
    if (interactive) window.addEventListener("mousemove", onMove);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        if (interactive) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
          if (d < 120 && d > 0.01) { p.x += (dx / d) * 0.5; p.y += (dy / d) * 0.5; }
        }
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < cfg.link) {
            ctx.strokeStyle = `rgba(${cfg.line},${(1 - d / cfg.link) * cfg.lineA})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = `rgba(${cfg.node},${cfg.nodeA})`;
      for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, cfg.dot, 0, Math.PI * 2); ctx.fill(); }
      raf = requestAnimationFrame(draw);
    };
    draw();

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduce, variant, interactive]);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none ${className}`} />;
}

/* ── Global benefit mesh (hero focal) ──────────────────────────────────────── */
const RINGS: { r: number; dur: number; dir: 1 | -1; nodes: ReactNode[] }[] = [
  { r: 78, dur: 26, dir: 1, nodes: [
    <Zap key="z" size={15} />, <ShieldCheck key="s" size={15} />, <ReceiptText key="r" size={15} />,
  ] },
  { r: 132, dur: 40, dir: -1, nodes: [
    <Cpu key="c" size={15} />, <ShoppingBag key="b" size={15} />, <Gem key="g" size={15} />,
    <Plane key="p" size={15} />, <Headphones key="h" size={15} />,
  ] },
  { r: 188, dur: 58, dir: 1, nodes: [
    <Globe key="gl" size={15} />, <Lock key="l" size={15} />, <ChartSpline key="ch" size={15} />, <ShieldCheck key="s2" size={15} />,
  ] },
];

export function GlobalMesh({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const C = 240; // centre of 480 viewBox

  // decorative animated SVG — render client-only to avoid SSR/client float mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className={className} aria-hidden />;

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 480 480" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="link" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* faint orbit rings */}
        {RINGS.map((ring, i) => (
          <circle key={i} cx={C} cy={C} r={ring.r} fill="none" stroke="rgba(147,197,253,0.12)" strokeWidth="1" strokeDasharray="2 6" />
        ))}

        {/* core glow */}
        <circle cx={C} cy={C} r="120" fill="url(#core-glow)" />

        {/* rotating rings with nodes, links and travelling packets */}
        {RINGS.map((ring, ri) => (
          <motion.g key={ri} style={{ originX: "240px", originY: "240px" }}
            animate={reduce ? undefined : { rotate: ring.dir * 360 }}
            transition={{ repeat: Infinity, ease: "linear", duration: ring.dur }}>
            {ring.nodes.map((node, ni) => {
              const a = (ni / ring.nodes.length) * Math.PI * 2;
              // round to a fixed precision so SSR and client emit identical strings (no hydration mismatch)
              const nx = Math.round((C + Math.cos(a) * ring.r) * 100) / 100;
              const ny = Math.round((C + Math.sin(a) * ring.r) * 100) / 100;
              return (
                <g key={ni}>
                  <line x1={C} y1={C} x2={nx} y2={ny} stroke="url(#link)" strokeWidth="1.25" />
                  {!reduce && (
                    <motion.circle r="2.4" fill="#bfdbfe"
                      animate={{ cx: [C, nx], cy: [C, ny], opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 2.4, delay: (ni + ri) * 0.5, ease: "easeInOut" }} />
                  )}
                  {/* node chip — counter-rotate to stay upright */}
                  <g transform={`translate(${nx} ${ny})`}>
                    <motion.g style={{ originX: "0px", originY: "0px" }}
                      animate={reduce ? undefined : { rotate: ring.dir * -360 }}
                      transition={{ repeat: Infinity, ease: "linear", duration: ring.dur }}>
                      <circle r="17" fill="rgba(15,23,42,0.92)" stroke="rgba(147,197,253,0.35)" strokeWidth="1" />
                      <foreignObject x="-11" y="-11" width="22" height="22">
                        <div className="flex h-[22px] w-[22px] items-center justify-center text-[#bfdbfe]">{node}</div>
                      </foreignObject>
                    </motion.g>
                  </g>
                </g>
              );
            })}
          </motion.g>
        ))}

        {/* central CoverFlow core */}
        <circle cx={C} cy={C} r="30" fill="rgba(10,10,20,0.95)" stroke="rgba(147,197,253,0.5)" strokeWidth="1.5" />
        <foreignObject x={C - 16} y={C - 16} width="32" height="32">
          <div className="flex h-8 w-8 items-center justify-center">
            <ShieldCheck size={20} className="text-[#93c5fd]" />
          </div>
        </foreignObject>
        {!reduce && (
          <circle cx={C} cy={C} r="30" fill="none" stroke="#3b82f6" strokeWidth="1.5">
            <animate attributeName="r" values="30;120" dur="3.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0" dur="3.5s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
    </div>
  );
}
