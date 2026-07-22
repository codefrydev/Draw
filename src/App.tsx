import { useState, useCallback, useRef } from 'react';
import { CanvasArea, type CanvasAreaHandle } from './components/CanvasArea';
import { Toolbar } from './components/Toolbar';
import { SketchHistoryPanel } from './components/SketchHistoryPanel';
import { useDrawingHistory } from './hooks/useDrawingHistory';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { Tool, Sketch } from './types/drawing.types';

const SKETCHES_KEY = 'sketchpad-sketches';

function loadSketches(): Sketch[] {
  try {
    const raw = localStorage.getItem(SKETCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function App() {
  const { state: historyState, dispatch } = useDrawingHistory();
  const [currentTool, setCurrentTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#0f172a');
  const [brushSize, setBrushSize] = useState(4);
  const [showHistory, setShowHistory] = useState(false);
  const [sketches, setSketches] = useState<Sketch[]>(loadSketches);

  const canvasAreaRef = useRef<CanvasAreaHandle>(null);
  const spacePressedRef = useRef(false);

  const handleUndo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch]);
  const handleRedo = useCallback(() => dispatch({ type: 'REDO' }), [dispatch]);
  const handleSpaceDown = useCallback(() => { spacePressedRef.current = true; }, []);
  const handleSpaceUp = useCallback(() => { spacePressedRef.current = false; }, []);

  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onSpaceDown: handleSpaceDown,
    onSpaceUp: handleSpaceUp,
  });

  const handleClear = useCallback(() => {
    dispatch({ type: 'CLEAR' });
    canvasAreaRef.current?.resetCamera();
  }, [dispatch]);

  const handleDownload = useCallback(() => {
    canvasAreaRef.current?.downloadAsPng();
  }, []);

  const handleSaveSketch = useCallback(() => {
    const thumbnail = canvasAreaRef.current?.getThumbnail() ?? '';
    const sketch: Sketch = {
      id: String(Date.now()),
      timestamp: Date.now(),
      paths: historyState.paths,
      redoStack: historyState.redoStack,
      thumbnail,
    };
    setSketches(prev => {
      const next = [sketch, ...prev];
      localStorage.setItem(SKETCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, [historyState.paths, historyState.redoStack]);

  const handleLoadSketch = useCallback((sketch: Sketch) => {
    dispatch({ type: 'LOAD_SKETCH', paths: sketch.paths, redoStack: sketch.redoStack });
    canvasAreaRef.current?.resetCamera();
    setShowHistory(false);
  }, [dispatch]);

  const handleDeleteSketch = useCallback((id: string) => {
    setSketches(prev => {
      const next = prev.filter(s => s.id !== id);
      localStorage.setItem(SKETCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <>
      <CanvasArea
        ref={canvasAreaRef}
        historyState={historyState}
        dispatch={dispatch}
        currentTool={currentTool}
        color={color}
        brushSize={brushSize}
        spacePressedRef={spacePressedRef}
      />
      <Toolbar
        currentTool={currentTool}
        color={color}
        brushSize={brushSize}
        canUndo={historyState.paths.length > 0}
        canRedo={historyState.redoStack.length > 0}
        historyOpen={showHistory}
        onToolChange={setCurrentTool}
        onColorChange={setColor}
        onBrushSizeChange={setBrushSize}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onDownload={handleDownload}
        onToggleHistory={() => setShowHistory(v => !v)}
      />
      {showHistory && (
        <SketchHistoryPanel
          sketches={sketches}
          onSave={handleSaveSketch}
          onLoad={handleLoadSketch}
          onDelete={handleDeleteSketch}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}
