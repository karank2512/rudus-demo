import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runTakeoff } from "../src/engine/takeoff.js";
import { priceTakeoff } from "../src/engine/pricing.js";
import type { PlanSet, Profile } from "../src/engine/types.js";

const plan = JSON.parse(readFileSync("fixtures/plan-set.json", "utf8")) as PlanSet;
const { profiles } = JSON.parse(readFileSync("fixtures/profiles.json", "utf8")) as { profiles: Profile[] };

test("waste and markup math is exact", () => {
  const { lineItems } = runTakeoff(plan);
  const priced = priceTakeoff(lineItems, profiles[0]);
  const conc = priced.items.find((i) => i.id === "wf1-concrete")!;
  // 14.22 CY at 5% waste = 14.93 adjusted, at $192/CY
  assert.equal(conc.waste_pct, 5);
  assert.equal(conc.adjusted_quantity, 14.93);
  assert.equal(conc.unit_price, 192);
  assert.equal(conc.extended, Math.round(14.93 * 192 * 100) / 100);
  const sum = Math.round(priced.items.reduce((s, p) => s + p.extended, 0) * 100) / 100;
  assert.equal(priced.subtotal, sum);
  assert.equal(priced.total, Math.round(sum * 1.12 * 100) / 100);
});

test("two profiles price the same plan set differently", () => {
  const { lineItems } = runTakeoff(plan);
  const a = priceTakeoff(lineItems, profiles[0]);
  const b = priceTakeoff(lineItems, profiles[1]);
  assert.notEqual(a.total, b.total);
  assert.equal(a.items.length, b.items.length);
});

test("rebar is priced per adjusted pound including waste", () => {
  const { lineItems } = runTakeoff(plan);
  const priced = priceTakeoff(lineItems, profiles[0]);
  const rb = priced.items.find((i) => i.id === "sog1-rebar-4")!;
  assert.equal(rb.waste_pct, 10);
  assert.equal(rb.adjusted_quantity, Math.round(1913.2 * 1.1 * 100) / 100);
});
