import React, { useState } from "react";
import { GeometrySpec } from "../types";
import { Eye, Grid, Ruler } from "lucide-react";

interface GeometryVisualProps {
  spec: GeometrySpec;
}

export const GeometryVisual: React.FC<GeometryVisualProps> = ({ spec }) => {
  const [showGrid, setShowGrid] = useState<boolean>(spec.showGrid ?? true);
  const [showVertices, setShowVertices] = useState<boolean>(true);

  const unit = spec.unit || "cm";
  const widthVal = spec.width || spec.sideA || 8;
  const heightVal = spec.height || spec.sideB || 5;
  const topWidthVal = spec.topWidth || 4;

  const renderShape = () => {
    switch (spec.shapeType) {
      case "square": {
        const s = 130;
        const x = (360 - s) / 2;
        const y = (240 - s) / 2;
        const sideLabel = `${spec.width || spec.sideA || 6} ${unit}`;
        const pts = [
          { x, y },
          { x: x + s, y },
          { x: x + s, y: y + s },
          { x, y: y + s },
        ];
        return (
          <g>
            <rect
              x={x}
              y={y}
              width={s}
              height={s}
              fill="rgba(2, 132, 199, 0.14)"
              stroke="#0284C7"
              strokeWidth="3"
            />
            <path
              d={`M ${x + 14} ${y} L ${x + 14} ${y + 14} L ${x} ${y + 14}`}
              fill="none"
              stroke="#0284C7"
              strokeWidth="1.8"
            />
            <path
              d={`M ${x + s - 14} ${y} L ${x + s - 14} ${y + 14} L ${x + s} ${y + 14}`}
              fill="none"
              stroke="#0284C7"
              strokeWidth="1.8"
            />
            <text
              x={x + s / 2}
              y={y - 12}
              textAnchor="middle"
              className="fill-sky-900 font-bold text-[13px] font-mono-tabular"
            >
              Cạnh = {sideLabel}
            </text>
            <text
              x={x + s + 12}
              y={y + s / 2 + 4}
              textAnchor="start"
              className="fill-sky-800 font-semibold text-[12px] font-mono-tabular"
            >
              {sideLabel}
            </text>
            {showVertices &&
              pts.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} r="5" fill="#D97706" stroke="#fff" strokeWidth="1.5" />
                  <text
                    x={p.x + (idx === 0 || idx === 3 ? -14 : 14)}
                    y={p.y + (idx < 2 ? -8 : 18)}
                    textAnchor="middle"
                    className="fill-slate-700 font-bold text-[11px]"
                  >
                    {["A", "B", "C", "D"][idx]} ({idx + 1})
                  </text>
                </g>
              ))}
          </g>
        );
      }

      case "rectangle": {
        const w = Math.min(220, Math.max(120, widthVal * 22));
        const h = Math.min(140, Math.max(76, heightVal * 22));
        const x = (360 - w) / 2;
        const y = (240 - h) / 2;
        const pts = [
          { x, y },
          { x: x + w, y },
          { x: x + w, y: y + h },
          { x, y: y + h },
        ];
        return (
          <g>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill="rgba(2, 132, 199, 0.14)"
              stroke="#0284C7"
              strokeWidth="3"
            />
            <path
              d={`M ${x + 14} ${y} L ${x + 14} ${y + 14} L ${x} ${y + 14}`}
              fill="none"
              stroke="#0284C7"
              strokeWidth="1.8"
            />
            <path
              d={`M ${x} ${y + h - 14} L ${x + 14} ${y + h - 14} L ${x + 14} ${y + h}`}
              fill="none"
              stroke="#0284C7"
              strokeWidth="1.8"
            />
            <text
              x={x + w / 2}
              y={y - 12}
              textAnchor="middle"
              className="fill-sky-900 font-bold text-[13px] font-mono-tabular"
            >
              Dài = {widthVal} {unit}
            </text>
            <text
              x={x + w + 12}
              y={y + h / 2 + 4}
              textAnchor="start"
              className="fill-emerald-800 font-bold text-[13px] font-mono-tabular"
            >
              Rộng = {heightVal} {unit}
            </text>
            {showVertices &&
              pts.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} r="5" fill="#D97706" stroke="#fff" strokeWidth="1.5" />
                  <text
                    x={p.x + (idx === 0 || idx === 3 ? -12 : 12)}
                    y={p.y + (idx < 2 ? -8 : 18)}
                    textAnchor="middle"
                    className="fill-slate-700 font-bold text-[11px]"
                  >
                    {["A", "B", "C", "D"][idx]}
                  </text>
                </g>
              ))}
          </g>
        );
      }

      case "triangle":
      case "right_triangle": {
        const isRight = spec.shapeType === "right_triangle";
        const p1 = isRight ? { x: 95, y: 50 } : { x: 180, y: 45 };
        const p2 = { x: 265, y: 185 };
        const p3 = { x: 95, y: 185 };
        const a = spec.sideA || 6;
        const b = spec.sideB || 8;
        const c = spec.sideC || 10;
        const pts = [p1, p2, p3];
        return (
          <g>
            <polygon
              points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
              fill="rgba(5, 150, 105, 0.14)"
              stroke="#059669"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {isRight && (
              <path
                d={`M ${p3.x + 16} ${p3.y} L ${p3.x + 16} ${p3.y - 16} L ${p3.x} ${p3.y - 16}`}
                fill="none"
                stroke="#059669"
                strokeWidth="1.8"
              />
            )}
            <text
              x={(p3.x + p2.x) / 2}
              y={p3.y + 22}
              textAnchor="middle"
              className="fill-emerald-900 font-bold text-[13px] font-mono-tabular"
            >
              {b} {unit}
            </text>
            <text
              x={p3.x - 12}
              y={(p1.y + p3.y) / 2}
              textAnchor="end"
              className="fill-emerald-900 font-bold text-[13px] font-mono-tabular"
            >
              {a} {unit}
            </text>
            <text
              x={(p1.x + p2.x) / 2 + 16}
              y={(p1.y + p2.y) / 2 - 4}
              textAnchor="start"
              className="fill-emerald-900 font-bold text-[13px] font-mono-tabular"
            >
              {c} {unit}
            </text>
            {showVertices &&
              pts.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} r="5" fill="#D97706" stroke="#fff" strokeWidth="1.5" />
                  <text
                    x={p.x}
                    y={idx === 0 ? p.y - 10 : p.y + 18}
                    textAnchor="middle"
                    className="fill-slate-700 font-bold text-[11px]"
                  >
                    Đỉnh {idx + 1}
                  </text>
                </g>
              ))}
          </g>
        );
      }

      case "pentagon":
      case "hexagon": {
        const sides = spec.shapeType === "pentagon" ? 5 : 6;
        const cx = 180;
        const cy = 122;
        const r = 74;
        const pts = Array.from({ length: sides }, (_, i) => {
          const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
          return {
            x: cx + r * Math.cos(angle),
            y: cy + r * Math.sin(angle),
            lx: cx + (r + 22) * Math.cos(angle),
            ly: cy + (r + 22) * Math.sin(angle),
          };
        });
        return (
          <g>
            <polygon
              points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="rgba(217, 119, 6, 0.14)"
              stroke="#D97706"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {pts.map((p, idx) => {
              const next = pts[(idx + 1) % sides];
              const mx = (p.x + next.x) / 2;
              const my = (p.y + next.y) / 2;
              return (
                <g key={idx}>
                  {showVertices && (
                    <>
                      <circle cx={p.x} cy={p.y} r="5.5" fill="#0284C7" stroke="#fff" strokeWidth="1.5" />
                      <text
                        x={p.lx}
                        y={p.ly + 4}
                        textAnchor="middle"
                        className="fill-sky-900 font-bold text-[12px] font-mono-tabular"
                      >
                        Đỉnh {idx + 1}
                      </text>
                      <text
                        x={mx}
                        y={my}
                        textAnchor="middle"
                        className="fill-amber-900 font-semibold text-[11px]"
                      >
                        Cạnh {idx + 1}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </g>
        );
      }

      case "trapezoid":
      case "parallelogram": {
        const topW = spec.shapeType === "parallelogram" ? 150 : 110;
        const botW = spec.shapeType === "parallelogram" ? 150 : 210;
        const shift = spec.shapeType === "parallelogram" ? 28 : 0;
        const h = 110;
        const yTop = 65;
        const yBot = yTop + h;
        const p1 = { x: 180 - topW / 2 + shift, y: yTop };
        const p2 = { x: 180 + topW / 2 + shift, y: yTop };
        const p3 = { x: 180 + botW / 2, y: yBot };
        const p4 = { x: 180 - botW / 2, y: yBot };
        const pts = [p1, p2, p3, p4];
        return (
          <g>
            <polygon
              points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
              fill="rgba(79, 70, 229, 0.12)"
              stroke="#4F46E5"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <text
              x={180 + shift / 2}
              y={yTop - 10}
              textAnchor="middle"
              className="fill-indigo-900 font-bold text-[12px] font-mono-tabular"
            >
              {topWidthVal} {unit}
            </text>
            <text
              x={180}
              y={yBot + 22}
              textAnchor="middle"
              className="fill-indigo-900 font-bold text-[12px] font-mono-tabular"
            >
              {widthVal} {unit}
            </text>
            <text
              x={p4.x - 10}
              y={(yTop + yBot) / 2}
              textAnchor="end"
              className="fill-indigo-800 font-bold text-[12px] font-mono-tabular"
            >
              {spec.sideA || 5} {unit}
            </text>
            <text
              x={p2.x + 10}
              y={(yTop + yBot) / 2}
              textAnchor="start"
              className="fill-indigo-800 font-bold text-[12px] font-mono-tabular"
            >
              {spec.sideB || 5} {unit}
            </text>
            {showVertices &&
              pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="5" fill="#D97706" stroke="#fff" strokeWidth="1.5" />
              ))}
          </g>
        );
      }

      case "composite_l": {
        const cell = 24;
        const startX = 108;
        const startY = 56;
        const d = `
          M ${startX} ${startY}
          L ${startX + 3 * cell} ${startY}
          L ${startX + 3 * cell} ${startY + 2 * cell}
          L ${startX + 6 * cell} ${startY + 2 * cell}
          L ${startX + 6 * cell} ${startY + 5 * cell}
          L ${startX} ${startY + 5 * cell}
          Z
        `;
        return (
          <g>
            {Array.from({ length: 5 }, (_, row) =>
              Array.from({ length: 6 }, (_, col) => {
                if (row < 2 && col >= 3) return null;
                return (
                  <rect
                    key={`${row}-${col}`}
                    x={startX + col * cell}
                    y={startY + row * cell}
                    width={cell}
                    height={cell}
                    fill="rgba(2, 132, 199, 0.18)"
                    stroke="rgba(2, 132, 199, 0.45)"
                    strokeWidth="1"
                  />
                );
              })
            )}
            <path d={d} fill="none" stroke="#0284C7" strokeWidth="3" />
            <text
              x={startX + 3 * cell}
              y={startY + 5 * cell + 20}
              textAnchor="middle"
              className="fill-sky-900 font-bold text-[12px] font-mono-tabular"
            >
              Đáy dưới = 6 {unit}
            </text>
            <text
              x={startX - 10}
              y={startY + 2.5 * cell}
              textAnchor="end"
              className="fill-sky-900 font-bold text-[12px] font-mono-tabular"
            >
              Cao = 5 {unit}
            </text>
            <text
              x={startX + 1.5 * cell}
              y={startY - 8}
              textAnchor="middle"
              className="fill-sky-800 font-semibold text-[11px] font-mono-tabular"
            >
              3 {unit}
            </text>
            <text
              x={startX + 6 * cell + 8}
              y={startY + 3.5 * cell}
              textAnchor="start"
              className="fill-sky-800 font-semibold text-[11px] font-mono-tabular"
            >
              3 {unit}
            </text>
          </g>
        );
      }

      case "circle":
      default: {
        const r = 68;
        return (
          <g>
            <circle
              cx={180}
              cy={120}
              r={r}
              fill="rgba(2, 132, 199, 0.14)"
              stroke="#0284C7"
              strokeWidth="3"
            />
            <line
              x1={180}
              y1={120}
              x2={180 + r}
              y2={120}
              stroke="#D97706"
              strokeWidth="2.5"
              strokeDasharray="4 3"
            />
            <circle cx={180} cy={120} r="4.5" fill="#0284C7" />
            <text
              x={180 + r / 2}
              y={112}
              textAnchor="middle"
              className="fill-amber-900 font-bold text-[12px] font-mono-tabular"
            >
              r = {widthVal} {unit}
            </text>
          </g>
        );
      }
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Ruler className="w-4 h-4 text-sky-600" />
          <span>{spec.customLabel || "Hình minh họa trực quan"}</span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="text-slate-500 font-normal">
            Đơn vị đo: <strong className="font-mono-tabular text-slate-700">{unit}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowGrid((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              showGrid
                ? "bg-sky-50 text-sky-700 border border-sky-200"
                : "bg-slate-100 text-slate-600 hover:text-slate-900"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Lưới ô vuông</span>
          </button>
          <button
            type="button"
            onClick={() => setShowVertices((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              showVertices
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : "bg-slate-100 text-slate-600 hover:text-slate-900"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Đánh dấu đỉnh/cạnh</span>
          </button>
        </div>
      </div>

      <div className="mt-3 flex justify-center bg-slate-50/70 rounded-lg border border-slate-100 overflow-hidden">
        <svg
          viewBox="0 0 360 240"
          className="w-full max-w-[440px] h-[230px]"
          role="img"
          aria-label={spec.customLabel || "Hình học minh họa"}
        >
          {showGrid && (
            <defs>
              <pattern id="geo-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.28)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
          )}
          {showGrid && <rect width="360" height="240" fill="url(#geo-grid)" />}
          {renderShape()}
        </svg>
      </div>
    </div>
  );
};
