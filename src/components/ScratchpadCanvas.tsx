import React, { useEffect, useRef, useState } from "react";
import { Eraser, Pencil, RotateCcw, Square, Trash2, Minus } from "lucide-react";

type DrawTool = "pen" | "eraser" | "line" | "rect";

const PEN_COLORS = [
  { name: "Xanh bút mực", value: "#0284C7" },
  { name: "Đỏ chấm bài", value: "#DC2626" },
  { name: "Xanh lá", value: "#059669" },
  { name: "Đen", value: "#0F172A" },
  { name: "Cam nổi bật", value: "#D97706" },
];

export const ScratchpadCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<DrawTool>("pen");
  const [color, setColor] = useState<string>("#0284C7");
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const saved = ctx.getImageData(0, 0, canvas.width || 1, canvas.height || 1);
      canvas.width = Math.max(320, Math.floor(rect.width));
      canvas.height = 360;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (saved.width > 1) {
        ctx.putImageData(saved, 0, 0);
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-14), snap]);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    saveSnapshot();
    const pos = getCoords(e);
    setIsDrawing(true);
    setStartPos(pos);

    if (tool === "pen" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getCoords(e);

    if (tool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 22;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if ((tool === "line" || tool === "rect") && startPos && history.length > 0) {
      // Restore snapshot before drawing preview shape
      const latestSnap = history[history.length - 1];
      ctx.putImageData(latestSnap, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      if (tool === "line") {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
      } else {
        ctx.rect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      }
      ctx.stroke();
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    setStartPos(null);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const previous = history[history.length - 1];
    ctx.putImageData(previous, 0, 0);
    setHistory((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    saveSnapshot();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setTool("pen")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              tool === "pen" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Bút viết</span>
          </button>
          <button
            type="button"
            onClick={() => setTool("line")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              tool === "line" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
            <span>Kẻ đoạn</span>
          </button>
          <button
            type="button"
            onClick={() => setTool("rect")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              tool === "rect" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>Vẽ hình</span>
          </button>
          <button
            type="button"
            onClick={() => setTool("eraser")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              tool === "eraser" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Tẩy</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {PEN_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.name}
              onClick={() => {
                setColor(c.value);
                if (tool === "eraser") setTool("pen");
              }}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                color === c.value && tool !== "eraser"
                  ? "border-slate-900 scale-110"
                  : "border-white shadow-xs"
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>

      {/* Sub-toolbar for stroke width & actions */}
      <div className="flex items-center justify-between gap-2 py-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>Nét bút:</span>
          {[2, 4, 6].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setLineWidth(size)}
              className={`px-2 py-0.5 rounded font-mono-tabular ${
                lineWidth === size
                  ? "bg-sky-100 text-sky-800 font-semibold"
                  : "hover:bg-slate-100 text-slate-600"
              }`}
            >
              {size}px
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Hoàn tác</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa nháp</span>
          </button>
        </div>
      </div>

      {/* Primary school notebook grid canvas */}
      <div className="relative flex-1 rounded-xl border border-sky-200 notebook-grid overflow-hidden shadow-2xs">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-[360px] touch-none cursor-crosshair block"
        />
        <div className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-sky-700/70">
          Vở nháp ô ly — Con đặt tính hoặc vẽ hình tại đây
        </div>
      </div>
    </div>
  );
};
