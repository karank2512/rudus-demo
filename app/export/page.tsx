import { Sheet } from "../components/Sheet";
import { ExportSheet } from "./ExportSheet";

export default function ExportPage() {
  return (
    <Sheet current="/export" sheetNo="T-3.00" sheetTitle="Bid package export">
      <div className="sheet-title">
        <h1>Export</h1>
        <span className="sub">Priced bid package, ready for the spreadsheet</span>
      </div>
      <ExportSheet />
    </Sheet>
  );
}
