import { useReducer, useEffect } from 'react';
import type { DrawingState, DrawingAction, DrawingElement } from '../types/drawing.types';

const STORAGE_KEY = 'sketchpad-history';

function loadFromStorage(): { paths: DrawingElement[]; redoStack: DrawingElement[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { paths: [], redoStack: [] };
    return JSON.parse(raw);
  } catch {
    return { paths: [], redoStack: [] };
  }
}

function makeInitialState(): DrawingState {
  const saved = loadFromStorage();
  return { ...saved, redrawVersion: 0 };
}

function drawingReducer(state: DrawingState, action: DrawingAction): DrawingState {
  switch (action.type) {
    case 'PUSH_PATH':
      return {
        paths: [...state.paths, action.path],
        redoStack: [],
        // bump redrawVersion for non-freehand elements so canvas redraws immediately
        redrawVersion: (action.path.mode === 'text' || action.path.mode === 'shape')
          ? state.redrawVersion + 1
          : state.redrawVersion,
      };
    case 'UNDO': {
      if (state.paths.length === 0) return state;
      const paths = state.paths.slice(0, -1);
      const last = state.paths[state.paths.length - 1];
      return {
        paths,
        redoStack: [...state.redoStack, last],
        redrawVersion: state.redrawVersion + 1,
      };
    }
    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const top = state.redoStack[state.redoStack.length - 1];
      return {
        paths: [...state.paths, top],
        redoStack: state.redoStack.slice(0, -1),
        redrawVersion: state.redrawVersion + 1,
      };
    }
    case 'CLEAR':
      return {
        paths: [],
        redoStack: [],
        redrawVersion: state.redrawVersion + 1,
      };
    case 'LOAD_SKETCH':
      return {
        paths: action.paths,
        redoStack: action.redoStack,
        redrawVersion: state.redrawVersion + 1,
      };
    default:
      return state;
  }
}

export function useDrawingHistory() {
  const [state, dispatch] = useReducer(drawingReducer, undefined, makeInitialState);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ paths: state.paths, redoStack: state.redoStack })
    );
  }, [state.paths, state.redoStack]);

  return { state, dispatch };
}
