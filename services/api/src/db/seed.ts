/** Seed data — a lived-in demo world. Idempotent: runs only when the users table is empty. */
import { db, migrate } from "./client.js";
import { hashPassword, id, log } from "../lib/core.js";
import { activateBenefits } from "../engines/rules.js";

const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();

const RULES = [
  { name: "Purchase Protection · Platinum", benefit_type: "Purchase Protection", description: "Covers accidental damage and theft for eligible purchases for 90 days from purchase date.", card_tiers: ["PLATINUM"], categories: ["ELECTRONICS", "APPLIANCES", "JEWELRY", "FASHION", "HOME"], countries: ["*"], min_amount: 2000, max_amount: null, coverage_days: 90, coverage_limit: 100000, claim_window_days: 120, decision: "AUTO", exclusions: [] },
  { name: "Purchase Protection · Gold", benefit_type: "Purchase Protection", description: "Covers accidental damage and theft for eligible purchases for 90 days from purchase date.", card_tiers: ["GOLD", "GREEN"], categories: ["ELECTRONICS", "APPLIANCES", "FASHION", "HOME"], countries: ["*"], min_amount: 3000, max_amount: null, coverage_days: 90, coverage_limit: 50000, claim_window_days: 120, decision: "AUTO", exclusions: [] },
  { name: "Extended Warranty", benefit_type: "Extended Warranty", description: "Doubles the manufacturer warranty up to 1 extra year on electronics and appliances.", card_tiers: ["PLATINUM", "GOLD"], categories: ["ELECTRONICS", "APPLIANCES"], countries: ["*"], min_amount: 5000, max_amount: null, coverage_days: 365, coverage_limit: 150000, claim_window_days: 395, decision: "AUTO", exclusions: [] },
  { name: "Return Protection", benefit_type: "Return Protection", description: "Refund for eligible items the merchant won't take back, within 90 days of purchase.", card_tiers: ["PLATINUM"], categories: ["ELECTRONICS", "FASHION", "HOME"], countries: ["IN", "US"], min_amount: 1000, max_amount: 30000, coverage_days: 90, coverage_limit: 25000, claim_window_days: 90, decision: "REMINDER", exclusions: [] },
  { name: "Travel Protection", benefit_type: "Travel Insurance", description: "Trip cancellation, delay and baggage cover for travel booked on the card.", card_tiers: ["PLATINUM", "GOLD"], categories: ["TRAVEL"], countries: ["*"], min_amount: 5000, max_amount: null, coverage_days: 180, coverage_limit: 500000, claim_window_days: 210, decision: "AUTO", exclusions: [] },
  { name: "Jewelry Care · Manual Review", benefit_type: "Purchase Protection", description: "High-value jewelry protection requiring manual activation with appraisal documents.", card_tiers: ["PLATINUM"], categories: ["JEWELRY"], countries: ["IN"], min_amount: 50000, max_amount: null, coverage_days: 60, coverage_limit: 300000, claim_window_days: 90, decision: "MANUAL", exclusions: [] },
];

const POLICIES = [
  { title: "Purchase Protection Policy", benefit_type: "Purchase Protection", content: "Purchase Protection covers accidental damage, theft, or involuntary loss of eligible items within 90 days of purchase. Coverage limit is up to ₹1,00,000 per item on Platinum and ₹50,000 on Gold. To file a claim you need the purchase receipt, a description of the incident, and photos where applicable. Claims must be filed within the claim window shown on the purchase's Benefit Passport. Exclusions: consumables, motor vehicles, cash equivalents, and items left unattended in public places.", keywords: ["damage", "theft", "broken", "stolen", "purchase protection"] },
  { title: "Extended Warranty Policy", benefit_type: "Extended Warranty", content: "Extended Warranty doubles the original manufacturer's warranty by up to one additional year for electronics and appliances bought entirely on your card. It mirrors the manufacturer's terms: mechanical and electrical failure are covered, physical damage is not. Keep the original receipt and warranty certificate — both are stored automatically when detected. File within the claim window; repairs are reimbursed up to the coverage limit.", keywords: ["warranty", "repair", "malfunction", "failure", "extended"] },
  { title: "Return Protection Policy", benefit_type: "Return Protection", content: "If a merchant refuses to accept a return of an eligible item in new condition within 90 days, Return Protection refunds the purchase price up to ₹25,000 per item. The item may need to be shipped to the insurer. Not covered: perishables, customized goods, jewelry, and final-sale items. Upload the receipt to complete activation for this benefit.", keywords: ["return", "refund", "merchant refused", "take back"] },
  { title: "Travel Insurance Policy", benefit_type: "Travel Insurance", content: "Travel booked fully on your card gets trip cancellation cover, delay compensation (over 6 hours), lost/delayed baggage cover, and emergency medical assistance abroad, up to ₹5,00,000 aggregate. Coverage runs 180 days from booking. For claims, provide booking confirmation and airline/hotel documentation — receipts detected automatically are already attached to the trip's Benefit Passport.", keywords: ["travel", "flight", "trip", "baggage", "cancellation", "delay"] },
];

