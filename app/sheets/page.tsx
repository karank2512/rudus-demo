import { Sheet } from "../components/Sheet";
import { baked } from "../../src/engine/data";

export default function SheetsPage() {
  return (
    <Sheet current="/sheets" sheetNo="T-0.01" sheetTitle="Drawing set index and routing">
      <div className="sheet-title">
        <h1>Sheet index</h1>
        <span className="sub">Deterministic routing - declared content kinds, no CV in this demo</span>
      </div>

      <table className="sheets">
        <thead>
          <tr>
            <th>Sheet</th>
            <th>Title</th>
            <th>Pipeline</th>
            <th>What the engine takes from it</th>
          </tr>
        </thead>
        <tbody>
          {baked.sheets.map((s) => (
            <tr key={s.id}>
              <td className="sheet-id">{s.id}</td>
              <td>{s.title}</td>
              <td>
                <span className="pipeline-name">{s.pipeline}</span>
              </td>
              <td>{s.role}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="footnote">
        Rudus classifies uploaded PDF sheets with trained models and routes each to the right
        processing pipeline. This demo works from a synthetic sheet index with declared kinds, so
        it demonstrates the routing contract - every sheet lands in exactly one pipeline and an
        unknown kind is rejected, never silently dropped - without claiming any classification
        capability it does not have.
      </p>
    </Sheet>
  );
}
