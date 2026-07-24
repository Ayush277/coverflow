"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Input } from "@/components/ui";
import { CoverFlowMark } from "@/components/logo";

function ResetInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) { setErr("Passwords don't match"); return; }
    setBusy(true); setErr("");
    try {
      await api("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password: pw }), retry: false });
      setDone(true);
      setTimeout(() => router.push("/login"), 2200);
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

        {!token ? (
          <div>
            <ShieldAlert size={22} className="text-amber" />
            <h1 className="mt-4 text-[19px] font-semibold tracking-[-0.02em]">Link missing</h1>
            <p className="mt-2 text-[13.5px] text-muted">Open the reset link from your email, or request a new one.</p>
            <Link href="/forgot-password"><Button className="mt-5 w-full">Request a new link</Button></Link>
          </div>
        ) : done ? (
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-mint/10">
              <CheckCircle2 size={20} className="text-mint" strokeWidth={2} />
            </div>
            <h1 className="mt-5 text-[19px] font-semibold tracking-[-0.02em]">Password updated</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              You've been signed out everywhere else for safety. Redirecting you to sign in…
            </p>
            <Link href="/login"><Button className="mt-5 w-full">Sign in now</Button></Link>
          </div>
        ) : (
          <>
            <h1 className="text-[19px] font-semibold tracking-[-0.02em]">Choose a new password</h1>
            <p className="mt-1.5 text-[13.5px] text-muted">At least 8 characters. This link works once.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <Input label="New password" type="password" value={pw} onChange={e => setPw(e.target.value)} required minLength={8} autoComplete="new-password" />
              <Input label="Confirm password" type="password" value={pw2} onChange={e => setPw2(e.target.value)} required minLength={8} autoComplete="new-password" error={err} />
              <Button type="submit" disabled={busy || pw.length < 8} className="w-full">{busy ? "Updating…" : "Update password"}</Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function ResetPassword() {
  return <Suspense><ResetInner /></Suspense>;
}
