"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setTokens, loadTokens } from "./api";

export interface User {
  id: string; email: string; name: string; role: "CUSTOMER" | "ADMIN" | "SUPPORT";
  avatarColor: string; emailVerified: boolean; preferences: Record<string, any>; createdAt: string;
}

interface AuthCtx {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  google: () => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTokens();
    api<{ user: User }>("/api/auth/me")
      .then(d => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = (d: any): User => {
    setTokens(d.accessToken, d.refreshToken);
    setUser(d.user);
    return d.user;
  };

  const login = useCallback(async (email: string, password: string) =>
    handleAuth(await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }), retry: false })), []);
  const register = useCallback(async (name: string, email: string, password: string) =>
    handleAuth(await api("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }), retry: false })), []);
  const google = useCallback(async () =>
    handleAuth(await api("/api/auth/google", { method: "POST", body: JSON.stringify({}), retry: false })), []);
  const logout = useCallback(() => {
    const refresh = typeof window !== "undefined" ? localStorage.getItem("cf_refresh") : null;
    api("/api/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: refresh }), retry: false }).catch(() => {});
    setTokens(null, null); setUser(null);
    location.href = "/login";
  }, []);
  const refreshUser = useCallback(async () => {
    const d = await api<{ user: User }>("/api/auth/me");
    setUser(d.user);
  }, []);

  return <Ctx.Provider value={{ user, loading, login, register, google, logout, refreshUser }}>{children}</Ctx.Provider>;
}
