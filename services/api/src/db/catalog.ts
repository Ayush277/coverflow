/**
 * Merchant catalog seed — single source of truth for the storefront and the
 * transaction simulator. Each product carries professional photography
 * (verified Unsplash CDN assets); nothing about purchases is hardcoded in the
 * event pipeline.
 */
import { db } from "./client.js";
import { id, log } from "../lib/core.js";

const IMG = (photo: string) => `https://images.unsplash.com/photo-${photo}?w=800&q=80&auto=format&fit=crop`;

interface ProductSeed {
  sku: string; name: string; description: string; merchant: string; category: string;
  price: number; country?: string; image: string; accent: string; warranty_months?: number;
}

export const CATALOG: ProductSeed[] = [
  { sku: "APL-MBP14-M4", name: "MacBook Pro 14\" M4", description: "14-inch Liquid Retina XDR, M4 Pro, 24GB unified memory, 1TB SSD.", merchant: "Apple Store", category: "ELECTRONICS", price: 189000, image: IMG("1517336714731-489689fd1ca8"), accent: "#60A5FA", warranty_months: 12 },
  { sku: "APL-IPAD-AIR11", name: "iPad Air 11\"", description: "M3 chip, 11-inch Liquid Retina, Wi-Fi 256GB, works with Apple Pencil Pro.", merchant: "Apple Store", category: "ELECTRONICS", price: 59900, image: IMG("1544244015-0df4b3ffc6b0"), accent: "#60A5FA", warranty_months: 12 },
  { sku: "APL-APP-PRO2", name: "AirPods Pro 2", description: "Active noise cancellation, adaptive audio, USB-C charging case.", merchant: "Apple Store", category: "ELECTRONICS", price: 24900, image: IMG("1505740420928-5e560c06d30e"), accent: "#60A5FA", warranty_months: 12 },
  { sku: "SNY-WH1000XM5", name: "Sony WH-1000XM5", description: "Industry-leading noise cancelling wireless headphones, 30h battery.", merchant: "Croma", category: "ELECTRONICS", price: 26990, image: IMG("1505740420928-5e560c06d30e"), accent: "#60A5FA", warranty_months: 12 },
  { sku: "SAM-S25-ULTRA", name: "Samsung Galaxy S25 Ultra", description: "6.9-inch QHD+ AMOLED, 200MP camera, Snapdragon 8 Elite, 512GB.", merchant: "Croma", category: "ELECTRONICS", price: 129999, image: IMG("1511707171634-5f897ff02aa9"), accent: "#60A5FA", warranty_months: 24 },
  { sku: "SNY-A7IV-BODY", name: "Sony A7 IV Camera Body", description: "33MP full-frame mirrorless, 4K60 video, 5-axis stabilisation.", merchant: "B&H Photo", category: "ELECTRONICS", price: 198000, country: "US", image: IMG("1516035069371-29a1b244cc32"), accent: "#A78BFA", warranty_months: 24 },
  { sku: "AMZ-KINDLE-PW", name: "Kindle Paperwhite Signature", description: "7-inch glare-free display, wireless charging, 32GB.", merchant: "Amazon", category: "ELECTRONICS", price: 16999, image: IMG("1512820790803-83ca734da794"), accent: "#60A5FA", warranty_months: 12 },
  { sku: "LOG-MX-MASTER3S", name: "Logitech MX Master 3S", description: "8K DPI quiet-click wireless performance mouse.", merchant: "Amazon", category: "ELECTRONICS", price: 9995, image: IMG("1527814050087-3793815479db"), accent: "#60A5FA", warranty_months: 12 },

  { sku: "DYS-V15-DETECT", name: "Dyson V15 Detect", description: "Laser dust detection, 60min runtime, HEPA filtration.", merchant: "Reliance Digital", category: "APPLIANCES", price: 62900, image: IMG("1558317374-067fb5f30001"), accent: "#34D399", warranty_months: 24 },
  { sku: "LG-FRIDGE-260", name: "LG 260L Refrigerator", description: "Frost-free double door, smart inverter compressor, 3-star.", merchant: "Reliance Digital", category: "APPLIANCES", price: 28490, image: IMG("1571175443880-49e1d25b2bc5"), accent: "#34D399", warranty_months: 12 },
  { sku: "IFB-WM-7KG", name: "IFB 7kg Washing Machine", description: "Front-load, 1200 RPM, aqua energie, 14 wash programmes.", merchant: "Reliance Digital", category: "APPLIANCES", price: 34990, image: IMG("1626806787461-102c1bfaaea1"), accent: "#34D399", warranty_months: 48 },

  { sku: "TNQ-GOLD-CHAIN", name: "Gold Chain 22K", description: "22-karat hallmarked gold chain, 18 grams, BIS certified.", merchant: "Tanishq", category: "JEWELRY", price: 164200, image: IMG("1515562141207-7a88fb7ce338"), accent: "#F472B6", warranty_months: 0 },
  { sku: "TNQ-DIA-PENDANT", name: "Diamond Pendant 18K", description: "18K white gold solitaire pendant, VVS1 clarity, IGI certified.", merchant: "Tanishq", category: "JEWELRY", price: 84000, image: IMG("1605100804763-247f67b3557e"), accent: "#F472B6", warranty_months: 0 },

  { sku: "MMT-FLT-DEL-SIN", name: "Flight DEL → SIN", description: "Singapore Airlines, non-stop, economy, return fare with baggage.", merchant: "MakeMyTrip", category: "TRAVEL", price: 48500, image: IMG("1436491865332-7a61a109cc05"), accent: "#2DD4BF", warranty_months: 0 },
  { sku: "MMT-FLT-BOM-LHR", name: "Flight BOM → LHR", description: "British Airways, non-stop, premium economy, return fare.", merchant: "MakeMyTrip", category: "TRAVEL", price: 128400, image: IMG("1436491865332-7a61a109cc05"), accent: "#2DD4BF", warranty_months: 0 },
  { sku: "TAJ-PALACE-2N", name: "Taj Palace · 2 nights", description: "Luxury suite, breakfast included, New Delhi.", merchant: "Taj Hotels", category: "TRAVEL", price: 38000, image: IMG("1566073771259-6a8506099945"), accent: "#2DD4BF", warranty_months: 0 },

  { sku: "NKE-AJ1-RETRO", name: "Air Jordan 1 Retro High", description: "Original colourway, full-grain leather upper, Air-Sole unit.", merchant: "Nike", category: "FASHION", price: 16995, image: IMG("1542291026-7eec264c27ff"), accent: "#F87171", warranty_months: 0 },
  { sku: "NKE-TECH-FLEECE", name: "Tech Fleece Set", description: "Hoodie and joggers, double-layer knit, tapered fit.", merchant: "Nike", category: "FASHION", price: 18990, image: IMG("1556905055-8f358a7a47b2"), accent: "#F87171", warranty_months: 0 },

  { sku: "IKE-MALM-DESK", name: "MALM Desk", description: "Oak veneer writing desk, 140x65cm, cable management.", merchant: "IKEA", category: "HOME", price: 29600, image: IMG("1518455027359-f3f8164ba6bd"), accent: "#FBBF24", warranty_months: 120 },
  { sku: "IKE-POANG-CHAIR", name: "POÄNG Armchair", description: "Bentwood frame, cushioned seat, ergonomic recline.", merchant: "IKEA", category: "HOME", price: 12500, image: IMG("1567538096630-e0c55bd6374c"), accent: "#FBBF24", warranty_months: 120 },

  { sku: "SBX-COFFEE", name: "Coffee & Croissant", description: "Grande cappuccino with an almond croissant.", merchant: "Starbucks", category: "DINING", price: 850, image: IMG("1509042239860-f550ce710b93"), accent: "#A78BFA", warranty_months: 0 },
  { sku: "UBR-AIRPORT", name: "Airport Ride", description: "Uber Premier, city centre to terminal 3.", merchant: "Uber", category: "TRANSPORT", price: 1250, image: IMG("1449965408869-eaa3f722e40d"), accent: "#94A3B8", warranty_months: 0 },
];

export function seedCatalog() {
  const count = (db.prepare(`SELECT COUNT(*) c FROM products`).get() as any).c;
  if (count === 0) {
    const ins = db.prepare(`INSERT INTO products (id, sku, name, description, merchant, category, price, country, emoji, accent, warranty_months, image_url)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const p of CATALOG) {
      ins.run(id(), p.sku, p.name, p.description, p.merchant, p.category, p.price, p.country ?? "IN", "", p.accent, p.warranty_months ?? 12, p.image);
    }
    log("seed", `catalog seeded with ${CATALOG.length} products`);
  }
  // idempotent image backfill so existing rows pick up photography without a reseed
  const setImg = db.prepare(`UPDATE products SET image_url = ?, accent = ? WHERE sku = ? AND (image_url IS NULL OR image_url = '')`);
  let backfilled = 0;
  for (const p of CATALOG) backfilled += setImg.run(p.image, p.accent, p.sku).changes;
  if (backfilled) log("seed", `backfilled ${backfilled} product images`);
}
