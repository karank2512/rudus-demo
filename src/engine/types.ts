// Shared types for the takeoff engine. Pure data in, pure data out: the engine
// reads the synthetic plan-set fixture and produces priced line items, flags,
// and provenance. No I/O, no randomness, no model calls.

export interface SourceRef {
  sheet: string;
  ref: string;
}

export interface SourcedValue<T> {
  value: T;
  source: SourceRef;
}

export interface GeneralNotes {
  sheet: string;
  concrete_fc_psi: number;
  rebar_fy_psi: number;
  stock_bar_length_ft: number;
  lap_splice_class_b_in: Record<string, number>;
  development_length_in: Record<string, number>;
  cover_in: Record<string, number>;
  tie_hook_allowance_in: number;
  vapor_barrier_lap_waste_pct: number;
}

export type ElementKind =
  | "wall_footing"
  | "stem_wall"
  | "spread_footing"
  | "pedestal"
  | "grade_beam"
  | "slab_on_grade";

export interface PlanElement {
  id: string;
  kind: ElementKind;
  mark: string;
  label: string;
  source_refs: string[];
  [key: string]: unknown;
}

export interface PlanSet {
  project: { name: string; address: string; synthetic: boolean; note: string };
  general_notes: GeneralNotes;
  sheets: { id: string; title: string; content_kind: string }[];
  building: {
    length_ft: number;
    width_ft: number;
    grid_lines_long: string[];
    grid_lines_cross: string[];
    bay_long_ft: number;
    bay_cross_ft: number;
  };
  elements: PlanElement[];
}

export type Category = "concrete" | "formwork" | "rebar" | "vapor" | "gravel";

export interface Profile {
  id: string;
  company: string;
  region: string;
  unit_prices: {
    concrete_per_cy: number;
    formwork_per_sf: number;
    rebar_per_lb: number;
    vapor_per_sf: number;
    gravel_per_cy: number;
  };
  waste_pct: Record<Category, number>;
  markup_pct: number;
}

export interface CalcStep {
  label: string;
  expr: string;
}

export interface LineItem {
  id: string;
  elementId: string;
  mark: string;
  category: Category;
  description: string;
  quantity: number;
  unit: "CY" | "SF" | "LB" | "LF";
  calc: CalcStep[];
  provenance: SourceRef[];
}

export type FlagKind = "conflict" | "missing";

export interface Flag {
  id: string;
  elementId: string;
  mark: string;
  kind: FlagKind;
  field: string;
  summary: string;
  sources: { sheet: string; ref: string; value: string }[];
  provisional: { value: string; why: string };
}

export interface TakeoffResult {
  project: PlanSet["project"];
  generatedBy: string;
  lineItems: LineItem[];
  flags: Flag[];
}

export interface PricedLineItem extends LineItem {
  waste_pct: number;
  adjusted_quantity: number;
  unit_price: number;
  extended: number;
}

export interface PricedTakeoff {
  profile: Profile;
  items: PricedLineItem[];
  subtotal: number;
  markup_pct: number;
  total: number;
}
