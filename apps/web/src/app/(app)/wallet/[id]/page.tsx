"use client";
/** Benefit Passport — the living digital passport of one protected purchase. */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, ReceiptText, Upload, FileCheck2, Sparkles, CheckCircle2, CircleDashed, Info, BadgeCheck, Copy, Link2, Trash2 } from "lucide-react";
import { api, money, compactMoney, fmtDate, daysLeft } from "@/lib/api";
import { Badge, Button, Card, Empty, Modal, useToast, cx } from "@/components/ui";

const ease = [0.22, 1, 0.36, 1] as const;

export default function Passport() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    api(`/api/benefits/${id}`).then(setData).catch(() => setNotFound(true));
  }, [id]);
  useEffect(load, [load]);

  const uploadReceipt = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("transactionId", data.benefit.transactionId);
    try {
      const res = await api<{ receipt: any }>("/api/receipts/upload", { method: "POST", body: form });
      toast({ tone: "success", title: "Receipt parsed by OCR", body: `${res.receipt.merchant ?? file.name} · confidence ${(res.receipt.confidence * 100).toFixed(0)}%` });
      load();
    } catch (e: any) {
      toast({ tone: "error", title: "Upload failed", body: e.message });
    } finally { setUploading(false); }
  };

  const activate = async () => {
    try { await api(`/api/benefits/${id}/activate`, { method: "POST" }); toast({ tone: "success", title: "Protection activated" }); load(); }
    catch (e: any) { toast({ tone: "error", title: "Activation failed", body: e.message }); }
  };

  if (notFound) return <Empty title="Benefit not found" hint="It may belong to a different account." action={<Link href="/wallet"><Button size="sm" variant="outline">Back to wallet</Button></Link>} />;
  if (!data) return <div className="space-y-4"><div className="skeleton h-8 w-64 rounded-[8px]" /><div className="skeleton h-48 rounded-[16px]" /><div className="skeleton h-64 rounded-[16px]" /></div>;

  const { benefit: b, timeline, claims } = data;
  const canClaim = ["ACTIVE", "EXPIRING"].includes(b.status) && new Date() <= new Date(b.claimDeadline);

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex cursor-pointer items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-text">
        <ArrowLeft size={14} /> Back
      </button>

      {/* passport header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease }}>
        <Card className="relative overflow-hidden">
          <div className="dotgrid absolute inset-0 opacity-40" />
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-transparent" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-primary/12 text-primary"><ShieldCheck size={26} /></div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl font-semibold tracking-tight">{b.description}</h1>
                  <Badge tone={b.status}>{b.status.replace("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{b.merchant} · {fmtDate(b.purchasedAt)} · {b.card.tier} ••{b.card.last4}</p>
                <div className="mono mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-[11px] uppercase tracking-wide text-muted">
                  <span>Amount <b className="text-text">{money(b.amount)}</b></span>
                  <span>Coverage <b className="text-primary">{b.benefitType}</b></span>
                  <span>Limit <b className="text-text">{compactMoney(b.coverageLimit)}</b></span>
                  <span>Claim by <b className="text-text">{fmtDate(b.claimDeadline)}</b></span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {canClaim && (
                <Link href={`/claims/new?benefit=${b.id}`}>
                  <Button><Sparkles size={15} /> File a claim</Button>
                </Link>
              )}
              {b.status === "PENDING_ACTIVATION" && b.decision === "MANUAL" && (
                <Button variant="accent" onClick={activate}>Activate protection</Button>
              )}
              <button onClick={() => setTraceOpen(true)} className="flex cursor-pointer items-center gap-1 text-[11.5px] text-muted transition-colors hover:text-primary">
                <Info size={12} /> Why is this covered?
              </button>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* timeline */}
        <Card className="lg:col-span-3">
          <h2 className="mb-6 text-[15px] font-semibold">Protection Timeline</h2>
          <div className="relative ml-2 space-y-0 border-l border-border pl-6">
            {timeline.map((ev: any, i: number) => {
              const past = new Date(ev.at) <= new Date();
              return (
                <motion.div key={ev.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07, duration: 0.45, ease }}
                  className="relative pb-7 last:pb-0">
                  <span className={cx("absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border-2",
                    past ? "border-primary bg-primary/20 text-primary" : "border-border bg-surface text-muted")}>
                    {past ? <CheckCircle2 size={11} /> : <CircleDashed size={11} />}
                  </span>
                  <p className={cx("text-[13.5px] font-medium", !past && "text-muted")}>{ev.label}</p>
                  <p className="mono mt-0.5 text-[11px] uppercase tracking-wide text-muted">{fmtDate(ev.at)}{past ? "" : ` · in ${daysLeft(ev.at)} days`}</p>
                </motion.div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {/* receipt / documents */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Documents</h2>
              <ReceiptText size={15} className="text-muted" />
            </div>
            {b.receipt ? (
              <div className="rounded-[12px] border border-mint/25 bg-mint/5 p-4">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-mint" />
                  <p className="text-[13px] font-medium">Receipt stored</p>
                </div>
                <div className="mono mt-3 space-y-1 text-[11px] uppercase tracking-wide text-muted">
                  <p>File · <span className="text-text">{b.receipt.fileName}</span></p>
                  <p>Invoice · <span className="text-text">{b.receipt.invoiceNumber ?? "—"}</span></p>
                  {b.receipt.serialNumber && <p>Serial · <span className="text-text">{b.receipt.serialNumber}</span></p>}
                </div>
              </div>
            ) : (
              <div className="rounded-[12px] border border-dashed border-border p-5 text-center">
                <p className="text-[13px] text-muted">No receipt yet.{b.decision === "REMINDER" && " Uploading one completes activation."}</p>
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" hidden
                  onChange={e => e.target.files?.[0] && uploadReceipt(e.target.files[0])} />
                <Button size="sm" variant="outline" className="mt-3" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  <Upload size={13} /> {uploading ? "Running OCR…" : "Upload receipt"}
                </Button>
              </div>
            )}
          </Card>

          {/* claim history */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Claim History</h2>
              <FileCheck2 size={15} className="text-muted" />
            </div>
            {claims.length === 0 ? (
              <p className="text-[13px] text-muted">No claims on this purchase.{canClaim && " If something happens, everything is already prepared."}</p>
            ) : (
              <div className="space-y-2">
                {claims.map((c: any) => (
                  <Link key={c.id} href={`/claims/${c.id}`} className="flex items-center justify-between rounded-[10px] border border-border bg-bg/50 p-3 transition-colors hover:border-primary/40">
                    <div>
                      <p className="text-[13px] font-medium">{c.claim_type.replace(/_/g, " ")}</p>
                      <p className="mono mt-0.5 text-[10.5px] uppercase text-muted">{fmtDate(c.created_at)} · {money(c.amount_requested)}</p>
                    </div>
                    <Badge tone={c.status}>{c.status.replace("_", " ")}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* rule */}
          <Card>
            <h2 className="mb-2 text-[15px] font-semibold">{b.rule.name}</h2>
            <p className="text-[13px] leading-relaxed text-muted">{b.rule.description}</p>
          </Card>

          {/* Proof of coverage — shareable, revocable public link */}
          <Card>
            <div className="mb-1 flex items-center gap-2">
              <BadgeCheck size={15} className="text-primary" strokeWidth={2.1} />
              <h2 className="text-[15px] font-semibold">Proof of coverage</h2>
            </div>
            <p className="text-[13px] leading-relaxed text-muted">
              Share a public, revocable link that proves this purchase is protected — without exposing your account, card or any other purchase.
            </p>
            <ShareProof benefitId={b.id} />
          </Card>
        </div>
      </div>

      {/* decision trace modal — explainable AI */}
      <Modal open={traceOpen} onClose={() => setTraceOpen(false)} title="Coverage decision trace">
        <p className="mb-4 text-[13px] text-muted">The Benefit Decision Engine evaluated this transaction against rule <b className="text-text">{b.rule.name}</b>:</p>
        <div className="space-y-2">
          {b.decisionTrace.map((t: any, i: number) => (
            <div key={i} className="flex items-center gap-3 rounded-[10px] border border-border bg-bg/50 px-3 py-2.5">
              <CheckCircle2 size={14} className={t.pass ? "text-mint" : "text-[#f87171]"} />
              <span className="mono flex-1 text-[11px] font-semibold uppercase tracking-wide">{t.check.replace(/_/g, " ")}</span>
              <span className="mono text-[11px] text-muted">{t.detail}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

/* ── Proof-of-coverage share control ── */
function ShareProof({ benefitId }: { benefitId: string }) {
  const { toast } = useToast();
  const [links, setLinks] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ links: any[] }>(`/api/share/benefit/${benefitId}`).then(d => setLinks(d.links)).catch(() => setLinks([]));
  }, [benefitId]);
  useEffect(load, [load]);

  const create = async () => {
    setBusy(true);
    try {
      const r = await api<{ url: string }>(`/api/share/benefit/${benefitId}`, { method: "POST", body: JSON.stringify({ expiresInDays: 30 }) });
      await navigator.clipboard.writeText(r.url).catch(() => {});
      toast({ tone: "success", title: "Proof link created", body: "Copied to clipboard · expires in 30 days" });
      load();
    } catch (e: any) { toast({ tone: "error", title: "Could not create link", body: e.message }); }
    finally { setBusy(false); }
  };

  const revoke = async (slug: string) => {
    await api(`/api/share/${slug}/revoke`, { method: "POST" }).catch(() => {});
    toast({ tone: "info", title: "Link revoked" });
    load();
  };

  const activeLinks = (links ?? []).filter(l => !l.revoked);

  return (
    <div className="mt-4">
      {activeLinks.length === 0 ? (
        <Button size="sm" onClick={create} disabled={busy}>
          <Link2 size={13} /> {busy ? "Creating…" : "Create proof link"}
        </Button>
      ) : (
        <div className="space-y-2">
          {activeLinks.map(l => (
            <div key={l.slug} className="rounded-[8px] border border-border bg-bg-subtle p-3">
              <div className="flex items-center gap-2">
                <code className="mono min-w-0 flex-1 truncate text-[11.5px] text-muted">{l.url}</code>
                <button onClick={() => { navigator.clipboard.writeText(l.url); toast({ tone: "success", title: "Copied" }); }}
                  className="cursor-pointer text-muted transition-colors hover:text-primary" title="Copy"><Copy size={13} /></button>
                <button onClick={() => revoke(l.slug)} className="cursor-pointer text-muted transition-colors hover:text-rose" title="Revoke"><Trash2 size={13} /></button>
              </div>
              <p className="mono mt-2 text-[10.5px] uppercase tracking-wide text-faint">
                {l.view_count} view{l.view_count === 1 ? "" : "s"}
                {l.expires_at ? ` · expires ${fmtDate(l.expires_at)}` : " · no expiry"}
              </p>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={create} disabled={busy}><Link2 size={13} /> New link</Button>
        </div>
      )}
    </div>
  );
}
