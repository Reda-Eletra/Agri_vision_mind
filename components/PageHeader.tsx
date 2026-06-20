import React from 'react';
import { Sparkles } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  imageUrl: string;
  eyebrow?: string;
  eyebrowIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, imageUrl, eyebrow, eyebrowIcon, children }) => {
  return (
    <section
      className="ui-page-header-card ui-reveal mb-12 bg-cover bg-center text-white"
      aria-label={title}
      style={{ backgroundImage: `url(${imageUrl})` }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(7,18,12,0.84),rgba(15,36,25,0.62)_42%,rgba(15,36,25,0.34)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(111,207,151,0.18),transparent_26%)]" />

      <div className="relative z-10 flex min-h-[16rem] flex-col justify-end p-5 md:p-8 lg:p-10">
        <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end">
          <div className="w-fit max-w-[min(34rem,100%)] rounded-[1.5rem] border border-white/12 bg-white/10 p-5 backdrop-blur-xl md:p-6">
            {eyebrow ? (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/78">
                {eyebrowIcon ?? <Sparkles size={14} />}
                <span>{eyebrow}</span>
              </div>
            ) : null}
            <h1 className="text-3xl font-extrabold text-white md:text-4xl">{title}</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/78 md:text-base">{subtitle}</p>
          </div>

          {children ? <div className="w-full lg:w-auto lg:justify-self-end lg:self-end">{children}</div> : null}
        </div>
      </div>
    </section>
  );
};
