/** Admin portal: executive analytics, user management, rules management, claims review, fraud queue. */
import { Router } from "express";
import { z } from "zod";
import { db, j } from "../db/client.js";
import { audit, id, now, requireAuth, requireRole, wrap } from "../lib/core.js";
import { notify } from "../events/consumers.js";
import { sendMail, templates } from "../lib/mailer.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("ADMIN", "SUPPORT"));

// ── Executive analytics ──────────────────────────────────────────────────────
adminRouter.get("/analytics", wrap((_req, res) => {
  const g = <T = any>(sql: string) => db.prepare(sql).get() as T;
  const a = <T = any>(sql: string) => db.prepare(sql).all() as T[];

  const totals = g(`SELECT
    (SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER') customers,
    (SELECT COUNT(*) FROM transactions) transactions,
    (SELECT COUNT(*) FROM benefits) benefits,
    (SELECT COALESCE(SUM(coverage_limit),0) FROM benefits WHERE status IN ('ACTIVE','EXPIRING')) active_coverage,
    (SELECT COUNT(*) FROM claims) claims,
    (SELECT COUNT(*) FROM claims WHERE status IN ('APPROVED','PAID')) approved_claims,
    (SELECT COUNT(*) FROM claims WHERE status = 'IN_REVIEW') pending_claims,
    (SELECT COUNT(*) FROM fraud_logs WHERE score >= 50) high_risk_events`);

  const claimRate = totals.claims ? Math.round((totals.approved_claims / totals.claims) * 100) : 0;
  const avgProcessing = g<any>(`SELECT AVG(julianday(updated_at) - julianday(created_at)) d FROM claims WHERE status IN ('APPROVED','REJECTED','PAID')`).d ?? 0;

  const topMerchants = a(`SELECT t.merchant, COUNT(cl.id) claims, COALESCE(SUM(cl.amount_requested),0) amount
    FROM claims cl JOIN benefits b ON b.id = cl.benefit_id JOIN transactions t ON t.id = b.transaction_id
    GROUP BY 1 ORDER BY claims DESC LIMIT 8`);
  const benefitUsage = a(`SELECT benefit_type, COUNT(*) activated,
      SUM(CASE WHEN status = 'CLAIMED' THEN 1 ELSE 0 END) claimed,
      SUM(CASE WHEN status = 'PENDING_ACTIVATION' THEN 1 ELSE 0 END) unused
    FROM benefits GROUP BY 1 ORDER BY activated DESC`);
  const byCountry = a(`SELECT t.country, COUNT(DISTINCT b.id) benefits, COALESCE(SUM(t.amount),0) volume
    FROM transactions t LEFT JOIN benefits b ON b.transaction_id = t.id GROUP BY 1 ORDER BY volume DESC`);
  const byCategory = a(`SELECT merchant_category category, COUNT(*) txns, COALESCE(SUM(amount),0) volume FROM transactions GROUP BY 1 ORDER BY volume DESC`);
  const daily = a(`SELECT date(occurred_at) day, COUNT(*) txns, COALESCE(SUM(amount),0) volume FROM transactions
    WHERE occurred_at > datetime('now','-30 days') GROUP BY 1 ORDER BY 1`);
  const engagement = a(`SELECT date(at) day, COUNT(*) actions FROM audit_logs WHERE at > datetime('now','-30 days') GROUP BY 1 ORDER BY 1`);

  res.json({ totals, claimRate, avgProcessingDays: Math.round(avgProcessing * 10) / 10, topMerchants, benefitUsage, byCountry, byCategory, daily, engagement });
}));

// ── Claims review queue ──────────────────────────────────────────────────────
adminRouter.get("/claims", wrap((req, res) => {
  const status = String(req.query.status ?? "");
  let sql = `SELECT cl.*, u.name user_name, u.email user_email, b.benefit_type, t.merchant, t.description
    FROM claims cl JOIN users u ON u.id = cl.user_id JOIN benefits b ON b.id = cl.benefit_id JOIN transactions t ON t.id = b.transaction_id`;
  const params: unknown[] = [];
  if (status && status !== "ALL") { sql += ` WHERE cl.status = ?`; params.push(status); }
  sql += ` ORDER BY cl.fraud_score DESC, cl.created_at DESC LIMIT 200`;
  res.json({ claims: (db.prepare(sql).all(...params) as any[]).map(c => ({ ...c, fraud_flags: j(c.fraud_flags, []) })) });
}));

