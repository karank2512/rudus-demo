// Bid-package CSV export: one row per priced line item, estimator-style
// columns. Deterministic and dependency-free.

import type { PricedTakeoff } from "./types.js";

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(pt: PricedTakeoff, provisionalElementIds: Set<string> = new Set()): string {
  const header = [
    "Mark", "Description", "Category", "Qty", "Unit",
    "Waste %", "Adj Qty", "Unit Price", "Extended", "Provisional", "Source",
  ];
  const rows = pt.items.map((p) =>
    [
      p.mark,
      p.description,
      p.category,
      p.quantity,
      p.unit,
      p.waste_pct,
      p.adjusted_quantity,
      p.unit_price.toFixed(2),
      p.extended.toFixed(2),
      provisionalElementIds.has(p.elementId) ? "PROVISIONAL - unresolved review item" : "",
      p.provenance.map((s) => `${s.sheet} ${s.ref}`).join("; "),
    ].map(csvCell).join(","),
  );
  rows.push(
    ["", "Subtotal", "", "", "", "", "", "", pt.subtotal.toFixed(2), ""].map(csvCell).join(","),
    ["", `Markup ${pt.markup_pct}%`, "", "", "", "", "", "", pt.total.toFixed(2), ""].map(csvCell).join(","),
  );
  return [header.map(csvCell).join(","), ...rows].join("\n");
}
