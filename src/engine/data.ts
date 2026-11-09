// Client-safe data access: imports the fixtures and the baked pipeline
// result as JSON so the static pages and the in-browser override recompute
// share exactly one source of truth.

import planSetJson from "../../fixtures/plan-set.json";
import profilesJson from "../../fixtures/profiles.json";
import resultsJson from "../../data/results.json";
import type { PlanSet, Profile } from "./types.js";
import type { PipelineResult } from "./run.js";

export const planSet = planSetJson as PlanSet;
export const profiles = (profilesJson as { profiles: Profile[] }).profiles;
export const baked = resultsJson as unknown as PipelineResult;
