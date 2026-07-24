/** Customer-facing domain routes: wallet, transactions, claims, receipts, notifications, analytics, assistant, search. */
import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { db, j } from "../db/client.js";
import { audit, id, now, requireAuth, sha256, wrap } from "../lib/core.js";
import { bus } from "../events/bus.js";
import { emitMockTransaction } from "../events/simulator.js";
import { extractReceipt } from "../engines/ocr.js";
import { chat, prepareClaim } from "../engines/assistant.js";
import { scoreClaim } from "../engines/fraud.js";
import { notify } from "../events/consumers.js";
import { sendMail, templates } from "../lib/mailer.js";

export const appRouter = Router();
appRouter.use(requireAuth);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const benefitSelect = `
  SELECT b.*, t.merchant, t.merchant_category, t.description, t.amount, t.currency, t.occurred_at, t.country,
         c.tier AS card_tier, c.last4 AS card_last4,
         br.name AS rule_name, br.description AS rule_description,
         r.id AS receipt_id, r.invoice_number, r.file_name AS receipt_file, r.serial_number
  FROM benefits b
  JOIN transactions t ON t.id = b.transaction_id
  JOIN cards c ON c.id = t.card_id
  JOIN benefit_rules br ON br.id = b.rule_id
  LEFT JOIN receipts r ON r.transaction_id = t.id`;

const shapeBenefit = (b: any) => ({
  id: b.id, transactionId: b.transaction_id, benefitType: b.benefit_type, status: b.status, decision: b.decision,
  coverageStart: b.coverage_start, coverageEnd: b.coverage_end, claimDeadline: b.claim_deadline, coverageLimit: b.coverage_limit,
  decisionTrace: j(b.decision_trace, []), merchant: b.merchant, category: b.merchant_category, description: b.description,
  amount: b.amount, currency: b.currency, purchasedAt: b.occurred_at, country: b.country,
  card: { tier: b.card_tier, last4: b.card_last4 }, rule: { name: b.rule_name, description: b.rule_description },
  receipt: b.receipt_id ? { id: b.receipt_id, invoiceNumber: b.invoice_number, fileName: b.receipt_file, serialNumber: b.serial_number } : null,
});

// ── Benefit Wallet ───────────────────────────────────────────────────────────
appRouter.get("/benefits", wrap((req, res) => {
  const { status, q } = req.query as Record<string, string>;
  let sql = benefitSelect + ` WHERE b.user_id = ?`;
  const params: unknown[] = [req.user!.id];
  if (status && status !== "ALL") { sql += ` AND b.status = ?`; params.push(status); }
  if (q) { sql += ` AND (LOWER(t.merchant) LIKE ? OR LOWER(t.description) LIKE ? OR LOWER(b.benefit_type) LIKE ?)`; params.push(...Array(3).fill(`%${q.toLowerCase()}%`)); }
  sql += ` ORDER BY t.occurred_at DESC`;
  res.json({ benefits: (db.prepare(sql).all(...params) as any[]).map(shapeBenefit) });
}));

// Benefit Passport — full lifecycle view for a single protection
appRouter.get("/benefits/:id", wrap((req, res) => {
  const b = db.prepare(benefitSelect + ` WHERE b.id = ? AND b.user_id = ?`).get(req.params.id, req.user!.id) as any;
  if (!b) return res.status(404).json({ error: "NOT_FOUND", message: "Benefit not found" });
  const timeline = db.prepare(`SELECT id, label, kind, at FROM timeline_events WHERE benefit_id = ? ORDER BY at`).all(b.id);
  const claims = db.prepare(`SELECT id, claim_type, status, amount_requested, confidence, created_at FROM claims WHERE benefit_id = ? ORDER BY created_at DESC`).all(b.id);
  res.json({ benefit: shapeBenefit(b), timeline, claims });
}));

appRouter.post("/benefits/:id/activate", wrap((req, res) => {
  const b = db.prepare(`SELECT * FROM benefits WHERE id = ? AND user_id = ?`).get(req.params.id, req.user!.id) as any;
  if (!b) return res.status(404).json({ error: "NOT_FOUND", message: "Benefit not found" });
  if (b.status !== "PENDING_ACTIVATION") return res.status(400).json({ error: "INVALID_STATE", message: "Benefit is not pending activation" });
  db.prepare(`UPDATE benefits SET status = 'ACTIVE' WHERE id = ?`).run(b.id);
  audit(req.user!.id, "ACTIVATE_BENEFIT", "benefit", b.id);
  notify(req.user!.id, "Protection activated", `${b.benefit_type} is now active for this purchase.`, "PROTECTION", "NORMAL", `/wallet/${b.id}`);
  res.json({ ok: true });
}));

