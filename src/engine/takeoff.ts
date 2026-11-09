// The takeoff engine: expands each plan element into assembly line items
// (concrete, formwork, rebar by bar size, slab accessories), each with its
// calc shown and its provenance attached. Deterministic: same fixtures and
// overrides in, same quantities out.

import { FT3_PER_CY } from "./constants.js";
import {
  continuousBarLf,
  lfToLbs,
  spacedBarCount,
  lapSpliceFt,
} from "./rebar.js";
import type {
  CalcStep,
  Flag,
  GeneralNotes,
  LineItem,
  PlanSet,
  SourceRef,
  TakeoffResult,
} from "./types.js";

// An override is the estimator's decision on a flagged field: which value to
// use instead of the provisional one. Keyed by element id, then field name.
export type Overrides = Record<string, Record<string, number | string>>;

const r2 = (n: number) => Math.round(n * 100) / 100;
const r1 = (n: number) => Math.round(n * 10) / 10;

function step(label: string, expr: string): CalcStep {
  return { label, expr };
}

function concreteItem(
  elementId: string,
  mark: string,
  description: string,
  ft3: number,
  expr: string,
  provenance: SourceRef[],
): LineItem {
  return {
    id: `${elementId}-concrete`,
    elementId,
    mark,
    category: "concrete",
    description,
    quantity: r2(ft3 / FT3_PER_CY),
    unit: "CY",
    calc: [step("Volume", `${expr} = ${r2(ft3)} ft3`), step("Convert", `${r2(ft3)} / 27 = ${r2(ft3 / FT3_PER_CY)} CY`)],
    provenance,
  };
}

