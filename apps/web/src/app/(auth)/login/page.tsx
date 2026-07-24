"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Input, useToast } from "@/components/ui";
import { CoverFlowMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const EASE = [0.22, 1, 0.36, 1] as const;

const DEMO = [
  { role: "Customer", email: "demo@coverflow.app", pw: "demo1234", icon: ShieldCheck },
  { role: "Admin", email: "admin@coverflow.app", pw: "admin1234", icon: Zap },
  { role: "Support", email: "support@coverflow.app", pw: "support1234", icon: Sparkles },
];

export default function Login() {
  const { login, google } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("demo@coverflow.app");
  const [password, setPassword] = useState("demo1234");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const u = await login(email, password);
      router.push(u.role === "CUSTOMER" ? "/dashboard" : "/admin");
    } catch (err: any) {
      toast({ tone: "error", title: "Sign in failed", body: err.message });
    } finally { setBusy(false); }
  };

  const googleSignIn = async () => {
    setBusy(true);
    try { await google(); router.push("/dashboard"); }
    catch (err: any) { toast({ tone: "error", title: "Google sign-in failed", body: err.message }); }
    finally { setBusy(false); }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg">
      <div className="mesh"><span className="m1" /><span className="m2" /><span className="m3" /></div>
      <div className="gridlines pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,#000_10%,transparent_60%)]" />

      {/* floating blobby nav — same as the marketing site */}
      <motion.header initial={{ y: -22, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, ease: EASE }}
        className="fixed inset-x-0 top-3 z-50 flex justify-center px-4 md:top-5">
        <div className="nav-blob flex items-center gap-3 rounded-full py-2 pl-4 pr-2.5">
          <Link href="/" className="flex items-center gap-2">
            <CoverFlowMark size={24} glow={false} />
            <span className="text-[14px] font-semibold tracking-[-0.02em]">CoverFlow</span>
          </Link>
          <span className="h-5 w-px bg-border" />
          <ThemeToggle className="!h-8 !w-8 !rounded-full !border-0 !bg-transparent hover:!bg-bg-subtle" />
          <Link href="/register" className="btn-shine flex h-8 items-center rounded-full bg-primary px-3.5 text-[12.5px] font-medium text-white shadow-[0_4px_14px_-4px_rgba(45,140,255,.8)] transition-all hover:brightness-[1.06]">
            <span>Get started</span>
          </Link>
        </div>
      </motion.header>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-10 pt-28">
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, ease: EASE }}
          className="glass-card w-full max-w-[400px] p-8">

          <div className="label text-primary">Welcome back</div>
          <h1 className="mt-3 text-[27px] font-semibold leading-[1.1] tracking-[-0.03em]">
            Sign in to your <span className="grad-text">protections</span>
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            Every eligible purchase, already protected and claim-ready.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Input label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            <div>
              <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
              <div className="mt-2 flex justify-end">
                <Link href="/forgot-password" className="text-[12.5px] text-muted transition-colors hover:text-primary">Forgot password?</Link>
              </div>
            </div>
            <button type="submit" disabled={busy}
              className="btn-shine flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-[14.5px] font-medium text-white shadow-[0_10px_28px_-8px_rgba(45,140,255,.95)] transition-all hover:brightness-[1.06] disabled:opacity-50">
              <span>{busy ? "Signing in…" : "Sign in"}</span>
              {!busy && <ArrowRight size={15} />}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="label text-faint">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button onClick={googleSignIn} disabled={busy}
            className="glass-chip flex h-11 w-full items-center justify-center gap-2.5 rounded-full text-[14px] font-medium text-text transition-colors hover:bg-bg-subtle disabled:opacity-50">
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/></svg>
            Continue with Google
          </button>

          {/* one-tap demo identities */}
          <div className="mt-7 border-t border-border pt-5">
            <p className="label mb-3 text-faint">Demo accounts · tap to fill</p>
            <div className="space-y-1.5">
              {DEMO.map(d => (
                <button key={d.email} type="button" onClick={() => { setEmail(d.email); setPassword(d.pw); }}
                  className="group flex w-full items-center gap-3 rounded-[8px] border border-border bg-bg-subtle px-3 py-2.5 text-left transition-all hover:border-primary/40 hover:bg-primary/5">
                  <d.icon size={14} className="shrink-0 text-muted transition-colors group-hover:text-primary" strokeWidth={1.9} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium">{d.role}</p>
                    <p className="mono truncate text-[10.5px] text-faint">{d.email}</p>
                  </div>
                  <span className="label text-faint opacity-0 transition-opacity group-hover:opacity-100">Fill</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-[13px] text-muted">
            No account? <Link href="/register" className="font-medium text-primary hover:underline">Create one</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
