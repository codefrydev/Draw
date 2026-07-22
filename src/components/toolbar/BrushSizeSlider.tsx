import React from 'react';

interface Props {
  size: number;
  onChange: (size: number) => void;
}

export const BrushSizeSlider = React.memo(function BrushSizeSlider({ size, onChange }: Props) {
  return (
    <div className="relative group flex items-center flex-col justify-center w-24 sm:w-32">
      <input
        type="range"
        min={1}
        max={50}
        value={size}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="text-[10px] text-gray-400 mt-1 font-medium tracking-wide uppercase">
        Size: <span>{size}</span>px
      </div>
    </div>
  );
});
