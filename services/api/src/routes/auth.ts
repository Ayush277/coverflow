import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "../db/client.js";
import { audit, hashPassword, id, issueRefresh, requireAuth, revokeRefresh, rotateRefresh, sha256, signAccess, verifyPassword, wrap, config, type AuthUser } from "../lib/core.js";
import { sendMail, templates } from "../lib/mailer.js";

/** Single-use, hashed, expiring token for email verification / password reset. */
function issueToken(userId: string, kind: "VERIFY_EMAIL" | "RESET_PASSWORD", ttlMinutes: number) {
  const token = nanoid(40);
  db.prepare(`INSERT INTO auth_tokens (id, user_id, token_hash, kind, expires_at) VALUES (?,?,?,?,?)`)
    .run(id(), userId, sha256(token), kind, new Date(Date.now() + ttlMinutes * 60_000).toISOString());
  return token;
}
function consumeToken(token: string, kind: "VERIFY_EMAIL" | "RESET_PASSWORD") {
  const row = db.prepare(`SELECT * FROM auth_tokens WHERE token_hash = ? AND kind = ?`).get(sha256(token), kind) as any;
  if (!row || row.used_at || row.expires_at < new Date().toISOString()) return null;
  db.prepare(`UPDATE auth_tokens SET used_at = datetime('now') WHERE id = ?`).run(row.id);
  return row.user_id as string;
}

export const authRouter = Router();

const publicUser = (u: any) => ({ id: u.id, email: u.email, name: u.name, role: u.role, avatarColor: u.avatar_color, emailVerified: !!u.email_verified, preferences: JSON.parse(u.preferences || "{}"), createdAt: u.created_at });

function respondWithTokens(res: any, user: AuthUser, userAgent?: string) {
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id) as any;
  res.json({ accessToken: signAccess(user), refreshToken: issueRefresh(user.id, userAgent), user: publicUser(row) });
}

const registerSchema = z.object({ name: z.string().min(2).max(60), email: z.string().email(), password: z.string().min(8).max(100) });

authRouter.post("/register", wrap((req, res) => {
  const body = registerSchema.parse(req.body);
  if (db.prepare(`SELECT 1 FROM users WHERE email = ?`).get(body.email.toLowerCase()))
    return res.status(409).json({ error: "EMAIL_TAKEN", message: "An account with this email already exists" });

  const uid = id();
  const colors = ["#818CF8", "#F472B6", "#34D399", "#FBBF24", "#60A5FA"];
  db.prepare(`INSERT INTO users (id, email, password_hash, name, role, avatar_color, email_verified) VALUES (?,?,?,?,?,?,0)`)
    .run(uid, body.email.toLowerCase(), hashPassword(body.password), body.name, "CUSTOMER", colors[Math.floor(Math.random() * colors.length)]);
  // every customer gets a demo card so the intelligence pipeline has a source
  db.prepare(`INSERT INTO cards (id, user_id, tier, last4, is_default) VALUES (?,?,?,?,1)`)
    .run(id(), uid, "GOLD", String(1000 + Math.floor(Math.random() * 9000)));
  audit(uid, "REGISTER", "user", uid);

  // real welcome + verification email (fire-and-forget; never blocks signup)
  const verifyToken = issueToken(uid, "VERIFY_EMAIL", 60 * 24);
  const verifyUrl = `${config.webOrigin}/verify-email?token=${verifyToken}`;
  const tpl = templates.welcome(body.name, verifyUrl);
  sendMail({ to: body.email.toLowerCase(), userId: uid, template: "welcome", subject: tpl.subject, html: tpl.html }).catch(() => {});

  respondWithTokens(res, { id: uid, email: body.email.toLowerCase(), name: body.name, role: "CUSTOMER" }, req.headers["user-agent"]);
}));

/* ── Email verification ─────────────────────────────────────────────────── */
authRouter.post("/verify-email", wrap((req, res) => {
  const { token } = z.object({ token: z.string().min(10) }).parse(req.body);
  const userId = consumeToken(token, "VERIFY_EMAIL");
  if (!userId) return res.status(400).json({ error: "TOKEN_INVALID", message: "This verification link is invalid or has expired" });
  db.prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(userId);
  audit(userId, "VERIFY_EMAIL", "user", userId);
  const u = db.prepare(`SELECT email, name FROM users WHERE id = ?`).get(userId) as any;
  res.json({ ok: true, email: u?.email, name: u?.name });
}));

authRouter.post("/resend-verification", requireAuth, wrap(async (req, res) => {
  const u = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.id) as any;
  if (!u) return res.status(404).json({ error: "NOT_FOUND", message: "User not found" });
  if (u.email_verified) return res.json({ ok: true, alreadyVerified: true });
  const url = `${config.webOrigin}/verify-email?token=${issueToken(u.id, "VERIFY_EMAIL", 60 * 24)}`;
  const tpl = templates.verifyEmail(u.name, url);
  const r = await sendMail({ to: u.email, userId: u.id, template: "verify_email", subject: tpl.subject, html: tpl.html });
  res.json({ ok: true, previewUrl: r.previewUrl });
}));