export function seedIfEmpty() {
  migrate();
  const count = (db.prepare(`SELECT COUNT(*) c FROM users`).get() as any).c;
  if (count > 0) return;
  log("seed", "seeding demo data…");

  // ── users + cards ──
  const demoId = id(), adminId = id(), supportId = id(), rileyId = id();
  const insUser = db.prepare(`INSERT INTO users (id, email, password_hash, name, role, avatar_color, email_verified, created_at) VALUES (?,?,?,?,?,?,1,?)`);
  insUser.run(demoId, "demo@coverflow.app", hashPassword("demo1234"), "Aarav Mehta", "CUSTOMER", "#818CF8", daysAgo(210));
  insUser.run(adminId, "admin@coverflow.app", hashPassword("admin1234"), "Priya Sharma", "ADMIN", "#F472B6", daysAgo(400));
  insUser.run(supportId, "support@coverflow.app", hashPassword("support1234"), "Rahul Verma", "SUPPORT", "#34D399", daysAgo(300));
  insUser.run(rileyId, "riley@coverflow.app", hashPassword("riley1234"), "Riley Chen", "CUSTOMER", "#FBBF24", daysAgo(90));

  const insCard = db.prepare(`INSERT INTO cards (id, user_id, tier, last4, is_default) VALUES (?,?,?,?,?)`);
  const platCard = id(), goldCard = id(), rileyCard = id();
  insCard.run(platCard, demoId, "PLATINUM", "3005", 1);
  insCard.run(goldCard, demoId, "GOLD", "1002", 0);
  insCard.run(rileyCard, rileyId, "GOLD", "7841", 1);

  // ── rules + policies ──
  const insRule = db.prepare(`INSERT INTO benefit_rules (id, name, benefit_type, description, card_tiers, categories, countries, min_amount, max_amount, coverage_days, coverage_limit, claim_window_days, decision, exclusions)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const r of RULES) insRule.run(id(), r.name, r.benefit_type, r.description, JSON.stringify(r.card_tiers), JSON.stringify(r.categories), JSON.stringify(r.countries), r.min_amount, r.max_amount, r.coverage_days, r.coverage_limit, r.claim_window_days, r.decision, JSON.stringify(r.exclusions));
  const insPolicy = db.prepare(`INSERT INTO policies (id, title, benefit_type, content, keywords) VALUES (?,?,?,?,?)`);
  for (const p of POLICIES) insPolicy.run(id(), p.title, p.benefit_type, p.content, JSON.stringify(p.keywords));

  // ── transactions (history spread over ~5 months) ──
  const TXNS: [string, string, string, string, number, number, string?][] = [
    // [cardId, merchant, category, description, amount, daysAgo, country]
    [platCard, "Apple Store", "ELECTRONICS", "MacBook Pro 14\" M4", 189000, 9],
    [platCard, "Croma", "ELECTRONICS", "Sony WH-1000XM5 Headphones", 26990, 18],
    [platCard, "MakeMyTrip", "TRAVEL", "Flight DEL→SIN · Singapore Airlines", 48500, 25],
    [platCard, "Tanishq", "JEWELRY", "Diamond Pendant 18K", 84000, 32],
    [goldCard, "Amazon", "ELECTRONICS", "Kindle Paperwhite Signature", 16999, 41],
    [platCard, "IKEA", "HOME", "MALM Desk + POÄNG Armchair", 24500, 55],
    [platCard, "B&H Photo", "ELECTRONICS", "Sony A7 IV Camera Body", 198000, 75, "US"],
    [goldCard, "Nike", "FASHION", "Air Jordan 1 Retro High", 16995, 82],
    [platCard, "Reliance Digital", "APPLIANCES", "Dyson V15 Detect", 62900, 96],
    [platCard, "Taj Hotels", "TRAVEL", "Taj Palace · 2 nights", 38000, 110],
    [goldCard, "Croma", "ELECTRONICS", "iPad Air 11\"", 59900, 130],
    [platCard, "Apple Store", "ELECTRONICS", "AirPods Pro 2", 24900, 145],
    [goldCard, "Starbucks", "DINING", "Coffee", 850, 3],           // no benefit — below thresholds / category
    [goldCard, "Uber", "TRANSPORT", "Airport ride", 1250, 5],      // no benefit
    [rileyCard, "Croma", "ELECTRONICS", "Samsung Galaxy S25", 79999, 12],
    [rileyCard, "Amazon", "ELECTRONICS", "Echo Show 8", 8999, 30],
  ];

  const insTxn = db.prepare(`INSERT INTO transactions (id, card_id, user_id, merchant, merchant_category, description, amount, currency, country, occurred_at, source)
    VALUES (?,?,?,?,?,?,?,?,?,?,'SEED')`);
  const txnIds: { tid: string; userId: string; merchant: string; description: string; amount: number; d: number }[] = [];
  for (const [cardId, merchant, cat, desc, amount, d, country] of TXNS) {
    const uid = (db.prepare(`SELECT user_id FROM cards WHERE id = ?`).get(cardId) as any).user_id;
    const tid = `txn_${id()}`;
    insTxn.run(tid, cardId, uid, merchant, cat, desc, amount, "INR", country ?? "IN", daysAgo(d));
    txnIds.push({ tid, userId: uid, merchant, description: desc, amount, d });
    activateBenefits({ id: tid, user_id: uid, card_id: cardId, merchant, merchant_category: cat, amount, country: country ?? "IN", occurred_at: daysAgo(d) });
  }

  // expire/flag past-dated coverage
  db.prepare(`UPDATE benefits SET status = 'EXPIRED' WHERE coverage_end < datetime('now')`).run();
  db.prepare(`UPDATE benefits SET status = 'EXPIRING' WHERE status = 'ACTIVE' AND coverage_end < datetime('now','+14 days')`).run();

  // ── receipts for most electronics purchases ──
  const insReceipt = db.prepare(`INSERT INTO receipts (id, user_id, transaction_id, file_name, file_hash, source, merchant, invoice_number, amount, purchase_date, serial_number, items, ocr_confidence, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'LINKED',?)`);
  const withReceipts = txnIds.filter(t => t.amount > 15000).slice(0, 9);
  withReceipts.forEach((t, i) => {
    insReceipt.run(id(), t.userId, t.tid, `${t.merchant.toLowerCase().replace(/\s+/g, "-")}-invoice.pdf`, `seedhash-${i}-${t.tid}`,
      i % 3 === 0 ? "EMAIL" : "UPLOAD", t.merchant, `INV-${2026}${String(1000 + i)}`, t.amount, daysAgo(t.d).slice(0, 10),
      t.merchant === "Apple Store" ? `C02${String(100000 + i)}` : null, JSON.stringify([t.description]), 0.94, daysAgo(t.d - 0.1));
  });
  db.prepare(`UPDATE benefits SET status = 'ACTIVE' WHERE status = 'PENDING_ACTIVATION' AND decision = 'REMINDER'
    AND transaction_id IN (SELECT transaction_id FROM receipts WHERE transaction_id IS NOT NULL) AND coverage_end > datetime('now')`).run();

  // ── claims in varied states ──
  const findBenefit = (desc: string) => db.prepare(`SELECT b.* FROM benefits b JOIN transactions t ON t.id = b.transaction_id WHERE t.description = ? LIMIT 1`).get(desc) as any;
  const insClaim = db.prepare(`INSERT INTO claims (id, user_id, benefit_id, claim_type, incident_description, ai_summary, confidence, amount_requested, status, fraud_score, fraud_flags, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insClaimEvent = db.prepare(`INSERT INTO claim_events (id, claim_id, actor, action, note, at) VALUES (?,?,?,?,?,?)`);

  const headphones = findBenefit("Sony WH-1000XM5 Headphones");
  if (headphones) {
    const cid = id();
    insClaim.run(cid, demoId, headphones.id, "ACCIDENTAL_DAMAGE", "Headphones slipped off the table and the right ear cup cracked. They still power on but the hinge is broken.",
      "Accidental Damage claim for Sony WH-1000XM5 purchased at Croma, covered by Purchase Protection.", 0.92, 26990, "IN_REVIEW", 5, "[]", daysAgo(2), daysAgo(2));
    insClaimEvent.run(id(), cid, "Aarav Mehta", "SUBMITTED", "Claim submitted via AI assistant", daysAgo(2));
    insClaimEvent.run(id(), cid, "λ claim-preprocessor", "IN_REVIEW", "Auto-preprocessed · fraud score 5", daysAgo(2));
    db.prepare(`UPDATE benefits SET status = 'CLAIMED' WHERE id = ?`).run(headphones.id);
  }
  const dyson = findBenefit("Dyson V15 Detect");
  if (dyson) {
    const cid = id();
    insClaim.run(cid, demoId, dyson.id, "MALFUNCTION", "Motor stopped working after two months of light use. No physical damage.",
      "Malfunction claim for Dyson V15 Detect, covered by Extended Warranty.", 0.89, 14500, "APPROVED", 0, "[]", daysAgo(40), daysAgo(37));
    insClaimEvent.run(id(), cid, "Aarav Mehta", "SUBMITTED", null, daysAgo(40));
    insClaimEvent.run(id(), cid, "λ claim-preprocessor", "IN_REVIEW", "Auto-preprocessed · fraud score 0", daysAgo(40));
    insClaimEvent.run(id(), cid, "Priya Sharma", "APPROVED", "Repair invoice verified with service centre", daysAgo(37));
  }
  const ipad = findBenefit("iPad Air 11\"");
  if (ipad) {
    const cid = id();
    insClaim.run(cid, demoId, ipad.id, "ACCIDENTAL_DAMAGE", "Screen cracked in bag during commute.",
      "Accidental Damage claim for iPad Air.", 0.84, 21000, "REJECTED", 15, "[]", daysAgo(100), daysAgo(96));
    insClaimEvent.run(id(), cid, "Aarav Mehta", "SUBMITTED", null, daysAgo(100));
    insClaimEvent.run(id(), cid, "Priya Sharma", "REJECTED", "Damage occurred outside the 90-day protection window", daysAgo(96));
  }
  const galaxy = findBenefit("Samsung Galaxy S25");
  if (galaxy) {
    const cid = id();
    insClaim.run(cid, rileyId, galaxy.id, "THEFT", "Phone snatched near metro station. FIR filed.",
      "Theft claim for Samsung Galaxy S25.", 0.9, 79999, "IN_REVIEW", 55, JSON.stringify(["HIGH_CLAIM_VELOCITY", "NEW_ACCOUNT"]), daysAgo(1), daysAgo(1));
    insClaimEvent.run(id(), cid, "Riley Chen", "SUBMITTED", null, daysAgo(1));
    insClaimEvent.run(id(), cid, "λ claim-preprocessor", "IN_REVIEW", "Auto-preprocessed · fraud score 55 · flags: HIGH_CLAIM_VELOCITY, NEW_ACCOUNT", daysAgo(1));
    db.prepare(`INSERT INTO fraud_logs (id, claim_id, user_id, score, flags, created_at) VALUES (?,?,?,?,?,?)`)
      .run(id(), cid, rileyId, 55, JSON.stringify(["HIGH_CLAIM_VELOCITY", "NEW_ACCOUNT"]), daysAgo(1));
  }

  // ── notifications ──
  const insNotif = db.prepare(`INSERT INTO notifications (id, user_id, title, body, kind, priority, read, link, created_at) VALUES (?,?,?,?,?,?,?,?,?)`);
  const mbp = findBenefit("MacBook Pro 14\" M4");
  insNotif.run(id(), demoId, "Protection activated", "MacBook Pro 14\" M4 (₹1,89,000 at Apple Store) is now covered by Purchase Protection for 90 days.", "PROTECTION", "NORMAL", 1, mbp ? `/wallet/${mbp.id}` : null, daysAgo(9));
  const pendant = findBenefit("Diamond Pendant 18K");
  insNotif.run(id(), demoId, "Action needed to activate benefit", "Diamond Pendant 18K qualifies for Jewelry Care protection. Manual activation with appraisal documents is required.", "REMINDER", "HIGH", 0, pendant ? `/wallet/${pendant.id}` : null, daysAgo(32));
  const camera = findBenefit("Sony A7 IV Camera Body");
  insNotif.run(id(), demoId, "Coverage expiring soon", "Sony A7 IV Camera Body — Purchase Protection ends in 15 days. File any claim before the window closes.", "EXPIRY", "HIGH", 0, camera ? `/wallet/${camera.id}` : null, daysAgo(0.5));
  insNotif.run(id(), demoId, "Claim update", "Your Dyson V15 Detect warranty claim was approved. ₹14,500 reimbursement is on its way.", "CLAIM", "HIGH", 1, null, daysAgo(37));
  insNotif.run(id(), demoId, "Monthly Benefit Insights ready", "Your card protected ₹4.2L of purchases this month. Protection rate: 92%.", "INSIGHT", "LOW", 0, "/analytics", daysAgo(1));

  log("seed", "done", {
    users: 4,
    txns: TXNS.length,
    benefits: (db.prepare(`SELECT COUNT(*) c FROM benefits`).get() as any).c,
    claims: (db.prepare(`SELECT COUNT(*) c FROM claims`).get() as any).c,
  });
}

// standalone execution: `npm run seed`
if (process.argv[1]?.endsWith("seed.ts")) seedIfEmpty();
