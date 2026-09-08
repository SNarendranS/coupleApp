import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DrawingStrokeDTO } from '@couple/shared';
import { Palette, Sparkles, ArrowRight } from 'lucide-react';

interface CanvasPreviewProps {
  strokes: DrawingStrokeDTO[];
  backgroundColor?: '#ffffff' | '#121214';
  className?: string;
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  strokes = [],
  backgroundColor = '#ffffff',
  className = 'h-48 sm:h-56',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth * (window.devicePixelRatio || 1);
      canvas.height = parent.clientHeight * (window.devicePixelRatio || 1);
    }

    const width = canvas.width;
    const height = canvas.height;

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (strokes.length === 0) {
      // Draw subtle placeholder illustration
      ctx.save();
      ctx.strokeStyle = backgroundColor === '#ffffff' ? '#fda4af' : '#fb7185';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw a gentle heart in center
      const cx = width / 2;
      const cy = height / 2 - 10;
      const s = Math.min(width, height) / 10;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.bezierCurveTo(cx - s, cy - s * 1.5, cx - s * 2, cy + s * 0.5, cx, cy + s * 2);
      ctx.bezierCurveTo(cx + s * 2, cy + s * 0.5, cx + s, cy - s * 1.5, cx, cy);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Check if coordinates are in virtual [0 .. 1000] coordinate space
    let maxPt = 0;
    strokes.forEach((s) => {
      s.points?.forEach((p) => {
        if (p.x > maxPt) maxPt = p.x;
        if (p.y > maxPt) maxPt = p.y;
      });
    });

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (maxPt <= 1000) {
      // Direct virtual coordinate mapping into preview
      scale = Math.min(width, height) / 1000;
      offsetX = (width - 1000 * scale) / 2;
      offsetY = (height - 1000 * scale) / 2;
    } else {
      // Legacy bounding box fallback
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      strokes.forEach((stroke) => {
        stroke.points?.forEach((pt) => {
          if (pt.x < minX) minX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y > maxY) maxY = pt.y;
        });
      });

      const boxW = Math.max(maxX - minX, 100);
      const boxH = Math.max(maxY - minY, 100);
      const padding = 16;

      const scaleX = (width - padding * 2) / boxW;
      const scaleY = (height - padding * 2) / boxH;
      scale = Math.min(scaleX, scaleY, 1.2);

      offsetX = (width - boxW * scale) / 2 - minX * scale;
      offsetY = (height - boxH * scale) / 2 - minY * scale;
    }

    // Render strokes with normalized scaling
    ctx.save();
    strokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;

      ctx.save();
      ctx.lineWidth = Math.max(2, stroke.width * scale);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'eraser') {
        ctx.strokeStyle = backgroundColor;
      } else {
        ctx.strokeStyle = stroke.color;
      }

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * scale + offsetX, stroke.points[0].y * scale + offsetY);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(
          stroke.points[i].x * scale + offsetX,
          stroke.points[i].y * scale + offsetY
        );
      }
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  }, [strokes, backgroundColor]);

  return (
    <div
      onClick={() => navigate('/drawing')}
      className={`relative w-full rounded-2xl overflow-hidden cursor-pointer group border border-white/10 shadow-lg transition-transform hover:scale-[1.01] ${className}`}
      title="Tap to open shared drawing canvas"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Subtle overlay badge */}
      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-rose-300 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
        <Sparkles className="w-3 h-3 text-rose-400" />
        <span>Live Canvas</span>
      </div>

      {/* Hover / Tap CTA overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-space-950/80 via-transparent to-transparent flex items-end justify-between p-3.5 opacity-80 group-hover:opacity-100 transition-opacity">
        <span className="text-[11px] font-medium text-white flex items-center gap-1">
          <Palette className="w-3.5 h-3.5 text-rose-400" />
          {strokes.length > 0 ? `${strokes.length} strokes` : 'Tap to start doodle'}
        </span>
        <span className="text-[11px] font-semibold text-rose-300 flex items-center gap-0.5">
          Draw <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};
