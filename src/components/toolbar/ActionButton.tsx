import React from 'react';

interface Props {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  colorClass?: string;
}

export const ActionButton = React.memo(function ActionButton({ icon, label, onClick, disabled = false, colorClass = 'text-gray-500 hover:bg-gray-100' }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative p-2.5 rounded-xl transition-colors focus:outline-none disabled:opacity-30 disabled:pointer-events-none ${colorClass}`}
    >
      {icon}
      <span className="tooltip invisible opacity-0 absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded transition-opacity whitespace-nowrap">
        {label}
      </span>
    </button>
  );
});
