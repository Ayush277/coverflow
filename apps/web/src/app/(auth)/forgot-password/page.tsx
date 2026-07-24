"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MailCheck, ArrowLeft, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Input } from "@/components/ui";
import { CoverFlowMark } from "@/components/logo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ message: string; previewUrl?: string } | null>(null);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await api<{ message: string; previewUrl?: string }>("/api/auth/forgot-password", {
        method: "POST", body: JSON.stringify({ email }), retry: false,
      });
      setSent(r);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-4">
      <div className="mesh"><span className="m1" /><span className="m2" /><span className="m3" /></div>
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card relative z-10 w-full max-w-sm p-8">
        <Link href="/" className="mb-7 flex items-center gap-2.5">
          <CoverFlowMark size={30} glow={false} />
          <span className="text-[15px] font-semibold tracking-[-0.02em]">CoverFlow</span>
        </Link>

        {sent ? (
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-mint/10">
              <MailCheck size={20} className="text-mint" strokeWidth={2} />
            </div>
            <h1 className="mt-5 text-[19px] font-semibold tracking-[-0.02em]">Check your inbox</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{sent.message}</p>
            {sent.previewUrl && (
              <a href={sent.previewUrl} target="_blank" rel="noreferrer"
                className="mt-5 flex items-center justify-between rounded-[8px] border border-primary/25 bg-primary/8 px-3.5 py-3 text-[12.5px] font-medium text-primary transition-colors hover:bg-primary/12">
                Open the delivered email <ExternalLink size={14} />
              </a>
            )}
            <Link href="/login" className="mt-6 flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-text">
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-[19px] font-semibold tracking-[-0.02em]">Reset your password</h1>
            <p className="mt-1.5 text-[13.5px] text-muted">We'll email you a secure, single-use link.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <Input label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" error={err} />
              <Button type="submit" disabled={busy || !email} className="w-full">{busy ? "Sending…" : "Send reset link"}</Button>
            </form>
            <Link href="/login" className="mt-6 flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-text">
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
