import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import type { Tool, PathRecord, Camera, DrawingState, Point, ShapeKind, DrawingElement } from '../types/drawing.types';
import type { DrawingAction } from '../types/drawing.types';
import {
  getPos, redraw, drawSegment, drawShapePreview,
  findElementAt, hitTestElement, hitTestHandle, getElementBounds,
  drawSelectionOverlay, moveElement, resizeElement,
} from '../hooks/useCanvasRenderer';

const HANDLE_CURSORS: readonly string[] = [
  'nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize',
  'nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize',
];
const HIT_TOLERANCE    = 8;
const HANDLE_TOLERANCE = 8;

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

const SHAPE_TOOLS = new Set<Tool>(['rectangle', 'circle', 'line', 'triangle', 'diamond', 'arrow']);

interface TextInputState {
  screenX: number;
  screenY: number;
  worldX: number;
  worldY: number;
  value: string;
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
  const pathsRef = useRef(historyState.paths);

  // Shape drawing state
  const isDrawingShapeRef = useRef(false);
  const shapeStartRef = useRef<Point | null>(null);

  // Select tool state
  const selectedIndexRef          = useRef<number>(-1);
  const selectDragModeRef         = useRef<'move' | number | null>(null);
  const selectDragStartWorldRef   = useRef<Point | null>(null);
  const selectDragOrigElementRef  = useRef<DrawingElement | null>(null);

