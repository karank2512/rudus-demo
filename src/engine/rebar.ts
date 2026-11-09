// Rebar takeoff helpers. Lap splice and development lengths are NOT computed
// here: they are explicit fixture inputs taken from the plan set's general
// notes (the way a real set carries a lap schedule on S-001). This engine does
// no structural engineering - it applies the drawing's own stated values.

import { BAR_UNIT_WEIGHT_LB_PER_FT, BAR_DIAMETER_IN } from "./constants.js";
import type { GeneralNotes } from "./types.js";

export function barUnitWeight(bar: string): number {
  const w = BAR_UNIT_WEIGHT_LB_PER_FT[bar];
  if (w === undefined) throw new Error(`unknown bar size ${bar}`);
  return w;
}

export function barDiameterIn(bar: string): number {
  const d = BAR_DIAMETER_IN[bar];
  if (d === undefined) throw new Error(`unknown bar size ${bar}`);
  return d;
}

export function lapSpliceFt(bar: string, notes: GeneralNotes): number {
  const v = notes.lap_splice_class_b_in[bar];
  if (v === undefined) throw new Error(`no lap splice input for ${bar}`);
  return v / 12;
}

export function developmentLengthFt(bar: string, notes: GeneralNotes): number {
  const v = notes.development_length_in[bar];
  if (v === undefined) throw new Error(`no development length input for ${bar}`);
  return v / 12;
}

// Number of stock bars needed to run `lengthFt`, and the total lap allowance.
// Stock length is a general-notes input (40'-0" is the usual mill stock).
export function lapsForRun(lengthFt: number, notes: GeneralNotes): {
  stockBars: number;
  laps: number;
} {
  const stock = notes.stock_bar_length_ft;
  const stockBars = Math.max(1, Math.ceil(lengthFt / stock - 1e-9));
  return { stockBars, laps: stockBars - 1 };
}

// Linear feet for `count` continuous bars running `lengthFt`, including laps.
export function continuousBarLf(
  count: number,
  lengthFt: number,
  bar: string,
  notes: GeneralNotes,
): { lf: number; laps: number; lapFt: number } {
  const { laps } = lapsForRun(lengthFt, notes);
  const lapFt = lapSpliceFt(bar, notes);
  const lf = count * (lengthFt + laps * lapFt);
  return { lf, laps, lapFt };
}

// Count of spaced bars across a run: clear length between covers divided by
// spacing, plus one bar. A standard estimator's count rule.
export function spacedBarCount(
  runFt: number,
  coverIn: number,
  spacingIn: number,
): number {
  const clearFt = runFt - (2 * coverIn) / 12;
  return Math.floor((clearFt * 12) / spacingIn + 1e-9) + 1;
}

export function lfToLbs(lf: number, bar: string): number {
  return lf * barUnitWeight(bar);
}
