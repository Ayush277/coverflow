"use client";
/**
 * Media layer — real product/category photography with a graceful fallback.
 * Every image URL here is a verified Unsplash permanent CDN asset; if any ever
 * fails to load, the tile degrades to a premium category gradient + line icon
 * rather than a broken image. No emoji anywhere in the product surface.
 */
import { useState } from "react";
import { Cpu, Refrigerator, Gem, Plane, Shirt, Armchair, Coffee, Car, Package, type LucideIcon } from "lucide-react";

const U = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

/** One curated professional photo per merchandise category (used by the wallet + fallbacks). */
export const CATEGORY_IMAGE: Record<string, string> = {
  ELECTRONICS: U("1517336714731-489689fd1ca8"),
  APPLIANCES: U("1571175443880-49e1d25b2bc5"),
  JEWELRY: U("1515562141207-7a88fb7ce338"),
  TRAVEL: U("1436491865332-7a61a109cc05"),
  FASHION: U("1542291026-7eec264c27ff"),
  HOME: U("1518455027359-f3f8164ba6bd"),
  DINING: U("1509042239860-f550ce710b93"),
  TRANSPORT: U("1449965408869-eaa3f722e40d"),
};

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  ELECTRONICS: Cpu, APPLIANCES: Refrigerator, JEWELRY: Gem, TRAVEL: Plane,
  FASHION: Shirt, HOME: Armchair, DINING: Coffee, TRANSPORT: Car,
};

export const CATEGORY_ACCENT: Record<string, string> = {
  ELECTRONICS: "#60a5fa", APPLIANCES: "#34d399", JEWELRY: "#f472b6", TRAVEL: "#2dd4bf",
  FASHION: "#f87171", HOME: "#fbbf24", DINING: "#a78bfa", TRANSPORT: "#94a3b8",
};

export const categoryIcon = (category: string) => CATEGORY_ICON[category] ?? Package;
export const categoryAccent = (category: string) => CATEGORY_ACCENT[category] ?? "#6366f1";

/**
 * Product / category imagery with automatic fallback.
 * Pass an explicit `src`, otherwise the category photo is used.
 */
export function Photo({
  src, category, alt, className = "", rounded = "rounded-[16px]",
}: { src?: string | null; category: string; alt: string; className?: string; rounded?: string }) {
  const [failed, setFailed] = useState(false);
  const url = src || CATEGORY_IMAGE[category];
  const Icon = categoryIcon(category);
  const accent = categoryAccent(category);

  if (failed || !url) {
    return (
      <div className={`relative flex items-center justify-center overflow-hidden ${rounded} ${className}`}
        style={{ background: `linear-gradient(135deg, ${accent}22, rgba(2,4,10,0.6))` }}>
        <Icon size={28} style={{ color: accent }} strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`}>
      <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 ring-1 ring-inset ring-border" style={{ borderRadius: "inherit" }} />
    </div>
  );
}
