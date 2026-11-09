// Deterministic sheet classification and routing. Rudus's real product does
// this with trained models over uploaded PDFs; this demo operates on a
// synthetic sheet index and uses declared content kinds only, so no CV claim
// is made anywhere. The point being demonstrated is the routing contract:
// every sheet lands in exactly one pipeline, and nothing is silently dropped.

import type { PlanSet } from "./types.js";

export interface RoutedSheet {
  id: string;
  title: string;
  content_kind: string;
  pipeline: string;
  role: string;
}

const PIPELINES: Record<string, { pipeline: string; role: string }> = {
  notes: { pipeline: "general-notes", role: "Constants: concrete f'c, bar grade, lap and development schedules, cover" },
  plan: { pipeline: "plan-geometry", role: "Element locations, plan dimensions, cross-references" },
  details: { pipeline: "detail-resolver", role: "Sections that resolve dimensions the plan does not carry" },
  schedule: { pipeline: "schedule-table", role: "Tabulated element sizes and reinforcement" },
};

export function classifySheets(plan: PlanSet): RoutedSheet[] {
  return plan.sheets.map((s) => {
    const p = PIPELINES[s.content_kind];
    if (!p) throw new Error(`sheet ${s.id} has unknown content kind ${s.content_kind}`);
    return { id: s.id, title: s.title, content_kind: s.content_kind, pipeline: p.pipeline, role: p.role };
  });
}
