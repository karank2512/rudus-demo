import Link from "next/link";
import type { ReactNode } from "react";

const SHEETS = [
  { no: "01", href: "/", label: "Plan" },
  { no: "02", href: "/sheets", label: "Sheet Index" },
  { no: "03", href: "/takeoff", label: "Takeoff" },
  { no: "04", href: "/review", label: "Review" },
  { no: "05", href: "/export", label: "Export" },
];

export function Sheet({
  current,
  sheetNo,
  sheetTitle,
  children,
}: {
  current: string;
  sheetNo: string;
  sheetTitle: string;
  children: ReactNode;
}) {
  return (
    <div className="sheet">
      <div className="stamp">Synthetic data - not for construction</div>
      <div className="sheet-inner">
        <div className="sheet-nav">
          <div className="wordmark">
            <span className="dot" />
            Rudus demo - takeoff workbench
          </div>
          <nav>
            {SHEETS.map((s) => (
              <Link
                key={s.no}
                href={s.href}
                aria-current={current === s.href ? "page" : undefined}
              >
                <span className="no">{s.no}</span>
                {s.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="sheet-body">{children}</div>
        <div className="title-block">
          <div className="cell">
            <span className="k">Project</span>
            <span className="v">Alder Street Workshop</span>
          </div>
          <div className="cell">
            <span className="k">Sheet title</span>
            <span className="v">{sheetTitle}</span>
          </div>
          <div className="cell">
            <span className="k">Sheet</span>
            <span className="v">{sheetNo}</span>
          </div>
          <div className="cell">
            <span className="k">Scale</span>
            <span className="v">NTS</span>
          </div>
          <div className="cell">
            <span className="k">Drawn</span>
            <span className="v">K.K.</span>
          </div>
          <div className="cell">
            <span className="k">Status</span>
            <span className="v">DEMO</span>
          </div>
        </div>
      </div>
    </div>
  );
}
