import React, { useRef } from 'react';

interface Props {
  color: string;
  onChange: (color: string) => void;
}

export const ColorPicker = React.memo(function ColorPicker({ color, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative group flex items-center justify-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-10 h-10 rounded-full cursor-pointer border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 shadow-inner"
        style={{ backgroundColor: color }}
        aria-label="Pick color"
      />
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
        tabIndex={-1}
      />
      <span className="tooltip invisible opacity-0 absolute -top-10 bg-gray-800 text-white text-xs px-2 py-1 rounded transition-opacity whitespace-nowrap">
        Color
      </span>
    </div>
  );
});
