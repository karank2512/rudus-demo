// The foundation plan, drawn as an SVG from the same fixture geometry the
// engine reads. Each element links to its takeoff group. Not a rendering of
// a real PDF - the fixture is the drawing set, and this is its plan view.

const S = 7.5; // px per foot
const OX = 96; // origin x (leaves room for grid bubbles and dims)
const OY = 72;
const L = 60; // building length, ft
const W = 36; // building width, ft

const X = (ft: number) => OX + ft * S;
const Y = (ft: number) => OY + ft * S;

function DimH({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <g stroke="#6b7c88" strokeWidth={0.75}>
      <line x1={X(x1)} y1={y} x2={X(x2)} y2={y} />
      <line x1={X(x1)} y1={y - 4} x2={X(x1)} y2={y + 4} />
      <line x1={X(x2)} y1={y - 4} x2={X(x2)} y2={y + 4} />
      <text
        x={(X(x1) + X(x2)) / 2}
        y={y - 5}
        textAnchor="middle"
        fontSize={10}
        fill="#3d4f5d"
        stroke="none"
        fontFamily="var(--mono)"
      >
        {label}
      </text>
    </g>
  );
}

function DimV({ y1, y2, x, label }: { y1: number; y2: number; x: number; label: string }) {
  return (
    <g stroke="#6b7c88" strokeWidth={0.75}>
      <line x1={x} y1={Y(y1)} x2={x} y2={Y(y2)} />
      <line x1={x - 4} y1={Y(y1)} x2={x + 4} y2={Y(y1)} />
      <line x1={x - 4} y1={Y(y2)} x2={x + 4} y2={Y(y2)} />
      <text
        x={x - 6}
        y={(Y(y1) + Y(y2)) / 2}
        textAnchor="middle"
        fontSize={10}
        fill="#3d4f5d"
        stroke="none"
        fontFamily="var(--mono)"
        transform={`rotate(-90 ${x - 6} ${(Y(y1) + Y(y2)) / 2})`}
      >
        {label}
      </text>
    </g>
  );
}

function GridBubble({ cx, cy, label }: { cx: number; cy: number; label: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={9} fill="#fff" stroke="#3d4f5d" strokeWidth={0.9} />
      <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize={9.5} fontFamily="var(--mono)" fill="#17242f">
        {label}
      </text>
    </g>
  );
}

