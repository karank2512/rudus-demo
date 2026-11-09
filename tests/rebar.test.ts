import { test } from "node:test";
import assert from "node:assert/strict";
import { BAR_UNIT_WEIGHT_LB_PER_FT } from "../src/engine/constants.js";
import {
  continuousBarLf,
  lapsForRun,
  lapSpliceFt,
  spacedBarCount,
} from "../src/engine/rebar.js";
import { readFileSync } from "node:fs";
import type { PlanSet } from "../src/engine/types.js";

const plan = JSON.parse(readFileSync("fixtures/plan-set.json", "utf8")) as PlanSet;
const notes = plan.general_notes;

test("bar unit weights are the published ASTM nominal values", () => {
  assert.equal(BAR_UNIT_WEIGHT_LB_PER_FT["#4"], 0.668);
  assert.equal(BAR_UNIT_WEIGHT_LB_PER_FT["#5"], 1.043);
  assert.equal(BAR_UNIT_WEIGHT_LB_PER_FT["#6"], 1.502);
});

test("lap lengths come from fixture general notes, never computed", () => {
  assert.equal(lapSpliceFt("#5", notes), 23 / 12);
  assert.equal(notes.lap_splice_class_b_in["#6"], 27);
});

test("stock-length lap counting", () => {
  assert.deepEqual(lapsForRun(39.9, notes), { stockBars: 1, laps: 0 });
  assert.deepEqual(lapsForRun(40, notes), { stockBars: 1, laps: 0 });
  assert.deepEqual(lapsForRun(40.1, notes), { stockBars: 2, laps: 1 });
  assert.deepEqual(lapsForRun(192, notes), { stockBars: 5, laps: 4 });
});

test("continuous bar LF includes lap allowance", () => {
  const { lf, laps } = continuousBarLf(3, 192, "#5", notes);
  assert.equal(laps, 4);
  assert.equal(lf, 3 * (192 + 4 * (23 / 12)));
});

test("spaced bar counting uses clear length plus one", () => {
  // 192 LF, 3" cover, 12" spacing: clear = 191.5' -> floor(2298/12) + 1 = 192
  assert.equal(spacedBarCount(192, 3, 12), 192);
  // 2.5' wall height, 2" cover, 12" spacing: clear = 26" -> floor(26/12)+1 = 3
  assert.equal(spacedBarCount(2.5, 2, 12), 3);
});
