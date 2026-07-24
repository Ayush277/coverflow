/**
 * CoverFlow Demo Storefront.
 *
 * A real merchant surface: browse the catalog, pay with a saved card, and the
 * checkout emits genuine card authorizations onto the event bus. From there the
 * normal pipeline takes over — Purchase Intelligence → Decision Engine → Wallet
 * → Timeline → Notifications — with no special-casing for store orders.
 *
 * Each merchant in the cart becomes its own authorization, exactly as a real
 * card network would settle them, and each one gets a merchant-issued receipt
 * so Receipt Intelligence has something to link.
 */
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { audit, id, now, requireAuth, sha256, wrap } from "../lib/core.js";
import { bus } from "../events/bus.js";
import { activateBenefits } from "../engines/rules.js";

export const storeRouter = Router();
storeRouter.use(requireAuth);

storeRouter.get("/products", wrap((req, res) => {
  const { category, q } = req.query as Record<string, string>;
  let sql = `SELECT * FROM products WHERE active = 1`;
  const params: unknown[] = [];
  if (category && category !== "ALL") { sql += ` AND category = ?`; params.push(category); }
  if (q) { sql += ` AND (LOWER(name) LIKE ? OR LOWER(merchant) LIKE ? OR LOWER(description) LIKE ?)`; params.push(...Array(3).fill(`%${q.toLowerCase()}%`)); }
  sql += ` ORDER BY price DESC`;
  const products = db.prepare(sql).all(...params);
  const categories = db.prepare(`SELECT DISTINCT category FROM products WHERE active = 1 ORDER BY category`).all() as any[];
  res.json({ products, categories: categories.map(c => c.category) });
}));

const checkoutSchema = z.object({
  cardId: z.string(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(5) })).min(1).max(20),
});

storeRouter.post("/checkout", wrap((req, res) => {
  const body = checkoutSchema.parse(req.body);
  const userId = req.user!.id;

  const card = db.prepare(`SELECT * FROM cards WHERE id = ? AND user_id = ? AND status = 'ACTIVE'`).get(body.cardId, userId) as any;
  if (!card) return res.status(404).json({ error: "CARD_NOT_FOUND", message: "Select an active card to pay with" });

  // resolve products and group them per merchant — one authorization per merchant
  const byMerchant = new Map<string, { product: any; quantity: number }[]>();
  let total = 0;
  for (const item of body.items) {
    const product = db.prepare(`SELECT * FROM products WHERE id = ? AND active = 1`).get(item.productId) as any;
    if (!product) return res.status(404).json({ error: "PRODUCT_NOT_FOUND", message: `Product ${item.productId} is unavailable` });
    total += product.price * item.quantity;
    const list = byMerchant.get(product.merchant) ?? [];
    list.push({ product, quantity: item.quantity });
    byMerchant.set(product.merchant, list);
  }

  const orderId = id();
  const timestamp = now();
  db.prepare(`INSERT INTO orders (id, user_id, card_id, total, currency, status, created_at) VALUES (?,?,?,?,?,?,?)`)
    .run(orderId, userId, card.id, total, card.currency, "AUTHORIZED", timestamp);

  const insItem = db.prepare(`INSERT INTO order_items (id, order_id, product_id, transaction_id, quantity, unit_price) VALUES (?,?,?,?,?,?)`);
  const insTxn = db.prepare(`INSERT INTO transactions (id, card_id, user_id, merchant, merchant_category, description, amount, currency, country, occurred_at, source)
    VALUES (?,?,?,?,?,?,?,?,?,?,'COVERFLOW_STORE')`);
  const insReceipt = db.prepare(`INSERT INTO receipts (id, user_id, transaction_id, file_name, file_hash, source, merchant, invoice_number, amount, purchase_date, serial_number, items, ocr_confidence, status)
    VALUES (?,?,?,?,?,'MERCHANT_EMAIL',?,?,?,?,?,?,1.0,'LINKED')`);

  const created: any[] = [];

  for (const [merchant, entries] of byMerchant) {
    const amount = entries.reduce((s, e) => s + e.product.price * e.quantity, 0);
    const lead = entries[0].product;
    const description = entries.length === 1 && entries[0].quantity === 1
      ? lead.name
      : `${lead.name}${entries.length > 1 ? ` +${entries.length - 1} item${entries.length > 2 ? "s" : ""}` : ` ×${entries[0].quantity}`}`;

    const txnId = `txn_${id()}`;
    const txn = {
      id: txnId, card_id: card.id, user_id: userId, merchant,
      merchant_category: lead.category, description, amount,
      currency: lead.currency, country: lead.country, occurred_at: timestamp,
    };
    insTxn.run(txnId, card.id, userId, merchant, lead.category, description, amount, lead.currency, lead.country, timestamp);
    for (const e of entries) insItem.run(id(), orderId, e.product.id, txnId, e.quantity, e.product.price);

    // merchant issues a receipt with the order — Receipt Intelligence gets real structured data
    const invoice = `INV-${new Date(timestamp).getFullYear()}-${orderId.slice(0, 6).toUpperCase()}`;
    insReceipt.run(id(), userId, txnId, `${merchant.toLowerCase().replace(/\s+/g, "-")}-${invoice}.pdf`,
      sha256(`${orderId}:${merchant}:${amount}`), merchant, invoice, amount, timestamp.slice(0, 10),
      lead.warranty_months > 0 ? `SN-${lead.sku}-${orderId.slice(0, 5).toUpperCase()}` : null,
      JSON.stringify(entries.map(e => `${e.quantity}× ${e.product.name}`)));

    // Activation runs synchronously so checkout can show the customer exactly what
    // got protected. The event still goes on the bus for the async consumers
    // (SSE, notifications, analytics) — carrying the already-activated benefits so
    // they notify without re-running the engine.
    const benefits = activateBenefits(txn);
    bus.publish("transactions.created", { ...txn, __benefits: benefits });

    created.push({
      transactionId: txnId, merchant, description, amount,
      items: entries.map(e => ({ name: e.product.name, quantity: e.quantity, price: e.product.price, image: e.product.image_url, category: e.product.category })),
      invoice,
      protections: benefits.map(b => ({ id: b.id, type: b.benefit_type, decision: b.decision, rule: b.rule_name, coverageEnd: b.coverage_end })),
    });
  }

  audit(userId, "STORE_CHECKOUT", "order", orderId, { total, merchants: byMerchant.size });

  res.status(201).json({
    orderId, total, currency: card.currency,
    card: { tier: card.tier, last4: card.last4 },
    authorizations: created,
    protectionsActivated: created.reduce((s, c) => s + c.protections.length, 0),
  });
}));

storeRouter.get("/orders", wrap((req, res) => {
  const orders = db.prepare(`SELECT o.*, c.tier card_tier, c.last4 card_last4,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) item_count
    FROM orders o JOIN cards c ON c.id = o.card_id
    WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 50`).all(req.user!.id) as any[];
  for (const o of orders) {
    o.items = db.prepare(`SELECT oi.quantity, oi.unit_price, p.name, p.emoji, p.merchant, oi.transaction_id
      FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`).all(o.id);
  }
  res.json({ orders });
}));
