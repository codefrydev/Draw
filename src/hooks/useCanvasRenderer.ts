import type { PathRecord, DrawingElement, ShapeRecord, TextRecord, ShapeKind, Camera, Point } from '../types/drawing.types';

const HANDLE_SIZE = 8;
const INTERNAL_HIT_TOLERANCE = 8;

function distToSegmentSq(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return (p.x - a.x) ** 2 + (p.y - a.y) ** 2;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return (p.x - (a.x + t * dx)) ** 2 + (p.y - (a.y + t * dy)) ** 2;
}

export function getElementBounds(el: DrawingElement): { x: number; y: number; w: number; h: number } {
  if (el.mode === 'shape') {
    return {
      x: Math.min(el.start.x, el.end.x),
      y: Math.min(el.start.y, el.end.y),
      w: Math.abs(el.end.x - el.start.x),
      h: Math.abs(el.end.y - el.start.y),
    };
  }
  if (el.mode === 'text') {
    const lines = el.text.split('\n');
    const maxLen = lines.reduce((m, l) => Math.max(m, l.length), 0);
    return { x: el.x, y: el.y, w: Math.max(40, maxLen * el.fontSize * 0.6), h: lines.length * el.fontSize * 1.3 };
  }
  // PathRecord
  if (el.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = el.points[0].x, minY = el.points[0].y, maxX = minX, maxY = minY;
  for (const p of el.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function hitTestElement(worldPt: Point, el: DrawingElement, tolerance: number): boolean {
  if (el.mode === 'text') {
    const b = getElementBounds(el);
    return worldPt.x >= b.x - tolerance && worldPt.x <= b.x + b.w + tolerance &&
           worldPt.y >= b.y - tolerance && worldPt.y <= b.y + b.h + tolerance;
  }
  if (el.mode === 'shape') {
    if (el.kind === 'line' || el.kind === 'arrow') {
      const tol = tolerance + el.size / 2;
      return distToSegmentSq(worldPt, el.start, el.end) <= tol * tol;
    }
    const b = getElementBounds(el);
    return worldPt.x >= b.x - tolerance && worldPt.x <= b.x + b.w + tolerance &&
           worldPt.y >= b.y - tolerance && worldPt.y <= b.y + b.h + tolerance;
  }
  // PathRecord
  if (el.points.length === 0) return false;
  const tol = tolerance + el.size / 2;
  const tolSq = tol * tol;
  if (el.points.length === 1) {
    const p = el.points[0];
    return (worldPt.x - p.x) ** 2 + (worldPt.y - p.y) ** 2 <= tolSq;
  }
  for (let i = 1; i < el.points.length; i++) {
    if (distToSegmentSq(worldPt, el.points[i - 1], el.points[i]) <= tolSq) return true;
  }
  return false;
}

export function findElementAt(worldPt: Point, paths: DrawingElement[]): number {
  for (let i = paths.length - 1; i >= 0; i--) {
    if (hitTestElement(worldPt, paths[i], INTERNAL_HIT_TOLERANCE)) return i;
  }
  return -1;
}

export function getHandles(bounds: { x: number; y: number; w: number; h: number }): Point[] {
  const { x, y, w, h } = bounds;
  return [
    { x,           y           }, // 0 TL
    { x: x + w/2,  y           }, // 1 TC
    { x: x + w,    y           }, // 2 TR
    { x: x + w,    y: y + h/2  }, // 3 MR
    { x: x + w,    y: y + h    }, // 4 BR
    { x: x + w/2,  y: y + h    }, // 5 BC
    { x,           y: y + h    }, // 6 BL
    { x,           y: y + h/2  }, // 7 ML
  ];
}

export function hitTestHandle(worldPt: Point, bounds: { x: number; y: number; w: number; h: number }, _camera: Camera, tolerance: number): number {
  const handles = getHandles(bounds);
  for (let i = 0; i < handles.length; i++) {
    const h = handles[i];
    if (Math.hypot(worldPt.x - h.x, worldPt.y - h.y) <= tolerance) return i;
  }
  return -1;
}

export function drawSelectionOverlay(ctx: CanvasRenderingContext2D, el: DrawingElement, camera: Camera): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, camera.x, camera.y);
  ctx.globalCompositeOperation = 'source-over';

  const bounds = getElementBounds(el);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 3]);
  ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
  ctx.setLineDash([]);

  const handles = getHandles(bounds);
  const hs = HANDLE_SIZE;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  for (const h of handles) {
    ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
    ctx.strokeRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
  }
  ctx.restore();
}

