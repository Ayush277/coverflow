/**
 * CoverFlow brand mark.
 * A shield (protection) carved by a continuous flowing current (the "flow" of
 * coverage moving through every purchase). Indigo→cyan gradient to match the
 * VoxAura / Seamless-Integrations palette. Used everywhere the brand appears.
 */
export function CoverFlowMark({ size = 36, className = "", glow = true }: { size?: number; className?: string; glow?: boolean }) {
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {glow && <span className="absolute inset-0 rounded-[30%] opacity-60 blur-md" style={{ background: "linear-gradient(135deg,#4f46e5,#06b6d4)" }} />}
      <svg viewBox="0 0 40 40" width={size} height={size} className="relative" fill="none">
        <defs>
          <linearGradient id="cf-mark" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="0.55" stopColor="#4f46e5" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="cf-flow" x1="10" y1="14" x2="30" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="1" stopColor="#cffafe" />
          </linearGradient>
        </defs>
        {/* shield tile */}
        <path d="M20 2.5 L33.5 7.2 C33.5 7.2 33.5 15.5 33.5 19.4 C33.5 27.9 27.7 34 20 37.5 C12.3 34 6.5 27.9 6.5 19.4 C6.5 15.5 6.5 7.2 6.5 7.2 Z"
          fill="url(#cf-mark)" />
        <path d="M20 2.5 L33.5 7.2 C33.5 7.2 33.5 15.5 33.5 19.4 C33.5 27.9 27.7 34 20 37.5 C12.3 34 6.5 27.9 6.5 19.4 C6.5 15.5 6.5 7.2 6.5 7.2 Z"
          fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1" />
        {/* flowing current — a continuous S that reads as coverage moving through */}
        <path d="M12.5 22.5 C15.5 22.5 15.2 15.5 20 15.5 C24.8 15.5 24.5 24.5 29 24.5"
          fill="none" stroke="url(#cf-flow)" strokeWidth="2.6" strokeLinecap="round" />
        {/* leading node on the current */}
        <circle cx="29" cy="24.5" r="1.9" fill="#ffffff" />
      </svg>
    </span>
  );
}

/** Full lockup — mark + wordmark. */
export function CoverFlowLogo({ size = 36, className = "", sub }: { size?: number; className?: string; sub?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <CoverFlowMark size={size} />
      <span className="leading-none">
        <span className="text-[16px] font-semibold tracking-tight text-text">Cover<span className="grad-text">Flow</span></span>
        {sub && <span className="mono mt-1 block text-[10px] uppercase tracking-[0.2em] text-muted">{sub}</span>}
      </span>
    </span>
  );
}
