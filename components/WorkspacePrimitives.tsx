import React from 'react';
import { Sparkles } from 'lucide-react';

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

type Tone = 'forest' | 'blue' | 'amber' | 'red' | 'neutral';

const chipToneClass: Record<Tone, string> = {
  forest: 'ui-chip ui-chip-forest',
  blue: 'ui-chip ui-chip-blue',
  amber: 'ui-chip ui-chip-amber',
  red: 'ui-chip ui-chip-red',
  neutral: 'ui-chip',
};

const badgeToneClass: Record<Tone, string> = {
  forest: 'ui-icon-badge',
  blue: 'ui-icon-badge ui-icon-badge-blue',
  amber: 'ui-icon-badge ui-icon-badge-amber',
  red: 'ui-icon-badge ui-icon-badge-red',
  neutral: 'ui-icon-badge',
};

export const SurfaceCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  strong?: boolean;
  muted?: boolean;
}> = ({ children, className, strong, muted }) => (
  <div className={cx('ui-card', strong && 'ui-surface-strong', muted && 'ui-surface-muted', className)}>
    {children}
  </div>
);

export const SectionHeading: React.FC<{
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, description, eyebrow, actions, icon }) => (
  <div className="ui-section-title">
    <div>
      {eyebrow ? (
        <div className="ui-section-eyebrow">
          {icon ?? <Sparkles size={14} strokeWidth={2.2} />}
          <span>{eyebrow}</span>
        </div>
      ) : null}
      <h2 className="ui-section-heading">{title}</h2>
      {description ? <p className="ui-section-copy">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
  </div>
);

export const StatusChip: React.FC<{
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}> = ({ children, tone = 'neutral', className }) => (
  <span className={cx(chipToneClass[tone], className)}>{children}</span>
);

export const IconBadge: React.FC<{
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}> = ({ children, tone = 'forest', className }) => (
  <span className={cx(badgeToneClass[tone], className)}>{children}</span>
);

export const StatTile: React.FC<{
  title: string;
  value: React.ReactNode;
  meta?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  className?: string;
}> = ({ title, value, meta, icon, tone = 'forest', className }) => (
  <div className={cx('ui-stat-card ui-card-hover', className)}>
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="ui-stat-label">{title}</div>
        <div className="ui-stat-value">{value}</div>
      </div>
      {icon ? <IconBadge tone={tone}>{icon}</IconBadge> : null}
    </div>
    {meta ? <div className="ui-stat-subtle">{meta}</div> : null}
  </div>
);

export const ProgressBar: React.FC<{
  value: number;
  className?: string;
}> = ({ value, className }) => (
  <div className={cx('ui-progress', className)}>
    <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);

export const EmptyPanel: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon, title, description, action, className }) => (
  <div className={cx('ui-empty-state', className)}>
    {icon ? <div className="ui-empty-icon">{icon}</div> : null}
    <h3 className="text-xl font-extrabold text-[var(--ag-text)]">{title}</h3>
    {description ? <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--ag-text-muted)]">{description}</p> : null}
    {action ? <div className="mt-6">{action}</div> : null}
  </div>
);