export function moveElement(el: DrawingElement, dx: number, dy: number): DrawingElement {
  if (el.mode === 'shape') {
    return { ...el, start: { x: el.start.x + dx, y: el.start.y + dy }, end: { x: el.end.x + dx, y: el.end.y + dy } };
  }
  if (el.mode === 'text') {
    return { ...el, x: el.x + dx, y: el.y + dy };
  }
  return { ...el, points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
}

export function resizeElement(el: DrawingElement, handleIdx: number, dx: number, dy: number): DrawingElement {
  const orig = getElementBounds(el);
  let left   = orig.x;
  let top    = orig.y;
  let right  = orig.x + orig.w;
  let bottom = orig.y + orig.h;

  if (handleIdx === 0) { left  += dx; top    += dy; }
  if (handleIdx === 1) { top   += dy; }
  if (handleIdx === 2) { right += dx; top    += dy; }
  if (handleIdx === 3) { right += dx; }
  if (handleIdx === 4) { right += dx; bottom += dy; }
  if (handleIdx === 5) { bottom += dy; }
  if (handleIdx === 6) { left  += dx; bottom += dy; }
  if (handleIdx === 7) { left  += dx; }

  if (el.mode === 'text') {
    return { ...el, x: left, y: top };
  }
  if (el.mode === 'shape') {
    return { ...el, start: { x: left, y: top }, end: { x: right, y: bottom } };
  }
  // PathRecord: scale all points
  const newX = Math.min(left, right);
  const newY = Math.min(top, bottom);
  const newW = Math.abs(right - left);
  const newH = Math.abs(bottom - top);
  const points = el.points.map(p => ({
    x: orig.w === 0 ? newX + newW / 2 : newX + (p.x - orig.x) / orig.w * newW,
    y: orig.h === 0 ? newY + newH / 2 : newY + (p.y - orig.y) / orig.h * newH,
  }));
  return { ...el, points };
}

export function getPos(
  evt: MouseEvent | TouchEvent,
  canvas: HTMLCanvasElement
): Point {
  const rect = canvas.getBoundingClientRect();
  let clientX: number, clientY: number;

  if ('touches' in evt && evt.touches.length > 0) {
    let sumX = 0, sumY = 0;
    for (let i = 0; i < evt.touches.length; i++) {
      sumX += evt.touches[i].clientX;
      sumY += evt.touches[i].clientY;
    }
    clientX = sumX / evt.touches.length;
    clientY = sumY / evt.touches.length;
  } else {
    const me = evt as MouseEvent;
    clientX = me.clientX;
    clientY = me.clientY;
  }

  return { x: clientX - rect.left, y: clientY - rect.top };
}

function applyShapePath(
  ctx: CanvasRenderingContext2D,
  kind: ShapeKind,
  start: Point,
  end: Point
): void {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);

  ctx.beginPath();
  switch (kind) {
    case 'rectangle':
      ctx.rect(x, y, w, h);
      break;
    case 'circle':
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
      break;
    case 'line':
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      break;
    case 'triangle':
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x, y + h / 2);
      ctx.closePath();
      break;
    case 'arrow': {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const angle = Math.atan2(dy, dx);
      const headLen = Math.max(12, Math.min(30, Math.hypot(dx, dy) * 0.25));
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle - Math.PI / 6),
        end.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle + Math.PI / 6),
        end.y - headLen * Math.sin(angle + Math.PI / 6)
      );
      break;
    }
  }
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeRecord
): void {
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  applyShapePath(ctx, shape.kind, shape.start, shape.end);
  ctx.stroke();
}

export function redraw(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  paths: DrawingElement[],
  camera: Camera
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(camera.x, camera.y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const element of paths) {
    if (element.mode === 'shape') {
      drawShape(ctx, element);
      continue;
    }

    if (element.mode === 'text') {
      const t = element as TextRecord;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = t.color;
      ctx.font = `${t.fontSize}px sans-serif`;
      ctx.textBaseline = 'top';
      t.text.split('\n').forEach((line, i) => {
        ctx.fillText(line, t.x, t.y + i * t.fontSize * 1.3);
      });
      continue;
    }

    const path = element as PathRecord;
    if (path.points.length === 0) continue;
    ctx.beginPath();
    if (path.mode === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = path.color;
    }
    ctx.lineWidth = path.size;
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'source-over';
}

export function drawSegment(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  path: PathRecord,
  camera: Camera
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, camera.x, camera.y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = path.size;
  if (path.mode === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = path.color;
  }
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

export function drawShapePreview(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  kind: ShapeKind,
  color: string,
  size: number,
  camera: Camera
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, camera.x, camera.y);
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  applyShapePath(ctx, kind, start, end);
  ctx.stroke();
  ctx.restore();
}
