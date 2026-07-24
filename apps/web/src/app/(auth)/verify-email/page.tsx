"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui";
import { CoverFlowMark } from "@/components/logo";

function VerifyInner() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"working" | "ok" | "bad">(token ? "working" : "bad");
  const [msg, setMsg] = useState("This verification link is invalid or has expired.");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!token) return;
    api<{ ok: boolean; name?: string }>("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }), retry: false })
      .then(r => { setState("ok"); setName(r.name ?? ""); })
      .catch(e => { setState("bad"); setMsg(e.message); });
  }, [token]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-4">
      <div className="mesh"><span className="m1" /><span className="m2" /><span className="m3" /></div>
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card relative z-10 w-full max-w-sm p-8 text-center">
        <CoverFlowMark size={38} glow={false} className="mx-auto" />

        {state === "working" && (
          <>
            <Loader2 size={22} className="mx-auto mt-6 animate-spin text-primary" />
            <h1 className="mt-4 text-[19px] font-semibold tracking-[-0.02em]">Verifying your email…</h1>
          </>
        )}

        {state === "ok" && (
          <>
            <div className="mx-auto mt-6 flex h-11 w-11 items-center justify-center rounded-full bg-mint/10">
              <CheckCircle2 size={20} className="text-mint" strokeWidth={2} />
            </div>
            <h1 className="mt-5 text-[19px] font-semibold tracking-[-0.02em]">Email verified</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              {name ? `Thanks, ${name}. ` : ""}Your account is confirmed and your protections are active.
            </p>
            <Link href="/dashboard"><Button className="mt-6 w-full">Open dashboard</Button></Link>
          </>
        )}

        {state === "bad" && (
          <>
            <div className="mx-auto mt-6 flex h-11 w-11 items-center justify-center rounded-full bg-amber/10">
              <ShieldAlert size={20} className="text-amber" strokeWidth={2} />
            </div>
            <h1 className="mt-5 text-[19px] font-semibold tracking-[-0.02em]">Couldn't verify</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{msg}</p>
            <Link href="/settings"><Button variant="outline" className="mt-6 w-full">Resend from settings</Button></Link>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyEmail() {
  return <Suspense><VerifyInner /></Suspense>;
}
