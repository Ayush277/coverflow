"use client";

export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function loadTokens() {
  if (typeof window === "undefined") return;
  accessToken = localStorage.getItem("cf_access");
  refreshToken = localStorage.getItem("cf_refresh");
}

export function setTokens(access: string | null, refresh: string | null) {
  accessToken = access; refreshToken = refresh;
  if (typeof window === "undefined") return;
  if (access) localStorage.setItem("cf_access", access); else localStorage.removeItem("cf_access");
  if (refresh) localStorage.setItem("cf_refresh", refresh); else localStorage.removeItem("cf_refresh");
}

export const getAccessToken = () => accessToken;

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  const res = await fetch(`${API}/api/auth/refresh`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) { setTokens(null, null); return false; }
  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return true;
}

export async function api<T = any>(path: string, opts: RequestInit & { retry?: boolean } = {}): Promise<T> {
  if (accessToken === null) loadTokens();
  const headers: Record<string, string> = { ...(opts.headers as any) };
  if (!(opts.body instanceof FormData) && opts.body) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (res.status === 401 && opts.retry !== false) {
    if (await tryRefresh()) return api<T>(path, { ...opts, retry: false });
    if (typeof window !== "undefined" && !location.pathname.match(/^\/(login|register)?$/)) location.href = "/login";
    throw new ApiError(401, "UNAUTHENTICATED", "Session expired");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "ERROR", data.message ?? "Request failed");
  return data as T;
}

export const money = (n: number, currency = "₹") => `${currency}${Math.round(n).toLocaleString("en-IN")}`;
export const compactMoney = (n: number) =>
  n >= 10_000_000 ? `₹${(n / 10_000_000).toFixed(1)}Cr` : n >= 100_000 ? `₹${(n / 100_000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : money(n);
export const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtDateTime = (d: string | Date) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const daysLeft = (d: string) => Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400_000));
export const timeAgo = (d: string) => {
  const s = (Date.now() - new Date(d.endsWith("Z") || d.includes("+") ? d : d + "Z").getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