// Aggregate timeline across every protection
appRouter.get("/timeline", wrap((req, res) => {
  const events = db.prepare(`SELECT te.id, te.label, te.kind, te.at, b.id AS benefit_id, b.benefit_type, t.description, t.merchant
    FROM timeline_events te JOIN benefits b ON b.id = te.benefit_id JOIN transactions t ON t.id = b.transaction_id
    WHERE b.user_id = ? ORDER BY te.at`).all(req.user!.id);
  res.json({ events });
}));

// ── Transactions (+ live simulate) ───────────────────────────────────────────
appRouter.get("/transactions", wrap((req, res) => {
  const limit = Math.min(100, Number(req.query.limit ?? 50));
  const txns = db.prepare(`SELECT t.*, c.tier AS card_tier, c.last4 AS card_last4,
      (SELECT COUNT(*) FROM benefits b WHERE b.transaction_id = t.id) AS benefit_count
    FROM transactions t JOIN cards c ON c.id = t.card_id
    WHERE t.user_id = ? ORDER BY t.occurred_at DESC LIMIT ?`).all(req.user!.id, limit);
  res.json({ transactions: txns });
}));

appRouter.post("/transactions/simulate", wrap((req, res) => {
  const txn = emitMockTransaction(req.user!.id);
  if (!txn) return res.status(400).json({ error: "NO_CARD", message: "No active card on file" });
  audit(req.user!.id, "SIMULATE_TXN", "transaction", txn.id);
  res.status(201).json({ transaction: txn });
}));

