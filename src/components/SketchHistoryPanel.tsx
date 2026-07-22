import React from 'react';
import type { Sketch } from '../types/drawing.types';

interface Props {
  sketches: Sketch[];
  onSave: () => void;
  onLoad: (sketch: Sketch) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export const SketchHistoryPanel = React.memo(function SketchHistoryPanel({
  sketches, onSave, onLoad, onDelete, onClose,
}: Props) {
  return (
    <div className="fixed right-0 top-0 h-full w-72 bg-white border-l border-gray-100 shadow-2xl z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800 text-sm">Sketch History</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none"
          aria-label="Close history"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Save button */}
      <div className="px-4 py-3 border-b border-gray-100">
        <button
          onClick={onSave}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
          </svg>
          Save Current Sketch
        </button>
      </div>

      {/* Sketch list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {sketches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
            </svg>
            <span>No saved sketches yet</span>
          </div>
        ) : (
          sketches.map((sketch) => (
            <div key={sketch.id} className="rounded-xl border border-gray-100 overflow-hidden bg-gray-50 group">
              {/* Thumbnail */}
              <div className="relative">
                <img
                  src={sketch.thumbnail}
                  alt="Sketch thumbnail"
                  className="w-full block"
                />
                {/* Load overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <button
                    onClick={() => onLoad(sketch)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-800 text-xs font-medium py-1.5 px-3 rounded-lg shadow-md hover:bg-gray-50"
                  >
                    Load
                  </button>
                </div>
              </div>
              {/* Meta row */}
              <div className="flex items-center justify-between px-2.5 py-2">
                <span className="text-xs text-gray-400">{formatDate(sketch.timestamp)}</span>
                <button
                  onClick={() => onDelete(sketch.id)}
                  className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors focus:outline-none"
                  aria-label="Delete sketch"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
