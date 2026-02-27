import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { replayStroke, redrawAll, getCanvasPos } from '../../utils/drawingUtils';

/**
 * Canvas — dual-layer drawing canvas with real-time collaboration
 *
 * Props:
 *  tool, color, size, fill          — current drawing settings
 *  socket, roomId                   — socket.io instance & room
 *  initialStrokes                   — strokes loaded from server on mount
 *  onStrokeAdded                    — callback when a stroke is committed locally
 */
const Canvas = forwardRef(({ tool, color, size, fill, socket, roomId, initialStrokes = [], onStrokeAdded, readOnly = false }, ref) => {
  const mainRef    = useRef(null);   // finalized strokes
  const previewRef = useRef(null);   // live in-progress drawing

  const strokesRef   = useRef([]);   // master list of all committed strokes
  const isDrawing    = useRef(false);
  const currentStroke = useRef(null); // stroke being built right now

  // Remote users' live previews: userId -> partial stroke
  const remotePreviews = useRef(new Map());

  // CSS-pixel position of the mouse inside the canvas container (for eraser ring)
  const [eraserCursor, setEraserCursor] = useState(null);

  // True once the user double-clicks while eraser is active
  const erasingActive = useRef(false);

  // ─── Expose methods to parent via ref ─────────────────────────────────────
  useImperativeHandle(ref, () => ({
    /**
     * Undo: optimistic local pop (instant feedback) + emit to server.
     * Server removes the same stroke from DB, maintains the shared redo
     * stack, and broadcasts the authoritative boardState to ALL clients.
     */
    undo: () => {
      if (strokesRef.current.length === 0) return;
      // Optimistic local update — feels instant
      strokesRef.current.pop();
      redrawAll(mainRef.current, strokesRef.current);
      // Sync with server (which then broadcasts boardState to everyone else)
      if (socket && roomId) {
        socket.emit('undoStroke', { roomId });
      }
    },
    /**
     * Redo: server owns the redo stack so just emit; boardState response
     * will update the canvas for all clients (including this one).
     */
    redo: () => {
      if (socket && roomId) {
        socket.emit('redoStroke', { roomId });
      }
    },
    clearAll: () => {
      strokesRef.current = [];
      const main = mainRef.current;
      if (main) {
        const ctx = main.getContext('2d');
        ctx.clearRect(0, 0, main.width, main.height);
      }
    },
    loadStrokes: (strokes) => {
      strokesRef.current = [...strokes];
      redrawAll(mainRef.current, strokesRef.current);
    },
  // Recreate handle whenever socket or roomId changes so undo/redo always
  // reference the current connection.
  }), [socket, roomId]);

  // ─── Resize canvas to fill its container ──────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const main    = mainRef.current;
      const preview = previewRef.current;
      if (!main || !preview) return;
      const container = main.parentElement;
      const w = container.offsetWidth;
      const h = container.offsetHeight;

      // Save current main canvas content
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width  = main.width;
      tempCanvas.height = main.height;
      tempCanvas.getContext('2d').drawImage(main, 0, 0);

      main.width    = w;
      main.height   = h;
      preview.width  = w;
      preview.height = h;

      // Replay strokes (restores content after resize)
      redrawAll(main, strokesRef.current);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ─── Load initial strokes from server ─────────────────────────────────────
  useEffect(() => {
    if (initialStrokes.length > 0) {
      strokesRef.current = [...initialStrokes];
      redrawAll(mainRef.current, strokesRef.current);
    }
  }, [initialStrokes]);

  // ─── Socket event listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Receive board state (on join)
    const onBoardState = (strokes) => {
      strokesRef.current = [...strokes];
      redrawAll(mainRef.current, strokesRef.current);
    };

    // Receive a live preview stroke from another user
    const onRemoteDrawing = (stroke) => {
      if (!stroke?.userId) return;
      remotePreviews.current.set(stroke.userId, stroke);
      drawPreviewCanvas();
    };

    // Receive a committed stroke from another user
    const onRemoteDraw = (stroke) => {
      if (!stroke) return;
      strokesRef.current.push(stroke);
      redrawAll(mainRef.current, strokesRef.current);
      // Remove live preview for that user
      if (stroke.userId) {
        remotePreviews.current.delete(stroke.userId);
        drawPreviewCanvas();
      }
    };

    // Clear board from another user
    const onClearBoard = () => {
      strokesRef.current = [];
      const main = mainRef.current;
      if (main) {
        const ctx = main.getContext('2d');
        ctx.clearRect(0, 0, main.width, main.height);
      }
    };

    // Erase data from another user (not used in this implementation — handled via strokes)
    const onErase = (eraseData) => {
      strokesRef.current.push({ ...eraseData, tool: 'eraser' });
      redrawAll(mainRef.current, strokesRef.current);
    };

    socket.on('boardState', onBoardState);
    socket.on('drawing',    onRemoteDrawing);
    socket.on('draw',       onRemoteDraw);
    socket.on('clearBoard', onClearBoard);
    socket.on('erase',      onErase);

    return () => {
      socket.off('boardState', onBoardState);
      socket.off('drawing',    onRemoteDrawing);
      socket.off('draw',       onRemoteDraw);
      socket.off('clearBoard', onClearBoard);
      socket.off('erase',      onErase);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // ─── Real-time erase helpers (draw directly on main canvas) ───────────────
  const eraseAt = useCallback((x, y) => {
    const main = mainRef.current;
    if (!main) return;
    const ctx = main.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [size]);

  const eraseLineTo = useCallback((from, to) => {
    const main = mainRef.current;
    if (!main) return;
    const ctx = main.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }, [size]);

  // ─── Redraw preview canvas (local + remote live strokes) ──────────────────
  const drawPreviewCanvas = useCallback(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, preview.width, preview.height);

    // Draw all remote live previews
    remotePreviews.current.forEach((stroke) => {
      replayStroke(ctx, stroke);
    });

    // Draw local in-progress stroke
    if (currentStroke.current) {
      replayStroke(ctx, currentStroke.current);
    }
  }, []);

  // ─── Mouse / touch helpers ────────────────────────────────────────────────
  const getPos = useCallback((e) => {
    const canvas = e.target.closest('canvas') || previewRef.current;
    if (e.touches) {
      const touch = e.touches[0];
      const fake  = { clientX: touch.clientX, clientY: touch.clientY };
      return getCanvasPos(fake, previewRef.current);
    }
    return getCanvasPos(e, previewRef.current);
  }, []);

  const startStroke = useCallback((pos) => {
    isDrawing.current = true;
    const base = { tool, color, size, fill };

    if (tool === 'pencil' || tool === 'eraser') {
      currentStroke.current = { ...base, points: [pos] };
    } else if (tool === 'line') {
      currentStroke.current = { ...base, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
    } else if (tool === 'rect') {
      currentStroke.current = { ...base, x: pos.x, y: pos.y, w: 0, h: 0, _startX: pos.x, _startY: pos.y };
    } else if (tool === 'circle') {
      currentStroke.current = { ...base, cx: pos.x, cy: pos.y, rx: 0, ry: 0, _startX: pos.x, _startY: pos.y };
    }
  }, [tool, color, size, fill]);

  const continueStroke = useCallback((pos) => {
    if (!isDrawing.current || !currentStroke.current) return;
    const s = currentStroke.current;

    if (tool === 'pencil' || tool === 'eraser') {
      s.points.push(pos);
    } else if (tool === 'line') {
      s.x2 = pos.x;
      s.y2 = pos.y;
    } else if (tool === 'rect') {
      s.x = Math.min(pos.x, s._startX);
      s.y = Math.min(pos.y, s._startY);
      s.w = Math.abs(pos.x - s._startX);
      s.h = Math.abs(pos.y - s._startY);
    } else if (tool === 'circle') {
      s.rx = Math.abs(pos.x - s._startX) / 2;
      s.ry = Math.abs(pos.y - s._startY) / 2;
      s.cx = (pos.x + s._startX) / 2;
      s.cy = (pos.y + s._startY) / 2;
    }

    drawPreviewCanvas();

    // Emit live preview (throttled by mousemove frequency)
    if (socket && roomId) {
      socket.emit('drawing', { roomId, stroke: { ...currentStroke.current, userId: socket.id } });
    }
  }, [tool, drawPreviewCanvas, socket, roomId]);

  const commitStroke = useCallback(() => {
    if (!isDrawing.current || !currentStroke.current) return;
    isDrawing.current = false;

    const s = { ...currentStroke.current };
    // Remove internal helper keys
    delete s._startX;
    delete s._startY;

    // Skip trivially empty strokes
    const isEmpty =
      (s.tool === 'pencil' || s.tool === 'eraser') && (!s.points || s.points.length === 0)
      || (s.tool === 'rect'   && (!s.w || !s.h))
      || (s.tool === 'circle' && (!s.rx || !s.ry))
      || (s.tool === 'line'   && s.x1 === s.x2 && s.y1 === s.y2);

    if (!isEmpty) {
      strokesRef.current.push(s);
      redrawAll(mainRef.current, strokesRef.current);
      if (socket && roomId) {
        socket.emit('draw', { roomId, stroke: s });
      }
      if (onStrokeAdded) onStrokeAdded(s);
    }

    currentStroke.current = null;
    // Clear preview canvas
    const preview = previewRef.current;
    if (preview) {
      const ctx = preview.getContext('2d');
      ctx.clearRect(0, 0, preview.width, preview.height);
    }
    // Redraw remote previews (without local stroke)
    remotePreviews.current.forEach((stroke) => {
      replayStroke(preview?.getContext('2d'), stroke);
    });
  }, [socket, roomId, onStrokeAdded]);

  // ─── Mouse events ─────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    if (tool === 'eraser') return; // eraser starts on double-click
    startStroke(getPos(e));
  }, [startStroke, getPos, tool]);

  const onDoubleClick = useCallback((e) => {
    if (tool !== 'eraser') return;
    e.preventDefault();
    erasingActive.current = true;
    const pos = getPos(e);
    startStroke(pos);
    eraseAt(pos.x, pos.y);
  }, [tool, getPos, startStroke, eraseAt]);

  const onMouseMove = useCallback((e) => {
    // Always track CSS pixel position so the eraser ring follows the cursor
    if (tool === 'eraser') {
      const canvas = previewRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setEraserCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      // Only erase if double-click was used to activate
      if (erasingActive.current && isDrawing.current) {
        const pts  = currentStroke.current?.points;
        const prev = pts?.[pts.length - 1];
        continueStroke(getPos(e));
        const pos = getPos(e);
        if (prev) eraseLineTo(prev, pos);
        else eraseAt(pos.x, pos.y);
      }
      return;
    }

    if (!isDrawing.current) return;
    continueStroke(getPos(e));
  }, [continueStroke, getPos, tool, eraseAt, eraseLineTo]);

  const onMouseUp = useCallback(() => {
    if (tool === 'eraser') {
      if (erasingActive.current) { erasingActive.current = false; commitStroke(); }
      return;
    }
    commitStroke();
  }, [commitStroke, tool]);

  const onMouseLeave = useCallback(() => {
    setEraserCursor(null);
    if (tool === 'eraser' && erasingActive.current) {
      erasingActive.current = false;
      commitStroke();
      return;
    }
    if (isDrawing.current) commitStroke();
  }, [commitStroke, tool]);

  // Touch events
  const onTouchStart = useCallback((e) => {
    e.preventDefault();
    if (tool === 'eraser') {
      // treat first tap as double-click for touch users
      erasingActive.current = true;
      const pos = getPos(e);
      startStroke(pos);
      eraseAt(pos.x, pos.y);
      return;
    }
    startStroke(getPos(e));
  }, [startStroke, getPos, tool, eraseAt]);
  const onTouchMove  = useCallback((e) => {
    e.preventDefault();
    if (tool === 'eraser' && e.touches[0]) {
      const canvas = previewRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setEraserCursor({
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        });
      }
      if (erasingActive.current && isDrawing.current) {
        const pts  = currentStroke.current?.points;
        const prev = pts?.[pts.length - 1];
        const pos  = getPos(e);
        continueStroke(pos);
        if (prev) eraseLineTo(prev, pos);
        else eraseAt(pos.x, pos.y);
      }
      return;
    }
    continueStroke(getPos(e));
  }, [continueStroke, getPos, tool, eraseAt, eraseLineTo]);
  const onTouchEnd = useCallback(() => {
    setEraserCursor(null);
    if (tool === 'eraser') erasingActive.current = false;
    commitStroke();
  }, [commitStroke, tool]);

  // Cursor style — hide native cursor when eraser is active (we render our own ring)
  const getCursor = () => {
    if (tool === 'eraser') return 'none';
    if (tool === 'text')   return 'text';
    return 'crosshair';
  };

  return (
    <div className="relative w-full h-full bg-white overflow-hidden rounded-none" style={{ cursor: getCursor() }}>
      {/* Main canvas — committed strokes */}
      <canvas
        ref={mainRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />
      {/* Preview canvas — in-progress stroke */}
      <canvas
        ref={previewRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none', pointerEvents: readOnly ? 'none' : 'auto' }}
        onMouseDown={readOnly ? undefined : onMouseDown}
        onMouseMove={readOnly ? undefined : onMouseMove}
        onMouseUp={readOnly ? undefined : onMouseUp}
        onMouseLeave={readOnly ? undefined : onMouseLeave}
        onDoubleClick={readOnly ? undefined : onDoubleClick}
        onTouchStart={readOnly ? undefined : onTouchStart}
        onTouchMove={readOnly ? undefined : onTouchMove}
        onTouchEnd={readOnly ? undefined : onTouchEnd}
      />
      {/* Viewer-mode overlay badge */}
      {readOnly && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5
                        bg-amber-50 border border-amber-200 rounded-xl shadow pointer-events-none">
          <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          <span className="text-xs font-semibold text-amber-700">View only — Host controls the board</span>
        </div>
      )}
      {/* Eraser cursor ring — visible indicator showing eraser size & position */}
      {tool === 'eraser' && eraserCursor && (
        <div
          className="absolute pointer-events-none rounded-full border-2 border-slate-500"
          style={{
            width:  size,
            height: size,
            left:   eraserCursor.x - size / 2,
            top:    eraserCursor.y - size / 2,
            background: 'rgba(255,255,255,0.35)',
            boxShadow:  '0 0 0 1px rgba(0,0,0,0.15)',
          }}
        />
      )}
    </div>
  );
});

Canvas.displayName = 'Canvas';
export default Canvas;
