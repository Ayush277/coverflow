"use client";
/** CoverFlow UI kit — shadcn-style primitives themed to the Capital/Aurora tokens. */
import { createContext, useContext, useEffect, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X, Inbox } from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

/* ── Button ── */
type BtnVariant = "primary" | "accent" | "ghost" | "outline" | "danger";
export function Button({ variant = "primary", size = "md", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg" }) {
  const variants: Record<BtnVariant, string> = {
    primary: "btn-shine bg-primary text-white font-medium shadow-[0_6px_18px_-6px_rgba(45,140,255,.85)] hover:brightness-[1.06] active:brightness-95",
    accent: "bg-text text-bg font-medium hover:opacity-90",
    ghost: "bg-transparent text-muted hover:text-text hover:bg-bg-subtle",
    outline: "border border-border bg-surface text-text hover:bg-bg-subtle hover:border-[color-mix(in_srgb,var(--ink)_18%,var(--line))]",
    danger: "border border-rose/30 bg-rose/8 text-rose hover:bg-rose/14",
  };
  const sizes = { sm: "h-8 px-3 text-[13px]", md: "h-9.5 px-4 text-[13.5px]", lg: "h-11 px-5 text-[15px]" };
  return <button className={cx("inline-flex items-center justify-center gap-2 rounded-[8px] transition-all disabled:opacity-45 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg", variants[variant], sizes[size], className)} {...props} />;
}

/* ── Card ── */
export function Card({ className, children, hover }: { className?: string; children: ReactNode; hover?: boolean }) {
  return <div className={cx("card p-6", hover && "lift", className)}>{children}</div>;
}

/* ── Badge ── */
const badgeTones: Record<string, string> = {
  ACTIVE: "bg-mint/10 text-mint border-mint/25",
  EXPIRING: "bg-amber/10 text-amber border-amber/30",
  EXPIRED: "bg-bg-subtle text-faint border-border",
  CLAIMED: "bg-primary/10 text-primary border-primary/25",
  PENDING_ACTIVATION: "bg-amber/10 text-amber border-amber/30",
  DRAFT: "bg-bg-subtle text-faint border-border",
  SUBMITTED: "bg-primary/10 text-primary border-primary/25",
  IN_REVIEW: "bg-amber/10 text-amber border-amber/30",
  APPROVED: "bg-mint/10 text-mint border-mint/25",
  PAID: "bg-mint/10 text-mint border-mint/25",
  REJECTED: "bg-rose/10 text-rose border-rose/25",
  WITHDRAWN: "bg-bg-subtle text-faint border-border",
  AUTO: "bg-mint/10 text-mint border-mint/25",
  REMINDER: "bg-amber/10 text-amber border-amber/30",
  MANUAL: "bg-primary/10 text-primary border-primary/25",
  URGENT: "bg-rose/10 text-rose border-rose/25",
  HIGH: "bg-amber/10 text-amber border-amber/30",
  NORMAL: "bg-primary/10 text-primary border-primary/25",
  LOW: "bg-bg-subtle text-faint border-border",
};
export function Badge({ children, tone, className }: { children: ReactNode; tone?: string; className?: string }) {
  return <span className={cx("label inline-flex items-center rounded-full border px-2 py-[3px] text-[10px]", badgeTones[tone ?? ""] ?? "bg-bg-subtle text-faint border-border", className)}>{children}</span>;
}

/* ── Inputs ── */
export function Input({ className, label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="label mb-1.5 block text-muted">{label}</span>}
      <input className={cx("h-9.5 w-full rounded-[8px] border border-border bg-surface px-3 text-[13.5px] text-text placeholder:text-faint outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20", error && "border-rose", className)} {...props} />
      {error && <span className="mt-1 block text-xs text-[#f87171]">{error}</span>}
    </label>
  );
}
export function Textarea({ className, label, ...props }: any) {
  return (
    <label className="block">
      {label && <span className="label mb-1.5 block text-muted">{label}</span>}
      <textarea className={cx("w-full rounded-[8px] border border-border bg-surface p-3 text-[13.5px] text-text placeholder:text-faint outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20", className)} {...props} />
    </label>
  );
}
export function Select({ className, label, children, ...props }: any) {
  return (
    <label className="block">
      {label && <span className="label mb-1.5 block text-muted">{label}</span>}
      <select className={cx("h-9.5 w-full rounded-[8px] border border-border bg-surface px-3 text-[13.5px] text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 [&>option]:bg-surface", className)} {...props}>{children}</select>
    </label>
  );
}

/* ── Skeleton / loading ── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton rounded-[8px]", className)} />;
}
export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card>
      <Skeleton className="mb-4 h-4 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="mb-2.5 h-3 w-full" />)}
    </Card>
  );
}

/* ── Empty state ── */
export function Empty({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-border bg-bg-subtle py-16 text-center">
      <div className="mb-3 text-muted/60">{icon ?? <Inbox size={32} strokeWidth={1.5} />}</div>
      <p className="text-sm font-medium text-text">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ── Modal ── */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,24,39,.45)] p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className={cx("card w-full p-6 shadow-[0_24px_64px_-24px_rgba(17,24,39,.28)]", wide ? "max-w-2xl" : "max-w-md")}
            initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }} onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">{title}</h3>
              <button onClick={onClose} className="cursor-pointer text-muted transition-colors hover:text-text"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Toasts ── */
interface Toast { id: number; title: string; body?: string; tone: "success" | "error" | "info" }
const ToastCtx = createContext<{ toast: (t: Omit<Toast, "id">) => void }>(null!);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = (t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 5200);
  };
  const icons = { success: <CheckCircle2 size={16} className="text-mint" />, error: <AlertTriangle size={16} className="text-[#f87171]" />, info: <Info size={16} className="text-primary" /> };
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className="card pointer-events-auto p-3.5 shadow-[0_16px_40px_-16px_rgba(17,24,39,.3)]">
              <div className="flex items-start gap-2.5">
                {icons[t.tone]}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight">{t.title}</p>
                  {t.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{t.body}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ── Stat tile ── */
export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        {accent && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} />}
        <p className="label text-faint">{label}</p>
      </div>
      <p className="tnum mt-3 text-[30px] font-medium leading-none tracking-[-0.03em] text-text">{value}</p>
      {sub && <div className="mt-2 text-[12.5px] leading-snug text-muted">{sub}</div>}
    </Card>
  );
}

/* ── Count-up number (shared with the marketing site) ── */
export function Count({ to, prefix = "", suffix = "", duration = 1.5, delay = 0.2, format }: {
  to: number; prefix?: string; suffix?: string; duration?: number; delay?: number; format?: (n: number) => string;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now() + delay * 1000;
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / (duration * 1000)));
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p); // easeOutExpo
      setN(to * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, delay]);
  return <>{prefix}{format ? format(n) : Math.round(n).toLocaleString("en-IN")}{suffix}</>;
}

/* ── Progress ── */
export function Progress({ value, tone }: { value: number; tone?: string }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-bg-sunken">
      <motion.div className="h-full rounded-full" style={{ background: tone ?? "var(--brand)" }}
        initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, value))}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}
