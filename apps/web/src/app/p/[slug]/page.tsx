"use client";
/**
 * Public Proof of Coverage — what a merchant, insurer or support agent sees.
 * No account required, scoped to a single protection, revocable by the owner.
 */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { BadgeCheck, ShieldAlert, Loader2, Clock3, FileText, Lock } from "lucide-react";
import { API, money, fmtDate, daysLeft } from "@/lib/api";
import { CoverFlowMark } from "@/components/logo";

export default function ProofPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/public/proof/${slug}`)
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.message ?? "Not available"); return j; })
      .then(setData)
      .catch(e => setErr(e.message));
  }, [slug]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-4">
      <div className="mesh"><span className="m1" /><span className="m2" /><span className="m3" /></div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-5 flex items-center justify-center gap-2.5">
          <CoverFlowMark size={26} glow={false} />
          <span className="text-[14px] font-semibold tracking-[-0.02em]">CoverFlow</span>
          <span className="label ml-1 text-faint">Proof of coverage</span>
        </div>

        {!data && !err && (
          <div className="glass-card flex items-center justify-center gap-3 p-12 text-muted">
            <Loader2 size={18} className="animate-spin" /> Verifying…
          </div>
        )}

        {err && (
          <div className="glass-card p-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber/10">
              <ShieldAlert size={20} className="text-amber" strokeWidth={2} />
            </div>
            <h1 className="mt-5 text-[18px] font-semibold tracking-[-0.02em]">Cannot verify</h1>
            <p className="mt-2 text-[13.5px] text-muted">{err}</p>
          </div>
        )}

        {data && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-[16px] border border-border bg-surface shadow-[0_24px_64px_-24px_rgba(17,24,39,.22)]">
            {/* verified banner */}
            <div className={`flex items-center gap-3 px-6 py-4 ${data.coverage.active ? "bg-[#0b0f19]" : "bg-bg-subtle"}`}>
              <BadgeCheck size={20} className={data.coverage.active ? "text-mint" : "text-faint"} strokeWidth={2.2} />
              <div>
                <p className={`text-[14px] font-semibold ${data.coverage.active ? "text-white" : "text-text"}`}>
                  {data.coverage.active ? "Coverage verified & active" : "Coverage no longer active"}
                </p>
                <p className={`mono text-[11px] ${data.coverage.active ? "text-white/50" : "text-faint"}`}>
                  Independently verified by CoverFlow
                </p>
              </div>
            </div>

            <div className="p-6">
              <p className="label text-faint">Protected purchase</p>
              <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.025em]">{data.purchase.item}</h1>
              <p className="mt-1 text-[13.5px] text-muted">
                {data.purchase.merchant} · {fmtDate(data.purchase.date)} · {money(data.purchase.amount)}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-border bg-border">
                {[
                  ["Cardholder", data.holder],
                  ["Card", data.card],
                  ["Coverage", data.coverage.type],
                  ["Limit", money(data.coverage.limit)],
                  ["Protected from", fmtDate(data.coverage.start)],
                  ["Protected until", fmtDate(data.coverage.end)],
                ].map(([k, v]) => (
                  <div key={k as string} className="bg-surface px-4 py-3">
                    <p className="label text-faint">{k as string}</p>
                    <p className="mt-1 text-[13px] font-medium">{v as string}</p>
                  </div>
                ))}
              </div>

              {data.coverage.active && (
                <div className="mt-4 flex items-center gap-2 rounded-[8px] border border-mint/25 bg-mint/8 px-3.5 py-3">
                  <Clock3 size={14} className="text-mint" />
                  <p className="text-[13px] text-text">
                    <strong className="font-medium">{daysLeft(data.coverage.end)} days</strong> of coverage remaining ·
                    claim window closes {fmtDate(data.coverage.claimDeadline)}
                  </p>
                </div>
              )}

              {data.documentation.receiptOnFile && (
                <div className="mt-3 flex items-center gap-2 rounded-[8px] border border-border bg-bg-subtle px-3.5 py-3">
                  <FileText size={14} className="text-muted" />
                  <p className="text-[13px] text-muted">
                    Receipt on file{data.documentation.invoiceNumber ? ` · ${data.documentation.invoiceNumber}` : ""}
                    {data.documentation.serialNumber ? ` · S/N ${data.documentation.serialNumber}` : ""}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border px-6 py-3.5">
              <Lock size={12} className="text-faint" />
              <p className="text-[11.5px] text-faint">
                This link proves one protection only. No account, card number or other purchases are exposed. The owner can revoke it at any time.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
