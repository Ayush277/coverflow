import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { createHash } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { db } from "../db/client.js";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "coverflow-dev-secret-change-in-prod",
  accessTtl: "30m",
  refreshTtlDays: 7,
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  openaiKey: process.env.OPENAI_API_KEY ?? "",
  aiServiceUrl: process.env.AI_SERVICE_URL ?? "",
};

export const id = () => nanoid(16);
export const now = () => new Date().toISOString();
export const sha256 = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");

export type Role = "CUSTOMER" | "ADMIN" | "SUPPORT";
export interface AuthUser { id: string; email: string; name: string; role: Role }

export const hashPassword = (p: string) => bcrypt.hashSync(p, 10);
export const verifyPassword = (p: string, h: string) => bcrypt.compareSync(p, h);

export function signAccess(user: AuthUser) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name, role: user.role }, config.jwtSecret, { expiresIn: config.accessTtl });
}

export function issueRefresh(userId: string, userAgent?: string) {
  const token = nanoid(48);
  const expires = new Date(Date.now() + config.refreshTtlDays * 86400_000).toISOString();
  db.prepare(`INSERT INTO sessions (id, user_id, refresh_token_hash, user_agent, expires_at) VALUES (?,?,?,?,?)`)
    .run(id(), userId, sha256(token), userAgent ?? null, expires);
  return token;
}

export function rotateRefresh(token: string, userAgent?: string): AuthUser | null {
  const row = db.prepare(`SELECT s.*, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.refresh_token_hash = ?`).get(sha256(token)) as any;
  if (!row || row.expires_at < now()) return null;
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(row.id);
  return { id: row.user_id, email: row.email, name: row.name, role: row.role };
}

export function revokeRefresh(token: string) {
  db.prepare(`DELETE FROM sessions WHERE refresh_token_hash = ?`).run(sha256(token));
}

declare global { namespace Express { interface Request { user?: AuthUser } } }

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "UNAUTHENTICATED", message: "Missing bearer token" });
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as any;
    req.user = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "TOKEN_EXPIRED", message: "Access token invalid or expired" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "FORBIDDEN", message: "Insufficient permissions" });
    }
    next();
  };
}

export function audit(actorId: string | null, action: string, entity: string, entityId?: string, detail: object = {}) {
  db.prepare(`INSERT INTO audit_logs (id, actor_id, action, entity, entity_id, detail) VALUES (?,?,?,?,?,?)`)
    .run(id(), actorId, action, entity, entityId ?? null, JSON.stringify(detail));
}

export function log(scope: string, msg: string, extra?: object) {
  console.log(JSON.stringify({ t: now(), scope, msg, ...extra }));
}

/** Wrap async handlers so thrown errors hit the error middleware. */
export const wrap = (fn: (req: Request, res: Response) => Promise<unknown> | unknown) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res)).catch(next);
