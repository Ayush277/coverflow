/**
 * Event consumers = the intelligence pipeline + Lambda-style background handlers.
 * transactions.created  → Purchase Intelligence → Decision Engine → Wallet + Timeline + Notification
 * receipts.uploaded     → λ receipt-parser (association + enrichment)
 * claims.submitted      → λ claim-preprocessor (fraud scoring + admin queue)
 * daily scheduler       → λ notification-scheduler (expiry reminders, receipt nudges)
 */
import { db } from "../db/client.js";
import { id, log, now } from "../lib/core.js";
import { bus } from "./bus.js";
import { activateBenefits, type Txn } from "../engines/rules.js";
import { sseBroadcast } from "../routes/stream.js";
import { sendMail, templates } from "../lib/mailer.js";

export function notify(userId: string, title: string, body: string, kind = "INFO", priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" = "NORMAL", link?: string) {
  const nid = id();
  db.prepare(`INSERT INTO notifications (id, user_id, title, body, kind, priority, link) VALUES (?,?,?,?,?,?,?)`)
    .run(nid, userId, title, body, kind, priority, link ?? null);
  bus.publish("notifications.created", { id: nid, user_id: userId, title, body, kind, priority, link });
  return nid;
}

export function registerConsumers() {
  // ── Purchase Intelligence Engine ──────────────────────────────────────────
  bus.subscribe<Txn & { merchant: string; description: string; amount: number; __benefits?: any[] }>("transactions.created", ({ data: txn }) => {
    // Storefront checkout activates synchronously (so it can show the result) and
    // passes the benefits through; everything else activates here. Activation is
    // idempotent per (transaction, rule) either way.
    const created = txn.__benefits ?? activateBenefits(txn);
    sseBroadcast(txn.user_id, "transaction", txn);
    for (const b of created) {
      const money = `₹${Math.round(txn.amount).toLocaleString("en-IN")}`;
      if (b.decision === "AUTO") {
        const until = new Date(b.coverage_end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        notify(txn.user_id, "Protection activated",
          `${txn.description} (${money} at ${txn.merchant}) is now covered by ${b.benefit_type} until ${until}.`,
          "PROTECTION", "NORMAL", `/wallet/${b.id}`);
        // email the customer their new protection (deduped to one per transaction)
        if (created[0]?.id === b.id) {
          const u = db.prepare(`SELECT name, email, preferences FROM users WHERE id = ?`).get(txn.user_id) as any;
          const wantsMail = !u?.preferences || (JSON.parse(u.preferences || "{}").notifyProtection !== false);
          if (u?.email && wantsMail) {
            const t = templates.protectionActivated(u.name, txn.description, txn.merchant, b.benefit_type, until, b.id);
            sendMail({ to: u.email, userId: txn.user_id, template: "protection_activated", subject: t.subject, html: t.html }).catch(() => {});
          }
        }
      } else if (b.decision === "REMINDER") {
        notify(txn.user_id, "Action needed to activate benefit",
          `${txn.description} qualifies for ${b.benefit_type}. Upload the receipt to complete activation.`,
          "REMINDER", "HIGH", `/wallet/${b.id}`);
      } else {
        notify(txn.user_id, "Benefit available",
          `${txn.description} may qualify for ${b.benefit_type}. Review and activate manually from your wallet.`,
          "REMINDER", "NORMAL", `/wallet/${b.id}`);
      }
      sseBroadcast(txn.user_id, "benefit", b);
      bus.publish("benefits.activated", { ...b, user_id: txn.user_id });
    }
    if (created.length) log("purchase-intel", `activated ${created.length} benefit(s) for txn ${txn.id}`);
  });

  // ── λ receipt-parser ──────────────────────────────────────────────────────
  bus.subscribe<{ receipt_id: string; user_id: string }>("receipts.uploaded", ({ data }) => {
    const r = db.prepare(`SELECT * FROM receipts WHERE id = ?`).get(data.receipt_id) as any;
    if (!r || r.transaction_id) return;
    // associate with the closest unlinked transaction by merchant/amount
    const candidate = db.prepare(`SELECT t.id FROM transactions t
      LEFT JOIN receipts x ON x.transaction_id = t.id
      WHERE t.user_id = ? AND x.id IS NULL
        AND (LOWER(t.merchant) LIKE '%' || LOWER(COALESCE(?, t.merchant)) || '%' OR ABS(t.amount - COALESCE(?, t.amount)) < 1)
      ORDER BY t.occurred_at DESC LIMIT 1`).get(r.user_id, r.merchant, r.amount) as any;
    if (candidate) {
      db.prepare(`UPDATE receipts SET transaction_id = ?, status = 'LINKED' WHERE id = ?`).run(candidate.id, r.id);
      // receipt completes REMINDER-gated benefits
      db.prepare(`UPDATE benefits SET status = 'ACTIVE' WHERE transaction_id = ? AND status = 'PENDING_ACTIVATION' AND decision = 'REMINDER'`).run(candidate.id);
      notify(r.user_id, "Receipt linked", `Receipt "${r.file_name}" was matched to your ${r.merchant ?? ""} purchase and its protections are fully active.`, "RECEIPT", "NORMAL");
      sseBroadcast(r.user_id, "receipt", { id: r.id, linked: candidate.id });
      log("λ-receipt-parser", `linked receipt ${r.id} → txn ${candidate.id}`);
    }
  });

  // ── λ notification-scheduler (hourly sweep, dedup per benefit) ────────────
  const sweep = () => {
    const expiring = db.prepare(`SELECT b.id, b.user_id, b.benefit_type, b.coverage_end, t.description
      FROM benefits b JOIN transactions t ON t.id = b.transaction_id
      WHERE b.status = 'ACTIVE' AND b.coverage_end BETWEEN datetime('now') AND datetime('now','+7 days')`).all() as any[];
    for (const b of expiring) {
      const dup = db.prepare(`SELECT 1 FROM notifications WHERE user_id = ? AND link = ? AND kind = 'EXPIRY' AND created_at > datetime('now','-3 days')`).get(b.user_id, `/wallet/${b.id}`);
      if (dup) continue;
      const days = Math.max(1, Math.ceil((new Date(b.coverage_end).getTime() - Date.now()) / 86400_000));
      db.prepare(`UPDATE benefits SET status = 'EXPIRING' WHERE id = ?`).run(b.id);
      notify(b.user_id, "Coverage expiring soon", `${b.description} — ${b.benefit_type} ends in ${days} day${days > 1 ? "s" : ""}. File any claim before the window closes.`, "EXPIRY", "HIGH", `/wallet/${b.id}`);
      const u = db.prepare(`SELECT name, email FROM users WHERE id = ?`).get(b.user_id) as any;
      if (u?.email) {
        const t = templates.coverageExpiring(u.name, b.description, b.benefit_type, days, b.id);
        sendMail({ to: u.email, userId: b.user_id, template: "coverage_expiring", subject: t.subject, html: t.html }).catch(() => {});
      }
    }
    db.prepare(`UPDATE benefits SET status = 'EXPIRED' WHERE status IN ('ACTIVE','EXPIRING') AND coverage_end < datetime('now')`).run();
    if (expiring.length) log("λ-notification-scheduler", `flagged ${expiring.length} expiring benefit(s)`);
  };
  setTimeout(sweep, 5000);
  setInterval(sweep, 60 * 60 * 1000);

  // ── λ claim-preprocessor: handled synchronously in claim route (fraud scoring), admin alert here
  bus.subscribe<{ claim_id: string; user_id: string; fraud_score: number }>("claims.submitted", ({ data }) => {
    const admins = db.prepare(`SELECT id FROM users WHERE role IN ('ADMIN','SUPPORT')`).all() as any[];
    for (const a of admins) {
      notify(a.id, data.fraud_score >= 50 ? "High-risk claim submitted" : "New claim submitted",
        `Claim ${data.claim_id} entered the review queue${data.fraud_score >= 50 ? ` with fraud score ${data.fraud_score}` : ""}.`,
        "CLAIM", data.fraud_score >= 50 ? "URGENT" : "NORMAL", `/admin/claims`);
    }
  });
}
