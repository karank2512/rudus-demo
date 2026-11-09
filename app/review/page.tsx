import { Sheet } from "../components/Sheet";
import { ReviewQueue } from "./ReviewQueue";

export default function ReviewPage() {
  return (
    <Sheet current="/review" sheetNo="T-2.00" sheetTitle="Discrepancy review and estimator decisions">
      <div className="sheet-title">
        <h1>Review queue</h1>
        <span className="sub">Software flags, people decide</span>
      </div>
      <ReviewQueue />
    </Sheet>
  );
}
