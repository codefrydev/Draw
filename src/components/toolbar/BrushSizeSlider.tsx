import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  size: number;
  onChange: (size: number) => void;
}

export const BrushSizeSlider = React.memo(function BrushSizeSlider({ size, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  // dot scales from 4px (size=1) to 22px (size=50)
  const dotPx = 4 + (size - 1) * (18 / 49);

  // Compute fixed popover position anchored above the button
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

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        title={`Stroke size: ${size}px`}
        aria-label={`Stroke size: ${size}px`}
        className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg transition-colors ${
          open ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <div
          className="rounded-full bg-current transition-all duration-100"
          style={{ width: dotPx, height: dotPx }}
        />
        <span className="text-[9px] font-semibold mt-1 tabular-nums leading-none">{size}</span>
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          style={getPopoverStyle()}
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-44 flex flex-col items-center gap-3"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-50">
            <div
              className="rounded-full bg-gray-800 transition-all duration-100"
              style={{ width: dotPx, height: dotPx }}
            />
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={size}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <span className="text-xs font-semibold text-gray-500 tabular-nums">{size}px</span>
        </div>,
        document.body
      )}
    </div>
  );
});