// ── Card wallet ──────────────────────────────────────────────────────────────
appRouter.get("/cards", wrap((req, res) => {
  const cards = db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM transactions t WHERE t.card_id = c.id) txn_count
    FROM cards c WHERE c.user_id = ? ORDER BY c.is_default DESC, c.created_at`).all(req.user!.id);
  res.json({ cards });
}));

/**
 * Connect a card (demo issuing).
 *
 * SECURITY: only the last four digits are ever persisted — the demo card number
 * is validated in memory (Luhn + length) and discarded immediately. There is no
 * column to store a PAN, CVV or expiry, by design. A production integration
 * would replace this with a Stripe Issuing / network tokenization handshake and
 * store only the network token reference.
 */
appRouter.post("/cards", wrap((req, res) => {
  const { number, tier } = z.object({
    number: z.string().regex(/^[\d\s-]{12,23}$/, "Enter a 13–19 digit card number"),
    tier: z.enum(["PLATINUM", "GOLD", "GREEN"]),
  }).parse(req.body);

  const digits = number.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return res.status(422).json({ error: "VALIDATION", message: "Card number must be 13–19 digits" });
  if (!luhnValid(digits)) return res.status(422).json({ error: "CARD_INVALID", message: "That card number fails the checksum — check the digits" });

  const last4 = digits.slice(-4);
  if (db.prepare(`SELECT 1 FROM cards WHERE user_id = ? AND last4 = ? AND tier = ? AND status = 'ACTIVE'`).get(req.user!.id, last4, tier))
    return res.status(409).json({ error: "CARD_EXISTS", message: "That card is already connected" });

  const hasCards = (db.prepare(`SELECT COUNT(*) c FROM cards WHERE user_id = ? AND status = 'ACTIVE'`).get(req.user!.id) as any).c;
  const cardId = id();
  db.prepare(`INSERT INTO cards (id, user_id, tier, last4, is_default) VALUES (?,?,?,?,?)`)
    .run(cardId, req.user!.id, tier, last4, hasCards === 0 ? 1 : 0);
  audit(req.user!.id, "CONNECT_CARD", "card", cardId, { tier, last4 });
  notify(req.user!.id, "Card connected",
    `Your ${tier} card ••${last4} is now monitored. Eligible purchases will be protected automatically.`,
    "PROTECTION", "NORMAL", "/cards");
  res.status(201).json({ card: db.prepare(`SELECT * FROM cards WHERE id = ?`).get(cardId) });
}));

/** Luhn checksum — the same validation a payment terminal runs before authorizing. */
function luhnValid(digits: string) {
  let sum = 0, double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d; double = !double;
  }
  return sum % 10 === 0;
}

appRouter.post("/cards/:id/default", wrap((req, res) => {
  const card = db.prepare(`SELECT * FROM cards WHERE id = ? AND user_id = ?`).get(req.params.id, req.user!.id) as any;
  if (!card) return res.status(404).json({ error: "NOT_FOUND", message: "Card not found" });
  db.prepare(`UPDATE cards SET is_default = 0 WHERE user_id = ?`).run(req.user!.id);
  db.prepare(`UPDATE cards SET is_default = 1 WHERE id = ?`).run(card.id);
  audit(req.user!.id, "SET_DEFAULT_CARD", "card", card.id);
  res.json({ ok: true });
}));

appRouter.delete("/cards/:id", wrap((req, res) => {
  const card = db.prepare(`SELECT * FROM cards WHERE id = ? AND user_id = ?`).get(req.params.id, req.user!.id) as any;
  if (!card) return res.status(404).json({ error: "NOT_FOUND", message: "Card not found" });
  const txns = (db.prepare(`SELECT COUNT(*) c FROM transactions WHERE card_id = ?`).get(card.id) as any).c;
  if (txns > 0) {
    // history must survive — deactivate instead of destroying protected purchases
    db.prepare(`UPDATE cards SET status = 'INACTIVE', is_default = 0 WHERE id = ?`).run(card.id);
    audit(req.user!.id, "DEACTIVATE_CARD", "card", card.id);
    res.json({ ok: true, deactivated: true, message: "Card deactivated — its protected purchases stay in your wallet" });
  } else {
    db.prepare(`DELETE FROM cards WHERE id = ?`).run(card.id);
    audit(req.user!.id, "REMOVE_CARD", "card", card.id);
    res.json({ ok: true, deactivated: false, message: "Card removed" });
  }
  const remaining = db.prepare(`SELECT id FROM cards WHERE user_id = ? AND status = 'ACTIVE' AND is_default = 1`).get(req.user!.id);
  if (!remaining) {
    const next = db.prepare(`SELECT id FROM cards WHERE user_id = ? AND status = 'ACTIVE' LIMIT 1`).get(req.user!.id) as any;
    if (next) db.prepare(`UPDATE cards SET is_default = 1 WHERE id = ?`).run(next.id);
  }
}));

// ── Receipts / OCR ───────────────────────────────────────────────────────────
appRouter.get("/receipts", wrap((req, res) => {
  const receipts = db.prepare(`SELECT r.*, t.merchant AS txn_merchant, t.description AS txn_description
    FROM receipts r LEFT JOIN transactions t ON t.id = r.transaction_id
    WHERE r.user_id = ? ORDER BY r.created_at DESC`).all(req.user!.id) as any[];
  res.json({ receipts: receipts.map(r => ({ ...r, items: j(r.items, []) })) });
}));

appRouter.post("/receipts/upload", upload.single("file"), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "NO_FILE", message: "Attach a receipt file (pdf, image or text)" });
  const transactionId = (req.body.transactionId as string) || null;
  let hint: any;
  if (transactionId) {
    const t = db.prepare(`SELECT merchant, amount, occurred_at FROM transactions WHERE id = ? AND user_id = ?`).get(transactionId, req.user!.id) as any;
    if (!t) return res.status(404).json({ error: "NOT_FOUND", message: "Transaction not found" });
    hint = { merchant: t.merchant, amount: t.amount, date: t.occurred_at?.slice(0, 10) };
  }
  const ocr = await extractReceipt(req.file.originalname, req.file.buffer, hint);
  const rid = id();
  db.prepare(`INSERT INTO receipts (id, user_id, transaction_id, file_name, file_hash, merchant, invoice_number, amount, purchase_date, serial_number, items, ocr_confidence, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(rid, req.user!.id, transactionId, req.file.originalname, sha256(req.file.buffer),
         ocr.merchant, ocr.invoice_number, ocr.amount, ocr.purchase_date, ocr.serial_number,
         JSON.stringify(ocr.items), ocr.confidence, transactionId ? "LINKED" : "PARSED");
  if (transactionId) {
    db.prepare(`UPDATE benefits SET status = 'ACTIVE' WHERE transaction_id = ? AND status = 'PENDING_ACTIVATION' AND decision = 'REMINDER'`).run(transactionId);
  }
  audit(req.user!.id, "UPLOAD_RECEIPT", "receipt", rid);
  bus.publish("receipts.uploaded", { receipt_id: rid, user_id: req.user!.id });
  res.status(201).json({ receipt: { id: rid, ...ocr } });
}));

