import React, { useState } from 'react';
import type { Tool } from '../types/drawing.types';
import { ColorPicker } from './toolbar/ColorPicker';
import { BrushSizeSlider } from './toolbar/BrushSizeSlider';
import { ToolButton } from './toolbar/ToolButton';
import { ActionButton } from './toolbar/ActionButton';

interface Props {
  currentTool: Tool;
  color: string;
  brushSize: number;
  canUndo: boolean;
  canRedo: boolean;
  historyOpen: boolean;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onDownload: () => void;
  onToggleHistory: () => void;
}

const Divider = () => <div className="w-px h-8 bg-gray-200 mx-1" />;

const PanIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 9l-3 3 3 3"/><path d="M14 9l3 3-3 3"/><path d="M3 12h18"/><path d="M12 3v18"/>
  </svg>
);

const PenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.58 7.58"/>
  </svg>
);

const EraserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20H20V20Z"/><path d="M17 14L7 20"/>
  </svg>
);

const UndoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
  </svg>
);

const RedoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
  </svg>
);

const ClearIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h6v6H3z"/><path d="M15 3h6v6h-6z"/><path d="M3 15h6v6H3z"/><path d="M15 15h6v6h-6z"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const ChevronUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);

export const Toolbar = React.memo(function Toolbar({
  currentTool, color, brushSize, canUndo, canRedo, historyOpen,
  onToolChange, onColorChange, onBrushSizeChange,
  onUndo, onRedo, onClear, onDownload, onToggleHistory,
}: Props) {
  const [minimized, setMinimized] = useState(false);

  if (minimized) {
    return (
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl px-4 py-2.5 border border-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Expand toolbar"
        >
          <PenIcon />
          <ChevronUpIcon />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-3 flex items-center gap-2 sm:gap-4 z-10 border border-gray-100 transition-all">
      <ColorPicker color={color} onChange={onColorChange} />
      <Divider />
      <BrushSizeSlider size={brushSize} onChange={onBrushSizeChange} />
      <Divider />
      <div className="flex items-center gap-1">
        <ToolButton icon={<PanIcon />} label="Pan (Space)" isActive={currentTool === 'pan'} activeClass="bg-gray-200 text-gray-800 focus:ring-gray-300" onClick={() => onToolChange('pan')} />
        <ToolButton icon={<PenIcon />} label="Pen" isActive={currentTool === 'pen'} activeClass="bg-blue-100 text-blue-600 focus:ring-blue-400" onClick={() => onToolChange('pen')} />
        <ToolButton icon={<EraserIcon />} label="Eraser" isActive={currentTool === 'eraser'} activeClass="bg-gray-200 text-gray-800 focus:ring-gray-300" onClick={() => onToolChange('eraser')} />
      </div>
      <Divider />
      <div className="flex items-center gap-1">
        <ActionButton icon={<UndoIcon />} label="Undo" onClick={onUndo} disabled={!canUndo} />
        <ActionButton icon={<RedoIcon />} label="Redo" onClick={onRedo} disabled={!canRedo} />
        <ActionButton icon={<ClearIcon />} label="Clear All" onClick={onClear} colorClass="text-red-500 hover:bg-red-50" />
        <ActionButton icon={<DownloadIcon />} label="Download" onClick={onDownload} colorClass="text-green-600 hover:bg-green-50" />
        <ToolButton
          icon={<HistoryIcon />}
          label="Sketch History"
          isActive={historyOpen}
          activeClass="bg-violet-100 text-violet-600 focus:ring-violet-400"
          onClick={onToggleHistory}
        />
      </div>
      <Divider />
      <button
        onClick={() => setMinimized(true)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Minimize toolbar"
        title="Minimize"
      >
        <ChevronDownIcon />
      </button>
    </div>
  );
});
