import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import type { Tool, PathRecord, Camera, DrawingState } from '../types/drawing.types';
import type { DrawingAction } from '../types/drawing.types';
import { getPos, redraw, drawSegment } from '../hooks/useCanvasRenderer';

export interface CanvasAreaHandle {
  resetCamera: () => void;
  downloadAsPng: () => void;
  getThumbnail: () => string;
}

interface Props {
  historyState: DrawingState;
  dispatch: React.Dispatch<DrawingAction>;
  currentTool: Tool;
  color: string;
  brushSize: number;
  spacePressedRef: React.MutableRefObject<boolean>;
}

export const CanvasArea = forwardRef<CanvasAreaHandle, Props>(function CanvasArea(
  { historyState, dispatch, currentTool, color, brushSize, spacePressedRef },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const cameraRef = useRef<Camera>({ x: 0, y: 0 });
  const currentPathRef = useRef<PathRecord | null>(null);
  const isDrawingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const startDragRef = useRef({ x: 0, y: 0 });
  const pathsRef = useRef<PathRecord[]>([]);

  // Prop-to-ref sync (so stable native handlers don't go stale)
  const currentToolRef = useRef(currentTool);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  useEffect(() => { currentToolRef.current = currentTool; updateCursor(); }, [currentTool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { pathsRef.current = historyState.paths; }, [historyState.paths]);

  useImperativeHandle(ref, () => ({
    resetCamera() {
      cameraRef.current = { x: 0, y: 0 };
      if (containerRef.current) {
        containerRef.current.style.backgroundPosition = '0px 0px';
      }
    },
    downloadAsPng() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const temp = document.createElement('canvas');
      temp.width = canvas.width;
      temp.height = canvas.height;
      const tCtx = temp.getContext('2d')!;
      tCtx.fillStyle = '#ffffff';
      tCtx.fillRect(0, 0, temp.width, temp.height);
      tCtx.drawImage(canvas, 0, 0);
      const link = document.createElement('a');
      link.download = `Sketchpad-${Date.now()}.png`;
      link.href = temp.toDataURL('image/png');
      link.click();
    },
    getThumbnail() {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      const thumb = document.createElement('canvas');
      thumb.width = 240;
      thumb.height = 135;
      const tCtx = thumb.getContext('2d')!;
      tCtx.fillStyle = '#f9fafb';
      tCtx.fillRect(0, 0, 240, 135);
      tCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 240, 135);
      return thumb.toDataURL('image/jpeg', 0.75);
    },
  }));

  function updateCursor() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tool = currentToolRef.current;
    const spacePressed = spacePressedRef.current;
    if (spacePressed || tool === 'pan') {
      canvas.style.cursor = isDraggingRef.current ? 'grabbing' : 'grab';
    } else if (tool === 'eraser') {
      canvas.style.cursor = 'cell';
    } else {
      canvas.style.cursor = 'crosshair';
    }
  }

  // Canvas init
  useEffect(() => {
    const canvas = canvasRef.current!;
    ctxRef.current = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  // Full redraw on history changes (undo/redo/clear)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    redraw(canvas, ctx, pathsRef.current, cameraRef.current);
  }, [historyState.redrawVersion]);

  // Native event listeners (stable, read from refs)
  useEffect(() => {
    const canvas = canvasRef.current!;

    function handleMouseDown(e: MouseEvent) {
      if (e.button !== 0 && e.button !== 1) return;
      if (e.button === 1) e.preventDefault(); // suppress autoscroll

      const pos = getPos(e, canvas);
      const tool = currentToolRef.current;
      const spacePressed = spacePressedRef.current;

      if (tool === 'pan' || e.button === 1 || spacePressed) {
        isDraggingRef.current = true;
        isDrawingRef.current = false;
        currentPathRef.current = null;
        startDragRef.current = { x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y };
        updateCursor();
        return;
      }

      isDrawingRef.current = true;
      currentPathRef.current = {
        mode: tool === 'eraser' ? 'eraser' : 'pen',
        color: colorRef.current,
        size: brushSizeRef.current,
        points: [{ x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y }],
      };
    }

    function handleMouseMove(e: MouseEvent) {
      if (!isDrawingRef.current && !isDraggingRef.current) return;
      const pos = getPos(e, canvas);
      const ctx = ctxRef.current!;

      if (isDraggingRef.current) {
        cameraRef.current = {
          x: pos.x - startDragRef.current.x,
          y: pos.y - startDragRef.current.y,
        };
        if (containerRef.current) {
          containerRef.current.style.backgroundPosition = `${cameraRef.current.x}px ${cameraRef.current.y}px`;
        }
        redraw(canvas, ctx, pathsRef.current, cameraRef.current);
        return;
      }

      if (isDrawingRef.current && currentPathRef.current) {
        const nextPoint = { x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y };
        const pts = currentPathRef.current.points;
        const lastPoint = pts[pts.length - 1];
        pts.push(nextPoint);
        drawSegment(ctx, lastPoint, nextPoint, currentPathRef.current, cameraRef.current);
      }
    }

    function handleMouseUp() {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        updateCursor();
      }
      if (isDrawingRef.current && currentPathRef.current) {
        isDrawingRef.current = false;
        dispatch({ type: 'PUSH_PATH', path: currentPathRef.current });
        currentPathRef.current = null;
      }
    }

    function handleTouchStart(e: TouchEvent) {
      e.preventDefault();
      const pos = getPos(e, canvas);
      const isMultiTouch = e.touches.length >= 2;
      const tool = currentToolRef.current;
      const spacePressed = spacePressedRef.current;

      if (tool === 'pan' || spacePressed || isMultiTouch) {
        isDraggingRef.current = true;
        isDrawingRef.current = false;
        currentPathRef.current = null;
        startDragRef.current = { x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y };
        updateCursor();
        return;
      }

      isDrawingRef.current = true;
      currentPathRef.current = {
        mode: tool === 'eraser' ? 'eraser' : 'pen',
        color: colorRef.current,
        size: brushSizeRef.current,
        points: [{ x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y }],
      };
    }

    function handleTouchMove(e: TouchEvent) {
      e.preventDefault();
      const pos = getPos(e, canvas);
      const ctx = ctxRef.current!;

      if (isDraggingRef.current) {
        cameraRef.current = {
          x: pos.x - startDragRef.current.x,
          y: pos.y - startDragRef.current.y,
        };
        if (containerRef.current) {
          containerRef.current.style.backgroundPosition = `${cameraRef.current.x}px ${cameraRef.current.y}px`;
        }
        redraw(canvas, ctx, pathsRef.current, cameraRef.current);
        return;
      }

      if (isDrawingRef.current && currentPathRef.current) {
        const nextPoint = { x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y };
        const pts = currentPathRef.current.points;
        const lastPoint = pts[pts.length - 1];
        pts.push(nextPoint);
        drawSegment(ctx, lastPoint, nextPoint, currentPathRef.current, cameraRef.current);
      }
    }

    function handleTouchEnd() {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        updateCursor();
      }
      if (isDrawingRef.current && currentPathRef.current) {
        isDrawingRef.current = false;
        dispatch({ type: 'PUSH_PATH', path: currentPathRef.current });
        currentPathRef.current = null;
      }
    }

    function handleResize() {
      const ctx = ctxRef.current;
      if (!ctx) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      redraw(canvas, ctx, pathsRef.current, cameraRef.current);
    }

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);
    window.addEventListener('resize', handleResize);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('resize', handleResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  return (
    <div
      ref={containerRef}
      id="canvas-container"
    >
      <canvas ref={canvasRef} />
    </div>
  );
});