// ── Claims ───────────────────────────────────────────────────────────────────
appRouter.post("/claims/prepare", wrap((req, res) => {
  const { benefitId, incident } = z.object({ benefitId: z.string(), incident: z.string().min(5).max(2000) }).parse(req.body);
  const owned = db.prepare(`SELECT 1 FROM benefits WHERE id = ? AND user_id = ?`).get(benefitId, req.user!.id);
  if (!owned) return res.status(404).json({ error: "NOT_FOUND", message: "Benefit not found" });
  const prep = prepareClaim(benefitId, incident);
  res.json(prep);
}));

appRouter.post("/claims", wrap((req, res) => {
  const body = z.object({
    benefitId: z.string(), incident: z.string().min(5).max(2000),
    claimType: z.string(), amountRequested: z.number().positive(), summary: z.string().optional(), confidence: z.number().optional(),
  }).parse(req.body);
  const b = db.prepare(`SELECT b.*, t.amount, t.description FROM benefits b JOIN transactions t ON t.id = b.transaction_id WHERE b.id = ? AND b.user_id = ?`).get(body.benefitId, req.user!.id) as any;
  if (!b) return res.status(404).json({ error: "NOT_FOUND", message: "Benefit not found" });
  if (new Date() > new Date(b.claim_deadline)) return res.status(400).json({ error: "WINDOW_CLOSED", message: "The claim window for this benefit has closed" });
  if (body.amountRequested > b.coverage_limit * 1.5) return res.status(400).json({ error: "AMOUNT_INVALID", message: "Requested amount is far above the coverage limit" });

  const { score, flags } = scoreClaim(req.user!.id, body.benefitId, body.amountRequested);
  const cid = id();
  db.prepare(`INSERT INTO claims (id, user_id, benefit_id, claim_type, incident_description, ai_summary, confidence, amount_requested, status, fraud_score, fraud_flags)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(cid, req.user!.id, body.benefitId, body.claimType, body.incident, body.summary ?? null, body.confidence ?? 0, body.amountRequested, "SUBMITTED", score, JSON.stringify(flags));
  db.prepare(`INSERT INTO claim_events (id, claim_id, actor, action, note) VALUES (?,?,?,?,?)`)
    .run(id(), cid, req.user!.name, "SUBMITTED", "Claim submitted via AI assistant");
  db.prepare(`UPDATE claims SET status = 'IN_REVIEW', updated_at = ? WHERE id = ?`).run(now(), cid);
  db.prepare(`INSERT INTO claim_events (id, claim_id, actor, action, note) VALUES (?,?,?,?,?)`)
    .run(id(), cid, "λ claim-preprocessor", "IN_REVIEW", `Auto-preprocessed · fraud score ${score}${flags.length ? ` · flags: ${flags.join(", ")}` : ""}`);
  if (b.status === "ACTIVE" || b.status === "EXPIRING") db.prepare(`UPDATE benefits SET status = 'CLAIMED' WHERE id = ?`).run(b.id);
  audit(req.user!.id, "SUBMIT_CLAIM", "claim", cid, { score, flags });
  bus.publish("claims.submitted", { claim_id: cid, user_id: req.user!.id, fraud_score: score });
  notify(req.user!.id, "Claim submitted", `Your ${body.claimType.replace(/_/g, " ").toLowerCase()} claim is in review. Typical decision time: 2 business days.`, "CLAIM", "NORMAL", `/claims/${cid}`);
  {
    const t = templates.claimSubmitted(req.user!.name, body.claimType, b.description ?? "your purchase", body.amountRequested, cid);
    sendMail({ to: req.user!.email, userId: req.user!.id, template: "claim_submitted", subject: t.subject, html: t.html }).catch(() => {});
  }
  res.status(201).json({ claim: { id: cid, status: "IN_REVIEW", fraudScore: score } });
}));

const claimSelect = `SELECT cl.*, b.benefit_type, t.merchant, t.description, t.amount AS purchase_amount
  FROM claims cl JOIN benefits b ON b.id = cl.benefit_id JOIN transactions t ON t.id = b.transaction_id`;

appRouter.get("/claims", wrap((req, res) => {
  const rows = db.prepare(claimSelect + ` WHERE cl.user_id = ? ORDER BY cl.created_at DESC`).all(req.user!.id) as any[];
  res.json({ claims: rows.map(c => ({ ...c, fraud_flags: j(c.fraud_flags, []), documents: j(c.documents, []) })) });
}));

appRouter.get("/claims/:id", wrap((req, res) => {
  const c = db.prepare(claimSelect + ` WHERE cl.id = ? AND cl.user_id = ?`).get(req.params.id, req.user!.id) as any;
  if (!c) return res.status(404).json({ error: "NOT_FOUND", message: "Claim not found" });
  const events = db.prepare(`SELECT * FROM claim_events WHERE claim_id = ? ORDER BY at`).all(c.id);
  res.json({ claim: { ...c, fraud_flags: j(c.fraud_flags, []), documents: j(c.documents, []) }, events });
}));

appRouter.post("/claims/:id/withdraw", wrap((req, res) => {
  const c = db.prepare(`SELECT * FROM claims WHERE id = ? AND user_id = ?`).get(req.params.id, req.user!.id) as any;
  if (!c) return res.status(404).json({ error: "NOT_FOUND", message: "Claim not found" });
  if (!["SUBMITTED", "IN_REVIEW"].includes(c.status)) return res.status(400).json({ error: "INVALID_STATE", message: "Only pending claims can be withdrawn" });
  db.prepare(`UPDATE claims SET status = 'WITHDRAWN', updated_at = ? WHERE id = ?`).run(now(), c.id);
  db.prepare(`UPDATE benefits SET status = 'ACTIVE' WHERE id = ? AND status = 'CLAIMED'`).run(c.benefit_id);
  db.prepare(`INSERT INTO claim_events (id, claim_id, actor, action) VALUES (?,?,?,?)`).run(id(), c.id, req.user!.name, "WITHDRAWN");
  audit(req.user!.id, "WITHDRAW_CLAIM", "claim", c.id);
  res.json({ ok: true });
}));

// ── Notifications ────────────────────────────────────────────────────────────
appRouter.get("/notifications", wrap((req, res) => {
  const rows = db.prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`).all(req.user!.id);
  const unread = (db.prepare(`SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read = 0`).get(req.user!.id) as any).c;
  res.json({ notifications: rows, unread });
}));

