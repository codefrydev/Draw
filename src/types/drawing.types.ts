export type Tool = 'pen' | 'eraser' | 'pan';

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

export interface Camera {
  x: number;
  y: number;
}

export interface DrawingState {
  paths: PathRecord[];
  redoStack: PathRecord[];
  redrawVersion: number;
}

export type DrawingAction =
  | { type: 'PUSH_PATH'; path: PathRecord }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR' }
  | { type: 'LOAD_SKETCH'; paths: PathRecord[]; redoStack: PathRecord[] };

export interface Sketch {
  id: string;
  timestamp: number;
  paths: PathRecord[];
  redoStack: PathRecord[];
  thumbnail: string;
}
