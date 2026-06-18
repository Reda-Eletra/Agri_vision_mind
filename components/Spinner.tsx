import React from 'react';

interface SpinnerProps {
  small?: boolean;
}

export const Spinner: React.FC<SpinnerProps> = React.memo(({ small = false }) => {
  const sizeClasses = small ? 'h-6 w-6 border-[3px]' : 'h-12 w-12 border-4';

  return (
    <div className="flex items-center justify-center p-4">
      <div className={`relative ${small ? 'h-8 w-8' : 'h-16 w-16'}`}>
        <div className="absolute inset-0 rounded-full bg-brand-green/10 blur-sm" />
        <div
          className={`absolute inset-0 animate-spin rounded-full border-transparent border-t-brand-green border-r-brand-green-light ${sizeClasses}`}
        />
      </div>
    </div>
  );
});