  // Text tool state
  const [textInput, setTextInput] = useState<TextInputState | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Prop-to-ref sync (so stable native handlers don't go stale)
  const currentToolRef = useRef(currentTool);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  useEffect(() => {
    currentToolRef.current = currentTool;
    updateCursor();
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    if (currentTool !== 'select') {
      selectedIndexRef.current = -1;
      selectDragModeRef.current = null;
      selectDragStartWorldRef.current = null;
      selectDragOrigElementRef.current = null;
      redraw(canvas, ctx, pathsRef.current, cameraRef.current);
    } else {
      redraw(canvas, ctx, pathsRef.current, cameraRef.current);
      const idx = selectedIndexRef.current;
      if (idx >= 0 && idx < pathsRef.current.length) {
        drawSelectionOverlay(ctx, pathsRef.current[idx], cameraRef.current);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { pathsRef.current = historyState.paths; }, [historyState.paths]);

  const commitText = useCallback((state: TextInputState) => {
    if (!state.value.trim()) { setTextInput(null); return; }
    const fontSize = Math.max(12, brushSizeRef.current * 2.5);
    dispatch({
      type: 'PUSH_PATH',
      path: { mode: 'text', text: state.value, x: state.worldX, y: state.worldY, color: colorRef.current, fontSize },
    });
    setTextInput(null);
  }, [dispatch]);

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

  function updateCursor(hoverHandleIdx?: number, isHoveringElement?: boolean) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tool = currentToolRef.current;
    const spacePressed = spacePressedRef.current;
    if (spacePressed || tool === 'pan') {
      canvas.style.cursor = isDraggingRef.current ? 'grabbing' : 'grab';
    } else if (tool === 'eraser') {
      canvas.style.cursor = 'cell';
    } else if (tool === 'select') {
      if (hoverHandleIdx !== undefined && hoverHandleIdx >= 0) {
        canvas.style.cursor = HANDLE_CURSORS[hoverHandleIdx];
      } else if (isHoveringElement) {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'default';
      }
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

  // Full redraw on history changes (undo/redo/clear/remove)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    selectedIndexRef.current = -1;
    selectDragModeRef.current = null;
    selectDragStartWorldRef.current = null;
    selectDragOrigElementRef.current = null;
    redraw(canvas, ctx, pathsRef.current, cameraRef.current);
  }, [historyState.redrawVersion]);

  // Delete/Backspace removes selected element
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (currentToolRef.current !== 'select') return;
      if (selectedIndexRef.current < 0) return;
      const active = document.activeElement;
      if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) return;
      e.preventDefault();
      const idx = selectedIndexRef.current;
      selectedIndexRef.current = -1;
      selectDragModeRef.current = null;
      selectDragStartWorldRef.current = null;
      selectDragOrigElementRef.current = null;
      dispatch({ type: 'REMOVE_ELEMENT', index: idx });
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  // Native event listeners (stable, read from refs)
  useEffect(() => {
    const canvas = canvasRef.current!;

    function handleMouseDown(e: MouseEvent) {
      if (e.button !== 0 && e.button !== 1) return;
      if (e.button === 1) e.preventDefault();

      const pos = getPos(e, canvas);
      const tool = currentToolRef.current;
      const spacePressed = spacePressedRef.current;

      if (tool === 'pan' || e.button === 1 || spacePressed) {
        isDraggingRef.current = true;
        isDrawingRef.current = false;
        isDrawingShapeRef.current = false;
        currentPathRef.current = null;
        shapeStartRef.current = null;
        startDragRef.current = { x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y };
        updateCursor();
        return;
      }

      if (tool === 'text') return; // handled by React onClick

      if (tool === 'select') {
        const worldPt = { x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y };
        const ctx = ctxRef.current;
        const currentIdx = selectedIndexRef.current;
        if (currentIdx >= 0 && currentIdx < pathsRef.current.length) {
          const el = pathsRef.current[currentIdx];
          const bounds = getElementBounds(el);
          const handleIdx = hitTestHandle(worldPt, bounds, cameraRef.current, HANDLE_TOLERANCE);
          if (handleIdx >= 0) {
            selectDragModeRef.current = handleIdx;
            selectDragStartWorldRef.current = worldPt;
            selectDragOrigElementRef.current = el;
            return;
          }
          if (hitTestElement(worldPt, el, HIT_TOLERANCE)) {
            selectDragModeRef.current = 'move';
            selectDragStartWorldRef.current = worldPt;
            selectDragOrigElementRef.current = el;
            return;
          }
        }
        const newIdx = findElementAt(worldPt, pathsRef.current);
        if (newIdx >= 0) {
          selectedIndexRef.current = newIdx;
          selectDragModeRef.current = 'move';
          selectDragStartWorldRef.current = worldPt;
          selectDragOrigElementRef.current = pathsRef.current[newIdx];
          if (ctx) {
            redraw(canvas, ctx, pathsRef.current, cameraRef.current);
            drawSelectionOverlay(ctx, pathsRef.current[newIdx], cameraRef.current);
          }
          return;
        }
        if (selectedIndexRef.current >= 0) {
          selectedIndexRef.current = -1;
          selectDragModeRef.current = null;
          if (ctx) redraw(canvas, ctx, pathsRef.current, cameraRef.current);
        }
        return;
      }

      if (SHAPE_TOOLS.has(tool)) {
        isDrawingShapeRef.current = true;
        isDrawingRef.current = false;
        shapeStartRef.current = { x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y };
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
      const moveTool = currentToolRef.current;

      if (moveTool === 'select') {
        const pos = getPos(e, canvas);
        const worldPt = { x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y };
        const ctx = ctxRef.current!;

        if (selectDragModeRef.current !== null && selectDragStartWorldRef.current && selectDragOrigElementRef.current) {
          const dx = worldPt.x - selectDragStartWorldRef.current.x;
          const dy = worldPt.y - selectDragStartWorldRef.current.y;
          const origEl = selectDragOrigElementRef.current;
          const idx = selectedIndexRef.current;
          const modifiedEl = selectDragModeRef.current === 'move'
            ? moveElement(origEl, dx, dy)
            : resizeElement(origEl, selectDragModeRef.current as number, dx, dy);
          const previewPaths = [
            ...pathsRef.current.slice(0, idx),
            modifiedEl,
            ...pathsRef.current.slice(idx + 1),
          ];
          redraw(canvas, ctx, previewPaths, cameraRef.current);
          drawSelectionOverlay(ctx, modifiedEl, cameraRef.current);
        } else {
          const idx = selectedIndexRef.current;
          if (idx >= 0 && idx < pathsRef.current.length) {
            const el = pathsRef.current[idx];
            const bounds = getElementBounds(el);
            const handleIdx = hitTestHandle(worldPt, bounds, cameraRef.current, HANDLE_TOLERANCE);
            if (handleIdx >= 0) { updateCursor(handleIdx); return; }
            if (hitTestElement(worldPt, el, HIT_TOLERANCE)) { updateCursor(undefined, true); return; }
          }
          updateCursor();
        }
        return;
      }

      if (!isDrawingRef.current && !isDraggingRef.current && !isDrawingShapeRef.current) return;
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

      if (isDrawingShapeRef.current && shapeStartRef.current) {
        const endPoint = { x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y };
        redraw(canvas, ctx, pathsRef.current, cameraRef.current);
        drawShapePreview(
          ctx,
          shapeStartRef.current,
          endPoint,
          currentToolRef.current as ShapeKind,
          colorRef.current,
          brushSizeRef.current,
          cameraRef.current
        );
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

    function handleMouseUp(e: MouseEvent) {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        updateCursor();
      }

      if (currentToolRef.current === 'select' && selectDragModeRef.current !== null) {
        const dragMode = selectDragModeRef.current;
        const startWorld = selectDragStartWorldRef.current;
        const origEl = selectDragOrigElementRef.current;
        const idx = selectedIndexRef.current;
        selectDragModeRef.current = null;
        selectDragStartWorldRef.current = null;
        selectDragOrigElementRef.current = null;
        if (startWorld && origEl && idx >= 0 && idx < pathsRef.current.length) {
          const pos2 = getPos(e, canvas);
          const worldPt = { x: pos2.x - cameraRef.current.x, y: pos2.y - cameraRef.current.y };
          const dx = worldPt.x - startWorld.x;
          const dy = worldPt.y - startWorld.y;
          if (dx !== 0 || dy !== 0) {
            const finalEl = dragMode === 'move'
              ? moveElement(origEl, dx, dy)
              : resizeElement(origEl, dragMode as number, dx, dy);
            const finalPaths = [...pathsRef.current.slice(0, idx), finalEl, ...pathsRef.current.slice(idx + 1)];
            dispatch({ type: 'UPDATE_ELEMENT', index: idx, element: finalEl });
            pathsRef.current = finalPaths;
            const c = canvasRef.current, x = ctxRef.current;
            if (c && x) { redraw(c, x, finalPaths, cameraRef.current); drawSelectionOverlay(x, finalEl, cameraRef.current); }
          } else {
            const c = canvasRef.current, x = ctxRef.current;
            if (c && x) {
              redraw(c, x, pathsRef.current, cameraRef.current);
              if (selectedIndexRef.current >= 0) drawSelectionOverlay(x, pathsRef.current[selectedIndexRef.current], cameraRef.current);
            }
          }
        }
        return;
      }

      if (isDrawingShapeRef.current && shapeStartRef.current) {
        isDrawingShapeRef.current = false;
        const canvas2 = canvasRef.current;
        if (canvas2) {
          const pos = getPos(e, canvas2);
          const endPoint = { x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y };
          dispatch({
            type: 'PUSH_PATH',
            path: {
              mode: 'shape',
              kind: currentToolRef.current as ShapeKind,
              color: colorRef.current,
              size: brushSizeRef.current,
              start: shapeStartRef.current,
              end: endPoint,
            },
          });
        }
        shapeStartRef.current = null;
        return;
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
        isDrawingShapeRef.current = false;
        currentPathRef.current = null;
        shapeStartRef.current = null;
        startDragRef.current = { x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y };
        updateCursor();
        return;
      }

      if (tool === 'text') return; // handled by React onClick

      if (tool === 'select') {
        const worldPt = { x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y };
        const ctx = ctxRef.current;
        const currentIdx = selectedIndexRef.current;
        if (currentIdx >= 0 && currentIdx < pathsRef.current.length) {
          const el = pathsRef.current[currentIdx];
          const bounds = getElementBounds(el);
          const handleIdx = hitTestHandle(worldPt, bounds, cameraRef.current, HANDLE_TOLERANCE);
          if (handleIdx >= 0) {
            selectDragModeRef.current = handleIdx;
            selectDragStartWorldRef.current = worldPt;
            selectDragOrigElementRef.current = el;
            return;
          }
          if (hitTestElement(worldPt, el, HIT_TOLERANCE)) {
            selectDragModeRef.current = 'move';
            selectDragStartWorldRef.current = worldPt;
            selectDragOrigElementRef.current = el;
            return;
          }
        }
        const newIdx = findElementAt(worldPt, pathsRef.current);
        if (newIdx >= 0) {
          selectedIndexRef.current = newIdx;
          selectDragModeRef.current = 'move';
          selectDragStartWorldRef.current = worldPt;
          selectDragOrigElementRef.current = pathsRef.current[newIdx];
          if (ctx) { redraw(canvas, ctx, pathsRef.current, cameraRef.current); drawSelectionOverlay(ctx, pathsRef.current[newIdx], cameraRef.current); }
          return;
        }
        if (selectedIndexRef.current >= 0) {
          selectedIndexRef.current = -1;
          selectDragModeRef.current = null;
          if (ctx) redraw(canvas, ctx, pathsRef.current, cameraRef.current);
        }
        return;
      }

      if (SHAPE_TOOLS.has(tool)) {
        isDrawingShapeRef.current = true;
        isDrawingRef.current = false;
        shapeStartRef.current = { x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y };
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
      const moveTool = currentToolRef.current;

      if (moveTool === 'select') {
        const pos = getPos(e, canvas);
        const worldPt = { x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y };
        const ctx = ctxRef.current!;
        if (selectDragModeRef.current !== null && selectDragStartWorldRef.current && selectDragOrigElementRef.current) {
          const dx = worldPt.x - selectDragStartWorldRef.current.x;
          const dy = worldPt.y - selectDragStartWorldRef.current.y;
          const origEl = selectDragOrigElementRef.current;
          const idx = selectedIndexRef.current;
          const modifiedEl = selectDragModeRef.current === 'move'
            ? moveElement(origEl, dx, dy)
            : resizeElement(origEl, selectDragModeRef.current as number, dx, dy);
          const previewPaths = [...pathsRef.current.slice(0, idx), modifiedEl, ...pathsRef.current.slice(idx + 1)];
          redraw(canvas, ctx, previewPaths, cameraRef.current);
          drawSelectionOverlay(ctx, modifiedEl, cameraRef.current);
        }
        return;
      }

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

      if (isDrawingShapeRef.current && shapeStartRef.current) {
        const endPoint = { x: pos.x - cameraRef.current.x, y: pos.y - cameraRef.current.y };
        redraw(canvas, ctx, pathsRef.current, cameraRef.current);
        drawShapePreview(
          ctx,
          shapeStartRef.current,
          endPoint,
          currentToolRef.current as ShapeKind,
          colorRef.current,
          brushSizeRef.current,
          cameraRef.current
        );
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

    function handleTouchEnd(e: TouchEvent) {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        updateCursor();
      }

      if (currentToolRef.current === 'select' && selectDragModeRef.current !== null) {
        const dragMode = selectDragModeRef.current;
        const startWorld = selectDragStartWorldRef.current;
        const origEl = selectDragOrigElementRef.current;
        const idx = selectedIndexRef.current;
        selectDragModeRef.current = null;
        selectDragStartWorldRef.current = null;
        selectDragOrigElementRef.current = null;
        if (startWorld && origEl && idx >= 0 && idx < pathsRef.current.length && e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          const rect = canvas.getBoundingClientRect();
          const worldPt = { x: touch.clientX - rect.left - cameraRef.current.x, y: touch.clientY - rect.top - cameraRef.current.y };
          const dx = worldPt.x - startWorld.x;
          const dy = worldPt.y - startWorld.y;
          if (dx !== 0 || dy !== 0) {
            const finalEl = dragMode === 'move'
              ? moveElement(origEl, dx, dy)
              : resizeElement(origEl, dragMode as number, dx, dy);
            const finalPaths = [...pathsRef.current.slice(0, idx), finalEl, ...pathsRef.current.slice(idx + 1)];
            dispatch({ type: 'UPDATE_ELEMENT', index: idx, element: finalEl });
            pathsRef.current = finalPaths;
            const c = canvasRef.current, x = ctxRef.current;
            if (c && x) { redraw(c, x, finalPaths, cameraRef.current); drawSelectionOverlay(x, finalEl, cameraRef.current); }
          }
        }
        return;
      }

      if (isDrawingShapeRef.current && shapeStartRef.current) {
        isDrawingShapeRef.current = false;
        const canvas2 = canvasRef.current;
        if (canvas2 && e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          const rect = canvas2.getBoundingClientRect();
          const endPoint = {
            x: touch.clientX - rect.left - cameraRef.current.x,
            y: touch.clientY - rect.top - cameraRef.current.y,
          };
          dispatch({
            type: 'PUSH_PATH',
            path: {
              mode: 'shape',
              kind: currentToolRef.current as ShapeKind,
              color: colorRef.current,
              size: brushSizeRef.current,
              start: shapeStartRef.current,
              end: endPoint,
            },
          });
        }
        shapeStartRef.current = null;
        return;
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
      onClick={(e) => {
        if (currentToolRef.current !== 'text') return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        setTextInput({
          screenX: e.clientX - rect.left,
          screenY: e.clientY - rect.top,
          worldX: e.clientX - rect.left - cameraRef.current.x,
          worldY: e.clientY - rect.top - cameraRef.current.y,
          value: '',
        });
      }}
    >
      <canvas ref={canvasRef} />
      {textInput && (
        <textarea
          ref={textareaRef}
          autoFocus
          rows={1}
          value={textInput.value}
          style={{
            position: 'absolute',
            left: textInput.screenX,
            top: textInput.screenY,
            font: `${Math.max(12, brushSize * 2.5)}px sans-serif`,
            color: color,
            background: 'transparent',
            border: '1.5px dashed rgba(59,130,246,0.6)',
            borderRadius: 2,
            outline: 'none',
            resize: 'none',
            minWidth: 80,
            padding: '2px 4px',
            lineHeight: 1.3,
            overflow: 'hidden',
            whiteSpace: 'pre',
            zIndex: 20,
          }}
          onChange={e => {
            const v = e.target.value;
            setTextInput(prev => prev ? { ...prev, value: v } : null);
            const el = e.target;
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
            el.style.width = 'auto';
            el.style.width = `${Math.max(80, el.scrollWidth)}px`;
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') { setTextInput(null); return; }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commitText(textInput);
            }
          }}
          onBlur={() => commitText(textInput)}
        />
      )}
    </div>
  );
});