export function runTakeoff(plan: PlanSet, overrides: Overrides = {}): TakeoffResult {
  const notes: GeneralNotes = plan.general_notes;
  const cover = notes.cover_in;
  const items: LineItem[] = [];
  const flags: Flag[] = [];

  const ov = (el: string, field: string) => overrides[el]?.[field];

  for (const el of plan.elements) {
    const e = el as any;
    switch (el.kind) {
      case "wall_footing": {
        // Cross-check plan length against the schedule note.
        const planLen = e.length_ft as { value: number; source: SourceRef };
        const schedLen = e.length_alt_ft as { value: number; source: SourceRef };
        if (Math.abs(planLen.value - schedLen.value) > 1e-9) {
          flags.push({
            id: "flag-wf1-length",
            elementId: el.id,
            mark: el.mark,
            kind: "conflict",
            field: "length_ft",
            summary: `Wall footing length: plan dims give ${planLen.value}'-0", schedule note gives ${schedLen.value}'-0"`,
            sources: [
              { sheet: planLen.source.sheet, ref: planLen.source.ref, value: `${planLen.value}'-0"` },
              { sheet: schedLen.source.sheet, ref: schedLen.source.ref, value: `${schedLen.value}'-0"` },
            ],
            provisional: { value: `${planLen.value}'-0"`, why: "scaled plan dims govern provisionally; needs an RFI either way" },
          });
        }
        const L = Number(ov(el.id, "length_ft") ?? planLen.value);
        const w = e.width_ft as number;
        const d = e.depth_ft as number;
        const srcL: SourceRef = ov(el.id, "length_ft") !== undefined
          ? schedLen.source
          : planLen.source;

        items.push(concreteItem(el.id, el.mark, `${el.label} - concrete`,
          L * w * d, `${L} LF x ${w}' wide x ${d}' deep`,
          [srcL, { sheet: "S-301", ref: "1/S-301 wall section (2'-0\" x 1'-0\")" }]));

        items.push({
          id: `${el.id}-formwork`, elementId: el.id, mark: el.mark,
          category: "formwork", description: `${el.label} - formwork, both faces`,
          quantity: r1(2 * L * d), unit: "SF",
          calc: [step("Form area", `2 faces x ${L} LF x ${d}' deep = ${r1(2 * L * d)} SF`)],
          provenance: [srcL, { sheet: "S-301", ref: "1/S-301 wall section" }],
        });

        const lon = e.rebar_longitudinal as { bar: string; count: number };
        const { lf, laps, lapFt } = continuousBarLf(lon.count, L, lon.bar, notes);
        items.push({
          id: `${el.id}-rebar-${lon.bar.slice(1)}`, elementId: el.id, mark: el.mark,
          category: "rebar",
          description: `${el.label} - ${lon.count} ${lon.bar} continuous longitudinal`,
          quantity: r1(lfToLbs(lf, lon.bar)), unit: "LB",
          calc: [
            step("Length", `${lon.count} bars x (${L} LF + ${laps} laps x ${lapFt.toFixed(2)}' lap) = ${r1(lf)} LF`),
            step("Weight", `${r1(lf)} LF x ${barWeightLabel(lon.bar)} = ${r1(lfToLbs(lf, lon.bar))} lb`),
          ],
          provenance: [srcL, { sheet: notes.sheet, ref: `lap schedule, ${lon.bar} Class B` }, { sheet: "S-301", ref: "1/S-301 wall section" }],
        });

        const tr = e.rebar_transverse as { bar: string; spacing_in: number };
        const nT = spacedBarCount(L, cover.footing, tr.spacing_in);
        const barLen = w - (2 * cover.footing) / 12;
        const lfT = nT * barLen;
        items.push({
          id: `${el.id}-rebar-${tr.bar.slice(1)}`, elementId: el.id, mark: el.mark,
          category: "rebar",
          description: `${el.label} - ${tr.bar} transverse @ ${tr.spacing_in}" o.c.`,
          quantity: r1(lfToLbs(lfT, tr.bar)), unit: "LB",
          calc: [
            step("Count", `floor((${L} - 2x${cover.footing / 12}') / ${tr.spacing_in / 12}') + 1 = ${nT} bars`),
            step("Length", `${nT} x ${barLen.toFixed(2)}' = ${r1(lfT)} LF`),
            step("Weight", `${r1(lfT)} LF x ${barWeightLabel(tr.bar)} = ${r1(lfToLbs(lfT, tr.bar))} lb`),
          ],
          provenance: [srcL, { sheet: "S-301", ref: "1/S-301 wall section" }],
        });
        break;
      }

      case "stem_wall": {
        const L = (e.length_ft as { value: number }).value;
        const t = e.thickness_ft as number;
        const h = e.height_ft as number;
        const src: SourceRef = { sheet: "S-301", ref: "1/S-301 wall section" };
        items.push(concreteItem(el.id, el.mark, `${el.label} - concrete`,
          L * t * h, `${L} LF x ${t}' thick x ${h}' high`, [src]));
        items.push({
          id: `${el.id}-formwork`, elementId: el.id, mark: el.mark,
          category: "formwork", description: `${el.label} - formwork, both faces`,
          quantity: r1(2 * L * h), unit: "SF",
          calc: [step("Form area", `2 faces x ${L} LF x ${h}' high = ${r1(2 * L * h)} SF`)],
          provenance: [src],
        });
        const rv = e.rebar_vertical as { bar: string; spacing_in: number };
        const nV = spacedBarCount(L, cover.wall, rv.spacing_in);
        const vBarLen = h + dLenFt(rv.bar, notes);
        const lfV = nV * vBarLen;
        const rh = e.rebar_horizontal as { bar: string; spacing_in: number; faces: number };
        const rows = spacedBarCount(h, cover.wall, rh.spacing_in) - 1;
        const { lf: lfH } = continuousBarLf(rows * rh.faces, L, rh.bar, notes);
        const lf4 = lfV + lfH;
        items.push({
          id: `${el.id}-rebar-4`, elementId: el.id, mark: el.mark,
          category: "rebar",
          description: `${el.label} - ${rv.bar} vert @ ${rv.spacing_in}" + ${rh.bar} horiz @ ${rh.spacing_in}"`,
          quantity: r1(lfToLbs(lf4, rv.bar)), unit: "LB",
          calc: [
            step("Vertical", `${nV} bars x (${h}' + dev ${dLenFt(rv.bar, notes).toFixed(2)}') = ${r1(lfV)} LF`),
            step("Horizontal", `${rows} rows x ${rh.faces} faces x ${L} LF + laps = ${r1(lfH)} LF`),
            step("Weight", `${r1(lf4)} LF x ${barWeightLabel(rv.bar)} = ${r1(lfToLbs(lf4, rv.bar))} lb`),
          ],
          provenance: [src, { sheet: notes.sheet, ref: `development length, ${rv.bar}` }],
        });
        break;
      }

      case "spread_footing": {
        const n = e.count as number;
        const Lf = e.length_ft as number;
        const Wf = e.width_ft as number;
        const Df = e.depth_ft as number;
        const mat = e.rebar_mat as { bar: string; bars_each_way: number };
        const alt = e.rebar_mat_alt_bar as { bar: string; source: SourceRef };
        if (alt && alt.bar !== mat.bar) {
          flags.push({
            id: "flag-f3-bar",
            elementId: el.id, mark: el.mark, kind: "conflict", field: "bar",
            summary: `${el.mark} bottom mat: schedule says ${mat.bar}, detail 3/S-301 says ${alt.bar}`,
            sources: [
              { sheet: "S-501", ref: "footing schedule row F3", value: `${mat.bar} each way` },
              { sheet: alt.source.sheet, ref: alt.source.ref, value: `${alt.bar} each way` },
            ],
            provisional: { value: mat.bar, why: "schedule governs provisionally; the detail callout may be newer" },
          });
        }
        const bar = String(ov(el.id, "bar") ?? mat.bar);
        const src: SourceRef = { sheet: "S-501", ref: "footing schedule row F3" };
        items.push(concreteItem(el.id, el.mark, `${el.label} - concrete (${n} no.)`,
          n * Lf * Wf * Df, `${n} x ${Lf}' x ${Wf}' x ${Df}'`, [src]));
        items.push({
          id: `${el.id}-formwork`, elementId: el.id, mark: el.mark,
          category: "formwork", description: `${el.label} - formwork (${n} no.)`,
          quantity: r1(n * 2 * (Lf + Wf) * Df), unit: "SF",
          calc: [step("Form area", `${n} x 2 x (${Lf}' + ${Wf}') x ${Df}' = ${r1(n * 2 * (Lf + Wf) * Df)} SF`)],
          provenance: [src],
        });
        const bars = mat.bars_each_way;
        const barLen = Lf - (2 * cover.footing) / 12;
        const lf = n * 2 * bars * barLen;
        items.push({
          id: `${el.id}-rebar-${bar.slice(1)}`, elementId: el.id, mark: el.mark,
          category: "rebar",
          description: `${el.label} - (${bars}) ${bar} each way, bottom mat (${n} no.)`,
          quantity: r1(lfToLbs(lf, bar)), unit: "LB",
          calc: [
            step("Length", `${n} ftgs x 2 ways x ${bars} bars x ${barLen.toFixed(2)}' = ${r1(lf)} LF`),
            step("Weight", `${r1(lf)} LF x ${barWeightLabel(bar)} = ${r1(lfToLbs(lf, bar))} lb`),
          ],
          provenance: [ov(el.id, "bar") !== undefined ? alt.source : src, { sheet: "S-001", ref: "3\" bottom cover" }],
        });
        break;
      }

      case "pedestal": {
        const n = e.count as number;
        const s = e.side_ft as number;
        const h = e.height_ft as number;
        const src: SourceRef = { sheet: "S-301", ref: "3/S-301 pedestal and footing detail" };
        items.push(concreteItem(el.id, el.mark, `${el.label} - concrete (${n} no.)`,
          n * s * s * h, `${n} x ${s}' x ${s}' x ${h}'`, [src]));
        items.push({
          id: `${el.id}-formwork`, elementId: el.id, mark: el.mark,
          category: "formwork", description: `${el.label} - formwork (${n} no.)`,
          quantity: r1(n * 4 * s * h), unit: "SF",
          calc: [step("Form area", `${n} x 4 sides x ${s}' x ${h}' = ${r1(n * 4 * s * h)} SF`)],
          provenance: [src],
        });
        const vb = e.rebar_vertical_bars as { bar: string; count: number };
        const vLen = h + dLenFt(vb.bar, notes);
        const lfV = n * vb.count * vLen;
        items.push({
          id: `${el.id}-rebar-${vb.bar.slice(1)}`, elementId: el.id, mark: el.mark,
          category: "rebar",
          description: `${el.label} - (${vb.count}) ${vb.bar} vertical (${n} no.)`,
          quantity: r1(lfToLbs(lfV, vb.bar)), unit: "LB",
          calc: [step("Length", `${n} x ${vb.count} bars x (${h}' + dev ${dLenFt(vb.bar, notes).toFixed(2)}') = ${r1(lfV)} LF`),
            step("Weight", `${r1(lfV)} LF x ${barWeightLabel(vb.bar)} = ${r1(lfToLbs(lfV, vb.bar))} lb`)],
          provenance: [src, { sheet: notes.sheet, ref: `development length, ${vb.bar}` }],
        });
        const ties = e.rebar_ties as { bar: string; spacing_in: number };
        const nTies = spacedBarCount(h, 0, ties.spacing_in);
        const tieLen = (4 * (s - (2 * cover.beam) / 12)) + notes.tie_hook_allowance_in / 12;
        const lfT = n * nTies * tieLen;
        items.push({
          id: `${el.id}-rebar-4`, elementId: el.id, mark: el.mark,
          category: "rebar",
          description: `${el.label} - ${ties.bar} ties @ ${ties.spacing_in}" o.c. (${n} no.)`,
          quantity: r1(lfToLbs(lfT, ties.bar)), unit: "LB",
          calc: [
            step("Count", `${n} x (floor(${h}' / ${ties.spacing_in / 12}') + 1) = ${n * nTies} ties`),
            step("Length", `${n * nTies} x ${tieLen.toFixed(2)}' incl. hooks = ${r1(lfT)} LF`),
            step("Weight", `${r1(lfT)} LF x ${barWeightLabel(ties.bar)} = ${r1(lfToLbs(lfT, ties.bar))} lb`),
          ],
          provenance: [src],
        });
        break;
      }

      case "grade_beam": {
        const depthIn = e.depth_ft as { value: number | null; source: SourceRef };
        const depthAlt = e.depth_alt_ft as { value: number; source: SourceRef };
        if (depthIn.value === null) {
          flags.push({
            id: "flag-gb1-depth",
            elementId: el.id, mark: el.mark, kind: "missing", field: "depth_ft",
            summary: `${el.mark} depth: schedule cell is blank; section 1/S-301 shows ${depthAlt.value}'-0"`,
            sources: [
              { sheet: depthIn.source.sheet, ref: depthIn.source.ref, value: "blank" },
              { sheet: depthAlt.source.sheet, ref: depthAlt.source.ref, value: `${depthAlt.value}'-0"` },
            ],
            provisional: { value: `${depthAlt.value}'-0"`, why: "only available source; confirm the schedule omission with the EOR" },
          });
        }
        const d = Number(ov(el.id, "depth_ft") ?? depthIn.value ?? depthAlt.value);
        const w = e.width_ft as number;
        const L = (e.length_ft as { value: number }).value;
        const srcL: SourceRef = (e.length_ft as { source: SourceRef }).source;
        const srcD: SourceRef = ov(el.id, "depth_ft") !== undefined || depthIn.value === null
          ? depthAlt.source : depthIn.source;
        items.push(concreteItem(el.id, el.mark, `${el.label} - concrete`,
          L * w * d, `${L} LF x ${w}' wide x ${d}' deep`, [srcL, srcD]));
        items.push({
          id: `${el.id}-formwork`, elementId: el.id, mark: el.mark,
          category: "formwork", description: `${el.label} - formwork, sides and soffit`,
          quantity: r1((2 * d + w) * L), unit: "SF",
          calc: [step("Form area", `(2 x ${d}' + ${w}') x ${L} LF = ${r1((2 * d + w) * L)} SF`)],
          provenance: [srcL, srcD],
        });
        const top = e.rebar_top as { bar: string; count: number };
        const bot = e.rebar_bottom as { bar: string; count: number };
        const { lf: lfTop, laps } = continuousBarLf(top.count, L, top.bar, notes);
        const { lf: lfBot } = continuousBarLf(bot.count, L, bot.bar, notes);
        const lf5 = lfTop + lfBot;
        items.push({
          id: `${el.id}-rebar-5`, elementId: el.id, mark: el.mark,
          category: "rebar",
          description: `${el.label} - ${top.count} ${top.bar} top + ${bot.count} ${bot.bar} bottom`,
          quantity: r1(lfToLbs(lf5, top.bar)), unit: "LB",
          calc: [
            step("Length", `(${top.count} + ${bot.count}) bars x (${L} LF + ${laps} lap x ${lapSpliceFt(top.bar, notes).toFixed(2)}') = ${r1(lf5)} LF`),
            step("Weight", `${r1(lf5)} LF x ${barWeightLabel(top.bar)} = ${r1(lfToLbs(lf5, top.bar))} lb`),
          ],
          provenance: [srcL, { sheet: notes.sheet, ref: `lap schedule, ${top.bar} Class B` }],
        });
        const st = e.rebar_stirrups as { bar: string; spacing_in: number };
        const nSt = spacedBarCount(L, cover.beam, st.spacing_in);
        const stLen = 2 * ((w - (2 * cover.beam) / 12) + (d - (2 * cover.beam) / 12)) + notes.tie_hook_allowance_in / 12;
        const lfSt = nSt * stLen;
        items.push({
          id: `${el.id}-rebar-4`, elementId: el.id, mark: el.mark,
          category: "rebar",
          description: `${el.label} - ${st.bar} stirrups @ ${st.spacing_in}" o.c.`,
          quantity: r1(lfToLbs(lfSt, st.bar)), unit: "LB",
          calc: [
            step("Count", `floor((${L} - 2x${cover.beam / 12}') / ${st.spacing_in / 12}') + 1 = ${nSt}`),
            step("Length", `${nSt} x ${stLen.toFixed(2)}' incl. hooks = ${r1(lfSt)} LF`),
            step("Weight", `${r1(lfSt)} LF x ${barWeightLabel(st.bar)} = ${r1(lfToLbs(lfSt, st.bar))} lb`),
          ],
          provenance: [srcL, srcD],
        });
        break;
      }

      case "slab_on_grade": {
        const L = e.length_ft as number;
        const W = e.width_ft as number;
        const planThk = e.thickness_in as { value: number; source: SourceRef };
        const detThk = e.thickness_alt_in as { value: number; source: SourceRef };
        if (Math.abs(planThk.value - detThk.value) > 1e-9) {
          flags.push({
            id: "flag-sog1-thickness",
            elementId: el.id, mark: el.mark, kind: "conflict", field: "thickness_in",
            summary: `Slab thickness: plan note says ${planThk.value}", edge detail says ${detThk.value}"`,
            sources: [
              { sheet: planThk.source.sheet, ref: planThk.source.ref, value: `${planThk.value}"` },
              { sheet: detThk.source.sheet, ref: detThk.source.ref, value: `${detThk.value}"` },
            ],
            provisional: { value: `${planThk.value}"`, why: "plan note governs provisionally; a 1\" swing here is 11 CY of concrete" },
          });
        }
        const thkIn = Number(ov(el.id, "thickness_in") ?? planThk.value);
        const thk = thkIn / 12;
        const srcT: SourceRef = ov(el.id, "thickness_in") !== undefined ? detThk.source : planThk.source;
        items.push(concreteItem(el.id, el.mark, `${el.label} - concrete, ${thkIn}" thick`,
          L * W * thk, `${L}' x ${W}' x ${thkIn}/12'`, [srcT]));
        items.push({
          id: `${el.id}-formwork`, elementId: el.id, mark: el.mark,
          category: "formwork", description: `${el.label} - edge form`,
          quantity: r1(2 * (L + W) * thk), unit: "SF",
          calc: [step("Form area", `2 x (${L}' + ${W}') x ${thk.toFixed(3)}' = ${r1(2 * (L + W) * thk)} SF`)],
          provenance: [srcT],
        });
        const rb = e.rebar as { bar: string; spacing_in: number; ways: number };
        const nLong = spacedBarCount(W, cover.slab, rb.spacing_in);
        const nCross = spacedBarCount(L, cover.slab, rb.spacing_in);
        const lfLong = nLong * (L - (2 * cover.slab) / 12);
        const lfCross = nCross * (W - (2 * cover.slab) / 12);
        const lf = lfLong + lfCross;
        items.push({
          id: `${el.id}-rebar-4`, elementId: el.id, mark: el.mark,
          category: "rebar",
          description: `${el.label} - ${rb.bar} @ ${rb.spacing_in}" o.c. each way`,
          quantity: r1(lfToLbs(lf, rb.bar)), unit: "LB",
          calc: [
            step("Long way", `${nLong} bars x ${(L - (2 * cover.slab) / 12).toFixed(2)}' = ${r1(lfLong)} LF`),
            step("Cross way", `${nCross} bars x ${(W - (2 * cover.slab) / 12).toFixed(2)}' = ${r1(lfCross)} LF`),
            step("Weight", `${r1(lf)} LF x ${barWeightLabel(rb.bar)} = ${r1(lfToLbs(lf, rb.bar))} lb`),
          ],
          provenance: [{ sheet: "S-101", ref: "plan note 7" }],
        });
        if (e.vapor_barrier) {
          const sf = L * W * (1 + notes.vapor_barrier_lap_waste_pct / 100);
          items.push({
            id: `${el.id}-vapor`, elementId: el.id, mark: el.mark,
            category: "vapor", description: `${el.label} - vapor barrier incl. ${notes.vapor_barrier_lap_waste_pct}% lap waste`,
            quantity: r1(sf), unit: "SF",
            calc: [step("Area", `${L}' x ${W}' x 1.${notes.vapor_barrier_lap_waste_pct} = ${r1(sf)} SF`)],
            provenance: [{ sheet: "S-101", ref: "plan note 7" }, { sheet: notes.sheet, ref: "lap waste note" }],
          });
        }
        const gIn = e.gravel_base_in as number;
        items.push({
          id: `${el.id}-gravel`, elementId: el.id, mark: el.mark,
          category: "gravel", description: `${el.label} - ${gIn}" gravel base`,
          quantity: r2((L * W * gIn) / 12 / FT3_PER_CY), unit: "CY",
          calc: [step("Volume", `${L}' x ${W}' x ${gIn}/12' / 27 = ${r2((L * W * gIn) / 12 / FT3_PER_CY)} CY`)],
          provenance: [{ sheet: "S-301", ref: "4/S-301 slab edge detail" }],
        });
        break;
      }
    }
  }

  return {
    project: plan.project,
    generatedBy: "deterministic takeoff engine, no model calls",
    lineItems: items,
    flags,
  };
}

function dLenFt(bar: string, notes: GeneralNotes): number {
  const v = notes.development_length_in[bar];
  if (v === undefined) throw new Error(`no development length input for ${bar}`);
  return v / 12;
}

import { BAR_UNIT_WEIGHT_LB_PER_FT } from "./constants.js";
function barWeightLabel(bar: string): string {
  return `${BAR_UNIT_WEIGHT_LB_PER_FT[bar]} lb/LF`;
}
