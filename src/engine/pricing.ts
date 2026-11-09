// Applies a contractor profile (unit prices, waste, markup) to the takeoff.
// The two profiles in the fixture are the FDE story: same plan set, priced
// the way each subcontractor actually buys and wastes material.

import type { LineItem, PricedLineItem, PricedTakeoff, Profile, Category } from "./types.js";

const r2 = (n: number) => Math.round(n * 100) / 100;

const UNIT_PRICE_KEY: Record<Category, keyof Profile["unit_prices"]> = {
  concrete: "concrete_per_cy",
  formwork: "formwork_per_sf",
  rebar: "rebar_per_lb",
  vapor: "vapor_per_sf",
  gravel: "gravel_per_cy",
};

export function priceTakeoff(items: LineItem[], profile: Profile): PricedTakeoff {
  const priced: PricedLineItem[] = items.map((it) => {
    const waste = profile.waste_pct[it.category] ?? 0;
    const qty = r2(it.quantity * (1 + waste / 100));
    const unitPrice = profile.unit_prices[UNIT_PRICE_KEY[it.category]];
    return {
      ...it,
      waste_pct: waste,
      adjusted_quantity: qty,
      unit_price: unitPrice,
      extended: r2(qty * unitPrice),
    };
  });
  const subtotal = r2(priced.reduce((s, p) => s + p.extended, 0));
  const total = r2(subtotal * (1 + profile.markup_pct / 100));
  return { profile, items: priced, subtotal, markup_pct: profile.markup_pct, total };
}
