import type { PathRecord, DrawingElement, ShapeRecord, TextRecord, ShapeKind, Camera, Point } from '../types/drawing.types';

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
