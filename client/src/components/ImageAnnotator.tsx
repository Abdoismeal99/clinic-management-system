import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil, Highlighter, Circle, ArrowRight, Type, Trash2, Undo2, Download, X } from "lucide-react";

type Tool = "pen" | "highlight" | "circle" | "arrow" | "text";
type Color = string;

interface Annotation {
  id: string;
  tool: Tool;
  color: Color;
  points?: { x: number; y: number }[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  text?: string;
  position?: { x: number; y: number };
  lineWidth: number;
}

interface Props {
  imageUrl: string;
  fileName: string;
  open: boolean;
  onClose: () => void;
  onSave?: (annotations: Annotation[]) => void;
  initialAnnotations?: Annotation[];
}

const COLORS: Color[] = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#000000", "#ffffff"];
const TOOL_ICONS: Record<Tool, React.ReactNode> = {
  pen: <Pencil className="w-4 h-4" />,
  highlight: <Highlighter className="w-4 h-4" />,
  circle: <Circle className="w-4 h-4" />,
  arrow: <ArrowRight className="w-4 h-4" />,
  text: <Type className="w-4 h-4" />,
};
const TOOL_LABELS: Record<Tool, string> = {
  pen: "Draw",
  highlight: "Highlight",
  circle: "Circle",
  arrow: "Arrow",
  text: "Text",
};

export default function ImageAnnotator({ imageUrl, fileName, open, onClose, onSave, initialAnnotations = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<Color>("#ef4444");
  const [lineWidth, setLineWidth] = useState(3);
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });

