"use client";
/** Fraud Monitor — risk events and high-risk users. */
import { useEffect, useState } from "react";
import { Radar, ShieldAlert } from "lucide-react";
import { api, fmtDateTime } from "@/lib/api";
import { Badge, Card, Empty, cx } from "@/components/ui";

export default function AdminFraud() {
  const [data, setData] = useState<any>(null);

  useEffect(() => { api("/api/admin/fraud").then(setData).catch(() => setData({ logs: [], riskyUsers: [] })); }, []);

  if (!data) return <div className="space-y-4"><div className="skeleton h-8 w-64 rounded-[8px]" />{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-[16px]" />)}</div>;

  const tone = (s: number) => s >= 50 ? "#f87171" : s >= 30 ? "#fbbf24" : "#34d399";

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[11px] font-semibold uppercase tracking-widest text-accent">Fraud Detection</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Risk monitor</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-[15px] font-semibold">Scoring events</h2>
          {data.logs.length === 0 ? (
            <Empty icon={<Radar size={32} strokeWidth={1.5} />} title="No fraud events" hint="Every claim submission is scored automatically." />
          ) : (
            <div className="space-y-2.5">
              {data.logs.map((f: any) => (
                <Card key={f.id} className={cx("!p-4", f.score >= 50 && "border-[#f87171]/40")}>
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                      <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#27272a" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke={tone(f.score)} strokeWidth="3"
                          strokeDasharray={`${(f.score / 100) * 97.4} 97.4`} strokeLinecap="round" />
                      </svg>
                      <span className="mono absolute text-[11px] font-bold" style={{ color: tone(f.score) }}>{f.score}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium">{f.user_name} <span className="text-muted">· {f.user_email}</span></p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {f.flags.length === 0 ? <span className="mono text-[10px] uppercase tracking-wide text-mint">clean submission</span>
                          : f.flags.map((fl: string) => (
                            <span key={fl} className="mono rounded-full bg-[#f87171]/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#f87171]">{fl.replace(/_/g, " ")}</span>
                          ))}
                      </div>
                    </div>
                    <span className="mono shrink-0 text-[10.5px] uppercase text-muted">{fmtDateTime(f.created_at)}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-[15px] font-semibold">High-risk users</h2>
          {data.riskyUsers.length === 0 ? (
            <Card><p className="py-6 text-center text-[13px] text-muted">No users above risk threshold.</p></Card>
          ) : data.riskyUsers.map((u: any) => (
            <Card key={u.id} className="flex items-center gap-3 !p-4">
              <ShieldAlert size={18} className="shrink-0 text-[#f87171]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">{u.name}</p>
                <p className="truncate text-[11.5px] text-muted">{u.email} · {u.events} event{u.events > 1 ? "s" : ""}</p>
              </div>
              <Badge tone="URGENT">{u.max_score}</Badge>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
