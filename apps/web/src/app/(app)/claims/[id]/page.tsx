"use client";
/** Claim detail — live status tracking, event log, withdraw. */
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, FileCheck2, CheckCircle2, Clock3, XCircle, CircleDot } from "lucide-react";
import { api, money, fmtDate, fmtDateTime } from "@/lib/api";
import { Badge, Button, Card, Empty, Modal, useToast, cx } from "@/components/ui";

const STATUS_STEPS = ["SUBMITTED", "IN_REVIEW", "DECIDED"];

export default function ClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(() => api(`/api/claims/${id}`).then(setData).catch(() => setNotFound(true)), [id]);
  useEffect(() => { load(); }, [load]);

  const withdraw = async () => {
    try {
      await api(`/api/claims/${id}/withdraw`, { method: "POST" });
      toast({ tone: "info", title: "Claim withdrawn", body: "The protection returned to active status." });
      setConfirmOpen(false); load();
    } catch (e: any) { toast({ tone: "error", title: "Could not withdraw", body: e.message }); }
  };

  if (notFound) return <Empty title="Claim not found" action={<Link href="/claims"><Button size="sm" variant="outline">Back to claims</Button></Link>} />;
  if (!data) return <div className="space-y-4"><div className="skeleton h-8 w-56 rounded-[8px]" /><div className="skeleton h-44 rounded-[16px]" /><div className="skeleton h-64 rounded-[16px]" /></div>;

  const { claim: c, events } = data;
  const decided = ["APPROVED", "REJECTED", "PAID", "WITHDRAWN"].includes(c.status);
  const stepIdx = c.status === "SUBMITTED" ? 0 : c.status === "IN_REVIEW" ? 1 : 2;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button onClick={() => router.back()} className="flex cursor-pointer items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-text">
        <ArrowLeft size={14} /> Back
      </button>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-primary/12 text-primary"><FileCheck2 size={22} /></div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-lg font-semibold tracking-tight">{c.claim_type.replace(/_/g, " ")} · {c.description}</h1>
                  <Badge tone={c.status}>{c.status.replace("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{c.merchant} · {c.benefit_type} · filed {fmtDate(c.created_at)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="mono text-xl font-semibold">{money(c.amount_requested)}</p>
              <p className="mono text-[10.5px] uppercase tracking-wide text-muted">requested</p>
            </div>
          </div>

          {/* progress */}
          <div className="mt-6 flex items-center gap-2">
            {STATUS_STEPS.map((s, i) => {
              const label = i === 2 ? (decided ? c.status : "DECISION") : s;
              const done = i < stepIdx || (i === 2 && decided);
              const current = i === stepIdx && !decided;
              const bad = i === 2 && ["REJECTED", "WITHDRAWN"].includes(c.status);
              return (
                <div key={s} className="flex flex-1 items-center gap-2">
                  <span className={cx("flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    bad ? "bg-[#f87171]/15 text-[#f87171]" : done ? "bg-mint/15 text-mint" : current ? "bg-amber/15 text-amber" : "bg-surface-2 text-muted")}>
                    {bad ? <XCircle size={14} /> : done ? <CheckCircle2 size={14} /> : current ? <Clock3 size={14} /> : <CircleDot size={14} />}
                  </span>
                  <span className={cx("mono hidden text-[10.5px] font-semibold uppercase tracking-wide sm:block", done || current ? "text-text" : "text-muted")}>
                    {label.replace("_", " ")}
                  </span>
                  {i < 2 && <span className={cx("h-px flex-1", done ? "bg-mint/40" : "bg-border")} />}
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {c.ai_summary && (
        <Card>
          <h2 className="mb-2 text-[15px] font-semibold">AI Summary</h2>
          <p className="text-[13px] leading-relaxed text-text/85">{c.ai_summary}</p>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 text-[15px] font-semibold">Incident</h2>
        <p className="text-[13px] leading-relaxed text-text/85">{c.incident_description}</p>
      </Card>

      <Card>
        <h2 className="mb-5 text-[15px] font-semibold">Activity</h2>
        <div className="relative ml-2 border-l border-border pl-6">
          {events.map((ev: any, i: number) => (
            <div key={ev.id} className="relative pb-6 last:pb-0">
              <span className={cx("absolute -left-[29px] h-4 w-4 rounded-full border-2",
                ["APPROVED", "PAID"].includes(ev.action) ? "border-mint bg-mint/20" :
                ev.action === "REJECTED" ? "border-[#f87171] bg-[#f87171]/20" : "border-primary bg-primary/20")} />
              <p className="text-[13.5px] font-medium">{ev.action.replace(/_/g, " ")} <span className="text-muted">· {ev.actor}</span></p>
              {ev.note && <p className="mt-0.5 text-[12.5px] text-muted">{ev.note}</p>}
              <p className="mono mt-0.5 text-[10.5px] uppercase text-muted">{fmtDateTime(ev.at)}</p>
            </div>
          ))}
        </div>
      </Card>

      {["SUBMITTED", "IN_REVIEW"].includes(c.status) && (
        <div className="flex justify-end">
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>Withdraw claim</Button>
        </div>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Withdraw this claim?">
        <p className="text-[13px] leading-relaxed text-muted">The claim will be closed and the benefit returns to active coverage. You can file again while the claim window is open.</p>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={withdraw}>Withdraw</Button>
        </div>
      </Modal>
    </div>
  );
}
