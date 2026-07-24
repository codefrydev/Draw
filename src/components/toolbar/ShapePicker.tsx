import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Tool, ShapeKind } from '../../types/drawing.types';

type PickerTool = ShapeKind | 'text';

const PICKER_TOOLS = new Set<Tool>(['rectangle', 'circle', 'line', 'triangle', 'diamond', 'arrow', 'text']);

const icons: Record<PickerTool, React.ReactElement> = {
  rectangle: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="1"/>
    </svg>
  ),
  circle: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
    </svg>
  ),
  line: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="20" x2="20" y2="4"/>
    </svg>
  ),
  triangle: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,3 22,21 2,21"/>
    </svg>
  ),
  diamond: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,2 22,12 12,22 2,12"/>
    </svg>
  ),
  arrow: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="19" x2="19" y2="5"/><polyline points="9,5 19,5 19,15"/>
    </svg>
  ),
  text: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,7 4,4 20,4 20,7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
    </svg>
  ),
};

const SHAPES: { kind: PickerTool; label: string }[] = [
  { kind: 'rectangle', label: 'Rectangle' },
  { kind: 'circle',    label: 'Circle' },
  { kind: 'line',      label: 'Line' },
  { kind: 'triangle',  label: 'Triangle' },
  { kind: 'diamond',   label: 'Diamond' },
  { kind: 'arrow',     label: 'Arrow' },
  { kind: 'text',      label: 'Text' },
];

// Generic "shapes" icon shown when no shape is active
const ShapesGridIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="0.5"/>
    <circle cx="18" cy="6" r="3"/>
    <polygon points="12,14 20,22 4,22"/>
  </svg>
);

const ChevronDownMini = () => (
  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

interface Props {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
}

export const ShapePicker = React.memo(function ShapePicker({ currentTool, onToolChange }: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const activeShape = PICKER_TOOLS.has(currentTool) ? (currentTool as PickerTool) : null;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        popoverRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const getPopoverStyle = (): React.CSSProperties => {
    if (!buttonRef.current) return { display: 'none' };
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      position: 'fixed',
      bottom: window.innerHeight - rect.top + 8,
      left: rect.left + rect.width / 2,
      transform: 'translateX(-50%)',
      zIndex: 9999,
    };
  };

  function handleSelect(kind: PickerTool) {
    onToolChange(kind);
    setOpen(false);
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        title="Shapes"
        aria-label="Shapes"
        className={`relative flex flex-col items-center justify-center w-10 h-10 rounded-lg transition-colors ${
          activeShape
            ? 'bg-orange-100 text-orange-600'
            : open
              ? 'bg-gray-100 text-gray-700'
              : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        {activeShape ? icons[activeShape] : <ShapesGridIcon />}
        <span className="absolute bottom-0.5 right-0.5 text-current opacity-50">
          <ChevronDownMini />
        </span>
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          style={getPopoverStyle()}
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-3"
        >
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center mb-2">Shapes</p>
          <div className="grid grid-cols-3 gap-1">
            {SHAPES.map(({ kind, label }) => (
              <button
                key={kind}
                title={label}
                aria-label={label}
                onClick={() => handleSelect(kind)}
                className={`flex items-center justify-center w-12 h-12 rounded-xl transition-colors ${
                  activeShape === kind
                    ? 'bg-orange-100 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {icons[kind]}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
