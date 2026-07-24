/**
 * Proof of Coverage — shareable Benefit Passport links.
 *
 * The differentiator: a customer can hand a merchant, insurer or support agent a
 * public, revocable, expiring link that proves a purchase is protected — without
 * exposing their account, card or any other purchase. Every view is counted, and
 * the owner can revoke instantly.
 *
 * Public route is deliberately unauthenticated but leaks nothing beyond the one
 * protection it is scoped to (no email, no card number, no other purchases).
 */
import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "../db/client.js";
import { audit, id, requireAuth, wrap, config } from "../lib/core.js";

/* ── Owner-side management (authenticated) ── */
export const shareRouter = Router();
shareRouter.use(requireAuth);

shareRouter.get("/benefit/:benefitId", wrap((req, res) => {
  const rows = db.prepare(`SELECT id, slug, expires_at, revoked, view_count, last_viewed_at, created_at
    FROM share_links WHERE benefit_id = ? AND user_id = ? ORDER BY created_at DESC`).all(req.params.benefitId, req.user!.id) as any[];
  res.json({ links: rows.map(r => ({ ...r, url: `${config.webOrigin}/p/${r.slug}` })) });
}));

shareRouter.post("/benefit/:benefitId", wrap((req, res) => {
  const { expiresInDays } = z.object({ expiresInDays: z.number().int().min(1).max(365).nullable().optional() }).parse(req.body ?? {});
  const owned = db.prepare(`SELECT 1 FROM benefits WHERE id = ? AND user_id = ?`).get(req.params.benefitId, req.user!.id);
  if (!owned) return res.status(404).json({ error: "NOT_FOUND", message: "Benefit not found" });

  const slug = nanoid(22);
  const expires = expiresInDays ? new Date(Date.now() + expiresInDays * 86400_000).toISOString() : null;
  db.prepare(`INSERT INTO share_links (id, benefit_id, user_id, slug, expires_at) VALUES (?,?,?,?,?)`)
    .run(id(), req.params.benefitId, req.user!.id, slug, expires);
  audit(req.user!.id, "CREATE_SHARE_LINK", "benefit", req.params.benefitId);
  res.status(201).json({ url: `${config.webOrigin}/p/${slug}`, slug, expiresAt: expires });
}));

shareRouter.post("/:slug/revoke", wrap((req, res) => {
  const r = db.prepare(`UPDATE share_links SET revoked = 1 WHERE slug = ? AND user_id = ?`).run(req.params.slug, req.user!.id);
  if (!r.changes) return res.status(404).json({ error: "NOT_FOUND", message: "Link not found" });
  audit(req.user!.id, "REVOKE_SHARE_LINK", "share", req.params.slug);
  res.json({ ok: true });
}));

/* ── Public verification (no auth) ── */
export const publicShareRouter = Router();

publicShareRouter.get("/:slug", wrap((req, res) => {
  const link = db.prepare(`SELECT * FROM share_links WHERE slug = ?`).get(req.params.slug) as any;
  if (!link) return res.status(404).json({ error: "NOT_FOUND", message: "This proof link does not exist" });
  if (link.revoked) return res.status(410).json({ error: "REVOKED", message: "This proof link was revoked by its owner" });
  if (link.expires_at && link.expires_at < new Date().toISOString())
    return res.status(410).json({ error: "EXPIRED", message: "This proof link has expired" });

  const b = db.prepare(`SELECT b.id, b.benefit_type, b.status, b.coverage_start, b.coverage_end, b.claim_deadline, b.coverage_limit,
      t.merchant, t.description, t.amount, t.currency, t.occurred_at,
      c.tier AS card_tier, c.last4 AS card_last4,
      u.name AS holder_name,
      r.invoice_number, r.serial_number
    FROM benefits b
    JOIN transactions t ON t.id = b.transaction_id
    JOIN cards c ON c.id = t.card_id
    JOIN users u ON u.id = b.user_id
    LEFT JOIN receipts r ON r.transaction_id = t.id
    WHERE b.id = ?`).get(link.benefit_id) as any;
  if (!b) return res.status(404).json({ error: "NOT_FOUND", message: "Protection not found" });

  db.prepare(`UPDATE share_links SET view_count = view_count + 1, last_viewed_at = datetime('now') WHERE id = ?`).run(link.id);

  // Deliberately minimal: proves coverage, discloses nothing else.
  res.json({
    verified: true,
    issuedAt: link.created_at,
    expiresAt: link.expires_at,
    holder: b.holder_name,
    card: `${b.card_tier} ····${b.card_last4}`,
    purchase: { item: b.description, merchant: b.merchant, amount: b.amount, currency: b.currency, date: b.occurred_at },
    coverage: {
      type: b.benefit_type, status: b.status,
      start: b.coverage_start, end: b.coverage_end,
      claimDeadline: b.claim_deadline, limit: b.coverage_limit,
      active: ["ACTIVE", "EXPIRING"].includes(b.status) && new Date(b.coverage_end) > new Date(),
    },
    documentation: { invoiceNumber: b.invoice_number ?? null, serialNumber: b.serial_number ?? null, receiptOnFile: !!b.invoice_number },
    verifiedBy: "CoverFlow — Benefit Intelligence Platform",
  });
}));
