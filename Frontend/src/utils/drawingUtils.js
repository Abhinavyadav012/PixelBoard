/**
 * Drawing utilities — shared functions used by Canvas.jsx
 */

/**
 * Replay a single stroke onto a 2D canvas context
 */
export const replayStroke = (ctx, stroke) => {
  if (!stroke || !stroke.tool) return;
  ctx.save();
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  switch (stroke.tool) {
    case 'pencil': {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color || '#000';
      ctx.lineWidth   = stroke.size  || 3;
      const pts = stroke.points || [];
      if (pts.length === 0) break;
      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, (stroke.size || 3) / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color || '#000';
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
      break;
    }

    case 'eraser': {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth   = stroke.size || 20;
      const pts = stroke.points || [];
      if (pts.length === 0) break;
      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, (stroke.size || 20) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
      break;
    }

    case 'line': {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color || '#000';
      ctx.lineWidth   = stroke.size  || 3;
      ctx.beginPath();
      ctx.moveTo(stroke.x1, stroke.y1);
      ctx.lineTo(stroke.x2, stroke.y2);
      ctx.stroke();
      break;
    }

    case 'rect': {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color || '#000';
      ctx.lineWidth   = stroke.size  || 3;
      if (stroke.fill) {
        ctx.fillStyle = stroke.color || '#000';
        ctx.fillRect(stroke.x, stroke.y, stroke.w, stroke.h);
      } else {
        ctx.strokeRect(stroke.x, stroke.y, stroke.w, stroke.h);
      }
      break;
    }

    case 'circle': {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color || '#000';
      ctx.lineWidth   = stroke.size  || 3;
      ctx.beginPath();
      ctx.ellipse(stroke.cx, stroke.cy, Math.abs(stroke.rx) || 1, Math.abs(stroke.ry) || 1, 0, 0, Math.PI * 2);
      if (stroke.fill) {
        ctx.fillStyle = stroke.color || '#000';
        ctx.fill();
      } else {
        ctx.stroke();
      }
      break;
    }

    case 'text': {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = stroke.color || '#000';
      ctx.font = `${stroke.size * 6 || 18}px Inter, sans-serif`;
      ctx.fillText(stroke.text || '', stroke.x, stroke.y);
      break;
    }

    default:
      break;
  }

  ctx.restore();
};

/**
 * Redraw all strokes onto a canvas from scratch
 */
export const redrawAll = (canvas, strokes) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  strokes.forEach((s) => replayStroke(ctx, s));
};

/**
 * Get cursor position relative to canvas, accounting for device pixel ratio
 */
export const getCanvasPos = (e, canvas) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top)  * scaleY,
  };
};
