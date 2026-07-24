"use client";
/** Claims review queue — approve/reject with notes; sorted by fraud risk. */
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Scale, ShieldAlert } from "lucide-react";
import { api, money, fmtDate } from "@/lib/api";
import { Badge, Button, Card, Empty, Modal, Textarea, useToast, cx } from "@/components/ui";

const TABS = ["IN_REVIEW", "SUBMITTED", "APPROVED", "REJECTED", "ALL"] as const;

export default function AdminClaims() {
  const { toast } = useToast();
  const [claims, setClaims] = useState<any[] | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("IN_REVIEW");
  const [decide, setDecide] = useState<{ claim: any; decision: "APPROVED" | "REJECTED" } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setClaims(null);
    api<{ claims: any[] }>(`/api/admin/claims?status=${tab}`).then(d => setClaims(d.claims)).catch(() => setClaims([]));
  }, [tab]);
  useEffect(load, [load]);

  const submit = async () => {
    if (!decide) return;
    setBusy(true);
    try {
      await api(`/api/admin/claims/${decide.claim.id}/decision`, { method: "POST", body: JSON.stringify({ decision: decide.decision, note: note || undefined }) });
      toast({ tone: "success", title: `Claim ${decide.decision.toLowerCase()}`, body: "The customer has been notified." });
      setDecide(null); setNote(""); load();
    } catch (e: any) { toast({ tone: "error", title: "Decision failed", body: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[11px] font-semibold uppercase tracking-widest text-accent">Claims Review</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Review queue</h1>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cx("mono cursor-pointer rounded-full border px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide transition-colors",
              tab === t ? "border-accent/40 bg-accent/12 text-accent" : "border-border text-muted hover:text-white")}>
            {t.replace("_", " ")}
          </button>
        ))}
      </div>

      {claims === null ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-[16px]" />)}</div>
      ) : claims.length === 0 ? (
        <Empty icon={<Scale size={32} strokeWidth={1.5} />} title="Queue clear" hint="No claims in this state." />
      ) : (
        <div className="space-y-3">
          {claims.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.4 }}>
              <Card className={cx(c.fraud_score >= 50 && "border-[#f87171]/40")}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="text-[14.5px] font-semibold">{c.claim_type.replace(/_/g, " ")} · {c.description}</p>
                      <Badge tone={c.status}>{c.status.replace("_", " ")}</Badge>
                      {c.fraud_score >= 50 && (
                        <span className="mono flex items-center gap-1 rounded-full border border-[#f87171]/30 bg-[#f87171]/10 px-2.5 py-0.5 text-[10.5px] font-bold uppercase text-[#f87171]">
                          <ShieldAlert size={11} /> risk {c.fraud_score}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12.5px] text-muted">{c.user_name} ({c.user_email}) · {c.merchant} · {c.benefit_type} · filed {fmtDate(c.created_at)}</p>
                    <p className="mt-2.5 rounded-[10px] border border-border bg-bg/50 p-3 text-[12.5px] leading-relaxed text-text/85">{c.incident_description}</p>
                    {c.fraud_flags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {c.fraud_flags.map((f: string) => (
                          <span key={f} className="mono rounded-full bg-[#f87171]/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#f87171]">{f.replace(/_/g, " ")}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-3">
                    <p className="mono text-lg font-semibold">{money(c.amount_requested)}</p>
                    {["SUBMITTED", "IN_REVIEW"].includes(c.status) && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="danger" onClick={() => setDecide({ claim: c, decision: "REJECTED" })}>Reject</Button>
                        <Button size="sm" onClick={() => setDecide({ claim: c, decision: "APPROVED" })}>Approve</Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={!!decide} onClose={() => setDecide(null)} title={`${decide?.decision === "APPROVED" ? "Approve" : "Reject"} claim`}>
        <p className="text-[13px] text-muted">
          {decide?.decision === "APPROVED"
            ? `Approve ${money(decide?.claim.amount_requested ?? 0)} for ${decide?.claim.user_name}? The customer is notified instantly.`
            : "Add a reason — it will be shared with the customer."}
        </p>
        <div className="mt-4"><Textarea rows={3} value={note} onChange={(e: any) => setNote(e.target.value)} placeholder={decide?.decision === "REJECTED" ? "Reason for rejection…" : "Optional note…"} /></div>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="ghost" onClick={() => setDecide(null)}>Cancel</Button>
          <Button variant={decide?.decision === "REJECTED" ? "danger" : "primary"} disabled={busy || (decide?.decision === "REJECTED" && !note.trim())} onClick={submit}>
            {busy ? "Saving…" : `Confirm ${decide?.decision.toLowerCase()}`}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
