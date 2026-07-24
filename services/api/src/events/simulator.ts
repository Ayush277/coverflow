/**
 * Stripe Issuing mock — emits realistic authorization events onto the bus,
 * simulating live card transactions arriving from the network.
 *
 * Products come from the `products` catalog table (the same one the demo
 * storefront sells from), so simulated authorizations are indistinguishable
 * from real store checkouts once they hit the pipeline. Nothing here is
 * hardcoded: change the catalog and the simulator changes with it.
 *
 * Payload shape mirrors Stripe's issuing_authorization closely enough that
 * swapping in a real webhook is a thin adapter.
 */
import { db } from "../db/client.js";
import { id, log, now } from "../lib/core.js";
import { bus } from "./bus.js";

export function emitMockTransaction(userId?: string) {
  const card = userId
    ? db.prepare(`SELECT * FROM cards WHERE user_id = ? AND status = 'ACTIVE' ORDER BY is_default DESC, RANDOM() LIMIT 1`).get(userId) as any
    : db.prepare(`SELECT * FROM cards WHERE status = 'ACTIVE' ORDER BY RANDOM() LIMIT 1`).get() as any;
  if (!card) return null;

  const product = db.prepare(`SELECT * FROM products WHERE active = 1 ORDER BY RANDOM() LIMIT 1`).get() as any;
  if (!product) return null;

  // real-world authorizations vary from list price (discounts, taxes, bundles)
  const variance = 0.9 + Math.random() * 0.2;
  const amount = Math.round((product.price * variance) / 100) * 100;

  const txn = {
    id: `txn_${id()}`,
    card_id: card.id, user_id: card.user_id,
    merchant: product.merchant, merchant_category: product.category,
    description: product.name, amount, currency: product.currency,
    country: product.country, occurred_at: now(),
    source: "STRIPE_ISSUING_MOCK",
  };

  db.prepare(`INSERT INTO transactions (id, card_id, user_id, merchant, merchant_category, description, amount, currency, country, occurred_at, source)
    VALUES (@id,@card_id,@user_id,@merchant,@merchant_category,@description,@amount,@currency,@country,@occurred_at,@source)`).run(txn);

  log("issuing-mock", `authorization ${txn.merchant} ₹${amount}`, { user: card.user_id });
  bus.publish("transactions.created", txn);
  return txn;
}

let timer: ReturnType<typeof setInterval> | null = null;
/**
 * Ambient stream: a new transaction lands every 45–90s while the server runs.
 * Scoped to the demo account only — real signups should see nothing on their
 * dashboard except the purchases they actually make in the store.
 */
export function startAmbientStream() {
  if (timer) return;
  const tick = () => {
    const demo = db.prepare(`SELECT id FROM users WHERE email = 'demo@coverflow.app'`).get() as { id: string } | undefined;
    if (demo) emitMockTransaction(demo.id);
    clearInterval(timer!);
    timer = setInterval(tick, 45000 + Math.random() * 45000);
  };
  timer = setInterval(tick, 60000);
}
