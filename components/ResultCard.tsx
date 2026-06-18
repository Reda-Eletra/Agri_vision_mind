import React from 'react';
import { Sparkles } from 'lucide-react';

interface ResultCardProps {
  title: string;
  children: React.ReactNode;
}

export const ResultCard: React.FC<ResultCardProps> = React.memo(({ title, children }) => {
  return (
    <div className="ui-card ui-reveal w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-[rgba(47,138,87,0.14)] bg-[var(--ag-surface-strong)] shadow-[0_28px_56px_rgba(18,34,26,0.12)]">
      <div className="flex items-center gap-3 border-b border-[var(--ag-border)] bg-[var(--ag-surface-muted)] px-5 py-4 md:px-7">
        <span className="ui-icon-badge">
          <Sparkles size={18} />
        </span>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ag-text-soft)]">AI report</p>
          <h2 className="text-xl font-extrabold tracking-[-0.03em] text-[var(--ag-text)]">{title}</h2>
        </div>
      </div>
      <div className="p-5 md:p-7">{children}</div>
    </div>
  );
});
