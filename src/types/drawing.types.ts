export type ShapeKind = 'rectangle' | 'circle' | 'line' | 'triangle' | 'diamond' | 'arrow';

export type Tool = 'pen' | 'eraser' | 'pan' | 'text' | ShapeKind;

export interface Point {
  x: number;
  y: number;
}

export interface PathRecord {
  mode: 'pen' | 'eraser';
  color: string;
  size: number;
  points: Point[];
}

export interface ShapeRecord {
  mode: 'shape';
  kind: ShapeKind;
  color: string;
  size: number;
  start: Point;
  end: Point;
}

export interface TextRecord {
  mode: 'text';
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

export type DrawingElement = PathRecord | ShapeRecord | TextRecord;

export interface Camera {
  x: number;
  y: number;
}

export interface DrawingState {
  paths: DrawingElement[];
  redoStack: DrawingElement[];
  redrawVersion: number;
}

export type DrawingAction =
  | { type: 'PUSH_PATH'; path: DrawingElement }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR' }
  | { type: 'LOAD_SKETCH'; paths: DrawingElement[]; redoStack: DrawingElement[] };

export interface Sketch {
  id: string;
  timestamp: number;
  paths: DrawingElement[];
  redoStack: DrawingElement[];
  thumbnail: string;
}
