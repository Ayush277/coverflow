"use client";
/** Authenticated app shell — sidebar, topbar, ⌘K command palette, SSE live updates. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, WalletCards, FileCheck2, Bell, ChartSpline, Clock3, Sparkles,
  Settings, UserRound, Search, LogOut, ShieldCheck, Users, Scale, Radar, ScrollText, ChevronRight, Command,
  Store, CreditCard, BookOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api, API, getAccessToken } from "@/lib/api";
import { Badge, cx, useToast } from "./ui";
import { CoverFlowMark } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const customerNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/store", label: "Demo Store", icon: Store },
  { href: "/wallet", label: "Benefit Wallet", icon: WalletCards },
  { href: "/cards", label: "My Cards", icon: CreditCard },
  { href: "/claims", label: "Claims", icon: FileCheck2 },
  { href: "/timeline", label: "Timeline", icon: Clock3 },
  { href: "/analytics", label: "Insights", icon: ChartSpline },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/how-it-works", label: "How It Works", icon: BookOpen },
];
const adminNav = [
  { href: "/admin", label: "Overview", icon: ShieldCheck },
  { href: "/admin/claims", label: "Claims Review", icon: Scale },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/rules", label: "Benefit Rules", icon: ScrollText },
  { href: "/admin/fraud", label: "Fraud Monitor", icon: Radar },
];

export function Shell({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [unread, setUnread] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // auth guard + role guard
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (admin && user.role === "CUSTOMER") router.replace("/dashboard");
  }, [user, loading, admin, router]);

  // unread badge
  useEffect(() => {
    if (!user) return;
    api<{ unread: number }>("/api/notifications").then(d => setUnread(d.unread)).catch(() => {});
  }, [user, pathname]);

  // SSE: live transactions / benefits / notifications
  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;
    const es = new EventSource(`${API}/api/stream?token=${encodeURIComponent(token)}`);
    es.addEventListener("transaction", (e: MessageEvent) => {
      const t = JSON.parse(e.data);
      toast({ tone: "info", title: `New transaction · ${t.merchant}`, body: `${t.description} — ₹${Math.round(t.amount).toLocaleString("en-IN")}` });
      window.dispatchEvent(new CustomEvent("cf:transaction", { detail: t }));
    });
    es.addEventListener("benefit", (e: MessageEvent) => {
      const b = JSON.parse(e.data);
      toast({ tone: "success", title: "Protection activated", body: `${b.benefit_type} · ${b.rule_name}` });
      setUnread(u => u + 1);
      window.dispatchEvent(new CustomEvent("cf:benefit", { detail: b }));
    });
    return () => es.close();
  }, [user?.id]); // eslint-disable-line

  // ⌘K
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen(o => !o); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  const nav = admin ? adminNav : customerNav;
  const showAdminSwitch = user.role !== "CUSTOMER";

  return (
    <div className="relative flex h-screen overflow-hidden bg-bg-subtle">
      <div className="mesh fixed inset-0 opacity-[0.45]"><span className="m1" /><span className="m2" /><span className="m3" /></div>
      {/* sidebar */}
      <aside className="relative z-10 hidden w-[248px] shrink-0 flex-col border-r border-border bg-surface/70 backdrop-blur-xl md:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 border-b border-border px-5 py-[18px]">
          <CoverFlowMark size={30} />
          <div>
            <p className="text-[14.5px] font-semibold leading-none tracking-[-0.02em]">CoverFlow</p>
            <p className="label mt-1.5 text-[9.5px] text-faint">{admin ? "Admin" : "Benefit OS"}</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          <p className="label px-3 pb-2 pt-2 text-faint">{admin ? "Operations" : "Workspace"}</p>
          {nav.map(item => {
            const active = pathname === item.href || (item.href !== "/admin" && item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={cx("group relative flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13.5px] transition-colors",
                  active ? "bg-primary/8 font-medium text-primary" : "text-muted hover:bg-bg-subtle hover:text-text")}>
                {active && <span className="absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-r-full bg-primary" />}
                <item.icon size={16} strokeWidth={active ? 2.2 : 1.9} />
                <span>{item.label}</span>
                {item.href === "/notifications" && unread > 0 && (
                  <span className="tnum ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">{unread > 99 ? "99+" : unread}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-0.5 border-t border-border p-3">
          {showAdminSwitch && (
            <Link href={admin ? "/dashboard" : "/admin"} className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13.5px] text-muted transition-colors hover:bg-bg-subtle hover:text-text">
              {admin ? <LayoutDashboard size={16} strokeWidth={1.9} /> : <ShieldCheck size={16} strokeWidth={1.9} />} {admin ? "Customer view" : "Admin portal"}
            </Link>
          )}
          <Link href="/profile" className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13.5px] text-muted transition-colors hover:bg-bg-subtle hover:text-text"><UserRound size={16} strokeWidth={1.9} /> Profile</Link>
          <Link href="/settings" className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13.5px] text-muted transition-colors hover:bg-bg-subtle hover:text-text"><Settings size={16} strokeWidth={1.9} /> Settings</Link>
        </div>
      </aside>

      {/* main */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="relative z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/70 px-4 backdrop-blur-xl md:px-6">
          <button onClick={() => setPaletteOpen(true)}
            className="flex h-8.5 w-full max-w-xs cursor-pointer items-center gap-2 rounded-[8px] border border-border bg-bg-subtle px-3 text-[13px] text-faint transition-colors hover:border-[color-mix(in_srgb,var(--ink)_16%,var(--line))]">
            <Search size={14} /> Search…
            <span className="label ml-auto flex items-center gap-0.5 rounded border border-border bg-surface px-1.5 py-0.5 text-[9.5px] text-faint"><Command size={9} />K</span>
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Link href="/notifications" className="relative flex h-8.5 w-8.5 items-center justify-center rounded-[8px] text-muted transition-colors hover:bg-bg-subtle hover:text-text">
              <Bell size={16} strokeWidth={1.9} />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
            </Link>
            <div className="group relative">
              <button className="flex cursor-pointer items-center gap-2 rounded-[8px] py-1 pl-1 pr-2 transition-colors hover:bg-bg-subtle">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white">
                  {user.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                </span>
                <span className="hidden text-[13px] font-medium sm:block">{user.name.split(" ")[0]}</span>
              </button>
              <div className="card invisible absolute right-0 top-full z-40 mt-1.5 w-52 p-1.5 opacity-0 shadow-[0_16px_40px_-16px_rgba(17,24,39,.3)] transition-all group-hover:visible group-hover:opacity-100">
                <div className="border-b border-border px-2.5 pb-2 pt-1.5">
                  <p className="truncate text-[13px] font-medium">{user.name}</p>
                  <p className="truncate text-[11.5px] text-faint">{user.email}</p>
                </div>
                <div className="px-2.5 py-2"><Badge tone={user.role === "ADMIN" ? "APPROVED" : user.role === "SUPPORT" ? "HIGH" : "NORMAL"}>{user.role}</Badge></div>
                <button onClick={logout} className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-left text-[13px] text-muted transition-colors hover:bg-bg-subtle hover:text-text">
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1180px] px-5 py-7 md:px-8">{children}</div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

/* ── ⌘K Command Palette (global search) ── */
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setQ(""); setResults([]); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);

  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(() => api<{ results: any[] }>(`/api/search?q=${encodeURIComponent(q)}`).then(d => { setResults(d.results); setIdx(0); }).catch(() => {}), 180);
    return () => clearTimeout(t);
  }, [q]);

  const go = (r: any) => { onClose(); router.push(r.href); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-start justify-center bg-[rgba(17,24,39,.4)] pt-[15vh] backdrop-blur-[2px]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="card w-full max-w-xl overflow-hidden shadow-[0_24px_64px_-24px_rgba(17,24,39,.3)]"
            initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.98 }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search size={16} className="text-muted" />
              <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(results.length - 1, i + 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
                  if (e.key === "Enter" && results[idx]) go(results[idx]);
                }}
                placeholder="Search everything…" className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted/50" />
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {q.length >= 2 && results.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">No results for “{q}”</p>}
              {results.map((r, i) => (
                <button key={`${r.type}-${r.id}`} onClick={() => go(r)} onMouseEnter={() => setIdx(i)}
                  className={cx("flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors", i === idx ? "bg-primary/12" : "")}>
                  <Badge tone={r.type === "benefit" ? "ACTIVE" : r.type === "claim" ? "IN_REVIEW" : "NORMAL"}>{r.type}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{r.title}</p>
                    <p className="truncate text-xs text-muted">{r.subtitle}</p>
                  </div>
                  <ChevronRight size={14} className="text-muted" />
                </button>
              ))}
              {q.length < 2 && (
                <div className="space-y-0.5 p-1">
                  {[...customerNav].map(n => (
                    <button key={n.href} onClick={() => { onClose(); router.push(n.href); }}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-left text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-text">
                      <n.icon size={15} /> {n.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
