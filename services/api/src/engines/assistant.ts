/**
 * AI Claim Assistant + Chat Assistant.
 * RAG over the policies table + the user's live benefit data (grounded, cites sources).
 * When OPENAI_API_KEY is set, retrieval context is sent to OpenAI for generation;
 * otherwise the deterministic composer answers from the same retrieved facts.
 */
import { db, j } from "../db/client.js";
import { config } from "../lib/core.js";

interface Retrieved { title: string; content: string; score: number }

function retrievePolicies(query: string, k = 3): Retrieved[] {
  const terms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  const rows = db.prepare(`SELECT title, benefit_type, content, keywords FROM policies`).all() as any[];
  return rows
    .map(r => {
      const hay = `${r.title} ${r.benefit_type} ${r.content} ${r.keywords}`.toLowerCase();
      const score = terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
      return { title: r.title, content: r.content, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

function userContext(userId: string) {
  const benefits = db.prepare(`SELECT b.benefit_type, b.status, b.coverage_end, b.claim_deadline, b.coverage_limit, t.merchant, t.description, t.amount
    FROM benefits b JOIN transactions t ON t.id = b.transaction_id
    WHERE b.user_id = ? ORDER BY b.created_at DESC LIMIT 25`).all(userId) as any[];
  const claims = db.prepare(`SELECT claim_type, status, amount_requested, created_at FROM claims WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`).all(userId) as any[];
  return { benefits, claims };
}

export async function chat(userId: string, message: string): Promise<{ content: string; sources: string[] }> {
  const policies = retrievePolicies(message);
  const ctx = userContext(userId);
  const sources = policies.map(p => p.title);

  if (config.openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `You are CoverFlow's benefit assistant for an American Express-style card. Answer ONLY from the provided policy excerpts and the user's live benefit data. Be concise. Policies:\n${policies.map(p => `## ${p.title}\n${p.content}`).join("\n")}\nUser data:\n${JSON.stringify(ctx)}` },
            { role: "user", content: message },
          ],
          max_tokens: 400,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const data: any = await res.json();
        return { content: data.choices[0].message.content, sources };
      }
    } catch { /* fall through */ }
  }
  return { content: composeAnswer(message, policies, ctx), sources };
}

function composeAnswer(q: string, policies: Retrieved[], ctx: { benefits: any[]; claims: any[] }): string {
  const ql = q.toLowerCase();
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  if (/expir|end|until|remaining|how long/.test(ql)) {
    const item = ctx.benefits.find(b => ql.includes(b.merchant?.toLowerCase()) || ql.split(/\W+/).some((t: string) => t.length > 3 && b.description?.toLowerCase().includes(t)))
      ?? ctx.benefits.filter(b => b.status === "ACTIVE").sort((a, b) => a.coverage_end.localeCompare(b.coverage_end))[0];
    if (item) return `Your **${item.description}** (${item.merchant}) is covered by **${item.benefit_type}** until **${fmt(item.coverage_end)}**. The claim deadline is ${fmt(item.claim_deadline)}, with a coverage limit of ${money(item.coverage_limit)}.`;
    return "You don't have any active protections yet. Once an eligible purchase is detected, its coverage timeline will appear in your Benefit Wallet.";
  }
  if (/can i claim|eligible|file a claim|claim this/.test(ql)) {
    const active = ctx.benefits.filter(b => b.status === "ACTIVE");
    if (!active.length) return "None of your current purchases have an active claim window. Check the Benefit Wallet — expired protections are listed with their original coverage terms.";
    return `Yes — you have ${active.length} purchase${active.length > 1 ? "s" : ""} with active protection. The claim assistant pre-fills merchant, date, receipt and coverage details; you only describe what happened. Most eligible: ${active.slice(0, 3).map(b => `**${b.description}** (${b.benefit_type}, until ${fmt(b.coverage_end)})`).join("; ")}.`;
  }
  if (/what benefits|my benefits|protections|what do i have|coverage do i/.test(ql)) {
    const active = ctx.benefits.filter(b => b.status === "ACTIVE");
    const total = active.reduce((s, b) => s + b.coverage_limit, 0);
    return `You have **${active.length} active protections** worth ${money(total)} in coverage:\n${active.slice(0, 6).map(b => `• **${b.description}** — ${b.benefit_type}, until ${fmt(b.coverage_end)} (limit ${money(b.coverage_limit)})`).join("\n")}${active.length > 6 ? `\n…and ${active.length - 6} more in your Benefit Wallet.` : ""}`;
  }
  if (/document|missing|need to upload|receipt/.test(ql)) {
    return "For a claim you typically need: the purchase receipt (already auto-stored for detected purchases), photos of damage if applicable, and a short incident description. Open the purchase's Benefit Passport — the Documents section shows exactly what's attached and what's missing.";
  }
  if (policies.length) {
    return `${policies[0].content}\n\n_Source: ${policies[0].title}_`;
  }
  return "I can help with your protections, coverage windows, claims and policy details. Try: “What benefits do I have?”, “When does my laptop coverage expire?” or “Can I claim this purchase?”";
}

/** AI Claim Assistant: pre-fills everything, generates a structured summary + confidence. */
export function prepareClaim(benefitId: string, incident: string) {
  const b = db.prepare(`SELECT b.*, t.merchant, t.description, t.amount, t.occurred_at, t.currency, c.tier, c.last4,
      r.id AS receipt_id, r.invoice_number
    FROM benefits b
    JOIN transactions t ON t.id = b.transaction_id
    JOIN cards c ON c.id = t.card_id
    LEFT JOIN receipts r ON r.transaction_id = t.id
    WHERE b.id = ?`).get(benefitId) as any;
  if (!b) return null;

  const il = incident.toLowerCase();
  const claimType =
    /stol|theft|snatch|robb/.test(il) ? "THEFT" :
    /lost|missing|left/.test(il) ? "LOSS" :
    /crack|broke|damag|drop|shatter|water|spill/.test(il) ? "ACCIDENTAL_DAMAGE" :
    /not work|dead|fault|defect|stopped|won't turn/.test(il) ? "MALFUNCTION" :
    /return|refund|refuse/.test(il) ? "RETURN_PROTECTION" : "OTHER";

  const withinWindow = new Date() <= new Date(b.claim_deadline);
  const hasReceipt = !!b.receipt_id;
  const confidence = Math.min(0.97, 0.5 + (withinWindow ? 0.25 : 0) + (hasReceipt ? 0.15 : 0) + (claimType !== "OTHER" ? 0.07 : 0));

  const summary = `${claimType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())} claim for ${b.description} purchased from ${b.merchant} on ${new Date(b.occurred_at).toLocaleDateString("en-IN")} for ₹${b.amount.toLocaleString("en-IN")} using ${b.tier} card ••${b.last4}. Covered by ${b.benefit_type} (limit ₹${b.coverage_limit.toLocaleString("en-IN")}, claim window until ${new Date(b.claim_deadline).toLocaleDateString("en-IN")}). ${hasReceipt ? `Receipt ${b.invoice_number} attached.` : "Receipt not yet attached — upload recommended."} Incident: ${incident}`;

  return {
    prefilled: {
      merchant: b.merchant, product: b.description, purchase_date: b.occurred_at, amount: b.amount,
      currency: b.currency, card: `${b.tier} ••${b.last4}`, benefit_type: b.benefit_type,
      coverage_limit: b.coverage_limit, claim_deadline: b.claim_deadline, receipt_id: b.receipt_id,
      invoice_number: b.invoice_number,
    },
    claim_type: claimType, summary, confidence, within_window: withinWindow, has_receipt: hasReceipt,
    missing_documents: hasReceipt ? [] : ["Purchase receipt"],
  };
}

export { retrievePolicies };
