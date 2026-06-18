import React from 'react';

export const LeafSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      <div className="ui-glow-ring flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-green-dark text-white">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          className="animate-leaf-spinner"
        >
          <path
            d="M12 22C12 22 4 18 4 12C4 6 12 2 12 2C12 2 20 6 20 12C20 18 12 22 12 22Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
      <div>
        <p className="text-base font-bold text-[var(--ag-text)]">AI is analyzing the crop sample</p>
        <p className="mt-1 text-sm text-[var(--ag-text-muted)]">Validating plant condition, severity, and recommended next actions.</p>
      </div>
    </div>
  );
};
