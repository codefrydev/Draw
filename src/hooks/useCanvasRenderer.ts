import type { PathRecord, Camera, Point } from '../types/drawing.types';

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

export function redraw(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  paths: PathRecord[],
  camera: Camera
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(camera.x, camera.y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const path of paths) {
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
