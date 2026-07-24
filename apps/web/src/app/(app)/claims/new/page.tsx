"use client";
/** AI Claim Assistant — pick a protection, describe what happened, everything else is pre-filled. */
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { api, money, fmtDate } from "@/lib/api";
import { Badge, Button, Card, Empty, Textarea, useToast, cx } from "@/components/ui";

const ease = [0.22, 1, 0.36, 1] as const;

function NewClaimInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [benefits, setBenefits] = useState<any[] | null>(null);
  const [selected, setSelected] = useState<string | null>(params.get("benefit"));
  const [incident, setIncident] = useState("");
  const [prep, setPrep] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ benefits: any[] }>("/api/benefits").then(d => {
      const claimable = d.benefits.filter(b => ["ACTIVE", "EXPIRING"].includes(b.status) && new Date() <= new Date(b.claimDeadline));
      setBenefits(claimable);
      if (params.get("benefit") && claimable.some(b => b.id === params.get("benefit"))) setStep(1);
    }).catch(() => setBenefits([]));
  }, []); // eslint-disable-line

  const prepare = async () => {
    if (!selected || incident.trim().length < 5) return;
    setBusy(true);
    try {
      const p = await api("/api/claims/prepare", { method: "POST", body: JSON.stringify({ benefitId: selected, incident }) });
      setPrep(p); setStep(2);
    } catch (e: any) { toast({ tone: "error", title: "Preparation failed", body: e.message }); }
    finally { setBusy(false); }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api<{ claim: any }>("/api/claims", {
        method: "POST",
        body: JSON.stringify({
          benefitId: selected, incident, claimType: prep.claim_type,
          amountRequested: prep.prefilled.amount > prep.prefilled.coverage_limit ? prep.prefilled.coverage_limit : prep.prefilled.amount,
          summary: prep.summary, confidence: prep.confidence,
        }),
      });
      toast({ tone: "success", title: "Claim submitted", body: "It entered review automatically — track it in the Claims Center." });
      router.push(`/claims/${r.claim.id}`);
    } catch (e: any) { toast({ tone: "error", title: "Submission failed", body: e.message }); setBusy(false); }
  };

  const sel = benefits?.find(b => b.id === selected);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="mono text-[11px] font-semibold uppercase tracking-widest text-primary">AI Claim Assistant</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">File a claim</h1>
      </div>

      {/* stepper */}
      <div className="flex items-center gap-2">
        {["Select purchase", "What happened?", "Review & submit"].map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span className={cx("mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
              i < step ? "bg-mint text-[#0e0e10]" : i === step ? "bg-primary text-[#0e0e10]" : "bg-surface-2 text-muted")}>
              {i < step ? "✓" : i + 1}
            </span>
            <span className={cx("hidden text-xs sm:block", i === step ? "text-text" : "text-muted")}>{label}</span>
            {i < 2 && <span className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35, ease }}>
            {benefits === null ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-[16px]" />)}</div>
              : benefits.length === 0 ? <Empty title="Nothing to claim right now" hint="Only purchases with an open claim window can be claimed." />
              : (
                <div className="space-y-2.5">
                  {benefits.map(b => (
                    <button key={b.id} onClick={() => setSelected(b.id)}
                      className={cx("flex w-full cursor-pointer items-center gap-4 rounded-[14px] border p-4 text-left transition-all",
                        selected === b.id ? "border-primary/60 bg-primary/8 ring-1 ring-primary/30" : "border-border bg-surface hover:border-[#3f3f46]")}>
                      <ShieldCheck size={18} className={selected === b.id ? "text-primary" : "text-muted"} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium">{b.description}</p>
                        <p className="truncate text-xs text-muted">{b.merchant} · {b.benefitType} · claim by {fmtDate(b.claimDeadline)}</p>
                      </div>
                      <span className="mono text-[13px] font-semibold">{money(b.amount)}</span>
                    </button>
                  ))}
                  <div className="flex justify-end pt-2">
                    <Button disabled={!selected} onClick={() => setStep(1)}>Continue <ArrowRight size={15} /></Button>
                  </div>
                </div>
              )}
          </motion.div>
        )}

        {step === 1 && sel && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35, ease }} className="space-y-4">
            <Card className="flex items-center gap-4 !py-4">
              <ShieldCheck size={18} className="text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{sel.description}</p>
                <p className="text-xs text-muted">{sel.merchant} · {sel.benefitType}</p>
              </div>
              <Badge tone={sel.status}>{sel.status}</Badge>
            </Card>
            <Card>
              <div className="mb-3 flex items-center gap-2"><Sparkles size={15} className="text-accent" /><h2 className="text-[15px] font-semibold">Only one question — what happened?</h2></div>
              <Textarea rows={5} value={incident} onChange={(e: any) => setIncident(e.target.value)}
                placeholder="e.g. My screen broke when the laptop slipped off the couch yesterday evening…" />
              <p className="mt-2 text-xs text-muted">Merchant, date, amount, card, receipt, coverage — already filled in from your Benefit Passport.</p>
            </Card>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft size={15} /> Back</Button>
              <Button disabled={incident.trim().length < 5 || busy} onClick={prepare}>
                <Sparkles size={15} /> {busy ? "Preparing claim…" : "Prepare my claim"}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && prep && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35, ease }} className="space-y-4">
            <Card className="border-primary/25">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2"><Sparkles size={15} className="text-primary" /><h2 className="text-[15px] font-semibold">AI-prepared claim</h2></div>
                <Badge tone={prep.confidence > 0.8 ? "APPROVED" : "IN_REVIEW"}>confidence {(prep.confidence * 100).toFixed(0)}%</Badge>
              </div>
              <p className="rounded-[10px] border border-border bg-bg/60 p-4 text-[13px] leading-relaxed text-text/90">{prep.summary}</p>
              <div className="mono mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] uppercase tracking-wide text-muted sm:grid-cols-3">
                <p>Type<br /><span className="text-text">{prep.claim_type.replace(/_/g, " ")}</span></p>
                <p>Amount<br /><span className="text-text">{money(Math.min(prep.prefilled.amount, prep.prefilled.coverage_limit))}</span></p>
                <p>Card<br /><span className="text-text">{prep.prefilled.card}</span></p>
                <p>Benefit<br /><span className="text-text">{prep.prefilled.benefit_type}</span></p>
                <p>Deadline<br /><span className="text-text">{fmtDate(prep.prefilled.claim_deadline)}</span></p>
                <p>Receipt<br /><span className={prep.has_receipt ? "text-mint" : "text-amber"}>{prep.has_receipt ? `attached (${prep.prefilled.invoice_number})` : "missing"}</span></p>
              </div>
              {!prep.has_receipt && (
                <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-amber/25 bg-amber/8 p-3 text-[12.5px] text-amber">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  You can still submit — but attaching the receipt from the Benefit Passport strengthens approval odds.
                </div>
              )}
              {!prep.within_window && (
                <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-[#f87171]/25 bg-[#f87171]/8 p-3 text-[12.5px] text-[#f87171]">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" /> The claim window has closed for this benefit.
                </div>
              )}
            </Card>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft size={15} /> Edit</Button>
              <Button disabled={busy || !prep.within_window} onClick={submit}>
                <CheckCircle2 size={15} /> {busy ? "Submitting…" : "Submit claim"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function NewClaim() {
  return <Suspense><NewClaimInner /></Suspense>;
}
