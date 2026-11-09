"use client";

import { useEffect, useMemo, useState } from "react";
import { planSet, profiles } from "../../src/engine/data";
import { runPipeline } from "../../src/engine/run";
import { toCsv } from "../../src/engine/exportCsv";
import type { Overrides } from "../../src/engine/takeoff";
import { loadOverrides, onOverridesChanged } from "../lib/overrides";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function ExportSheet() {
  const [profileId, setProfileId] = useState(profiles[0].id);
  const [overrides, setOverrides] = useState<Overrides>({});

  useEffect(() => {
    setOverrides(loadOverrides());
    return onOverridesChanged(() => setOverrides(loadOverrides()));
  }, []);

  const { csv, subtotal, total, profileName, count, provisionalCount } = useMemo(() => {
    const { takeoff, priced } = runPipeline(planSet, profiles, overrides);
    const p = priced.find((x) => x.profile.id === profileId) ?? priced[0];
    // Rows stay provisional until a person decides the flagged field.
    const unresolved = new Set(
      takeoff.flags.filter((f) => !overrides[f.elementId]).map((f) => f.elementId),
    );
    return {
      csv: toCsv(p, unresolved),
      subtotal: p.subtotal,
      total: p.total,
      profileName: p.profile.company.replace(" (fictional)", ""),
      count: p.items.length,
      provisionalCount: p.items.filter((i) => unresolved.has(i.elementId)).length,
    };
  }, [profileId, overrides]);

  const download = () => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alder-street-workshop_takeoff_${profileId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lines = csv.split("\n");

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div className="seg" role="group" aria-label="Pricing profile">
          {profiles.map((p) => (
            <button key={p.id} aria-pressed={profileId === p.id} onClick={() => setProfileId(p.id)}>
              {p.company.replace(" (fictional)", "")}
            </button>
          ))}
        </div>
        <button className="btn" onClick={download}>
          Download CSV
        </button>
        <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
          {count} rows - {profileName} - subtotal {money(subtotal)} - total {money(total)}
          {provisionalCount > 0 && ` - ${provisionalCount} rows PROVISIONAL pending review`}
        </span>
      </div>

      <div className="csv-preview">
        <pre>
          {lines.map((l, i) => (
            <div key={i} className={l.includes("Subtotal") || l.includes("Markup") ? "total-line" : undefined}>
              {l}
            </div>
          ))}
        </pre>
      </div>

      <p className="footnote">
        Estimator-style columns - mark, description, category, quantity, waste, adjusted quantity,
        unit price, extended, and the source references for every row - so the package can drop
        into a spreadsheet workflow without double entry. Rows whose element still has an
        undecided review item are marked PROVISIONAL so an unresolved price is never mistaken for
        an approved bid; decisions recorded in the review queue during this session clear the mark
        and are already reflected here.
      </p>
    </>
  );
}
