// Full pipeline: plan set + profiles -> takeoff -> priced takeoffs + flags.
// Shared by the CLI (which bakes data/results.json for the static build) and
// by the review UI (which reruns it in the browser when an estimator
// overrides a flagged field).

import { runTakeoff, type Overrides } from "./takeoff.js";
import { priceTakeoff } from "./pricing.js";
import { classifySheets } from "./classify.js";
import type { PlanSet, PricedTakeoff, Profile, TakeoffResult } from "./types.js";

export interface PipelineResult {
  takeoff: TakeoffResult;
  priced: PricedTakeoff[];
  sheets: ReturnType<typeof classifySheets>;
}

export function runPipeline(
  plan: PlanSet,
  profiles: Profile[],
  overrides: Overrides = {},
): PipelineResult {
  const takeoff = runTakeoff(plan, overrides);
  const priced = profiles.map((p) => priceTakeoff(takeoff.lineItems, p));
  const sheets = classifySheets(plan);
  return { takeoff, priced, sheets };
}
