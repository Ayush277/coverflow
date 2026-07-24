"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bell, ShieldCheck, ReceiptText, Clock3, FileCheck2, Sparkles, CheckCheck } from "lucide-react";
import { api, timeAgo } from "@/lib/api";
import { Badge, Button, Card, Empty, cx } from "@/components/ui";

const kindIcon: Record<string, any> = {
  PROTECTION: ShieldCheck, RECEIPT: ReceiptText, EXPIRY: Clock3, CLAIM: FileCheck2, INSIGHT: Sparkles, REMINDER: Bell, INFO: Bell,
};
const kindTone: Record<string, string> = {
  PROTECTION: "#34d399", RECEIPT: "#818cf8", EXPIRY: "#fbbf24", CLAIM: "#f472b6", INSIGHT: "#60a5fa", REMINDER: "#fbbf24", INFO: "#a1a1aa",
};

export default function Notifications() {
  const [items, setItems] = useState<any[] | null>(null);

  const load = () => api<{ notifications: any[] }>("/api/notifications").then(d => setItems(d.notifications)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const markAll = async () => {
    await api("/api/notifications/read", { method: "POST", body: JSON.stringify({}) });
    load();
  };
  const markOne = async (id: string) => {
    await api("/api/notifications/read", { method: "POST", body: JSON.stringify({ ids: [id] }) });
    setItems(p => p?.map(n => n.id === id ? { ...n, read: 1 } : n) ?? null);
  };

  const unread = items?.filter(n => !n.read).length ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono text-[11px] font-semibold uppercase tracking-widest text-primary">Smart Notifications</p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">Notifications {unread > 0 && <span className="text-accent">({unread})</span>}</h1>
        </div>
        {unread > 0 && <Button size="sm" variant="outline" onClick={markAll}><CheckCheck size={14} /> Mark all read</Button>}
      </div>

      {items === null ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-[16px]" />)}</div>
      ) : items.length === 0 ? (
        <Empty icon={<Bell size={32} strokeWidth={1.5} />} title="All quiet" hint="Personalized reminders about coverage, receipts and claims land here." />
      ) : (
        <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }} className="space-y-2.5">
          {items.map(n => {
            const Icon = kindIcon[n.kind] ?? Bell;
            const tone = kindTone[n.kind] ?? "#a1a1aa";
            const inner = (
              <Card hover className={cx("flex items-start gap-3.5 !p-4", !n.read && "border-primary/30 bg-primary/[0.04]")}>
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: `${tone}1c`, color: tone }}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13.5px] font-semibold">{n.title}</p>
                    {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{n.body}</p>
                  <div className="mono mt-1.5 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted">
                    <span>{timeAgo(n.created_at)}</span>
                    {["HIGH", "URGENT"].includes(n.priority) && <Badge tone={n.priority}>{n.priority}</Badge>}
                  </div>
                </div>
              </Card>
            );
            return (
              <motion.div key={n.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
                onClick={() => !n.read && markOne(n.id)}>
                {n.link ? <Link href={n.link}>{inner}</Link> : inner}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