adminRouter.post("/claims/:id/decision", wrap((req, res) => {
  const { decision, note } = z.object({ decision: z.enum(["APPROVED", "REJECTED"]), note: z.string().max(1000).optional() }).parse(req.body);
  const c = db.prepare(`SELECT * FROM claims WHERE id = ?`).get(req.params.id) as any;
  if (!c) return res.status(404).json({ error: "NOT_FOUND", message: "Claim not found" });
  if (!["SUBMITTED", "IN_REVIEW"].includes(c.status)) return res.status(400).json({ error: "INVALID_STATE", message: "Claim already decided" });
  db.prepare(`UPDATE claims SET status = ?, updated_at = ? WHERE id = ?`).run(decision, now(), c.id);
  db.prepare(`INSERT INTO claim_events (id, claim_id, actor, action, note) VALUES (?,?,?,?,?)`).run(id(), c.id, req.user!.name, decision, note ?? null);
  audit(req.user!.id, `CLAIM_${decision}`, "claim", c.id);
  notify(c.user_id,
    decision === "APPROVED" ? "Claim approved" : "Claim decision",
    decision === "APPROVED"
      ? `Your claim for ₹${Math.round(c.amount_requested).toLocaleString("en-IN")} was approved. Reimbursement is on its way.`
      : `Your claim was not approved.${note ? ` Reason: ${note}` : ""} You can contact support to appeal.`,
    "CLAIM", "HIGH", `/claims/${c.id}`);

  // real decision email to the customer
  const cust = db.prepare(`SELECT u.name, u.email, t.description FROM users u
    JOIN claims cl ON cl.user_id = u.id JOIN benefits b ON b.id = cl.benefit_id JOIN transactions t ON t.id = b.transaction_id
    WHERE cl.id = ?`).get(c.id) as any;
  if (cust?.email) {
    const t = templates.claimDecision(cust.name, decision === "APPROVED", cust.description ?? "your purchase", c.amount_requested, note ?? null, c.id);
    sendMail({ to: cust.email, userId: c.user_id, template: "claim_decision", subject: t.subject, html: t.html }).catch(() => {});
  }
  res.json({ ok: true });
}));

// ── User management (ADMIN only) ─────────────────────────────────────────────
adminRouter.get("/users", requireRole("ADMIN"), wrap((_req, res) => {
  const users = db.prepare(`SELECT u.id, u.email, u.name, u.role, u.avatar_color, u.created_at,
      (SELECT COUNT(*) FROM benefits b WHERE b.user_id = u.id) benefits,
      (SELECT COUNT(*) FROM claims c WHERE c.user_id = u.id) claims,
      (SELECT COALESCE(MAX(score),0) FROM fraud_logs f WHERE f.user_id = u.id) max_fraud_score
    FROM users u ORDER BY u.created_at DESC`).all();
  res.json({ users });
}));

adminRouter.patch("/users/:id/role", requireRole("ADMIN"), wrap((req, res) => {
  const { role } = z.object({ role: z.enum(["CUSTOMER", "ADMIN", "SUPPORT"]) }).parse(req.body);
  if (req.params.id === req.user!.id) return res.status(400).json({ error: "SELF_DEMOTE", message: "You cannot change your own role" });
  const r = db.prepare(`UPDATE users SET role = ? WHERE id = ?`).run(role, req.params.id);
  if (!r.changes) return res.status(404).json({ error: "NOT_FOUND", message: "User not found" });
  audit(req.user!.id, "CHANGE_ROLE", "user", req.params.id, { role });
  res.json({ ok: true });
}));

