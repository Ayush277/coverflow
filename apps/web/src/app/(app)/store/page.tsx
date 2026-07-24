"use client";
/**
 * CoverFlow Demo Store — a real merchant surface.
 * Buy goods, pay with a connected card, and watch the authorization flow into
 * the Benefit Wallet with protections activated live.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingCart, Plus, Minus, CreditCard, ShieldCheck, Sparkles, ArrowRight, Store as StoreIcon, X, Search } from "lucide-react";
import { api, money, fmtDate } from "@/lib/api";
import { Badge, Button, Card, Empty, Modal, Select, useToast, cx } from "@/components/ui";
import { Photo } from "@/components/media";

const ease = [0.22, 1, 0.36, 1] as const;

interface Product { id: string; sku: string; name: string; description: string; merchant: string; category: string; price: number; image_url: string; accent: string; warranty_months: number; country: string }

export default function Store() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("ALL");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const [cardId, setCardId] = useState("");
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== "ALL") params.set("category", category);
    if (q) params.set("q", q);
    setProducts(null);
    const t = setTimeout(() => {
      api<{ products: Product[]; categories: string[] }>(`/api/store/products?${params}`)
        .then(d => { setProducts(d.products); setCategories(d.categories); })
        .catch(() => setProducts([]));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [category, q]);

  useEffect(() => {
    api<{ cards: any[] }>("/api/cards").then(d => {
      const active = d.cards.filter((c: any) => c.status === "ACTIVE");
      setCards(active);
      setCardId(active.find((c: any) => c.is_default)?.id ?? active[0]?.id ?? "");
    }).catch(() => {});
  }, []);

  const add = (p: Product) => {
    setCart(c => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }));
    toast({ tone: "info", title: `${p.name} added`, body: `${p.merchant} · ${money(p.price)}` });
  };
  const setQty = (pid: string, delta: number) =>
    setCart(c => {
      const next = (c[pid] ?? 0) + delta;
      if (next <= 0) { const { [pid]: _, ...rest } = c; return rest; }
      return { ...c, [pid]: Math.min(5, next) };
    });

  const cartLines = useMemo(() =>
    Object.entries(cart).map(([pid, qty]) => ({ product: products?.find(p => p.id === pid), qty }))
      .filter(l => l.product) as { product: Product; qty: number }[],
    [cart, products]);
  const cartTotal = cartLines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const cartCount = Object.values(cart).reduce((s, n) => s + n, 0);

  const checkout = async () => {
    if (!cardId) { toast({ tone: "error", title: "No card connected", body: "Connect a card first from the Cards page." }); return; }
    setPaying(true);
    try {
      const res = await api("/api/store/checkout", {
        method: "POST",
        body: JSON.stringify({ cardId, items: cartLines.map(l => ({ productId: l.product.id, quantity: l.qty })) }),
      });
      setCart({}); setCartOpen(false); setReceipt(res);
    } catch (e: any) {
      toast({ tone: "error", title: "Payment failed", body: e.message });
    } finally { setPaying(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="fade-in">
          <div className="mono inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-medium text-text/70 ring-1 ring-border">
            <StoreIcon size={13} className="text-primary" /> Demo Store
          </div>
          <h1 className="mt-4 text-4xl font-normal tracking-tighter">Buy something, watch it get <span className="grad-text">protected</span></h1>
          <p className="mt-2 text-[15px] text-muted">Real checkout → real card authorization → real benefit activation. Nothing is faked downstream.</p>
        </div>
        <Button onClick={() => setCartOpen(true)} variant={cartCount ? "primary" : "outline"}>
          <ShoppingCart size={15} /> Cart{cartCount > 0 && ` · ${cartCount}`}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products…"
            className="h-9 w-64 rounded-[10px] border border-border bg-surface pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-primary/60" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["ALL", ...categories].map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={cx("mono cursor-pointer rounded-full border px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide transition-colors",
                category === c ? "border-primary/40 bg-primary/12 text-primary" : "border-border text-muted hover:text-white")}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {products === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-56 rounded-[16px]" />)}</div>
      ) : products.length === 0 ? (
        <Empty icon={<StoreIcon size={32} strokeWidth={1.5} />} title="No products match" hint="Try a different category or search." />
      ) : (
        <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(p => (
            <motion.div key={p.id} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } } }}>
              <Card hover className="group flex h-full flex-col overflow-hidden !p-0">
                <div className="relative">
                  <Photo src={p.image_url} category={p.category} alt={p.name} rounded="rounded-none" className="aspect-[4/3] w-full" />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#030712] to-transparent" />
                  <span className="glass absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-text/90 mono">{p.merchant}</span>
                  {p.country !== "IN" && <span className="mono absolute right-3 top-3 rounded-full bg-amber/15 px-2 py-1 text-[9.5px] font-semibold uppercase tracking-wide text-amber ring-1 ring-amber/25">ships {p.country}</span>}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-[15px] font-semibold">{p.name}</h3>
                  <p className="mt-1 flex-1 text-[12.5px] leading-relaxed text-muted line-clamp-2">{p.description}</p>
                  <div className="mono mt-3 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted">
                    <span style={{ color: p.accent }}>{p.category}</span>
                    {p.warranty_months > 0 && <span>· {p.warranty_months}mo warranty</span>}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-[17px] font-semibold">{money(p.price)}</span>
                    {cart[p.id] ? (
                      <div className="flex items-center gap-2 rounded-[10px] border border-primary/40 bg-primary/10 px-1">
                        <button onClick={() => setQty(p.id, -1)} className="cursor-pointer p-1.5 text-primary transition-opacity hover:opacity-70"><Minus size={13} /></button>
                        <span className="mono w-4 text-center text-[13px] font-bold text-primary">{cart[p.id]}</span>
                        <button onClick={() => setQty(p.id, 1)} className="cursor-pointer p-1.5 text-primary transition-opacity hover:opacity-70"><Plus size={13} /></button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => add(p)}><Plus size={13} /> Add</Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* cart drawer */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCartOpen(false)}>
            <motion.aside className="glass-2 flex h-full w-full max-w-md flex-col rounded-l-[24px]"
              initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} transition={{ type: "spring", stiffness: 380, damping: 36 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-border p-5">
                <h2 className="text-[15px] font-semibold">Your cart</h2>
                <button onClick={() => setCartOpen(false)} className="cursor-pointer text-muted hover:text-text"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {cartLines.length === 0 ? (
                  <Empty icon={<ShoppingCart size={28} strokeWidth={1.5} />} title="Cart is empty" hint="Add something protectable — electronics, appliances, travel." />
                ) : (
                  <div className="space-y-3">
                    {cartLines.map(l => (
                      <div key={l.product.id} className="flex items-center gap-3 rounded-[12px] border border-border bg-surface-2 p-3">
                        <Photo src={l.product.image_url} category={l.product.category} alt={l.product.name} rounded="rounded-[10px]" className="h-11 w-11 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">{l.product.name}</p>
                          <p className="mono text-[10.5px] uppercase text-muted">{l.product.merchant}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setQty(l.product.id, -1)} className="cursor-pointer rounded p-1 text-muted hover:text-text"><Minus size={12} /></button>
                          <span className="mono w-4 text-center text-[12px]">{l.qty}</span>
                          <button onClick={() => setQty(l.product.id, 1)} className="cursor-pointer rounded p-1 text-muted hover:text-text"><Plus size={12} /></button>
                        </div>
                        <span className="mono w-20 shrink-0 text-right text-[13px] font-semibold">{money(l.product.price * l.qty)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cartLines.length > 0 && (
                <div className="space-y-4 border-t border-border p-5">
                  {cards.length === 0 ? (
                    <div className="rounded-[10px] border border-amber/30 bg-amber/8 p-3 text-[12.5px] text-amber">
                      No card connected. <Link href="/cards" className="underline">Connect one</Link> to check out.
                    </div>
                  ) : (
                    <Select label="Pay with" value={cardId} onChange={(e: any) => setCardId(e.target.value)}>
                      {cards.map(c => <option key={c.id} value={c.id}>{c.tier} •••• {c.last4}{c.is_default ? " (default)" : ""}</option>)}
                    </Select>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="mono text-[11px] uppercase tracking-widest text-muted">Total</span>
                    <span className="text-xl font-semibold">{money(cartTotal)}</span>
                  </div>
                  <Button className="w-full" size="lg" disabled={paying || !cardId} onClick={checkout}>
                    <CreditCard size={16} /> {paying ? "Authorizing…" : `Pay ${money(cartTotal)}`}
                  </Button>
                  <p className="text-center text-[11px] text-muted">Simulated issuing — no real payment is processed.</p>
                </div>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* post-purchase protection receipt */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Payment authorized" wide>
        {receipt && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-[12px] border border-mint/25 bg-mint/8 p-4">
              <div>
                <p className="text-[14px] font-semibold text-mint">{money(receipt.total)} paid</p>
                <p className="mono mt-0.5 text-[10.5px] uppercase tracking-wide text-muted">{receipt.card.tier} •••• {receipt.card.last4} · order {receipt.orderId.slice(0, 8)}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-medium text-primary">{receipt.protectionsActivated}</p>
                <p className="mono text-[10px] uppercase tracking-wide text-muted">protections activated</p>
              </div>
            </div>

            {receipt.authorizations.map((a: any) => (
              <div key={a.transactionId} className="rounded-[12px] border border-border bg-bg/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13.5px] font-medium">{a.description}</p>
                    <p className="mono text-[10.5px] uppercase tracking-wide text-muted">{a.merchant} · receipt {a.invoice} stored</p>
                  </div>
                  <span className="mono text-[13px] font-semibold">{money(a.amount)}</span>
                </div>
                {a.protections.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    {a.protections.map((p: any) => (
                      <Link key={p.id} href={`/wallet/${p.id}`} className="flex items-center gap-2.5 rounded-[8px] border border-border px-3 py-2 transition-colors hover:border-primary/40">
                        <ShieldCheck size={14} className="text-mint" />
                        <span className="flex-1 text-[12.5px]">{p.type} <span className="text-muted">· until {fmtDate(p.coverageEnd)}</span></span>
                        <Badge tone={p.decision}>{p.decision}</Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2.5 text-[12px] text-muted">No protection applies — this purchase falls outside every active coverage rule.</p>
                )}
              </div>
            ))}

            <div className="flex justify-end gap-2.5">
              <Button variant="ghost" onClick={() => setReceipt(null)}>Keep shopping</Button>
              <Link href="/wallet"><Button><Sparkles size={15} /> Open Benefit Wallet <ArrowRight size={14} /></Button></Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