  // Load image and set canvas size
  useEffect(() => {
    if (!open) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      const maxW = Math.min(img.naturalWidth, 900);
      const scale = maxW / img.naturalWidth;
      const w = maxW;
      const h = img.naturalHeight * scale;
      setCanvasSize({ w, h });
    };
    img.src = imageUrl;
  }, [imageUrl, open]);

  // Redraw everything
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    annotations.forEach((ann) => drawAnnotation(ctx, ann));
  }, [annotations, canvasSize]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation) {
    ctx.save();
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = ann.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (ann.tool === "pen" && ann.points && ann.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(ann.points[0].x, ann.points[0].y);
      ann.points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    } else if (ann.tool === "highlight" && ann.points && ann.points.length > 1) {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = ann.lineWidth * 6;
      ctx.beginPath();
      ctx.moveTo(ann.points[0].x, ann.points[0].y);
      ann.points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    } else if (ann.tool === "circle" && ann.start && ann.end) {
      const rx = Math.abs(ann.end.x - ann.start.x) / 2;
      const ry = Math.abs(ann.end.y - ann.start.y) / 2;
      const cx = (ann.start.x + ann.end.x) / 2;
      const cy = (ann.start.y + ann.end.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (ann.tool === "arrow" && ann.start && ann.end) {
      drawArrow(ctx, ann.start.x, ann.start.y, ann.end.x, ann.end.y, ann.lineWidth);
    } else if (ann.tool === "text" && ann.text && ann.position) {
      ctx.font = `bold ${ann.lineWidth * 5 + 10}px Inter, sans-serif`;
      ctx.fillStyle = ann.color;
      ctx.fillText(ann.text, ann.position.x, ann.position.y);
    }
    ctx.restore();
  }

  function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, lw: number) {
    const headLen = lw * 5 + 10;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }

  function getPos(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasSize.w / rect.width;
    const scaleY = canvasSize.h / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const pos = getPos(e);
    if (tool === "text") {
      setTextPos(pos);
      setShowTextInput(true);
      return;
    }
    setIsDrawing(true);
    setStartPos(pos);
    setCurrentPoints([pos]);
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing || !startPos) return;
    const pos = getPos(e);

    if (tool === "pen" || tool === "highlight") {
      setCurrentPoints((prev) => [...prev, pos]);
      // Draw live on overlay
      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      ctx.strokeStyle = color;
      ctx.lineWidth = tool === "highlight" ? lineWidth * 6 : lineWidth;
      ctx.globalAlpha = tool === "highlight" ? 0.35 : 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      const pts = [...currentPoints, pos];
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    } else {
      // Shape preview on overlay
      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      if (tool === "circle") {
        const rx = Math.abs(pos.x - startPos.x) / 2;
        const ry = Math.abs(pos.y - startPos.y) / 2;
        const cx = (startPos.x + pos.x) / 2;
        const cy = (startPos.y + pos.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tool === "arrow") {
        drawArrow(ctx, startPos.x, startPos.y, pos.x, pos.y, lineWidth);
      }
    }
  }

  function onMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing || !startPos) return;
    const pos = getPos(e);
    setIsDrawing(false);

    // Clear overlay
    const overlay = overlayRef.current;
    if (overlay) overlay.getContext("2d")?.clearRect(0, 0, overlay.width, overlay.height);

    const id = `ann-${Date.now()}`;
    let newAnn: Annotation | null = null;

    if (tool === "pen" || tool === "highlight") {
      if (currentPoints.length > 1) {
        newAnn = { id, tool, color, points: [...currentPoints, pos], lineWidth };
      }
    } else if (tool === "circle") {
      newAnn = { id, tool, color, start: startPos, end: pos, lineWidth };
    } else if (tool === "arrow") {
      newAnn = { id, tool, color, start: startPos, end: pos, lineWidth };
    }

    if (newAnn) {
      setAnnotations((prev) => [...prev, newAnn!]);
    }
    setCurrentPoints([]);
    setStartPos(null);
  }

  function addText() {
    if (!textPos || !textInput.trim()) { setShowTextInput(false); return; }
    const id = `ann-${Date.now()}`;
    setAnnotations((prev) => [...prev, { id, tool: "text", color, text: textInput, position: textPos, lineWidth }]);
    setTextInput("");
    setShowTextInput(false);
    setTextPos(null);
  }

  function undo() {
    setAnnotations((prev) => prev.slice(0, -1));
  }

  function clearAll() {
    setAnnotations([]);
  }

  function downloadAnnotated() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `annotated-${fileName}`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-full p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="text-sm font-medium">Annotate: {fileName}</DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 flex-wrap">
          {/* Tools */}
          <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
            {(["pen", "highlight", "circle", "arrow", "text"] as Tool[]).map((t) => (
              <Tooltip key={t}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setTool(t)}
                    className={`p-1.5 rounded-md transition-colors ${tool === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    {TOOL_ICONS[t]}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{TOOL_LABELS[t]}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Colors */}
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? "border-foreground scale-125" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Line width */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Size:</span>
            {[2, 4, 7].map((w) => (
              <button
                key={w}
                onClick={() => setLineWidth(w)}
                className={`w-6 h-6 flex items-center justify-center rounded border transition-colors ${lineWidth === w ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
              >
                <div className="rounded-full bg-foreground" style={{ width: w * 2, height: w * 2 }} />
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={annotations.length === 0}><Undo2 className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Undo</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={clearAll} disabled={annotations.length === 0}><Trash2 className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Clear All</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={downloadAnnotated}><Download className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Download</TooltipContent></Tooltip>
          </div>
        </div>

        {/* Canvas area */}
        <div className="relative overflow-auto max-h-[65vh] bg-gray-900 flex items-center justify-center p-4">
          <div className="relative inline-block" style={{ maxWidth: "100%" }}>
            <canvas
              ref={canvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              className="block max-w-full"
              style={{ cursor: tool === "text" ? "text" : "crosshair" }}
            />
            <canvas
              ref={overlayRef}
              width={canvasSize.w}
              height={canvasSize.h}
              className="absolute inset-0 max-w-full pointer-events-none"
              style={{ opacity: 1 }}
            />
            {/* Invisible interaction layer */}
            <canvas
              width={canvasSize.w}
              height={canvasSize.h}
              className="absolute inset-0 max-w-full"
              style={{ cursor: tool === "text" ? "text" : "crosshair", opacity: 0 }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            />
          </div>
        </div>

        {/* Text input popover */}
        {showTextInput && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-50">
            <div className="bg-card border border-border rounded-lg p-4 shadow-xl w-72">
              <p className="text-sm font-medium mb-2">Add Text Annotation</p>
              <input
                autoFocus
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addText(); if (e.key === "Escape") setShowTextInput(false); }}
                placeholder="Type annotation text..."
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary mb-3"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowTextInput(false)}>Cancel</Button>
                <Button size="sm" onClick={addText}>Add</Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground mr-auto">{annotations.length} annotation{annotations.length !== 1 ? "s" : ""}</p>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {onSave && (
            <Button onClick={() => { onSave(annotations); onClose(); }}>Save Annotations</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
