import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';

const LogoIcon = () => (
  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-gradient-to-br from-brand-green to-brand-green-dark shadow-lg">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 22c0-4-3-7-7-7" />
      <path d="M12 15a7 7 0 0 0 5-7c0-2-1-4-3-5-1.5 1-2 3-2 5" />
      <path d="M12 22V12" />
      <circle cx="12" cy="12" r="2" fill="white" stroke="currentColor" />
    </svg>
  </div>
);

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);

interface FooterProps {
  setActiveView: (view: 'home' | 'doctor' | 'guide' | 'dashboard' | 'library' | 'contact') => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveView }) => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-8 overflow-hidden border-t border-[var(--ag-border)] bg-[var(--ag-surface-strong)] transition-colors duration-300">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-green/40 to-transparent" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative mx-auto max-w-[92rem] px-6 pb-8 pt-14 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3 xl:gap-14">
          <div className="space-y-5">
            <button
              onClick={() => setActiveView('home')}
              className="group flex items-center gap-3 transition-transform hover:-translate-y-0.5"
            >
              <LogoIcon />
              <div className="text-start">
                <div className="text-sm font-extrabold uppercase tracking-[0.18em] text-[var(--ag-text)]">
                  {t('app.title')}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold text-[var(--ag-text-muted)]">
                  Premium agritech intelligence
                </div>
              </div>
            </button>

            <p className="max-w-xs text-sm leading-relaxed text-[var(--ag-text-muted)]">
              {t('footer.description')}
            </p>

            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] px-3.5 py-1.5">
              <LeafIcon />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ag-text-muted)]">
                Graduation project demo
              </span>
            </div>
          </div>

          <div>
            <FooterColumnHeading>{t('footer.headings.features')}</FooterColumnHeading>
            <ul className="space-y-2.5">
              <FooterLink onClick={() => setActiveView('doctor')} text={t('footer.links.plantDoctor')} />
              <FooterLink onClick={() => setActiveView('guide')} text={t('footer.links.growthGuide')} />
              <FooterLink onClick={() => setActiveView('dashboard')} text={t('footer.links.performanceAnalytics')} />
              <FooterLink onClick={() => setActiveView('library')} text={t('footer.links.diseaseLibrary')} />
            </ul>
          </div>

          <div>
            <FooterColumnHeading>{t('footer.headings.legal')}</FooterColumnHeading>
            <ul className="space-y-2.5">
              <FooterLink onClick={() => setActiveView('contact')} text={t('footer.links.contactUs')} />
              <FooterNote text="Privacy, terms, FAQ, newsletter, and social channels are intentionally hidden until real pages or integrations are available." />
            </ul>
          </div>
        </div>

        <div className="mb-6 h-px bg-gradient-to-r from-transparent via-[var(--ag-border-strong)] to-transparent" />

        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-center text-xs text-[var(--ag-text-soft)] sm:text-left">
            {t('footer.copyright', { year: currentYear })}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-[var(--ag-text-soft)]">
            <span>Built for practical agricultural decision support</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const FooterColumnHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-5">
    <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text)]">
      {children}
    </h3>
    <div className="mt-2 h-0.5 w-8 rounded-full bg-gradient-to-r from-brand-green to-brand-green-light" />
  </div>
);

const FooterLink: React.FC<{ text: string; onClick: () => void }> = ({ text, onClick }) => (
  <li>
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-2 text-left text-sm text-[var(--ag-text-muted)] transition-all duration-150 hover:text-brand-green dark:hover:text-brand-green-light"
    >
      <span className="h-1 w-1 rounded-full bg-[var(--ag-border-strong)] transition-all duration-150 group-hover:w-2.5 group-hover:bg-brand-green dark:group-hover:bg-brand-green-light" />
      {text}
    </button>
  </li>
);

const FooterNote: React.FC<{ text: string }> = ({ text }) => (
  <li className="rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--ag-text-muted)]">
    {text}
  </li>
);
