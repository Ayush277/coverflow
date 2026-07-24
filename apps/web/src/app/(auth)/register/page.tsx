"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, Input, useToast } from "@/components/ui";
import { CoverFlowMark } from "@/components/logo";

export default function Register() {
  const { register } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      toast({ tone: "success", title: "Welcome to CoverFlow", body: "A demo Gold card is connected — simulate a purchase to see protection activate." });
      router.push("/dashboard");
    } catch (err: any) {
      toast({ tone: "error", title: "Registration failed", body: err.message });
    } finally { setBusy(false); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 bg-bg">
      <div className="mesh"><span className="m1" /><span className="m2" /><span className="m3" /></div>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card relative z-10 w-full max-w-sm p-8">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <CoverFlowMark size={30} glow={false} />
          <span className="text-[15px] font-semibold tracking-[-0.02em]">CoverFlow</span>
        </Link>
        <h1 className="text-[19px] font-semibold tracking-[-0.02em]">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Your card benefits, on autopilot.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input label="Full name" value={form.name} onChange={set("name")} required minLength={2} />
          <Input label="Email" type="email" value={form.email} onChange={set("email")} required />
          <Input label="Password" type="password" value={form.password} onChange={set("password")} required minLength={8} placeholder="At least 8 characters" />
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating account…" : "Create account"}</Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          Already registered? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
