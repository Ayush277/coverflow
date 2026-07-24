import Link from "next/link";
import { ShieldOff } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg text-center">
      <div className="aurora" />
      <div className="relative z-10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[16px] border border-border bg-surface text-muted">
          <ShieldOff size={24} />
        </div>
        <p className="mono text-[11px] font-semibold uppercase tracking-widest text-primary">404 · Not covered</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">This page isn't protected by any policy</h1>
        <p className="mt-2 text-sm text-muted">The route you're looking for doesn't exist.</p>
        <Link href="/dashboard" className="mt-6 inline-flex h-10 items-center rounded-[8px] bg-primary px-5 text-sm font-semibold text-[#0e0e10] transition-colors hover:bg-[#818cf8]">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