appRouter.post("/notifications/read", wrap((req, res) => {
  const { ids } = z.object({ ids: z.array(z.string()).optional() }).parse(req.body ?? {});
  if (ids?.length) {
    const stmt = db.prepare(`UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?`);
    for (const nid of ids) stmt.run(nid, req.user!.id);
  } else {
    db.prepare(`UPDATE notifications SET read = 1 WHERE user_id = ?`).run(req.user!.id);
  }
  res.json({ ok: true });
}));

// ── Customer analytics (Benefit Insights) ────────────────────────────────────
appRouter.get("/analytics", wrap((req, res) => {
  const uid = req.user!.id;
  const g = <T = any>(sql: string, ...p: unknown[]) => db.prepare(sql).get(...p) as T;
  const a = <T = any>(sql: string, ...p: unknown[]) => db.prepare(sql).all(...p) as T[];

  const totals = g(`SELECT COUNT(*) protected_count, COALESCE(SUM(coverage_limit),0) coverage_value FROM benefits WHERE user_id = ? AND status IN ('ACTIVE','EXPIRING')`, uid);
  const spend = g(`SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE user_id = ? AND occurred_at > datetime('now','-30 days')`, uid);
  const protectedSpend = g(`SELECT COALESCE(SUM(DISTINCT t.amount),0) total FROM transactions t JOIN benefits b ON b.transaction_id = t.id WHERE t.user_id = ? AND t.occurred_at > datetime('now','-30 days')`, uid);
  const claims = g(`SELECT COUNT(*) total, SUM(CASE WHEN status='APPROVED' OR status='PAID' THEN 1 ELSE 0 END) approved, COALESCE(SUM(CASE WHEN status IN ('APPROVED','PAID') THEN amount_requested ELSE 0 END),0) recovered FROM claims WHERE user_id = ?`, uid);
  const expiring = g(`SELECT COUNT(*) c FROM benefits WHERE user_id = ? AND status IN ('ACTIVE','EXPIRING') AND coverage_end < datetime('now','+14 days')`, uid);
  const unused = g(`SELECT COUNT(*) c FROM benefits WHERE user_id = ? AND status = 'PENDING_ACTIVATION'`, uid);
  const byCategory = a(`SELECT t.merchant_category category, COUNT(DISTINCT b.id) benefits, COALESCE(SUM(b.coverage_limit),0) coverage
    FROM benefits b JOIN transactions t ON t.id = b.transaction_id WHERE b.user_id = ? GROUP BY 1 ORDER BY coverage DESC`, uid);
  const monthly = a(`SELECT strftime('%Y-%m', t.occurred_at) month, COALESCE(SUM(t.amount),0) spend,
      COALESCE(SUM(CASE WHEN EXISTS (SELECT 1 FROM benefits b WHERE b.transaction_id = t.id) THEN t.amount ELSE 0 END),0) protected
    FROM transactions t WHERE t.user_id = ? GROUP BY 1 ORDER BY 1 DESC LIMIT 6`, uid);

  res.json({
    coverageValue: totals.coverage_value, protectedCount: totals.protected_count,
    spend30d: spend.total, protectedSpend30d: protectedSpend.total,
    protectionRate: spend.total ? Math.round((protectedSpend.total / spend.total) * 100) : 0,
    claims: { total: claims.total, approved: claims.approved ?? 0, recovered: claims.recovered },
    expiringSoon: expiring.c, unusedBenefits: unused.c,
    potentialSavings: Math.round(totals.coverage_value * 0.04),
    byCategory, monthly: monthly.reverse(),
  });
}));

