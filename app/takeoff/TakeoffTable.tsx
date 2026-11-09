"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { baked, planSet, profiles } from "../../src/engine/data";
import { runPipeline } from "../../src/engine/run";
import type { Overrides } from "../../src/engine/takeoff";
import type { PricedTakeoff } from "../../src/engine/types";
import { loadOverrides, onOverridesChanged } from "../lib/overrides";

const fmtQty = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function TakeoffTable() {
  const [profileId, setProfileId] = useState(profiles[0].id);
  const [open, setOpen] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Overrides>({});

  useEffect(() => {
    setOverrides(loadOverrides());
    return onOverridesChanged(() => setOverrides(loadOverrides()));
  }, []);

  const result: PricedTakeoff = useMemo(() => {
    const { priced } = runPipeline(planSet, profiles, overrides);
    return priced.find((p) => p.profile.id === profileId) ?? priced[0];
  }, [profileId, overrides]);

  const groups = useMemo(() => {
    const order = planSet.elements.map((e) => e.id);
    const byEl = new Map<string, typeof result.items>();
    for (const item of result.items) {
      const arr = byEl.get(item.elementId) ?? [];
      arr.push(item);
      byEl.set(item.elementId, arr);
    }
    return order
      .filter((id) => byEl.has(id))
      .map((id) => ({
        element: planSet.elements.find((e) => e.id === id)!,
        items: byEl.get(id)!,
      }));
  }, [result]);

  const flaggedElements = useMemo(
    () => new Set(baked.takeoff.flags.map((f) => f.elementId)),
    [],
  );
  const overriddenCount = Object.keys(overrides).length;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div className="seg" role="group" aria-label="Pricing profile">
          {profiles.map((p) => (
            <button
              key={p.id}
              aria-pressed={profileId === p.id}
              onClick={() => setProfileId(p.id)}
            >
              {p.company.replace(" (fictional)", "")}
            </button>
          ))}
        </div>
        <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
          {result.items.length} line items - subtotal {money(result.subtotal)} - bid total{" "}
          {money(result.total)}
          {overriddenCount > 0 && ` - ${overriddenCount} override${overriddenCount > 1 ? "s" : ""} applied`}
        </span>
      </div>

      {groups.map(({ element, items }) => (
        <div className="element-group" key={element.id} id={element.id}>
          <div className="element-head">
            <span className="mark-chip">{element.mark}</span>
            <h3>{element.label}</h3>
            {flaggedElements.has(element.id) && <span className="flag-tag">Flagged for review</span>}
            <span className="refs">{element.source_refs.join(" · ")}</span>
          </div>
          <div className="table-scroll">
          <table className="items">
            <thead>
              <tr>
                <th>Assembly line</th>
                <th className="num">Qty</th>
                <th>Unit</th>
                <th className="num">Waste</th>
                <th className="num">Adj qty</th>
                <th className="num">Unit $</th>
                <th className="num">Extended</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <Fragment key={it.id}>
                  <tr
                    className="item-row"
                    onClick={() => setOpen(open === it.id ? null : it.id)}
                    aria-expanded={open === it.id}
                  >
                    <td>
                      <span className="desc">{it.description.startsWith(`${element.label} - `) ? it.description.slice(element.label.length + 3) : it.description}</span>
                      <span className="expand-hint">{open === it.id ? "- hide calc & source" : "+ calc & source"}</span>
                    </td>
                    <td className="num">{fmtQty(it.quantity)}</td>
                    <td className="num">{it.unit}</td>
                    <td className="num">{it.waste_pct}%</td>
                    <td className="num">{fmtQty(it.adjusted_quantity)}</td>
                    <td className="num">{money(it.unit_price)}</td>
                    <td className="num">{money(it.extended)}</td>
                  </tr>
                  {open === it.id && (
                    <tr className="detail-row">
                      <td colSpan={7}>
                        <ul className="calc-steps">
                          {it.calc.map((c, i) => (
                            <li key={i}>
                              <span className="lbl">{c.label}</span>
                              <span>{c.expr}</span>
                            </li>
                          ))}
                        </ul>
                        <ul className="prov-list">
                          {it.provenance.map((p, i) => (
                            <li key={i}>
                              <b>{p.sheet}</b> - {p.ref}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ))}
    </>
  );
}
