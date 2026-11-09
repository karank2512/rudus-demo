// CLI: node dist-engine/engine/cli.js <fixturesDir> <outFile>
// Bakes the deterministic results JSON the static site renders.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runPipeline } from "./run.js";
import type { PlanSet, Profile } from "./types.js";

const [fixturesDir, outFile] = process.argv.slice(2);
if (!fixturesDir || !outFile) {
  console.error("usage: cli <fixturesDir> <outFile>");
  process.exit(2);
}

const plan = JSON.parse(readFileSync(join(fixturesDir, "plan-set.json"), "utf8")) as PlanSet;
const { profiles } = JSON.parse(readFileSync(join(fixturesDir, "profiles.json"), "utf8")) as { profiles: Profile[] };

const result = runPipeline(plan, profiles);
writeFileSync(outFile, JSON.stringify(result, null, 2) + "\n");
console.log(
  `wrote ${outFile}: ${result.takeoff.lineItems.length} line items, ` +
    `${result.takeoff.flags.length} flags, ${result.priced.length} profiles`,
);
