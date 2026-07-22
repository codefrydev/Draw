import React from 'react';

interface Props {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  activeClass: string;
  onClick: () => void;
}

export const ToolButton = React.memo(function ToolButton({ icon, label, isActive, activeClass, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`group relative p-2.5 rounded-xl transition-colors focus:outline-none focus:ring-2 ${
        isActive ? activeClass : 'text-gray-500 hover:bg-gray-100 focus:ring-gray-300'
      }`}
    >
      {icon}
      <span className="tooltip invisible opacity-0 absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded transition-opacity whitespace-nowrap">
        {label}
      </span>
    </button>
  );
});
