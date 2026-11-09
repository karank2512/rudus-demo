"use client";

import { useEffect, useMemo, useState } from "react";
import { baked, planSet, profiles } from "../../src/engine/data";
import { runPipeline } from "../../src/engine/run";
import type { Overrides } from "../../src/engine/takeoff";
import { clearOverrides, loadOverrides, onOverridesChanged, saveOverrides } from "../lib/overrides";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Which override field each flag drives, and the selectable values.
const FLAG_FIELD: Record<string, { element: string; field: string; parse: (v: string) => number | string }> = {
  "flag-wf1-length": {
    element: "wf1",
    field: "length_ft",
    parse: (v) => parseFloat(v),
  },
  "flag-f3-bar": {
    element: "f3",
    field: "bar",
    parse: (v) => v.replace(" each way", ""),
  },
  "flag-gb1-depth": {
    element: "gb1",
    field: "depth_ft",
    parse: (v) => parseFloat(v),
  },
  "flag-sog1-thickness": {
    element: "sog1",
    field: "thickness_in",
    parse: (v) => parseFloat(v.replace('"', "")),
  },
};

export function ReviewQueue() {
  const [overrides, setOverrides] = useState<Overrides>({});
  const [choices, setChoices] = useState<Record<string, string>>({});

  useEffect(() => {
    setOverrides(loadOverrides());
    return onOverridesChanged(() => setOverrides(loadOverrides()));
  }, []);

  const base = useMemo(() => runPipeline(planSet, profiles, {}), []);
  const current = useMemo(() => runPipeline(planSet, profiles, overrides), [overrides]);

  const applyChoice = (flagId: string) => {
    const cfg = FLAG_FIELD[flagId];
    const choice = choices[flagId];
    if (!cfg || choice === undefined) return;
    // "provisional" means: remove the override, keep the engine default.
    const next = { ...overrides };
    if (choice === "__provisional__") {
      delete next[cfg.element];
    } else {
      next[cfg.element] = { [cfg.field]: cfg.parse(choice) };
    }
    saveOverrides(next);
  };

  const flags = baked.takeoff.flags;
  const resolvedCount = flags.filter((f) => overrides[FLAG_FIELD[f.id].element]).length;

  return (
    <>
      <div className="session-note">
        {flags.length} discrepancies were detected by cross-checking the sheets against each other.
        The engine does not resolve them on its own: every affected quantity is priced from a
        clearly marked provisional source and held here until a person decides. Decisions you
        make below recompute the takeoff, pricing, and export in this browser session only -
        nothing is written back; a production deployment would record who decided what, and when.
      </div>

      {resolvedCount > 0 && (
        <p className="mono" style={{ fontSize: 12, color: "var(--ok)" }}>
          {resolvedCount} of {flags.length} decided this session.{" "}
          <button
            onClick={() => clearOverrides()}
            style={{ border: "none", background: "none", color: "var(--accent)", cursor: "pointer", font: "inherit" }}
          >
            Reset all
          </button>
        </p>
      )}

      {flags.map((f, i) => {
        const cfg = FLAG_FIELD[f.id];
        const isResolved = overrides[cfg.element] !== undefined;
        const baseItem = base.takeoff.lineItems.filter((li) => li.elementId === f.elementId);
        const curItem = current.takeoff.lineItems.filter((li) => li.elementId === f.elementId);
        const baseTotal = base.priced[0].total;
        const curTotal = current.priced[0].total;

        return (
          <div className={`rev-item${isResolved ? " resolved" : ""}`} key={f.id}>
            <div className="rev-marker">R{i + 1}</div>
            <div className="rev-body">
              <h3>{f.summary}</h3>
              <div className="rev-meta">
                {f.mark} · {f.kind === "conflict" ? "Conflicting sources" : "Missing data"}
              </div>

              <div className="rev-sources">
                <label className={`rev-source${choices[f.id] === "__provisional__" || (choices[f.id] === undefined && !isResolved) ? " chosen" : ""}`}>
                  <span className="sheet-ref">
                    {(() => {
                      const s = f.sources.find((x) => x.value === f.provisional.value) ?? f.sources[0];
                      return `${s.sheet} - ${s.ref}`;
                    })()}
                  </span>
                  <span>
                    Keep provisional: <span className="val">{f.provisional.value}</span>
                    <span className="rev-note"> - {f.provisional.why}</span>
                  </span>
                  <input
                    type="radio"
                    name={f.id}
                    checked={choices[f.id] === "__provisional__" || choices[f.id] === undefined}
                    onChange={() => setChoices({ ...choices, [f.id]: "__provisional__" })}
                  />
                </label>
                {f.sources.map((s) => {
                  if (s.value === "blank" || s.value.startsWith(f.provisional.value)) return null;
                  return (
                    <label className={`rev-source${choices[f.id] === s.value ? " chosen" : ""}`} key={s.value}>
                      <span className="sheet-ref">{s.sheet} - {s.ref}</span>
                      <span>
                        Use <span className="val">{s.value}</span>
                      </span>
                      <input
                        type="radio"
                        name={f.id}
                        checked={choices[f.id] === s.value}
                        onChange={() => setChoices({ ...choices, [f.id]: s.value })}
                      />
                    </label>
                  );
                })}
              </div>

              <div className="rev-actions">
                <button className="btn" onClick={() => applyChoice(f.id)}>
                  {isResolved ? "Update decision" : "Record decision"}
                </button>
                {isResolved && <span className="mono" style={{ fontSize: 11, color: "var(--ok)" }}>Decided</span>}
              </div>

              {isResolved && (
                <div className="rev-impact">
                  <span>
                    {f.mark} lines recompute:{" "}
                    {baseItem.map((b, j) => {
                      const c = curItem[j];
                      return c && c.quantity !== b.quantity ? (
                        <span className="delta" key={b.id}>
                          {b.id.replace(`${f.elementId}-`, "")} {b.quantity} → {c.quantity} {b.unit}
                          {j < baseItem.length - 1 ? " · " : ""}
                        </span>
                      ) : null;
                    })}
                  </span>
                  <span>
                    Bid total ({current.priced[0].profile.company.replace(" (fictional)", "")}):{" "}
                    <span className="delta">{money(baseTotal)} → {money(curTotal)}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
