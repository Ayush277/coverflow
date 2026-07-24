/** Fraud Detection Engine — deterministic risk scoring with explainable flags. */
import { db } from "../db/client.js";
import { id } from "../lib/core.js";

export function scoreClaim(userId: string, benefitId: string, amountRequested: number): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 0;

  const benefit = db.prepare(`SELECT b.*, t.amount AS txn_amount, r.file_hash FROM benefits b
    JOIN transactions t ON t.id = b.transaction_id
    LEFT JOIN receipts r ON r.transaction_id = t.id
    WHERE b.id = ?`).get(benefitId) as any;

  // Duplicate claims on same benefit
  const dupClaims = db.prepare(`SELECT COUNT(*) c FROM claims WHERE benefit_id = ? AND status NOT IN ('WITHDRAWN','REJECTED')`).get(benefitId) as any;
  if (dupClaims.c > 0) { score += 35; flags.push("DUPLICATE_CLAIM_SAME_BENEFIT"); }

  // Claim velocity: >3 claims in 30 days
  const recent = db.prepare(`SELECT COUNT(*) c FROM claims WHERE user_id = ? AND created_at > datetime('now','-30 days')`).get(userId) as any;
  if (recent.c >= 3) { score += 25; flags.push("HIGH_CLAIM_VELOCITY"); }

  // Amount above transaction amount
  if (benefit && amountRequested > benefit.txn_amount) { score += 30; flags.push("AMOUNT_EXCEEDS_PURCHASE"); }

  // Duplicate receipt hash across users
  if (benefit?.file_hash) {
    const dupReceipt = db.prepare(`SELECT COUNT(*) c FROM receipts WHERE file_hash = ? AND user_id != ?`).get(benefit.file_hash, userId) as any;
    if (dupReceipt.c > 0) { score += 40; flags.push("DUPLICATE_RECEIPT_HASH"); }
  }

  // Repeated merchant abuse: >2 claims against same merchant
  if (benefit) {
    const merchantClaims = db.prepare(`SELECT COUNT(*) c FROM claims cl JOIN benefits b ON b.id = cl.benefit_id
      JOIN transactions t ON t.id = b.transaction_id
      WHERE cl.user_id = ? AND t.merchant = (SELECT merchant FROM transactions WHERE id = ?)`).get(userId, benefit.transaction_id) as any;
    if (merchantClaims.c > 2) { score += 20; flags.push("REPEATED_MERCHANT_CLAIMS"); }
  }

  // New account claiming quickly
  const user = db.prepare(`SELECT created_at FROM users WHERE id = ?`).get(userId) as any;
  if (user && Date.now() - new Date(user.created_at + "Z").getTime() < 7 * 86400_000) { score += 15; flags.push("NEW_ACCOUNT"); }

  score = Math.min(100, score);
  db.prepare(`INSERT INTO fraud_logs (id, user_id, score, flags) VALUES (?,?,?,?)`).run(id(), userId, score, JSON.stringify(flags));
  return { score, flags };
}