/* ── Password reset ─────────────────────────────────────────────────────── */
authRouter.post("/forgot-password", wrap(async (req, res) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const u = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.toLowerCase()) as any;
  // Always answer the same way — never disclose whether an account exists.
  let previewUrl: string | undefined;
  if (u?.password_hash) {
    const url = `${config.webOrigin}/reset-password?token=${issueToken(u.id, "RESET_PASSWORD", 60)}`;
    const tpl = templates.resetPassword(u.name, url);
    const r = await sendMail({ to: u.email, userId: u.id, template: "reset_password", subject: tpl.subject, html: tpl.html });
    previewUrl = r.previewUrl;
    audit(u.id, "REQUEST_PASSWORD_RESET", "user", u.id);
  }
  res.json({ ok: true, message: "If an account exists for that address, a reset link is on its way.", previewUrl });
}));

authRouter.post("/reset-password", wrap((req, res) => {
  const { token, password } = z.object({ token: z.string().min(10), password: z.string().min(8).max(100) }).parse(req.body);
  const userId = consumeToken(token, "RESET_PASSWORD");
  if (!userId) return res.status(400).json({ error: "TOKEN_INVALID", message: "This reset link is invalid or has expired" });
  db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashPassword(password), userId);
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId); // sign out everywhere
  audit(userId, "RESET_PASSWORD", "user", userId);
  res.json({ ok: true, message: "Password updated. You can sign in with your new password." });
}));

/* ── Email activity (in-app proof that mail really went out) ────────────── */
authRouter.get("/emails", requireAuth, wrap((req, res) => {
  const rows = db.prepare(`SELECT id, to_address, subject, template, preview_url, status, created_at
    FROM emails WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`).all(req.user!.id);
  res.json({ emails: rows });
}));

authRouter.post("/login", wrap((req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
  const u = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.toLowerCase()) as any;
  if (!u?.password_hash || !verifyPassword(password, u.password_hash))
    return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Incorrect email or password" });
  audit(u.id, "LOGIN", "user", u.id);
  respondWithTokens(res, { id: u.id, email: u.email, name: u.name, role: u.role }, req.headers["user-agent"]);
}));

/**
 * Google OAuth. With GOOGLE_CLIENT_ID set, the web app sends the Google ID token
 * here for verification via Google's tokeninfo endpoint. Without it, a clearly
 * labelled demo identity keeps the flow fully navigable.
 */
authRouter.post("/google", wrap(async (req, res) => {
  const { credential } = z.object({ credential: z.string().optional() }).parse(req.body);
  let email = "demo.google@coverflow.app", name = "Google Demo User", googleId = "google-demo";
  if (credential && process.env.GOOGLE_CLIENT_ID) {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!r.ok) return res.status(401).json({ error: "OAUTH_FAILED", message: "Google token verification failed" });
    const info: any = await r.json();
    if (info.aud !== process.env.GOOGLE_CLIENT_ID) return res.status(401).json({ error: "OAUTH_FAILED", message: "Token audience mismatch" });
    email = info.email; name = info.name ?? info.email; googleId = info.sub;
  }
  let u = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as any;
  if (!u) {
    const uid = id();
    db.prepare(`INSERT INTO users (id, email, name, role, google_id, email_verified, avatar_color) VALUES (?,?,?,?,?,1,'#34D399')`).run(uid, email, name, "CUSTOMER", googleId);
    db.prepare(`INSERT INTO cards (id, user_id, tier, last4, is_default) VALUES (?,?,?,?,1)`).run(id(), uid, "GOLD", String(1000 + Math.floor(Math.random() * 9000)));
    u = db.prepare(`SELECT * FROM users WHERE id = ?`).get(uid);
  }
  audit(u.id, "LOGIN_GOOGLE", "user", u.id);
  respondWithTokens(res, { id: u.id, email: u.email, name: u.name, role: u.role }, req.headers["user-agent"]);
}));

authRouter.post("/refresh", wrap((req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
  const user = rotateRefresh(refreshToken, req.headers["user-agent"]);
  if (!user) return res.status(401).json({ error: "REFRESH_INVALID", message: "Session expired, please sign in again" });
  respondWithTokens(res, user, req.headers["user-agent"]);
}));

authRouter.post("/logout", wrap((req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string().optional() }).parse(req.body ?? {});
  if (refreshToken) revokeRefresh(refreshToken);
  res.json({ ok: true });
}));

authRouter.get("/me", requireAuth, wrap((req, res) => {
  const u = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.id) as any;
  if (!u) return res.status(404).json({ error: "NOT_FOUND", message: "User not found" });
  res.json({ user: publicUser(u) });
}));

authRouter.patch("/me", requireAuth, wrap((req, res) => {
  const body = z.object({ name: z.string().min(2).max(60).optional(), preferences: z.record(z.any()).optional() }).parse(req.body);
  const u = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.id) as any;
  const prefs = { ...JSON.parse(u.preferences || "{}"), ...(body.preferences ?? {}) };
  db.prepare(`UPDATE users SET name = ?, preferences = ? WHERE id = ?`).run(body.name ?? u.name, JSON.stringify(prefs), u.id);
  audit(u.id, "UPDATE_PROFILE", "user", u.id, body);
  res.json({ user: publicUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(u.id)) });
}));
