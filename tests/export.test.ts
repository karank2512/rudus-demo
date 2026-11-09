import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runPipeline } from "../src/engine/run.js";
import { toCsv } from "../src/engine/exportCsv.js";
import { classifySheets } from "../src/engine/classify.js";
import type { PlanSet, Profile } from "../src/engine/types.js";

const plan = JSON.parse(readFileSync("fixtures/plan-set.json", "utf8")) as PlanSet;
const { profiles } = JSON.parse(readFileSync("fixtures/profiles.json", "utf8")) as { profiles: Profile[] };

test("CSV has one row per line item plus subtotal and markup", () => {
  const { priced } = runPipeline(plan, profiles);
  const csv = toCsv(priced[0]);
  const lines = csv.split("\n");
  assert.equal(lines.length, 1 + priced[0].items.length + 2);
  assert.ok(lines[0].startsWith("Mark,Description,Category,Qty,Unit"));
  assert.ok(lines[lines.length - 1].includes(`Markup ${profiles[0].markup_pct}%`));
});

test("provisional status travels into the CSV", () => {
  const { takeoff, priced } = runPipeline(plan, profiles);
  const unresolved = new Set(takeoff.flags.map((f) => f.elementId));
  const csv = toCsv(priced[0], unresolved);
  // wf1, f3, gb1, sog1 rows must be marked; fw1 and p1 must not.
  const lines = csv.split("\n");
  const prov = lines.filter((l) => l.includes("PROVISIONAL - unresolved review item"));
  assert.equal(prov.length, priced[0].items.filter((i) => unresolved.has(i.elementId)).length);
  assert.ok(prov.every((l) => /^(WF-1|F3|GB-1|SOG-1),/.test(l)));
  // Once a decision is recorded, the mark clears.
  const resolved = runPipeline(plan, profiles, { sog1: { thickness_in: 4 } });
  const stillOpen = new Set(
    resolved.takeoff.flags.filter((f) => f.elementId !== "sog1").map((f) => f.elementId),
  );
  const csv2 = toCsv(resolved.priced[0], stillOpen);
  assert.ok(!csv2.split("\n").some((l) => l.startsWith("SOG-1,") && l.includes("PROVISIONAL")));
});

test("CSV quotes cells containing commas", () => {
  const { priced } = runPipeline(plan, profiles);
  const csv = toCsv(priced[0]);
  // Descriptions contain commas ("Continuous wall footing, perimeter - ...")
  const row = csv.split("\n").find((l) => l.includes("WF-1"))!;
  assert.ok(row.includes('"'), "comma-bearing cells must be quoted");
});

test("every sheet is classified into exactly one pipeline", () => {
  const routed = classifySheets(plan);
  assert.equal(routed.length, plan.sheets.length);
  const pipelines = new Set(routed.map((r) => r.pipeline));
  assert.equal(pipelines.size, 4);
  assert.deepEqual(
    routed.map((r) => r.id),
    ["S-001", "S-101", "S-301", "S-501"],
  );
});

test("unknown sheet kind is rejected, never silently dropped", () => {
  const bad = { ...plan, sheets: [{ id: "X-1", title: "Mystery", content_kind: "unknown" }] };
  assert.throws(() => classifySheets(bad), /unknown content kind/);
});