// ── Global search ────────────────────────────────────────────────────────────
appRouter.get("/search", wrap((req, res) => {
  const q = String(req.query.q ?? "").toLowerCase().trim();
  if (q.length < 2) return res.json({ results: [] });
  const like = `%${q}%`;
  const benefits = db.prepare(`SELECT b.id, t.description title, t.merchant subtitle, b.benefit_type FROM benefits b JOIN transactions t ON t.id = b.transaction_id
    WHERE b.user_id = ? AND (LOWER(t.description) LIKE ? OR LOWER(t.merchant) LIKE ? OR LOWER(b.benefit_type) LIKE ?) LIMIT 6`).all(req.user!.id, like, like, like) as any[];
  const claims = db.prepare(`SELECT cl.id, cl.claim_type, t.description FROM claims cl JOIN benefits b ON b.id = cl.benefit_id JOIN transactions t ON t.id = b.transaction_id
    WHERE cl.user_id = ? AND (LOWER(t.description) LIKE ? OR LOWER(cl.claim_type) LIKE ?) LIMIT 4`).all(req.user!.id, like, like) as any[];
  const txns = db.prepare(`SELECT id, description, merchant, amount FROM transactions WHERE user_id = ? AND (LOWER(description) LIKE ? OR LOWER(merchant) LIKE ?) LIMIT 5`).all(req.user!.id, like, like) as any[];
  res.json({
    results: [
      ...benefits.map(b => ({ type: "benefit", id: b.id, title: b.title, subtitle: `${b.benefit_type} · ${b.subtitle}`, href: `/wallet/${b.id}` })),
      ...claims.map(c => ({ type: "claim", id: c.id, title: `${c.claim_type.replace(/_/g, " ")} claim`, subtitle: c.description, href: `/claims/${c.id}` })),
      ...txns.map(t => ({ type: "transaction", id: t.id, title: t.description, subtitle: `${t.merchant} · ₹${Math.round(t.amount).toLocaleString("en-IN")}`, href: `/dashboard` })),
    ],
  });
}));

// ── AI chat assistant ────────────────────────────────────────────────────────
appRouter.get("/assistant/history", wrap((req, res) => {
  const rows = db.prepare(`SELECT id, role, content, sources, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`).all(req.user!.id) as any[];
  res.json({ messages: rows.reverse().map(m => ({ ...m, sources: j(m.sources, []) })) });
}));

appRouter.post("/assistant/chat", wrap(async (req, res) => {
  const { message } = z.object({ message: z.string().min(1).max(2000) }).parse(req.body);
  db.prepare(`INSERT INTO chat_messages (id, user_id, role, content) VALUES (?,?,?,?)`).run(id(), req.user!.id, "user", message);
  const answer = await chat(req.user!.id, message);
  db.prepare(`INSERT INTO chat_messages (id, user_id, role, content, sources) VALUES (?,?,?,?,?)`).run(id(), req.user!.id, "assistant", answer.content, JSON.stringify(answer.sources));
  res.json(answer);
}));
