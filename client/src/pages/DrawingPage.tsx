import React, { useRef, useState, useEffect, useCallback } from 'react';
const generateUUID = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2) + Date.now().toString(36);

import { useAuthStore } from '../stores/authStore';
import { useDrawingStore } from '../stores/drawingStore';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { DrawingStrokeDTO, SOCKET_EVENTS } from '@couple/shared';
import {
  Pen,
  Eraser,
  Undo2,
  Trash2,
  Download,
  Moon,
  Sun,
  Palette,
  Sparkles,
} from 'lucide-react';

const CANVAS_SIZE = 1000; // Normalized virtual drawing space

const COLOR_PALETTE = [
  '#f43f5e', // Rose
  '#e11d48', // Deep Rose
  '#c084fc', // Purple/Lavender
  '#38bdf8', // Sky Blue
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#f87171', // Coral
  '#090a0f', // Dark Ink
  '#ffffff', // White
];

const STROKE_SIZES = [
  { label: 'S', value: 6, title: 'Fine' },
  { label: 'M', value: 12, title: 'Medium' },
  { label: 'L', value: 24, title: 'Bold' },
  { label: 'XL', value: 40, title: 'Heavy' },
];

export const DrawingPage: React.FC = () => {
  const { couple, user, partner } = useAuthStore();
  const {
    strokes,
    backgroundColor,
    tool,
    color,
    width,
    setBoard,
    addStroke,
    removeStroke,
    clearStrokes,
    setTool,
    setColor,
    setWidth,
    setBackgroundColor,
  } = useDrawingStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSizePopoverOpen, setIsSizePopoverOpen] = useState(false);
  const currentStrokePoints = useRef<{ x: number; y: number }[]>([]);
  const currentStrokeId = useRef<string>('');

  // Normalize any legacy strokes from prior sessions that were saved in large pixel coordinates
  const sanitizeStrokes = (rawStrokes: DrawingStrokeDTO[]): DrawingStrokeDTO[] => {
    let maxX = 0;
    let maxY = 0;
    rawStrokes.forEach((s) => {
      s.points?.forEach((p) => {
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      });
    });

    if (maxX > CANVAS_SIZE || maxY > CANVAS_SIZE) {
      const scale = Math.min(850 / Math.max(maxX, 1), 850 / Math.max(maxY, 1));
      return rawStrokes.map((s) => ({
        ...s,
        width: Math.max(4, Math.min(30, Math.round(s.width * scale * 10))),
        points: (s.points || []).map((p) => ({
          x: Math.round(p.x * scale + 75),
          y: Math.round(p.y * scale + 75),
        })),
      }));
    }
    return rawStrokes;
  };

  // 1. Fetch initial board and strokes
  useEffect(() => {
    const fetchBoard = async () => {
      const res = await api.get('/drawing');
      if (res.success && res.data) {
        const cleaned = sanitizeStrokes(res.data.strokes || []);
        setBoard(res.data.board, cleaned);
      }
    };
    fetchBoard();
  }, []);

  // 2. Setup Realtime Socket Listeners
  useEffect(() => {
    // Partner finished a stroke
    const handleRemoteStrokeCommit = (payload: { stroke: DrawingStrokeDTO }) => {
      addStroke(payload.stroke);
    };

    // Partner cleared the board
    const handleRemoteClear = () => {
      clearStrokes();
    };

    // Partner toggled background
    const handleRemoteBackground = (payload: { backgroundColor: '#ffffff' | '#121214' }) => {
      setBackgroundColor(payload.backgroundColor);
    };

    // Partner undid a stroke
    const handleRemoteUndo = (payload: { strokeId: string }) => {
      removeStroke(payload.strokeId);
    };

    // Partner is drawing live (streaming intermediate point in virtual coordinates)
    const handleRemoteStrokeStream = (payload: any) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(canvas.width / CANVAS_SIZE, canvas.height / CANVAS_SIZE);
      ctx.lineWidth = Math.max(2, payload.width);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (payload.tool === 'eraser') {
        ctx.strokeStyle = backgroundColor;
      } else {
        ctx.strokeStyle = payload.color;
      }

      ctx.beginPath();
      if (payload.prevPoint) {
        ctx.moveTo(payload.prevPoint.x, payload.prevPoint.y);
      } else {
        ctx.moveTo(payload.point.x, payload.point.y);
      }
      ctx.lineTo(payload.point.x, payload.point.y);
      ctx.stroke();
      ctx.restore();
    };

    socketService.on(SOCKET_EVENTS.DRAWING_STROKE_COMMIT, handleRemoteStrokeCommit);
    socketService.on(SOCKET_EVENTS.DRAWING_CLEAR, handleRemoteClear);
    socketService.on(SOCKET_EVENTS.DRAWING_BACKGROUND, handleRemoteBackground);
    socketService.on(SOCKET_EVENTS.DRAWING_UNDO, handleRemoteUndo);
    socketService.on(SOCKET_EVENTS.DRAWING_STROKE_STREAM, handleRemoteStrokeStream);

    return () => {
      socketService.off(SOCKET_EVENTS.DRAWING_STROKE_COMMIT, handleRemoteStrokeCommit);
      socketService.off(SOCKET_EVENTS.DRAWING_CLEAR, handleRemoteClear);
      socketService.off(SOCKET_EVENTS.DRAWING_BACKGROUND, handleRemoteBackground);
      socketService.off(SOCKET_EVENTS.DRAWING_UNDO, handleRemoteUndo);
      socketService.off(SOCKET_EVENTS.DRAWING_STROKE_STREAM, handleRemoteStrokeStream);
    };
  }, [backgroundColor]);

  // 3. Render all strokes onto the canvas with virtual scaling
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    // Reset transform & clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Map [0 .. CANVAS_SIZE] to physical canvas dimensions
    ctx.scale(canvas.width / CANVAS_SIZE, canvas.height / CANVAS_SIZE);

    // Draw all strokes
    strokes.forEach((s) => {
      if (!s.points || s.points.length === 0) return;

      ctx.save();
      ctx.lineWidth = Math.max(2, s.width);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (s.tool === 'eraser') {
        ctx.strokeStyle = backgroundColor;
      } else {
        ctx.strokeStyle = s.color;
      }

      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);

      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    });
  }, [strokes, backgroundColor]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Handle canvas sizing on window resize
  useEffect(() => {
    const handleResize = () => {
      redrawCanvas();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  // Convert mouse / touch coordinates to virtual [0 .. CANVAS_SIZE] coordinates
  const getVirtualCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (!e.touches || e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const normX = ((clientX - rect.left) / rect.width) * CANVAS_SIZE;
    const normY = ((clientY - rect.top) / rect.height) * CANVAS_SIZE;

    return {
      x: Math.round(Math.max(0, Math.min(CANVAS_SIZE, normX))),
      y: Math.round(Math.max(0, Math.min(CANVAS_SIZE, normY))),
    };
  };

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (isSizePopoverOpen) setIsSizePopoverOpen(false);
    const coords = getVirtualCoordinates(e);
    setIsDrawing(true);
    currentStrokeId.current = generateUUID();
    currentStrokePoints.current = [coords];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(canvas.width / CANVAS_SIZE, canvas.height / CANVAS_SIZE);
    ctx.lineWidth = Math.max(2, width);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = tool === 'eraser' ? backgroundColor : color;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const coords = getVirtualCoordinates(e);
    currentStrokePoints.current.push(coords);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pointsLen = currentStrokePoints.current.length;
    const prev = pointsLen >= 2 ? currentStrokePoints.current[pointsLen - 2] : coords;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(canvas.width / CANVAS_SIZE, canvas.height / CANVAS_SIZE);
    ctx.lineWidth = Math.max(2, width);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = tool === 'eraser' ? backgroundColor : color;

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    ctx.restore();

    // Stream point in virtual coordinates to partner
    socketService.emit(SOCKET_EVENTS.DRAWING_STROKE_STREAM, {
      strokeId: currentStrokeId.current,
      tool,
      color,
      width,
      point: coords,
      prevPoint: prev,
    });
  };

  const stopDrawing = async () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const points = currentStrokePoints.current;
    if (points.length < 2) return;

    const strokeData: DrawingStrokeDTO = {
      id: currentStrokeId.current,
      strokeId: currentStrokeId.current,
      coupleId: couple?.id || '',
      createdBy: user?.id || '',
      tool,
      color,
      width,
      points,
      createdAt: new Date().toISOString(),
    };

    // Optimistically add to local store
    addStroke(strokeData);

    // Commit to database and broadcast to partner through Socket.IO
    socketService.emit(SOCKET_EVENTS.DRAWING_STROKE_COMMIT, { stroke: strokeData });
  };

  // Canvas Actions
  const handleClear = () => {
    if (window.confirm('Clear the entire canvas for both of you?')) {
      clearStrokes();
      socketService.emit(SOCKET_EVENTS.DRAWING_CLEAR, {});
    }
  };

  const handleToggleBackground = () => {
    const newBg = backgroundColor === '#ffffff' ? '#121214' : '#ffffff';
    setBackgroundColor(newBg);
    socketService.emit(SOCKET_EVENTS.DRAWING_BACKGROUND, { backgroundColor: newBg });
  };

  const handleUndo = () => {
    socketService.emit(SOCKET_EVENTS.DRAWING_UNDO, {});
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `UsTwo-Artwork-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-130px)] lg:h-[calc(100vh-70px)] max-w-4xl mx-auto px-3 sm:px-6 py-2 sm:py-3 select-none">
      {/* Top Toolbar: Ergonomic 2-Row Design with ZERO clipping on mobile */}
      <div className="glass-panel rounded-3xl p-2 sm:p-3 mb-2 border border-white/10 shadow-lg space-y-2 shrink-0">
        {/* Row 1: Tools + Brush Width Dots + 4 Action Buttons */}
        <div className="flex items-center justify-between gap-1 w-full">
          {/* Tool Selector (Pen / Eraser) */}
          <div className="flex items-center gap-0.5 p-0.5 sm:p-1 rounded-2xl bg-white/5 border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setTool('pen')}
              className={`px-2.5 py-1.5 sm:px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                tool === 'pen'
                  ? 'bg-romantic-600 text-white shadow-glow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Pen Tool"
            >
              <Pen className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs">Pen</span>
            </button>

            <button
              type="button"
              onClick={() => setTool('eraser')}
              className={`px-2.5 py-1.5 sm:px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                tool === 'eraser'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Eraser Tool"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs">Eraser</span>
            </button>
          </div>

          {/* Mobile-First Brush Size Button (Toggles Slider Drawer) */}
          <button
            type="button"
            onClick={() => setIsSizePopoverOpen((prev) => !prev)}
            className={`px-2.5 py-1.5 sm:px-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border shrink-0 ${
              isSizePopoverOpen
                ? 'bg-romantic-600 border-romantic-400 text-white shadow-glow'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Adjust brush size (2px - 48px)"
          >
            <div
              className="rounded-full shrink-0 transition-all border border-white/30"
              style={{
                width: Math.max(7, Math.min(16, width)),
                height: Math.max(7, Math.min(16, width)),
                backgroundColor: tool === 'eraser' ? '#ffffff' : color,
              }}
            />
            <span className="text-[11px] sm:text-xs font-bold font-mono">{width}px</span>
          </button>

          {/* Action Buttons: Theme, Undo, Clear, Download (All 4 fully visible on mobile) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleToggleBackground}
              className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
              title="Toggle Theme (White / Obsidian)"
            >
              {backgroundColor === '#ffffff' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={handleUndo}
              className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
              title="Undo last stroke"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-rose-300 border border-white/10 transition-colors"
              title="Clear entire canvas"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
              title="Download PNG"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expandable Mobile-First Size Slider Drawer */}
        {isSizePopoverOpen && (
          <div className="w-full p-3 rounded-2xl bg-space-950/95 border border-white/15 backdrop-blur-md shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-2">
                <span>Stroke Width:</span>
                <strong className="text-white font-bold text-sm font-mono">{width}px</strong>
              </span>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5">
                {[4, 8, 16, 24, 36].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setWidth(sz)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      width === sz
                        ? 'bg-romantic-600 text-white shadow-sm ring-1 ring-white/40'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {sz}px
                  </button>
                ))}
              </div>
            </div>

            {/* Range Slider & Dynamic Live Circle Preview */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500 font-mono">2px</span>
              <input
                type="range"
                min={2}
                max={48}
                step={1}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full accent-romantic-500 h-2.5 bg-white/10 rounded-lg cursor-pointer transition-all"
              />
              <span className="text-[10px] text-slate-500 font-mono">48px</span>

              {/* Dynamic Preview Circle matching current tool and color */}
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <div
                  className="rounded-full transition-all border border-white/20"
                  style={{
                    width: Math.max(3, Math.min(28, width)),
                    height: Math.max(3, Math.min(28, width)),
                    backgroundColor: tool === 'eraser' ? '#ffffff' : color,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Row 2: Touch-Friendly Color Palette (All 10 swatches fit perfectly without clipping) */}
        <div className="flex items-center justify-between gap-1 sm:gap-2.5 overflow-x-auto scrollbar-none py-0.5 px-0.5">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                if (tool === 'eraser') setTool('pen');
              }}
              style={{ backgroundColor: c }}
              className={`w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] rounded-full border-2 border-white/25 shadow-md transition-all shrink-0 cursor-pointer ${
                color === c && tool !== 'eraser'
                  ? 'scale-115 ring-2 ring-rose-400 border-white shadow-glow'
                  : 'hover:scale-105 active:scale-95'
              }`}
              title={`Color: ${c}`}
            />
          ))}

          {/* Custom Color Picker Swatch */}
          <label
            className={`relative w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] rounded-full border-2 border-dashed border-white/40 flex items-center justify-center cursor-pointer bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 shadow-md hover:scale-105 active:scale-95 shrink-0 transition-transform ${
              !COLOR_PALETTE.includes(color) && tool !== 'eraser'
                ? 'ring-2 ring-rose-400 scale-115 border-white shadow-glow'
                : ''
            }`}
            title="Pick custom color"
          >
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                if (tool === 'eraser') setTool('pen');
              }}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            />
            <Palette className="w-3 h-3 text-white drop-shadow" />
          </label>
        </div>
      </div>

      {/* Canvas Area: Centered, Equal 1:1 Aspect Ratio on Both Desktop & Mobile */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 overflow-hidden py-1">
        <div className="relative aspect-square max-h-full max-w-full w-full max-w-[min(100%,calc(100dvh-240px))] rounded-3xl overflow-hidden shadow-2xl border-2 border-white/15 bg-white mx-auto">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full touch-none cursor-crosshair block"
          />

          {/* Live Partner Presence Notice */}
          <div className="absolute top-3 left-3 pointer-events-none px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-100">
              {partner?.displayName ? `${partner.displayName}'s shared canvas` : 'Couple Canvas'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