export function PlanView() {
  const gridsX = [0, 20, 40, 60];
  const gridsY = [0, 18, 36];
  const gridXLabels = ["1", "2", "3", "4"];
  const gridYLabels = ["A", "B", "C"];

  return (
    <svg viewBox="0 0 640 400" role="img" aria-label="Foundation plan, Alder Street Workshop (synthetic)">
      {/* grid lines */}
      {gridsX.map((g, i) => (
        <g key={`gx${g}`}>
          <line x1={X(g)} y1={Y(-3)} x2={X(g)} y2={Y(W + 3)} stroke="#aeb9c2" strokeWidth={0.6} strokeDasharray="8 3 1.5 3" />
          <GridBubble cx={X(g)} cy={Y(-4.6)} label={gridXLabels[i]} />
          <GridBubble cx={X(g)} cy={Y(W + 4.6)} label={gridXLabels[i]} />
        </g>
      ))}
      {gridsY.map((g, i) => (
        <g key={`gy${g}`}>
          <line x1={X(-3)} y1={Y(g)} x2={X(L + 3)} y2={Y(g)} stroke="#aeb9c2" strokeWidth={0.6} strokeDasharray="8 3 1.5 3" />
          <GridBubble cx={X(-4.6)} cy={Y(g)} label={gridYLabels[i]} />
          <GridBubble cx={X(L + 4.6)} cy={Y(g)} label={gridYLabels[i]} />
        </g>
      ))}

      {/* SOG-1: slab field */}
      <a href="/takeoff#sog1" className="plan-el">
        <rect className="hit" x={X(0)} y={Y(0)} width={L * S} height={W * S} />
        <rect x={X(0)} y={Y(0)} width={L * S} height={W * S} fill="none" stroke="#c9d2d8" strokeWidth={0.5} strokeDasharray="2 3" />
        <text x={X(44)} y={Y(7.4)} fontSize={10} fontFamily="var(--mono)" fill="#6b7c88">
          SOG-1: 5&quot; S.O.G.
        </text>
        <text x={X(44)} y={Y(9.2)} fontSize={9} fontFamily="var(--mono)" fill="#6b7c88">
          #4 @ 18&quot; E.W.
        </text>
      </a>

      {/* WF-1 + FW-1: perimeter footing strip and stem wall */}
      <a href="/takeoff#wf1" className="plan-el">
        <rect className="hit" x={X(0)} y={Y(0)} width={L * S} height={W * S} />
        <rect className="el-line" x={X(0)} y={Y(0)} width={L * S} height={W * S} fill="none" stroke="#17242f" strokeWidth={1.6} />
        <rect className="el-line" x={X(2)} y={Y(2)} width={(L - 4) * S} height={(W - 4) * S} fill="none" stroke="#17242f" strokeWidth={1} />
        <rect x={X(2)} y={Y(2)} width={(L - 4) * S} height={(W - 4) * S} fill="none" stroke="#17242f" strokeWidth={2.2} transform={`translate(${0.66 * S * 0} 0)`} opacity={0.9} style={{ display: "none" }} />
        <text x={X(2.8)} y={Y(3.4)} fontSize={9.5} fontFamily="var(--mono)" fill="#17242f">
          WF-1: 2&apos;-0&quot; x 1&apos;-0&quot; CONT. FTG.
        </text>
        <text x={X(2.8)} y={Y(4.9)} fontSize={9} fontFamily="var(--mono)" fill="#3d4f5d">
          W/ 8&quot; STEM WALL (FW-1)
        </text>
      </a>

      {/* GB-1 grade beam along grid B */}
      <a href="/takeoff#gb1" className="plan-el">
        <line className="el-line" x1={X(1)} y1={Y(18) - 3} x2={X(L - 1)} y2={Y(18) - 3} stroke="#17242f" strokeWidth={1.4} />
        <line className="el-line" x1={X(1)} y1={Y(18) + 3} x2={X(L - 1)} y2={Y(18) + 3} stroke="#17242f" strokeWidth={1.4} />
        <rect className="hit" x={X(1)} y={Y(18) - 7} width={(L - 2) * S} height={14} />
        <text x={X(24)} y={Y(16.4)} fontSize={9.5} fontFamily="var(--mono)" fill="#17242f">
          GB-1
        </text>
      </a>

      {/* F3 spread footings with P-1 pedestals at B-2 and B-3 */}
      {[20, 40].map((gx) => (
        <a href="/takeoff#f3" className="plan-el" key={`f3-${gx}`}>
          <rect className="hit" x={X(gx - 3)} y={Y(18 - 3)} width={6 * S} height={6 * S} />
          <rect className="el-line" x={X(gx - 3)} y={Y(18 - 3)} width={6 * S} height={6 * S} fill="#eef1f2" stroke="#17242f" strokeWidth={1.3} />
          <line x1={X(gx - 3)} y1={Y(18 - 3)} x2={X(gx + 3)} y2={Y(18 + 3)} stroke="#17242f" strokeWidth={0.6} />
          <line x1={X(gx + 3)} y1={Y(18 - 3)} x2={X(gx - 3)} y2={Y(18 + 3)} stroke="#17242f" strokeWidth={0.6} />
          <rect x={X(gx - 0.75)} y={Y(18 - 0.75)} width={1.5 * S} height={1.5 * S} fill="#17242f" />
          <text x={X(gx - 3)} y={Y(18 + 4.4)} fontSize={9.5} fontFamily="var(--mono)" fill="#17242f">
            F3 / P-1
          </text>
        </a>
      ))}

      {/* dimensions */}
      <DimH x1={0} x2={20} y={Y(-2.2)} label={"20'-0\""} />
      <DimH x1={20} x2={40} y={Y(-2.2)} label={"20'-0\""} />
      <DimH x1={40} x2={60} y={Y(-2.2)} label={"20'-0\""} />
      <DimV y1={0} y2={18} x={X(-2.2)} label={"18'-0\""} />
      <DimV y1={18} y2={36} x={X(-2.2)} label={"18'-0\""} />
      <DimH x1={0} x2={60} y={Y(W + 2.4)} label={"60'-0\""} />
      <DimV y1={0} y2={36} x={X(L + 2.4)} label={"36'-0\""} />

      {/* revision flag marker example on the slab thickness conflict */}
      <g transform={`translate(${X(52)}, ${Y(11)})`}>
        <ellipse cx={0} cy={0} rx={13} ry={9} fill="none" stroke="#9a7414" strokeWidth={1.2} strokeDasharray="3 2" />
        <text x={0} y={3} textAnchor="middle" fontSize={8.5} fontFamily="var(--mono)" fill="#9a7414">
          R3
        </text>
      </g>
    </svg>
  );
}
