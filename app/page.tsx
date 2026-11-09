import { Sheet } from "./components/Sheet";
import { PlanView } from "./components/PlanView";
import { baked, profiles } from "../src/engine/data";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function PlanPage() {
  const { takeoff, priced } = baked;
  const [a, b] = priced;
  const delta = Math.abs(a.total - b.total);

  return (
    <Sheet current="/" sheetNo="T-0.00" sheetTitle="Foundation plan and project summary">
      <div className="sheet-title">
        <h1>Alder Street Workshop</h1>
        <span className="sub">Foundation package - synthetic plan set</span>
      </div>

      <div className="overview">
        <div>
          <div className="plan-frame">
            <PlanView />
            <div className="plan-caption">
              <span>S-101 FOUNDATION PLAN (SYNTHETIC REDRAWING)</span>
              <span>SCALE: NTS</span>
            </div>
          </div>
          <p className="footnote">
            Select an element on the plan to jump to its takeoff lines. Every quantity in this
            demo is computed deterministically from this fixture - no model calls, no CV, no
            real drawings. Four deliberate discrepancies are planted across the sheets; they are
            waiting in the review queue.
          </p>
        </div>

        <div>
          <h2 className="block-label">Package at a glance</h2>
          <div className="stat-rows">
            <div className="stat-row">
              <span className="k">Plan elements</span>
              <span className="v">6 <small>marks</small></span>
            </div>
            <div className="stat-row">
              <span className="k">Priced line items</span>
              <span className="v">{takeoff.lineItems.length}</span>
            </div>
            <div className="stat-row">
              <span className="k">Open discrepancies</span>
              <span className="v" style={{ color: "var(--flag)" }}>{takeoff.flags.length} <small>in review</small></span>
            </div>
            <div className="stat-row">
              <span className="k">Concrete, total</span>
              <span className="v">
                {takeoff.lineItems
                  .filter((i) => i.category === "concrete")
                  .reduce((s, i) => s + i.quantity, 0)
                  .toFixed(2)}{" "}
                <small>CY</small>
              </span>
            </div>
            <div className="stat-row">
              <span className="k">Rebar, total</span>
              <span className="v">
                {takeoff.lineItems
                  .filter((i) => i.category === "rebar")
                  .reduce((s, i) => s + i.quantity, 0)
                  .toLocaleString("en-US", { maximumFractionDigits: 0 })}{" "}
                <small>LB</small>
              </span>
            </div>
          </div>

          <h2 className="block-label">Same plan, two subcontractors</h2>
          <div className="profile-compare">
            <div>
              <span className="co">
                {a.profile.company.replace(" (fictional)", "")}
                <span className="region">{a.profile.region} - fictional</span>
              </span>
              <div className="total">
                <small>Bid total</small>
                {money(a.total)}
              </div>
            </div>
            <div>
              <span className="co">
                {b.profile.company.replace(" (fictional)", "")}
                <span className="region">{b.profile.region} - fictional</span>
              </span>
              <div className="total">
                <small>Bid total</small>
                {money(b.total)}
              </div>
            </div>
          </div>
          <p className="compare-note">
            Same {takeoff.lineItems.length} quantities, two buying profiles:{" "}
            <span className="mono">{money(delta)}</span> apart on a small foundation package.
            Tuning this per customer is the forward-deployed work.
          </p>

          <h2 className="block-label">Profiles carry</h2>
          <div className="stat-rows">
            {profiles.map((p) => (
              <div className="stat-row" key={p.id}>
                <span className="k">{p.company.replace(" (fictional)", "")}</span>
                <span className="v">
                  <small>
                    concrete ${p.unit_prices.concrete_per_cy}/CY · rebar ${p.unit_prices.rebar_per_lb}
                    /lb · {p.markup_pct}% markup
                  </small>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
