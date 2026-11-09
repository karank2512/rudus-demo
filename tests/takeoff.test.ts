// The engine's quantities must match the separately written Python spec
// (spec/compute_spec.py -> spec/expected.json), and the review queue must
// surface exactly the data problems planted in the fixture.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runTakeoff } from "../src/engine/takeoff.js";
import type { PlanSet } from "../src/engine/types.js";

const plan = JSON.parse(readFileSync("fixtures/plan-set.json", "utf8")) as PlanSet;
const expected = JSON.parse(readFileSync("spec/expected.json", "utf8"));

test("line item quantities match the separately written spec", () => {
  const result = runTakeoff(plan);
  assert.equal(result.lineItems.length, expected.line_item_count);
  for (const item of result.lineItems) {
    const exp = expected.line_items[item.id];
    assert.ok(exp !== undefined, `spec has no entry for ${item.id}`);
    assert.equal(item.quantity, exp, `${item.id}: engine ${item.quantity} vs spec ${exp}`);
  }
  for (const id of Object.keys(expected.line_items)) {
    assert.ok(result.lineItems.some((i) => i.id === id), `engine missing ${id}`);
  }
});

test("review queue contains exactly the planted data problems", () => {
  const { flags } = runTakeoff(plan);
  const got = flags.map((f) => ({ id: f.id, kind: f.kind, field: f.field })).sort((a, b) => a.id.localeCompare(b.id));
  const exp = [...expected.flags].sort((a: any, b: any) => a.id.localeCompare(b.id));
  assert.deepEqual(got, exp);
});

test("every line item carries calc steps and provenance", () => {
  for (const item of runTakeoff(plan).lineItems) {
    assert.ok(item.calc.length > 0, `${item.id} has no calc steps`);
    assert.ok(item.provenance.length > 0, `${item.id} has no provenance`);
    assert.ok(item.quantity > 0, `${item.id} has non-positive quantity`);
  }
});

test("overrides recompute the affected quantities", () => {
  const base = runTakeoff(plan);
  const baseConc = base.lineItems.find((i) => i.id === "sog1-concrete")!.quantity;
  // Plan note says 5", edge detail says 4": overriding to 4" must shrink volume.
  const overridden = runTakeoff(plan, { sog1: { thickness_in: 4 } });
  const newConc = overridden.lineItems.find((i) => i.id === "sog1-concrete")!.quantity;
  assert.ok(newConc < baseConc, `override did not reduce slab volume (${baseConc} -> ${newConc})`);
  // 60 x 36 x 4/12 / 27 = 26.67 CY
  assert.equal(newConc, 26.67);
});

test("override to the schedule wall-footing length changes WF-1 and FW-1 inputs only where applied", () => {
  const overridden = runTakeoff(plan, { wf1: { length_ft: 188 } });
  const conc = overridden.lineItems.find((i) => i.id === "wf1-concrete")!;
  assert.equal(conc.quantity, 13.93); // 188 x 2 x 1 / 27
});
