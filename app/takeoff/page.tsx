import { Sheet } from "../components/Sheet";
import { TakeoffTable } from "./TakeoffTable";

export default function TakeoffPage() {
  return (
    <Sheet current="/takeoff" sheetNo="T-1.00" sheetTitle="Quantity takeoff and priced assemblies">
      <div className="sheet-title">
        <h1>Takeoff</h1>
        <span className="sub">Every line expands to its calc and its source</span>
      </div>
      <TakeoffTable />
      <p className="footnote">
        Quantities are computed deterministically from the synthetic plan set. Lap splice and
        development lengths are the drawing&apos;s own general-notes schedule, not engineering
        judgment by this software. Select any row to see the arithmetic and the sheet references
        behind it.
      </p>
    </Sheet>
  );
}
