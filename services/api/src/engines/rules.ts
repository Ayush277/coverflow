/**
 * Benefit Knowledge Engine + Benefit Decision Engine.
 * Rules live in the database (configurable, versioned) — never hardcoded.
 * Every evaluation emits an explainable decision trace stored with the benefit.
 */
import { db, j } from "../db/client.js";
import { id } from "../lib/core.js";

export interface Txn {
  id: string; user_id: string; card_id: string; merchant: string;
  merchant_category: string; amount: number; country: string; occurred_at: string;
}

export interface RuleRow {
  id: string; name: string; benefit_type: string; description: string;
  card_tiers: string; categories: string; countries: string;
  min_amount: number; max_amount: number | null;
  coverage_days: number; coverage_limit: number; claim_window_days: number;
  decision: "AUTO" | "REMINDER" | "MANUAL"; exclusions: string; active: number;
}

interface TraceStep { check: string; pass: boolean; detail: string }

export function evaluateTransaction(txn: Txn): { rule: RuleRow; trace: TraceStep[] }[] {
  const card = db.prepare(`SELECT tier FROM cards WHERE id = ?`).get(txn.card_id) as { tier: string } | undefined;
  if (!card) return [];
  const rules = db.prepare(`SELECT * FROM benefit_rules WHERE active = 1`).all() as RuleRow[];
  const matches: { rule: RuleRow; trace: TraceStep[] }[] = [];

  for (const rule of rules) {
    const tiers = j<string[]>(rule.card_tiers, []);
    const cats = j<string[]>(rule.categories, []);
    const countries = j<string[]>(rule.countries, []);
    const exclusions = j<string[]>(rule.exclusions, []);
    const trace: TraceStep[] = [];
    const step = (check: string, pass: boolean, detail: string) => { trace.push({ check, pass, detail }); return pass; };

    const ok =
      step("card_tier", tiers.includes("*") || tiers.includes(card.tier), `${card.tier} vs [${tiers}]`) &&
      step("category", cats.includes("*") || cats.includes(txn.merchant_category), `${txn.merchant_category} vs [${cats}]`) &&
      step("country", countries.includes("*") || countries.includes(txn.country), `${txn.country} vs [${countries}]`) &&
      step("min_amount", txn.amount >= rule.min_amount, `${txn.amount} >= ${rule.min_amount}`) &&
      step("max_amount", rule.max_amount == null || txn.amount <= rule.max_amount, `${txn.amount} <= ${rule.max_amount ?? "∞"}`) &&
      step("exclusions", !exclusions.some(e => txn.merchant.toLowerCase().includes(e.toLowerCase())), `merchant ${txn.merchant} not excluded`);

    if (ok) matches.push({ rule, trace });
  }
  return matches;
}

/** Decision Engine: activates, schedules a reminder, or marks manual. Idempotent per (txn, rule). */
export function activateBenefits(txn: Txn) {
  const created: any[] = [];
  for (const { rule, trace } of evaluateTransaction(txn)) {
    const start = new Date(txn.occurred_at);
    const coverageEnd = new Date(start.getTime() + rule.coverage_days * 86400_000);
    const claimDeadline = new Date(start.getTime() + rule.claim_window_days * 86400_000);
    const benefitId = id();
    const status = rule.decision === "AUTO" ? "ACTIVE" : "PENDING_ACTIVATION";
    try {
      db.prepare(`INSERT INTO benefits (id, transaction_id, user_id, rule_id, benefit_type, status, decision, coverage_start, coverage_end, claim_deadline, coverage_limit, decision_trace)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(benefitId, txn.id, txn.user_id, rule.id, rule.benefit_type, status, rule.decision,
             start.toISOString(), coverageEnd.toISOString(), claimDeadline.toISOString(),
             Math.min(rule.coverage_limit, txn.amount), JSON.stringify(trace));
    } catch { continue; } // unique(txn, rule) — replayed event, skip
    generateTimeline(benefitId, txn, rule, start, coverageEnd, claimDeadline);
    created.push({ id: benefitId, benefit_type: rule.benefit_type, decision: rule.decision, rule_name: rule.name, coverage_end: coverageEnd.toISOString() });
  }
  return created;
}

function generateTimeline(benefitId: string, txn: Txn, rule: RuleRow, start: Date, end: Date, deadline: Date) {
  const ins = db.prepare(`INSERT INTO timeline_events (id, benefit_id, label, kind, at) VALUES (?,?,?,?,?)`);
  const returnWindow = new Date(start.getTime() + 30 * 86400_000);
  ins.run(id(), benefitId, "Purchase completed", "purchase", start.toISOString());
  ins.run(id(), benefitId, `${rule.benefit_type} activated`, "protection_start", start.toISOString());
  if (returnWindow < end) ins.run(id(), benefitId, "Return window ends", "return_end", returnWindow.toISOString());
  ins.run(id(), benefitId, "Coverage ends", "coverage_end", end.toISOString());
  ins.run(id(), benefitId, "Claim deadline", "claim_deadline", deadline.toISOString());
}
