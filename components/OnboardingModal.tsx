import React, { useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';

type AppView = 'home' | 'doctor' | 'guide' | 'dashboard' | 'library' | 'contact' | 'community' | 'admin' | 'news';

interface OnboardingModalProps {
  onClose: () => void;
  setActiveView: (view: AppView) => void;
}

const STORAGE_KEY = 'avm_onboarded';

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose, setActiveView }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
          <circle cx="12" cy="13" r="3"/>
        </svg>
      ),
      title: t('onboarding.step1Title'),
      desc: t('onboarding.step1Desc'),
      color: '#059669',
      bg: 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.08))',
      border: 'rgba(16,185,129,0.2)',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
        </svg>
      ),
      title: t('onboarding.step2Title'),
      desc: t('onboarding.step2Desc'),
      color: '#0d9488',
      bg: 'linear-gradient(135deg,rgba(13,148,136,0.12),rgba(15,118,110,0.08))',
      border: 'rgba(13,148,136,0.2)',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
          <line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>
        </svg>
      ),
      title: t('onboarding.step3Title'),
      desc: t('onboarding.step3Desc'),
      color: '#d97706',
      bg: 'linear-gradient(135deg,rgba(217,119,6,0.12),rgba(180,83,9,0.08))',
      border: 'rgba(217,119,6,0.2)',
    },
  ];

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  };

  const startScan = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
    setActiveView('doctor');
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="relative w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl"
        style={{ background: 'var(--ag-surface)', border: '1px solid var(--ag-border)' }}
      >
        {/* Top gradient bar */}
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, #059669, #0d9488, #d97706)` }} />

        <div className="p-8">
          {/* Welcome heading — shown only on first step */}
          {step === 0 && (
            <div className="text-center mb-8">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--ag-text-muted)] mb-2">
                {t('onboarding.subtitle')}
              </p>
              <h2 id="onboarding-title" className="text-2xl font-extrabold text-[var(--ag-text)] leading-snug">
                {t('onboarding.welcome')}
              </h2>
            </div>
          )}
          {step > 0 && (
            <h2 id="onboarding-title" className="sr-only">{t('onboarding.welcome')}</h2>
          )}

          {/* Step progress dots */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 24 : 8,
                  height: 8,
                  background: i === step ? currentStep.color : 'var(--ag-border)',
                }}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="text-center px-2">
            <div
              className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-6"
              style={{ background: currentStep.bg, border: `1px solid ${currentStep.border}`, color: currentStep.color }}
            >
              {currentStep.icon}
            </div>
            <h3 className="text-xl font-bold text-[var(--ag-text)] mb-3">{currentStep.title}</h3>
            <p className="text-[var(--ag-text-muted)] leading-relaxed text-base">{currentStep.desc}</p>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3">
            {!isLast && (
              <button
                onClick={() => setStep(s => s + 1)}
                className="w-full py-3.5 rounded-full font-bold text-white text-base transition-all duration-300 hover:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg, ${currentStep.color}, #0d9488)`, boxShadow: `0 8px 20px ${currentStep.color}30` }}
              >
                {steps[step + 1].title}
              </button>
            )}
            {isLast && (
              <button
                onClick={startScan}
                className="w-full py-3.5 rounded-full font-bold text-white text-base transition-all duration-300 hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#059669,#0d9488)', boxShadow: '0 8px 20px rgba(5,150,105,0.28)' }}
              >
                {t('onboarding.startScan')}
              </button>
            )}
            <button
              onClick={dismiss}
              className="w-full py-2.5 rounded-full text-sm font-semibold text-[var(--ag-text-muted)] transition-colors hover:text-[var(--ag-text)]"
            >
              {t('onboarding.skip')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper: check if onboarding should show
export const shouldShowOnboarding = (): boolean =>
  localStorage.getItem(STORAGE_KEY) !== 'true';
