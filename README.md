# Alder Street Workshop - concrete takeoff workbench

A small, self-contained slice of estimating software for a concrete
subcontractor: what happens between the plan set and the bid.

An estimator's week is built on trust. Every number they sign goes into a bid
worth real money, so software that hands them quantities without showing its
work is software they won't use. This repo is the layer that earns the number:
it reads a (synthetic) foundation plan set, expands each concrete element
into priced assembly line items, shows the arithmetic and the sheet references
behind every line, and holds anything the drawings disagree on in a review
queue where a person decides.

Everything here runs on a fictional project with synthetic fixture data. No
real drawings, no client data, no model calls, no CV.

## What it does

- **Sheet intake and routing.** The drawing set index (general notes,
  foundation plan, sections, footing schedule) is routed deterministically:
  every sheet lands in exactly one pipeline and an unknown kind is rejected,
  never silently dropped. (Rudus's real product classifies uploaded PDFs with
  trained models; this demo operates on declared content kinds and makes no
  classification claims.)
- **Quantity takeoff.** Each element - wall footings, stem walls, spread
  footings, pedestals, grade beams, slab on grade - expands into assembly
  line items: concrete volume, formwork contact area, rebar by bar size with
  the drawing's own lap-splice and development-length schedule, vapor barrier,
  gravel base. Bar unit weights are the published ASTM nominal values. This is
  an estimating-workflow demo, not structural engineering validation or code
  compliance.
- **Provenance on every line.** Each line item expands to show its arithmetic
  and the sheets/details/schedule rows it came from.
- **Review queue.** The plan set deliberately disagrees with itself in four
  places (a length, a bar size, a slab thickness, a missing schedule cell).
  The engine never guesses: it prices the provisional source, flags the
  conflict, and an estimator records the decision. Decisions recompute the
  takeoff, pricing, and export live in the browser session.
- **Contractor profiles.** Two fictional subcontractors price the same
  quantities with their own unit prices, waste assumptions, and markup - the
  per-customer tuning a forward-deployed engineer does on site.
- **Bid export.** Estimator-style CSV - one row per line item with source
  references - ready to drop into a spreadsheet workflow.

## Running it

Requires Node 20+.

```sh
npm install
npm test        # engine vs. the separately written spec (spec/compute_spec.py)
npm run demo    # bake data/results.json from the fixtures
npm run build   # static site into out/
npm run dev     # local preview
```

## Repo layout

- `fixtures/` - the synthetic plan set and the two contractor profiles.
  Lap/development lengths, cover, stock bar length, and pricing are all
  explicit inputs here.
- `src/engine/` - the deterministic engine: classification, rebar, takeoff,
  pricing, CSV export. Pure functions, no I/O except the CLI.
- `spec/` - `compute_spec.py`, a second, separately written Python implementation of the
  same estimator rules, and `expected.json`, its output. The test suite
  asserts the TypeScript engine reproduces these numbers exactly.
- `tests/` - engine-vs-spec quantities, the four planted flags, rebar
  constants, pricing math, CSV shape.
- `app/` - the workbench UI (Next.js, static export): plan, sheet index,
  takeoff, review queue, export.
- `data/results.json` - the baked pipeline result the static site renders.

## Honest limits

- Synthetic fixtures only. Nothing here reads a PDF, runs a model, or proves
  accuracy on a real plan set.
- Overrides are session-scoped (sessionStorage). A production system would
  write decisions back with the estimator's identity and timestamp.
- Quantities follow stated estimator conventions, not a code check.
