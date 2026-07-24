"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileCheck2, Plus } from "lucide-react";
import { api, money, fmtDate } from "@/lib/api";
import { Badge, Button, Card, Empty } from "@/components/ui";

export default function Claims() {
  const [claims, setClaims] = useState<any[] | null>(null);

  useEffect(() => {
    api<{ claims: any[] }>("/api/claims").then(d => setClaims(d.claims)).catch(() => setClaims([]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono text-[11px] font-semibold uppercase tracking-widest text-primary">Claims Center</p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">Your claims</h1>
        </div>
        <Link href="/claims/new"><Button><Plus size={15} /> New claim</Button></Link>
      </div>

      {claims === null ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-[16px]" />)}</div>
      ) : claims.length === 0 ? (
        <Empty icon={<FileCheck2 size={32} strokeWidth={1.5} />} title="No claims yet"
          hint="If something happens to a protected purchase, your claim is already 90% prepared."
          action={<Link href="/claims/new"><Button size="sm">Start a claim</Button></Link>} />
      ) : (
        <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }} className="space-y-3">
          {claims.map(c => (
            <motion.div key={c.id} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}>
              <Link href={`/claims/${c.id}`}>
                <Card hover className="flex flex-wrap items-center gap-4 !py-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary"><FileCheck2 size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{c.claim_type.replace(/_/g, " ")} · {c.description}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">{c.merchant} · {c.benefit_type} · filed {fmtDate(c.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="mono text-[14px] font-semibold">{money(c.amount_requested)}</p>
                    {c.fraud_score >= 50 && <p className="mono text-[10px] font-semibold text-[#f87171]">risk {c.fraud_score}</p>}
                  </div>
                  <Badge tone={c.status}>{c.status.replace("_", " ")}</Badge>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
