#!/usr/bin/env python3
"""Second-implementation reference computation for the Rudus takeoff demo.

Written separately from the TypeScript engine (a second implementation in a
different language, separate pass over the fixtures) so the test suite compares two
implementations of the same estimator rules rather than the engine against
itself. Run: python3 spec/compute_spec.py  ->  spec/expected.json

Rules (the estimator conventions both implementations follow):
  concrete CY = volume ft3 / 27, rounded 2dp
  formwork SF = contact area (footing sides; wall both faces; pedestal 4
    sides; beam sides + soffit; slab edge form = perimeter x thickness)
  continuous rebar LF = bars x (run + laps x lap), laps = ceil(run/stock) - 1,
    lap lengths are fixture inputs from the general notes (never computed)
  spaced bar count = floor((run - 2 x cover) / spacing) + 1
  footing bottom mat = explicit bars each way from the schedule
  LB = LF x ASTM nominal unit weight
  vapor SF = slab area x (1 + lap waste)
  gravel CY = area x depth / 27
"""
import json
import math
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
plan = json.loads((ROOT / "fixtures" / "plan-set.json").read_text())
notes = plan["general_notes"]

BAR_WT = {"#3": 0.376, "#4": 0.668, "#5": 1.043, "#6": 1.502, "#7": 2.044, "#8": 2.670}
FT3_PER_CY = 27

r2 = lambda n: round(n, 2)
r1 = lambda n: round(n, 1)


def laps_for_run(length_ft):
    stock = notes["stock_bar_length_ft"]
    return max(0, math.ceil(length_ft / stock - 1e-9) - 1)


def continuous_lf(count, length_ft, bar):
    lap = notes["lap_splice_class_b_in"][bar] / 12
    return count * (length_ft + laps_for_run(length_ft) * lap)


def spaced_count(run_ft, cover_in, spacing_in):
    clear_in = run_ft * 12 - 2 * cover_in
    return math.floor(clear_in / spacing_in + 1e-9) + 1


def lbs(lf, bar):
    return r1(lf * BAR_WT[bar])


def dev_ft(bar):
    return notes["development_length_in"][bar] / 12


cover = notes["cover_in"]
expected = {"line_items": {}, "flags": [], "line_item_count": 0}

el = {e["id"]: e for e in plan["elements"]}

# WF-1 continuous wall footing (provisional: plan length 192')
wf = el["wf1"]
L, w, d = wf["length_ft"]["value"], wf["width_ft"], wf["depth_ft"]
expected["line_items"]["wf1-concrete"] = r2(L * w * d / FT3_PER_CY)
expected["line_items"]["wf1-formwork"] = r1(2 * L * d)
lf = continuous_lf(wf["rebar_longitudinal"]["count"], L, wf["rebar_longitudinal"]["bar"])
expected["line_items"]["wf1-rebar-5"] = lbs(lf, "#5")
n = spaced_count(L, cover["footing"], wf["rebar_transverse"]["spacing_in"])
lf = n * (w - 2 * cover["footing"] / 12)
expected["line_items"]["wf1-rebar-4"] = lbs(lf, "#4")
expected["flags"].append({"id": "flag-wf1-length", "kind": "conflict", "field": "length_ft"})

# FW-1 stem wall
fw = el["fw1"]
L, t, h = fw["length_ft"]["value"], fw["thickness_ft"], fw["height_ft"]
expected["line_items"]["fw1-concrete"] = r2(L * t * h / FT3_PER_CY)
expected["line_items"]["fw1-formwork"] = r1(2 * L * h)
nv = spaced_count(L, cover["wall"], fw["rebar_vertical"]["spacing_in"])
lf_v = nv * (h + dev_ft("#4"))
rows = spaced_count(h, cover["wall"], fw["rebar_horizontal"]["spacing_in"]) - 1
lf_h = continuous_lf(rows * fw["rebar_horizontal"]["faces"], L, "#4")
expected["line_items"]["fw1-rebar-4"] = lbs(lf_v + lf_h, "#4")