// ── Benefit rules management (the Knowledge Engine console) ──────────────────
adminRouter.get("/rules", wrap((_req, res) => {
  const rules = (db.prepare(`SELECT r.*, (SELECT COUNT(*) FROM benefits b WHERE b.rule_id = r.id) usage_count FROM benefit_rules r ORDER BY r.created_at`).all() as any[])
    .map(r => ({ ...r, card_tiers: j(r.card_tiers, []), categories: j(r.categories, []), countries: j(r.countries, []), exclusions: j(r.exclusions, []) }));
  res.json({ rules });
}));

const ruleSchema = z.object({
  name: z.string().min(3), benefit_type: z.string().min(3), description: z.string().min(3),
  card_tiers: z.array(z.string()).min(1), categories: z.array(z.string()).min(1), countries: z.array(z.string()).min(1),
  min_amount: z.number().min(0), max_amount: z.number().nullable().optional(),
  coverage_days: z.number().int().positive(), coverage_limit: z.number().positive(), claim_window_days: z.number().int().positive(),
  decision: z.enum(["AUTO", "REMINDER", "MANUAL"]), exclusions: z.array(z.string()).default([]), active: z.boolean().default(true),
});

adminRouter.post("/rules", requireRole("ADMIN"), wrap((req, res) => {
  const r = ruleSchema.parse(req.body);
  const rid = id();
  db.prepare(`INSERT INTO benefit_rules (id, name, benefit_type, description, card_tiers, categories, countries, min_amount, max_amount, coverage_days, coverage_limit, claim_window_days, decision, exclusions, active)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(rid, r.name, r.benefit_type, r.description, JSON.stringify(r.card_tiers), JSON.stringify(r.categories), JSON.stringify(r.countries),
         r.min_amount, r.max_amount ?? null, r.coverage_days, r.coverage_limit, r.claim_window_days, r.decision, JSON.stringify(r.exclusions), r.active ? 1 : 0);
  audit(req.user!.id, "CREATE_RULE", "benefit_rule", rid);
  res.status(201).json({ id: rid });
}));

adminRouter.patch("/rules/:id", requireRole("ADMIN"), wrap((req, res) => {
  const existing = db.prepare(`SELECT * FROM benefit_rules WHERE id = ?`).get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "NOT_FOUND", message: "Rule not found" });
  const r = ruleSchema.partial().parse(req.body);
  const merged = {
    ...existing,
    ...Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Array.isArray(v) ? JSON.stringify(v) : typeof v === "boolean" ? (v ? 1 : 0) : v])),
  };
  db.prepare(`UPDATE benefit_rules SET name=@name, benefit_type=@benefit_type, description=@description, card_tiers=@card_tiers,
      categories=@categories, countries=@countries, min_amount=@min_amount, max_amount=@max_amount, coverage_days=@coverage_days,
      coverage_limit=@coverage_limit, claim_window_days=@claim_window_days, decision=@decision, exclusions=@exclusions,
      active=@active, version=version+1, updated_at=datetime('now') WHERE id=@id`).run(merged);
  audit(req.user!.id, "UPDATE_RULE", "benefit_rule", req.params.id, r);
  res.json({ ok: true });
}));

// ── Fraud monitor ────────────────────────────────────────────────────────────
adminRouter.get("/fraud", wrap((_req, res) => {
  const logs = (db.prepare(`SELECT f.*, u.name user_name, u.email user_email FROM fraud_logs f JOIN users u ON u.id = f.user_id ORDER BY f.created_at DESC LIMIT 100`).all() as any[])
    .map(f => ({ ...f, flags: j(f.flags, []) }));
  const riskyUsers = db.prepare(`SELECT u.id, u.name, u.email, MAX(f.score) max_score, COUNT(f.id) events
    FROM fraud_logs f JOIN users u ON u.id = f.user_id GROUP BY u.id HAVING max_score >= 40 ORDER BY max_score DESC LIMIT 20`).all();
  res.json({ logs, riskyUsers });
}));

// ── Audit trail ──────────────────────────────────────────────────────────────
adminRouter.get("/audit", requireRole("ADMIN"), wrap((_req, res) => {
  const logs = db.prepare(`SELECT a.*, u.name actor_name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.at DESC LIMIT 200`).all();
  res.json({ logs });
}));