# F3 spread footings (provisional: schedule bar #6)
f3 = el["f3"]
n0, Lf, Wf, Df = f3["count"], f3["length_ft"], f3["width_ft"], f3["depth_ft"]
expected["line_items"]["f3-concrete"] = r2(n0 * Lf * Wf * Df / FT3_PER_CY)
expected["line_items"]["f3-formwork"] = r1(n0 * 2 * (Lf + Wf) * Df)
lf = n0 * 2 * f3["rebar_mat"]["bars_each_way"] * (Lf - 2 * cover["footing"] / 12)
expected["line_items"]["f3-rebar-6"] = lbs(lf, "#6")
expected["flags"].append({"id": "flag-f3-bar", "kind": "conflict", "field": "bar"})

# P-1 pedestals
p1 = el["p1"]
n0, s, h = p1["count"], p1["side_ft"], p1["height_ft"]
expected["line_items"]["p1-concrete"] = r2(n0 * s * s * h / FT3_PER_CY)
expected["line_items"]["p1-formwork"] = r1(n0 * 4 * s * h)
lf = n0 * p1["rebar_vertical_bars"]["count"] * (h + dev_ft("#6"))
expected["line_items"]["p1-rebar-6"] = lbs(lf, "#6")
n_ties = spaced_count(h, 0, p1["rebar_ties"]["spacing_in"])
tie_len = 4 * (s - 2 * cover["beam"] / 12) + notes["tie_hook_allowance_in"] / 12
expected["line_items"]["p1-rebar-4"] = lbs(n0 * n_ties * tie_len, "#4")

# GB-1 grade beam (provisional: section depth 1.5')
gb = el["gb1"]
L, w, d = gb["length_ft"]["value"], gb["width_ft"], gb["depth_alt_ft"]["value"]
expected["line_items"]["gb1-concrete"] = r2(L * w * d / FT3_PER_CY)
expected["line_items"]["gb1-formwork"] = r1((2 * d + w) * L)
lf = continuous_lf(gb["rebar_top"]["count"], L, "#5") + continuous_lf(gb["rebar_bottom"]["count"], L, "#5")
expected["line_items"]["gb1-rebar-5"] = lbs(lf, "#5")
n_st = spaced_count(L, cover["beam"], gb["rebar_stirrups"]["spacing_in"])
st_len = 2 * ((w - 2 * cover["beam"] / 12) + (d - 2 * cover["beam"] / 12)) + notes["tie_hook_allowance_in"] / 12
expected["line_items"]["gb1-rebar-4"] = lbs(n_st * st_len, "#4")
expected["flags"].append({"id": "flag-gb1-depth", "kind": "missing", "field": "depth_ft"})

# SOG-1 slab on grade (provisional: plan note 5")
sg = el["sog1"]
L, W, thk = sg["length_ft"], sg["width_ft"], sg["thickness_in"]["value"] / 12
expected["line_items"]["sog1-concrete"] = r2(L * W * thk / FT3_PER_CY)
expected["line_items"]["sog1-formwork"] = r1(2 * (L + W) * thk)
n_long = spaced_count(W, cover["slab"], sg["rebar"]["spacing_in"])
n_cross = spaced_count(L, cover["slab"], sg["rebar"]["spacing_in"])
lf = n_long * (L - 2 * cover["slab"] / 12) + n_cross * (W - 2 * cover["slab"] / 12)
expected["line_items"]["sog1-rebar-4"] = lbs(lf, "#4")
expected["line_items"]["sog1-vapor"] = r1(L * W * (1 + notes["vapor_barrier_lap_waste_pct"] / 100))
expected["line_items"]["sog1-gravel"] = r2(L * W * sg["gravel_base_in"] / 12 / FT3_PER_CY)
expected["flags"].append({"id": "flag-sog1-thickness", "kind": "conflict", "field": "thickness_in"})

expected["line_item_count"] = len(expected["line_items"])

out = ROOT / "spec" / "expected.json"
out.write_text(json.dumps(expected, indent=2) + "\n")
print(f"wrote {out}: {expected['line_item_count']} line items, {len(expected['flags'])} flags")
for k, v in expected["line_items"].items():
    print(f"  {k}: {v}")
