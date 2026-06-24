import React, { useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';

type AppView = 'home' | 'doctor' | 'guide' | 'dashboard' | 'library' | 'contact' | 'community' | 'admin' | 'news';

interface HomePageProps {
    setActiveView: (view: AppView) => void;
    onOpenChat?: () => void;
    onOpenVoice?: () => void;
    onOpenSignup?: () => void;
}


// ─── Small bilingual copy helper ─────────────────────────────────────────────
// Existing translation keys are still used for the original content. This helper
// keeps the new project-specific copy bilingual without forcing an immediate
// translations.ts migration. These strings can be moved to translations.ts later.
function useLocalizedCopy() {
    const { language } = useTranslation();
    const isArabic = language === 'ar';
    const copy = (arabic: string, english: string) => (isArabic ? arabic : english);
    return { isArabic, copy };
}

// ─── Scroll Reveal Hook ───────────────────────────────────────────────────────
function useScrollReveal() {
    useEffect(() => {
        const elements = Array.from(
            document.querySelectorAll<HTMLElement>('.sr-hidden, .sr-left, .sr-right, .sr-zoom')
        );

        if (!('IntersectionObserver' in window)) {
            elements.forEach((element) => element.classList.add('sr-visible'));
            return undefined;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('sr-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
        );

        elements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, []);
}


// ─── Injected CSS ────────────────────────────────────────────────────────────
const Styles = () => (
    <style>{`
        /* ── Core Keyframes ── */
        @keyframes hp-scan {
            0%   { top: 0%;   opacity: 0; }
            8%   { opacity: 1; }
            92%  { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        @keyframes hp-fadeInUp {
            from { opacity: 0; transform: translateY(28px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hp-countUp {
            from { opacity: 0; transform: scale(0.6) translateY(15px); }
            to   { opacity: 1; transform: scale(1)   translateY(0); }
        }
        @keyframes hp-shimmer {
            0%   { background-position: -200% center; }
            100% { background-position:  200% center; }
        }
        @keyframes hp-pulse-ring {
            0%   { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes hp-particle {
            0%   { transform: translateY(0)    scale(1)    opacity: 0; }
            10%  { opacity: 0.8; }
            90%  { opacity: 0.5; }
            100% { transform: translateY(-120px) scale(0.3) opacity: 0; }
        }
        @keyframes hp-img-reveal {
            from { clip-path: inset(0 100% 0 0 round 2.5rem); }
            to   { clip-path: inset(0 0%   0 0 round 2.5rem); }
        }

        /* ── Utility Classes ── */
        .hp-scan            { animation: hp-scan 3.5s linear infinite; }
        .hp-fade-up         { animation: hp-fadeInUp 0.8s cubic-bezier(0.22,1,0.36,1) forwards; opacity:0; }
        .hp-count-up        { animation: hp-countUp 0.7s cubic-bezier(0.22,1,0.36,1) forwards; }
        .hp-img-reveal      { animation: hp-img-reveal 1s cubic-bezier(0.22,1,0.36,1) forwards; }

        /* Static gradient text — warm brand greens only (no cyan) */
        .hp-shimmer-text {
            background: var(--ag-grad-primary);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .hp-gold-text {
            background: var(--ag-grad-gold);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        /* Warm surface (replaces cold glass) */
        .hp-glass {
            background: var(--ag-surface);
            border: 1px solid var(--ag-border);
        }
        .dark .hp-glass {
            background: var(--ag-surface);
            border: 1px solid var(--ag-border);
        }

        /* Feature card */
        .hp-feature-card {
            transition: transform 0.2s ease,
                        box-shadow 0.2s ease,
                        border-color 0.3s ease;
        }
        .hp-feature-card:hover { transform: translateY(-2px); }

        /* Card surface - light/dark aware */
        .hp-card-surface {
            background: var(--ag-surface);
            border: 1px solid var(--ag-border);
            box-shadow: var(--ag-shadow-soft);
        }
        .dark .hp-card-surface {
            background: var(--ag-surface);
            border: 1px solid var(--ag-border);
            box-shadow: var(--ag-shadow-soft);
        }
        .hp-why-card-surface {
            background: var(--ag-surface-muted);
        }
        .dark .hp-why-card-surface {
            background: var(--ag-surface-muted);
        }

        /* Card shine sweep */
        .hp-card-shine { position:relative; overflow:hidden; }
        .hp-card-shine::before {
            content:none;
            position:absolute;
            top:-60%; left:-80%;
            width:50%; height:200%;
            background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.38) 50%, transparent 70%);
            transform: skewX(-20deg);
            transition: left 0.7s ease;
            pointer-events:none;
        }
        .hp-card-shine:hover::before { left:140%; }

        /* Gradient border card */
        .hp-grad-border {
            position: relative;
            border-radius: 1.75rem;
        }
        .hp-grad-border::before {
            content: '';
            position: absolute;
            inset: -2px;
            background: var(--ag-grad-primary);
            border-radius: inherit;
            z-index: 0;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .hp-grad-border:hover::before { opacity:1; }
        .hp-grad-border > * { position:relative; z-index:1; }

        /* Delays */
        .d-100 { animation-delay: 0.10s; }
        .d-200 { animation-delay: 0.20s; }
        .d-300 { animation-delay: 0.30s; }
        .d-400 { animation-delay: 0.40s; }
        .d-500 { animation-delay: 0.50s; }
        .d-600 { animation-delay: 0.60s; }

        /* Pulse ring */
        .hp-pulse-ring {
            position:absolute; inset:0;
            border-radius:999px;
            border: 2px solid rgba(16,185,129,0.5);
            animation: hp-pulse-ring 2s ease-out infinite;
        }

        /* Section wave divider */
        .hp-wave-top {
            position:absolute; top:-2px; left:0; right:0; overflow:hidden; line-height:0;
        }
        .hp-wave-top svg { display:block; width:100%; }

        /* Image hover overlay */
        .hp-img-wrap { position:relative; overflow:hidden; }
        .hp-img-wrap img { transition: transform 0.7s cubic-bezier(0.22,1,0.36,1); }
        .hp-img-wrap:hover img { transform: scale(1.06); }
        .hp-img-overlay {
            position:absolute; inset:0; pointer-events:none;
            background: linear-gradient(135deg, rgba(5,150,105,0.3) 0%, rgba(13,148,136,0.18) 100%);
            opacity:0; transition:opacity 0.4s ease;
        }
        .hp-img-wrap:hover .hp-img-overlay { opacity:1; }

        /* Stat card glow on hover */
        .hp-stat-card {
            transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s ease;
        }
        .hp-stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 28px rgba(10,60,35,0.12);
        }

        /* Step connector */
        .hp-step-line {
            position:absolute; top:40px; left: calc(50% + 2.5rem); right:0;
            height:2px;
            background: linear-gradient(90deg, rgba(16,185,129,0.7), rgba(13,148,136,0.4));
            transform-origin: left;
        }

        .hp-interactive:focus-visible {
            outline: 3px solid rgba(16,185,129,0.45);
            outline-offset: 4px;
        }

        @media (prefers-reduced-motion: reduce) {
            .hp-scan, .hp-fade-up, .hp-count-up, .hp-img-reveal, .hp-pulse-ring {
                animation: none !important;
                opacity: 1 !important;
                transform: none !important;
            }
            .hp-img-wrap img, .hp-feature-card, .hp-stat-card, .hp-card-shine::before {
                transition: none !important;
            }
        }

    `}</style>
);

// ─── SVG Icon Library ────────────────────────────────────────────────────────
const I = {
    arrow:     (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>,
    check:     (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6 9 17l-5-5"/></svg>,
    leaf:      (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.5 2 4.5a7.2 7.2 0 0 1-1.2 7.8C15.5 19 11 20 11 20Z"/><path d="M11 20c3-4 3.5-9 3.5-9"/></svg>,
    speed:     (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><path d="M16.2 7.8 12 12"/></svg>,
    globe:     (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>,
    clock:     (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    water:     (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>,
    bug:       (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>,
    plant:     (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22v-7l-2-2"/><path d="M17 8v.8A6 6 0 0 1 13.8 20v0H10v0A6 6 0 0 1 7 8.8V8"/><path d="m14 14-2 2-2-2"/></svg>,
    brain:     (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>,
    book:      (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
    users:     (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    library:   (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="7" height="18" x="3" y="3" rx="1"/><rect width="7" height="10" x="14" y="3" rx="1"/><rect width="7" height="5" x="14" y="16" rx="1"/></svg>,
    chart:     (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6"  x2="6"  y1="20" y2="14"/></svg>,
    map:       (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>,
    news:      (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>,
    chat:      (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    mic:       (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>,
    satellite: (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 7 9 3 5 7l4 4"/><path d="m17 11 4 4-4 4-4-4"/><path d="m8 12 4 4 6-6-4-4Z"/><path d="m16 8 3-3"/><path d="M9 21a6 6 0 0 0-6-6"/></svg>,
    dollar:    (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    phone:     (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.49 12 19.79 19.79 0 0 1 1.43 3.36a2 2 0 0 1 1.49-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    camera:    (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>,
    sparkles:  (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>,
    shield:    (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    farmers:   (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    zap:       (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    sun:       (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
    drone:     (p: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M3 7l3 3"/><path d="M21 7l-3 3"/><path d="M3 17l3 -3"/><path d="M21 17l-3 -3"/><path d="M3 7c0 -1.1 .9 -2 2 -2s2 .9 2 2s-.9 2 -2 2s-2 -.9 -2 -2z"/><path d="M17 7c0 -1.1 .9 -2 2 -2s2 .9 2 2s-.9 2 -2 2s-2 -.9 -2 -2z"/><path d="M3 17c0 -1.1 .9 -2 2 -2s2 .9 2 2s-.9 2 -2 2s-2 -.9 -2 -2z"/><path d="M17 17c0 -1.1 .9 -2 2 -2s2 .9 2 2s-.9 2 -2 2s-2 -.9 -2 -2z"/></svg>,
};

// ─── Particle Component ───────────────────────────────────────────────────────
const HeroParticles = () => {
    return null;
};

// ─── Main Component ──────────────────────────────────────────────────────────
export const HomePage: React.FC<HomePageProps> = ({ setActiveView, onOpenChat, onOpenVoice, onOpenSignup }) => {
    useScrollReveal();

    return (
        <div className="relative min-h-screen overflow-x-hidden font-sans selection:bg-emerald-200 selection:text-emerald-900" style={{ background: 'var(--ag-bg)' }}>
            <Styles />

            {/* Calm ambient background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(22,101,52,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />
                <div className="absolute top-[35%] right-[-8%] w-[600px] h-[600px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(15,118,110,0.05) 0%, transparent 70%)', filter: 'blur(90px)' }} />
                {/* Grid overlay */}
                <div className="absolute inset-0 opacity-[0.025]"
                    style={{ backgroundImage: 'linear-gradient(rgba(22,101,52,1) 1px, transparent 1px), linear-gradient(90deg, rgba(22,101,52,1) 1px, transparent 1px)', backgroundSize: '96px 96px' }} />
            </div>

            <main className="relative z-10 space-y-20 lg:space-y-28 pb-16">
                <HeroSection setActiveView={setActiveView} onOpenSignup={onOpenSignup} />
                <StatsSection />
                <ProjectOverviewSection setActiveView={setActiveView} />
                <HowItWorksSection />
                <SmartDiagnosisSection setActiveView={setActiveView} />
                <MainFeaturesSection setActiveView={setActiveView} onOpenChat={onOpenChat} onOpenVoice={onOpenVoice} />
                <GrowthGuideSection setActiveView={setActiveView} />
                <AdvancedDashboardSection setActiveView={setActiveView} />
                <WhyChooseUsSection />
                <SustainableImpactSection />
                <ResponsibleAiSection setActiveView={setActiveView} />
                <CTASection setActiveView={setActiveView} onOpenSignup={onOpenSignup} />
            </main>
        </div>
    );
};

// ─── HERO ────────────────────────────────────────────────────────────────────
const HeroSection: React.FC<HomePageProps> = ({ setActiveView, onOpenSignup }) => {
    const { t, language } = useTranslation();
    const isArabic = language === 'ar';
    return (
        <section className="avm-home-hero relative pt-28 pb-8 lg:pt-36 lg:pb-20 overflow-hidden">
            <HeroParticles />
            <img
                src="/images/avm-3d/home-greenhouse-ai.png"
                alt="AI greenhouse with robotic farming equipment"
                className="avm-home-hero-image"
                loading="eager"
                decoding="async"
            />
            <div className="avm-home-hero-shade" />
            <div className="avm-home-hero-network" aria-hidden="true" />
            <div className="avm-home-drone-beam" aria-hidden="true" />
            <div className="avm-home-arm-pulse" aria-hidden="true" />

            <div className="avm-home-legacy-container container mx-auto px-6 md:px-12">
                <div className="avm-home-legacy-grid grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">

                    {/* ── Text Side ── */}
                    <div className={`avm-home-hero-content relative z-10 text-center ${isArabic ? 'lg:order-2 lg:text-right' : 'lg:text-left'}`}>

                        {/* Eyebrow badge */}
                        <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full mb-7 hp-fade-up"
                            style={{ background: 'rgba(236,253,245,0.95)', border: '1px solid rgba(16,185,129,0.22)' }}>
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="hp-pulse-ring absolute inline-flex h-full w-full" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                            <span className="text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-widest">
                                {t('homePage.hero.eyebrow')}
                            </span>
                        </div>

                        {/* Headline */}
                        <h1 className={`${isArabic ? 'text-4xl md:text-5xl lg:text-6xl' : 'text-5xl md:text-6xl lg:text-7xl'} font-extrabold text-[var(--ag-text)] leading-tight mb-6 hp-fade-up d-100`}>
                            {t('homePage.hero.title')}
                            <span className="block hp-shimmer-text mt-2">{t('homePage.hero.gradientTitle')}</span>
                        </h1>

                        <p className={`text-lg md:text-xl text-[var(--ag-text-soft)] mb-6 leading-relaxed hp-fade-up d-200 max-w-xl mx-auto ${isArabic ? 'lg:mr-0 lg:ml-auto' : 'lg:mx-0'}`}>
                            {t('homePage.hero.subtitle')}
                        </p>

                        <p className={`text-base text-[var(--ag-text-muted)] mb-10 leading-relaxed hp-fade-up d-300 max-w-xl mx-auto ${isArabic ? 'lg:mr-0 lg:ml-auto' : 'lg:mx-0'}`}>
                            {t('homePage.hero.description')}
                        </p>

                        {/* CTA Buttons */}
                        <div className={`flex flex-col sm:flex-row gap-4 justify-center hp-fade-up d-400 ${isArabic ? 'lg:justify-end' : 'lg:justify-start'}`}>
                            <button
                               type="button"
                                onClick={() => setActiveView('doctor')}
                                className="group relative px-8 py-4 rounded-full text-white font-bold text-lg shadow-xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5"
                                style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', boxShadow: '0 12px 28px rgba(5,150,105,0.28)' }}
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    {t('homePage.hero.button')}
                                    <I.arrow className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" />
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </button>

                            <button
                               type="button"
                                onClick={onOpenSignup || (() => document.getElementById('home-features')?.scrollIntoView({ behavior: 'smooth' }))}
                                className="px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:-translate-y-1 hp-glass"
                                style={{ color: 'var(--ag-text)', border: '1px solid rgba(16,185,129,0.25)' }}
                            >
                                {t('homePage.hero.secondaryButton')}
                            </button>
                        </div>

                        {/* Trust badges */}
                        <div className={`mt-10 flex flex-wrap gap-4 justify-center hp-fade-up d-500 ${isArabic ? 'lg:justify-end' : 'lg:justify-start'}`}>
                            {[t('homePage.hero.trustBadge1'), t('homePage.hero.trustBadge2')].map((b) => (
                                <span key={b} className="inline-flex items-center gap-1.5 text-xs text-[var(--ag-text-muted)] font-semibold">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                                        <I.check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    </span>
                                    {b}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* ── Visual Side ── */}
                    <div className={`avm-home-legacy-visual relative hp-fade-up d-200 ${isArabic ? 'lg:order-1' : ''}`}>
                        <div className="relative z-10">
                            {/* Main hero image */}
                            <div className="hp-img-wrap rounded-[2.5rem] shadow-2xl border-4 border-white/40 dark:border-gray-700/40 overflow-hidden"
                                style={{ boxShadow: '0 32px 80px rgba(5,150,105,0.25), 0 0 0 1px rgba(255,255,255,0.15) inset' }}>
                                <img
                                    src="/images/avm-3d/hero-seedling-hand.png"
                                    alt="Smart Farming Technology"
                                    className="w-full h-[260px] sm:h-[380px] md:h-[500px] object-cover"
                                    loading="eager"
                                    decoding="async"
                                />
                                <div className="hp-img-overlay" />
                                {/* Scan line */}
                                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                    <div className="hp-scan absolute left-0 right-0 h-0.5"
                                        style={{ background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.8), rgba(52,211,153,0.7), transparent)', boxShadow: '0 0 20px rgba(52,211,153,0.5)' }} />
                                </div>
                                {/* Bottom overlay */}
                                <div className="absolute bottom-0 left-0 right-0 p-5" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                                        <span className="font-mono text-xs text-emerald-300 uppercase tracking-widest">{t('homePage.hero.scannerLabel')}</span>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Glow behind image */}
                        <div className="absolute inset-4 bg-gradient-to-tr from-emerald-500/30 to-teal-400/20 rounded-[2.5rem] blur-3xl -z-10" />
                    </div>
                </div>
            </div>
            <div className="avm-home-ai-card" aria-hidden="true">
                <strong>AI</strong>
                <span>Analysis</span>
                <div>
                    <small>Plant Health</small>
                    <b>95%</b>
                </div>
            </div>
            <div className="avm-home-wave" aria-hidden="true">
                <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
                    <path d="M0,62 C230,102 410,126 640,101 C900,73 1055,32 1440,68 L1440,120 L0,120 Z" />
                </svg>
            </div>
        </section>
    );
};

// ─── PLATFORM SNAPSHOT ───────────────────────────────────────────────────────
const StatsSection = () => {
    const { copy } = useLocalizedCopy();

    const stats = [
        {
            icon: <I.camera className="w-7 h-7" />,
            value: '3',
            label: copy('أنماط للتشخيص: صورة، تربة، وكاميرا مباشرة', 'Diagnosis modes: image, soil, and live camera'),
            color: '#059669',
        },
        {
            icon: <I.library className="w-7 h-7" />,
            value: '12+',
            label: copy('أداة مترابطة داخل المنصة', 'Connected tools across the platform'),
            color: '#0d9488',
        },
        {
            icon: <I.globe className="w-7 h-7" />,
            value: '2',
            label: copy('لغتان مع دعم كامل للعربية واتجاه RTL', 'Languages with Arabic and RTL support'),
            color: '#0284c7',
        },
        {
            icon: <I.chart className="w-7 h-7" />,
            value: '1',
            label: copy('لوحة موحدة للمزرعة والبيانات والقرارات', 'Unified workspace for farms, data, and decisions'),
            color: '#d97706',
        },
    ];

    return (
        <section className="container mx-auto px-6" aria-labelledby="platform-snapshot-title">
            <h2 id="platform-snapshot-title" className="sr-only">
                {copy('ملخص إمكانيات المنصة', 'Platform capability snapshot')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat, index) => (
                    <article
                        key={stat.label}
                        className={`sr-hidden sr-delay-${(index + 1) * 100} hp-stat-card hp-card-surface rounded-3xl p-6`}
                    >
                        <div className="flex items-start gap-4">
                            <div
                                className="w-14 h-14 min-w-14 rounded-2xl flex items-center justify-center"
                                style={{
                                    width: 52,
                                    height: 52,
                                    color: stat.color,
                                    background: `${stat.color}12`,
                                    border: `1px solid ${stat.color}22`,
                                }}
                            >
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-3xl font-extrabold text-[var(--ag-text)] leading-none mb-2">{stat.value}</p>
                                <p className="text-sm font-semibold text-[var(--ag-text-muted)] leading-relaxed">{stat.label}</p>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
};

// ─── PROJECT OVERVIEW ────────────────────────────────────────────────────────
const ProjectOverviewSection: React.FC<Pick<HomePageProps, 'setActiveView'>> = ({ setActiveView }) => {
    const { copy } = useLocalizedCopy();

    const pillars = [
        {
            icon: <I.brain className="w-7 h-7" />,
            title: copy('ذكاء زراعي قابل للتنفيذ', 'Actionable agricultural intelligence'),
            description: copy(
                'تحليل صور النبات والتربة وشرح النتائج بطريقة مبسطة، مع خطوات متابعة تساعد المستخدم على الانتقال من الملاحظة إلى الإجراء.',
                'Analyze plant and soil images, explain the result clearly, and turn observations into practical follow-up actions.'
            ),
            color: '#059669',
        },
        {
            icon: <I.map className="w-7 h-7" />,
            title: copy('إدارة دورة المزرعة بالكامل', 'End-to-end farm cycle management'),
            description: copy(
                'تنظيم المزارع والحدود الجغرافية والمواسم والمحاصيل والمهام والنباتات والسجلات المالية من مساحة عمل واحدة.',
                'Organize farms, boundaries, seasons, crops, tasks, plants, and financial records from one workspace.'
            ),
            color: '#0d9488',
        },
        {
            icon: <I.satellite className="w-7 h-7" />,
            title: copy('رؤية من الحقل إلى القمر الصناعي', 'From field observations to satellite context'),
            description: copy(
                'دمج بيانات الحقل مع الطقس ومؤشرات الغطاء النباتي لتكوين صورة أوضح عن صحة المحصول والمخاطر المحيطة به.',
                'Combine field records, weather context, and vegetation indicators for a clearer view of crop health and risk.'
            ),
            color: '#0284c7',
        },
    ];

    return (
        <section id="home-about" className="container mx-auto px-6 scroll-mt-28">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16 items-center">
                <div className="sr-left">
                    <span
                        className="inline-flex px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider mb-5"
                        style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)', color: '#059669' }}
                    >
                        {copy('فكرة المشروع', 'The project vision')}
                    </span>
                    <h2 className="text-3xl md:text-5xl font-extrabold text-[var(--ag-text)] leading-tight mb-5">
                        {copy('منصة واحدة تربط التشخيص بإدارة المزرعة واتخاذ القرار', 'One platform connecting diagnosis, farm management, and decision-making')}
                    </h2>
                    <p className="text-lg text-[var(--ag-text-soft)] leading-relaxed mb-5">
                        {copy(
                            'Agricultural Vision Mind ليست مجرد أداة للتعرّف على الأمراض؛ بل نظام زراعي رقمي يجمع الذكاء الاصطناعي، إدارة العمليات، المعرفة، والمجتمع في تجربة موحدة.',
                            'Agricultural Vision Mind is more than a disease detector. It is a digital agriculture workspace combining AI, operations, knowledge, and community.'
                        )}
                    </p>
                    <p className="text-sm text-[var(--ag-text-muted)] leading-relaxed mb-8">
                        {copy(
                            'تم تصميمها لتخدم المزارع والمهتم بالإرشاد الزراعي من لحظة اكتشاف المشكلة، مرورًا بتسجيل الإجراءات، وحتى متابعة الأداء والتكلفة.',
                            'It supports the farming journey from detecting a problem, to recording actions, to monitoring performance and cost.'
                        )}
                    </p>
                    <button
                       type="button"
                        onClick={() => setActiveView('dashboard')}
                        className="hp-interactive group inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-white font-bold transition-all duration-300 hover:-translate-y-1"
                        style={{ background: 'linear-gradient(135deg,#059669,#0d9488)', boxShadow: '0 12px 28px rgba(5,150,105,0.24)' }}
                    >
                        {copy('استكشف مساحة إدارة المزرعة', 'Explore the farm workspace')}
                        <I.arrow className="w-5 h-5 group-hover:translate-x-1 transition-transform rtl:rotate-180" />
                    </button>
                </div>

                <div className="grid gap-5">
                    {pillars.map((pillar, index) => (
                        <article
                            key={pillar.title}
                            className={`sr-right sr-delay-${(index + 1) * 100} hp-card-surface hp-feature-card rounded-3xl p-6 md:p-7`}
                        >
                            <div className="flex gap-5 items-start">
                                <div
                                    className="w-14 h-14 min-w-14 rounded-2xl flex items-center justify-center"
                                    style={{ color: pillar.color, background: `${pillar.color}12`, border: `1px solid ${pillar.color}24` }}
                                >
                                    {pillar.icon}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-[var(--ag-text)] mb-2">{pillar.title}</h3>
                                    <p className="text-sm md:text-base text-[var(--ag-text-muted)] leading-relaxed">{pillar.description}</p>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
};

// ─── HOW IT WORKS ────────────────────────────────────────────────────────────
const HowItWorksSection = () => {
    const { t } = useTranslation();
    const { copy } = useLocalizedCopy();
    const steps = [
        { icon: <I.camera className="w-8 h-8" />, number: t('homePage.howItWorks.step1.number'), title: t('homePage.howItWorks.step1.title'), desc: t('homePage.howItWorks.step1.desc'), color: '#059669' },
        { icon: <I.sparkles className="w-8 h-8" />, number: t('homePage.howItWorks.step2.number'), title: t('homePage.howItWorks.step2.title'), desc: t('homePage.howItWorks.step2.desc'), color: '#0d9488' },
        { icon: <I.check className="w-8 h-8" />, number: t('homePage.howItWorks.step3.number'), title: t('homePage.howItWorks.step3.title'), desc: t('homePage.howItWorks.step3.desc'), color: '#0ea5e9' },
    ];
    return (
        <section id="home-workflow" className="container mx-auto px-6 scroll-mt-28">
            <div className="text-center mb-16 sr-hidden">
                <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
                    style={{ background: 'linear-gradient(135deg,rgba(13,148,136,0.12),rgba(6,182,212,0.10))', border: '1px solid rgba(13,148,136,0.25)', color: '#0d9488' }}>
                    {copy('خطوات بسيطة ونتيجة قابلة للمتابعة', 'A simple workflow with trackable outcomes')}
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--ag-text)] mb-4">{t('homePage.howItWorks.title')}</h2>
                <p className="text-xl text-[var(--ag-text-muted)] max-w-2xl mx-auto">{t('homePage.howItWorks.subtitle')}</p>
                {/* Accent underline */}
                <div className="w-24 h-1.5 rounded-full mx-auto mt-6"
                    style={{ background: 'linear-gradient(90deg,#059669,#0d9488)' }} />
            </div>

            <div className="grid md:grid-cols-3 gap-10 relative">
                {steps.map((step, i) => (
                    <div key={i} className={`sr-zoom sr-delay-${(i+1)*200} relative text-center`}>
                        {/* Connector line */}
                        {i < 2 && (
                            <div className="hidden md:block hp-step-line"
                                style={{ background: `linear-gradient(90deg, ${step.color}80, transparent)` }} />
                        )}
                        <div className="relative z-10">
                            {/* Step badge */}
                            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full text-white text-sm font-extrabold mb-5 shadow-xl"
                                style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}aa)`, boxShadow: `0 8px 24px ${step.color}40` }}>
                                {step.number}
                            </div>
                            {/* Icon card */}
                            <div className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-6 shadow-xl hp-card-shine transition-all duration-300 hover:scale-110"
                                style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))`, border: `2px solid ${step.color}30`, color: step.color, boxShadow: `0 16px 40px ${step.color}20` }}>
                                {step.icon}
                            </div>
                            <h3 className="text-xl font-bold text-[var(--ag-text)] mb-3">{step.title}</h3>
                            <p className="text-[var(--ag-text-muted)] leading-relaxed text-sm max-w-xs mx-auto">{step.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

// ─── WHY CHOOSE US ───────────────────────────────────────────────────────────
const WhyChooseUsSection = () => {
    const { t } = useTranslation();
    const { copy } = useLocalizedCopy();
    const cards = [
        { icon: <I.leaf className="w-6 h-6" />,  title: t('homePage.whyUs.cards.accuracy.title'),  desc: t('homePage.whyUs.cards.accuracy.desc'),  color: '#059669', delay: 100 },
        { icon: <I.zap className="w-6 h-6" />,   title: t('homePage.whyUs.cards.speed.title'),    desc: t('homePage.whyUs.cards.speed.desc'),    color: '#f59e0b', delay: 200 },
        { icon: <I.globe className="w-6 h-6" />, title: t('homePage.whyUs.cards.community.title'), desc: t('homePage.whyUs.cards.community.desc'), color: '#0d9488', delay: 300 },
        { icon: <I.clock className="w-6 h-6" />, title: t('homePage.whyUs.cards.available.title'), desc: t('homePage.whyUs.cards.available.desc'), color: '#0ea5e9', delay: 400 },
    ];
    return (
        <section className="container mx-auto px-6">
            <div className="text-center mb-16 sr-hidden">
                <h2 className="text-3xl md:text-4xl font-bold text-[var(--ag-text)] mb-4">{t('homePage.whyUs.title')}</h2>
                <p className="text-lg text-[var(--ag-text-muted)] max-w-3xl mx-auto leading-relaxed">
                    {copy(
                        'تم تصميم المنصة لتكون عملية وسهلة الاستخدام، مع الحفاظ على عمق الأدوات التي يحتاجها المستخدم لإدارة المزرعة ومتابعة صحة النبات واتخاذ قرارات أفضل.',
                        'The platform is designed to stay approachable while still providing the depth needed to manage farms, monitor plant health, and make better decisions.'
                    )}
                </p>
                <div className="w-20 h-1.5 rounded-full mx-auto mt-6"
                    style={{ background: 'linear-gradient(90deg,#059669,#0d9488,#0ea5e9)' }} />
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {cards.map((c, i) => (
                    <div key={i} className={`sr-zoom sr-delay-${c.delay} group hp-card-shine hp-grad-border hp-why-card-surface p-8 rounded-3xl transition-all duration-500 cursor-default`}
                        style={{ border: `1px solid ${c.color}28` }}>
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-400 group-hover:scale-110 group-hover:rotate-6"
                            style={{ background: `linear-gradient(135deg, ${c.color}18, ${c.color}10)`, color: c.color, border: `1px solid ${c.color}25` }}>
                            {c.icon}
                        </div>
                        <h3 className="font-bold text-xl text-[var(--ag-text)] mb-3">{c.title}</h3>
                        <p className="text-[var(--ag-text-muted)] text-sm leading-relaxed">{c.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

// ─── SMART DIAGNOSIS SPOTLIGHT ───────────────────────────────────────────────
const SmartDiagnosisSection: React.FC<HomePageProps> = ({ setActiveView }) => {
    const { t } = useTranslation();
    return (
        <section className="container mx-auto px-6 py-8">
            <div className="grid md:grid-cols-2 gap-16 items-center">
                {/* Image */}
                <div className="sr-left relative group">
                    <div className="hp-img-wrap rounded-[2.5rem] shadow-2xl"
                        style={{ border: '3px solid rgba(16,185,129,0.3)', boxShadow: '0 32px 80px rgba(5,150,105,0.22)' }}>
                        <img
                            src="/images/avm-3d/plant-doctor-upload.png"
                            alt="AI Plant Diagnosis"
                            className="w-full h-[280px] sm:h-[400px] md:h-[580px] object-cover rounded-[2.5rem]"
                        />
                        <div className="hp-img-overlay rounded-[2.5rem]" />
                        {/* Scan line */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
                            <div className="hp-scan absolute left-0 right-0 h-0.5"
                                style={{ background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.9), rgba(52,211,153,0.7), transparent)', boxShadow: '0 0 24px rgba(52,211,153,0.6)' }} />
                        </div>
                        {/* Bottom overlay */}
                        <div className="absolute bottom-0 left-0 right-0 rounded-b-[2.5rem] p-7"
                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 bg-emerald-400 rounded-full" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                                <span className="font-mono text-sm text-emerald-400 uppercase tracking-widest">{t('homePage.smartDiagnosis.scannerStatus')}</span>
                            </div>
                            <p className="font-medium text-white text-base font-mono">{t('homePage.smartDiagnosis.scannerDesc')}</p>
                        </div>
                    </div>
                    {/* Glow effect */}
                    <div className="absolute inset-4 rounded-[2.5rem] -z-10 blur-3xl" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(13,148,136,0.2))' }} />
                </div>

                {/* Text */}
                <div className="sr-right">
                    <div className="inline-block px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider mb-6"
                        style={{ background: 'linear-gradient(135deg,rgba(13,148,136,0.12),rgba(5,150,105,0.08))', border: '1px solid rgba(13,148,136,0.25)', color: '#0d9488' }}>
                        {t('homePage.smartDiagnosis.eyebrow')}
                    </div>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--ag-text)] mb-6 leading-tight">{t('homePage.smartDiagnosis.title')}</h2>
                    <p className="text-xl text-[var(--ag-text-soft)] mb-4 leading-relaxed">{t('homePage.smartDiagnosis.subtitle')}</p>
                    <p className="text-base text-[var(--ag-text-muted)] mb-8 leading-relaxed">
                        {t('homePage.smartDiagnosis.description')}
                    </p>
                    <ul className="space-y-4 mb-8">
                        {[1, 2, 3, 4].map((item, idx) => (
                            <CheckListItem key={idx} text={t(`homePage.smartDiagnosis.checklist.item${item}`)} delay={`sr-delay-${(idx+1)*100}`} />
                        ))}
                    </ul>
                    <button
                        type="button"
                        onClick={() => setActiveView('doctor')}
                        className="group inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-bold shadow-xl transition-all duration-300 hover:-translate-y-1.5"
                        style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', boxShadow: '0 16px 40px rgba(5,150,105,0.30)' }}
                    >
                        {t('homePage.smartDiagnosis.tryButton')}
                        <I.arrow className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                    </button>
                </div>
            </div>
        </section>
    );
};

// ─── MAIN FEATURES ────────────────────────────────────────────────────────────
type FeatureDef = {
    icon: React.ReactNode;
    titleKey: string;
    descKey: string;
    onClick: () => void;
    badge: string;
    badgeColor: string;
    iconColor: string;
    gradStart: string;
    gradEnd: string;
};

interface MainFeaturesProps extends HomePageProps {
    onOpenChat?: () => void;
    onOpenVoice?: () => void;
}

const MainFeaturesSection: React.FC<MainFeaturesProps> = ({ setActiveView, onOpenChat, onOpenVoice }) => {
    const { t } = useTranslation();

    const badgeAiPowered  = t('homePage.mainFeatures.badgeAiPowered');
    const badgeKnowledge  = t('homePage.mainFeatures.badgeKnowledge');
    const badgeManagement = t('homePage.mainFeatures.badgeManagement');
    const badgeCommunity  = t('homePage.mainFeatures.badgeCommunity');

    const features: FeatureDef[] = [
        { icon: <I.brain className="w-8 h-8" />,     titleKey: 'homePage.mainFeatures.cards.plantDoctor.title',       descKey: 'homePage.mainFeatures.cards.plantDoctor.description',       onClick: () => setActiveView('doctor'),                                  badge: badgeAiPowered,  badgeColor: 'emerald', iconColor: '#059669', gradStart: '#d1fae5', gradEnd: '#a7f3d0' },
        { icon: <I.chat className="w-8 h-8" />,       titleKey: 'homePage.mainFeatures.cards.smartChat.title',         descKey: 'homePage.mainFeatures.cards.smartChat.description',         onClick: () => onOpenChat ? onOpenChat() : setActiveView('community'),   badge: badgeAiPowered,  badgeColor: 'emerald', iconColor: '#0891b2', gradStart: '#e0f2fe', gradEnd: '#bae6fd' },
        { icon: <I.mic className="w-8 h-8" />,        titleKey: 'homePage.mainFeatures.cards.voiceAssistant.title',    descKey: 'homePage.mainFeatures.cards.voiceAssistant.description',    onClick: () => onOpenVoice ? onOpenVoice() : setActiveView('doctor'),    badge: badgeAiPowered,  badgeColor: 'emerald', iconColor: '#e11d48', gradStart: '#ffe4e6', gradEnd: '#fecdd3' },
        { icon: <I.book className="w-8 h-8" />,       titleKey: 'homePage.mainFeatures.cards.growthGuide.title',       descKey: 'homePage.mainFeatures.cards.growthGuide.description',       onClick: () => setActiveView('guide'),                                   badge: badgeKnowledge,  badgeColor: 'lime',    iconColor: '#65a30d', gradStart: '#ecfccb', gradEnd: '#d9f99d' },
        { icon: <I.library className="w-8 h-8" />,    titleKey: 'homePage.mainFeatures.cards.diseaseLibrary.title',    descKey: 'homePage.mainFeatures.cards.diseaseLibrary.description',    onClick: () => setActiveView('library'),                                 badge: badgeKnowledge,  badgeColor: 'lime',    iconColor: '#0d9488', gradStart: '#ccfbf1', gradEnd: '#99f6e4' },
        { icon: <I.news className="w-8 h-8" />,       titleKey: 'homePage.mainFeatures.cards.news.title',              descKey: 'homePage.mainFeatures.cards.news.description',              onClick: () => setActiveView('news'),                                    badge: badgeKnowledge,  badgeColor: 'lime',    iconColor: '#d97706', gradStart: '#fef3c7', gradEnd: '#fde68a' },
        { icon: <I.chart className="w-8 h-8" />,      titleKey: 'homePage.mainFeatures.cards.dashboard.title',         descKey: 'homePage.mainFeatures.cards.dashboard.description',         onClick: () => setActiveView('dashboard'),                               badge: badgeManagement, badgeColor: 'teal',    iconColor: '#0d9488', gradStart: '#ccfbf1', gradEnd: '#99f6e4' },
        { icon: <I.map className="w-8 h-8" />,        titleKey: 'homePage.mainFeatures.cards.farmManagement.title',    descKey: 'homePage.mainFeatures.cards.farmManagement.description',    onClick: () => setActiveView('dashboard'),                               badge: badgeManagement, badgeColor: 'teal',    iconColor: '#059669', gradStart: '#dcfce7', gradEnd: '#bbf7d0' },
        { icon: <I.satellite className="w-8 h-8" />,  titleKey: 'homePage.mainFeatures.cards.satelliteMonitoring.title',descKey: 'homePage.mainFeatures.cards.satelliteMonitoring.description',onClick: () => setActiveView('dashboard'),                              badge: badgeManagement, badgeColor: 'teal',    iconColor: '#0284c7', gradStart: '#e0f2fe', gradEnd: '#bae6fd' },
        { icon: <I.dollar className="w-8 h-8" />,     titleKey: 'homePage.mainFeatures.cards.financeManager.title',    descKey: 'homePage.mainFeatures.cards.financeManager.description',    onClick: () => setActiveView('dashboard'),                               badge: badgeManagement, badgeColor: 'teal',    iconColor: '#d97706', gradStart: '#fef3c7', gradEnd: '#fde68a' },
        { icon: <I.users className="w-8 h-8" />,      titleKey: 'homePage.mainFeatures.cards.community.title',         descKey: 'homePage.mainFeatures.cards.community.description',         onClick: () => setActiveView('community'),                               badge: badgeCommunity,  badgeColor: 'amber',   iconColor: '#059669', gradStart: '#dcfce7', gradEnd: '#bbf7d0' },
        { icon: <I.phone className="w-8 h-8" />,      titleKey: 'homePage.mainFeatures.cards.expertSupport.title',     descKey: 'homePage.mainFeatures.cards.expertSupport.description',     onClick: () => setActiveView('contact'),                                 badge: badgeCommunity,  badgeColor: 'amber',   iconColor: '#d97706', gradStart: '#fff7ed', gradEnd: '#fed7aa' },
    ];

    const badgeGroups = [
        { label: badgeAiPowered,  color: '#059669', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
        { label: badgeKnowledge,  color: '#65a30d', bg: 'rgba(132,204,22,0.1)',  border: 'rgba(132,204,22,0.2)' },
        { label: badgeManagement, color: '#0d9488', bg: 'rgba(13,148,136,0.1)',  border: 'rgba(13,148,136,0.2)' },
        { label: badgeCommunity,  color: '#d97706', bg: 'rgba(217,119,6,0.1)',   border: 'rgba(217,119,6,0.2)' },
    ];

    return (
        <section id="home-features" className="container mx-auto px-4 scroll-mt-28">
            {/* Header */}
            <div className="text-center mb-12 sr-hidden">
                <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
                    style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.08))', border: '1px solid rgba(16,185,129,0.25)', color: '#059669' }}>
                    {t('homePage.mainFeatures.eyebrow')}
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--ag-text)] mb-5">{t('homePage.mainFeatures.title')}</h2>
                <p className="text-xl text-[var(--ag-text-muted)] max-w-3xl mx-auto">{t('homePage.mainFeatures.subtitle')}</p>
            </div>

            {/* Category legend */}
            <div className="flex flex-wrap justify-center gap-4 mb-12 sr-hidden sr-delay-100">
                {badgeGroups.map(g => (
                    <div key={g.label} className="flex items-center gap-2.5 px-5 py-2.5 rounded-full transition-all duration-300 hover:scale-105"
                        style={{ background: g.bg, border: `1px solid ${g.border}`, color: g.color }}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color, boxShadow: `0 0 8px ${g.color}` }} />
                        <span className="text-sm font-bold">{g.label}</span>
                    </div>
                ))}
            </div>

            {/* Feature grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-2">
                {features.map((f, i) => (
                    <FeatureGridCard key={i} feature={f} t={t} delay={Math.min((i % 4 + 1) * 100, 400)} />
                ))}
            </div>

            {/* Bottom banner */}
            <div className="mt-14 rounded-[2.5rem] p-8 md:p-12 text-center relative overflow-hidden sr-zoom sr-delay-200"
                style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 35%, #065f46 65%, #0f766e 100%)', boxShadow: '0 32px 80px rgba(5,150,105,0.35)' }}>
                <div className="absolute inset-0 opacity-[0.06]"
                    style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.25) 0%, transparent 60%)' }} />
                <div className="relative z-10">
                    <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-5 text-emerald-300"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 24px rgba(16,185,129,0.2)' }}>
                        <I.sparkles className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-3">{t('homePage.mainFeatures.platformBannerTitle')}</h3>
                    <p className="text-emerald-200 max-w-xl mx-auto mb-8 text-lg">
                        {t('homePage.mainFeatures.platformBannerDesc')}
                    </p>
                    <button
                        type="button"
                        onClick={() => setActiveView('doctor')}
                        className="inline-flex items-center gap-2 px-9 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
                        style={{ background: 'white', color: '#064e3b', boxShadow: '0 16px 40px rgba(0,0,0,0.25)' }}
                    >
                        {t('homePage.mainFeatures.platformBannerButton')}
                        <I.arrow className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </section>
    );
};

const FeatureGridCard: React.FC<{ feature: FeatureDef; t: (k: string) => string; delay: number }> = ({ feature: f, t, delay }) => {
    const badgeColorMap: Record<string, { bg: string; color: string }> = {
        emerald: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
        lime:    { bg: 'rgba(132,204,22,0.12)',  color: '#65a30d' },
        teal:    { bg: 'rgba(13,148,136,0.12)',  color: '#0d9488' },
        amber:   { bg: 'rgba(217,119,6,0.12)',   color: '#d97706' },
    };
    const bc = badgeColorMap[f.badgeColor] || badgeColorMap.emerald;

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={f.onClick}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    f.onClick();
                }
            }}
            aria-label={`${t(f.titleKey)} — ${t('homePage.mainFeatures.explore')}`}
            className={`hp-interactive sr-hidden sr-delay-${delay} group hp-feature-card hp-card-shine hp-card-surface relative overflow-hidden rounded-[1.75rem] p-7 cursor-pointer text-start rtl:text-right`}
        >
            {/* Top color strip */}
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-[1.75rem] opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(90deg, ${f.iconColor}, transparent)` }} />

            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full mb-5"
                style={{ background: bc.bg, color: bc.color }}>
                {f.badge}
            </span>

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-400 group-hover:scale-110 group-hover:rotate-3"
                style={{ background: `linear-gradient(135deg, ${f.gradStart}, ${f.gradEnd})`, color: f.iconColor, boxShadow: `0 8px 20px ${f.iconColor}20` }}>
                {f.icon}
            </div>

            {/* Text */}
            <h3 className="text-lg font-bold text-[var(--ag-text)] mb-2.5 transition-colors duration-200"
                style={{ color: undefined }}>
                {t(f.titleKey)}
            </h3>
            <p className="text-sm text-[var(--ag-text-muted)] leading-relaxed mb-5">
                {t(f.descKey)}
            </p>

            {/* Explore link */}
            <span className="inline-flex items-center gap-1.5 text-sm font-bold transition-all group-hover:gap-2.5"
                style={{ color: f.iconColor }}>
                {t('homePage.mainFeatures.explore')}
                <I.arrow className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>

            {/* Hover glow */}
            <div className="absolute inset-0 rounded-[1.75rem] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                style={{ background: `radial-gradient(ellipse at top left, ${f.iconColor}08, transparent 70%)` }} />
        </article>
    );
};

// ─── SUSTAINABLE IMPACT ──────────────────────────────────────────────────────
const SustainableImpactSection = () => {
    const { t } = useTranslation();
    return (
        <section className="container mx-auto px-4">
            <div className="relative text-white py-20 px-8 md:px-16 rounded-[3rem] overflow-hidden shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 35%, #065f46 65%, #134e4a 100%)', boxShadow: '0 40px 100px rgba(5,150,105,0.35)' }}>

                {/* Dot grid */}
                <div className="absolute inset-0 opacity-[0.07]"
                    style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                {/* Top glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full blur-3xl"
                    style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.3) 0%, transparent 70%)' }} />

                <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                    <div className="sr-left">
                        <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6"
                            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: '#6ee7b7' }}>
                            {t('homePage.sustainability.eyebrow')}
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-bold mb-5 leading-tight">{t('homePage.sustainability.title')}</h2>
                        <p className="text-emerald-100 text-lg leading-relaxed mb-6 opacity-90">{t('homePage.sustainability.subtitle')}</p>
                        <p className="text-emerald-200/80 text-base leading-relaxed mb-10">
                            {t('homePage.sustainability.description')}
                        </p>
                        <div className="grid grid-cols-3 gap-8 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                            <StatItem icon={<I.water className="w-6 h-6" />}  text={t('homePage.sustainability.stat1')} color="#38bdf8" />
                            <StatItem icon={<I.bug className="w-6 h-6" />}    text={t('homePage.sustainability.stat2')} color="#34d399" />
                            <StatItem icon={<I.plant className="w-6 h-6" />}  text={t('homePage.sustainability.stat3')} color="#86efac" />
                        </div>
                    </div>

                    <div className="sr-right relative">
                        <div className="hp-img-wrap rounded-3xl shadow-2xl transform md:rotate-[-3deg] md:translate-x-6 hover:rotate-0 transition-all duration-700 group"
                            style={{ border: '4px solid rgba(255,255,255,0.12)', boxShadow: '0 32px 64px rgba(0,0,0,0.3)' }}>
                            <img
                                src="/images/avm-3d/auth-farm-ai.png"
                                alt="Sustainable Farming"
                                className="w-full h-[240px] sm:h-[320px] md:h-[420px] object-cover rounded-3xl"
                            />
                            <div className="hp-img-overlay rounded-3xl" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const StatItem = ({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) => (
    <div className="text-center group cursor-default">
        <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110"
            style={{ background: `rgba(255,255,255,0.10)`, color, border: '1px solid rgba(255,255,255,0.12)', boxShadow: `0 8px 20px ${color}30` }}>
            {icon}
        </div>
        <p className="font-bold text-sm text-emerald-100">{text}</p>
    </div>
);

// ─── GROWTH GUIDE SPOTLIGHT ──────────────────────────────────────────────────
const GrowthGuideSection: React.FC<HomePageProps> = ({ setActiveView }) => {
    const { t } = useTranslation();
    const { copy } = useLocalizedCopy();
    return (
        <section className="container mx-auto px-6 py-8">
            <div className="grid md:grid-cols-2 gap-16 items-center">
                {/* Text */}
                <div className="sr-left">
                    <div className="inline-block px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider mb-6"
                        style={{ background: 'rgba(101,163,13,0.12)', border: '1px solid rgba(101,163,13,0.25)', color: '#65a30d' }}>
                        {copy('قاعدة المعرفة الزراعية', 'Agricultural knowledge base')}
                    </div>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--ag-text)] mb-5 leading-tight">{t('homePage.growthGuide.title')}</h2>
                    <p className="text-xl text-[var(--ag-text-soft)] mb-4 leading-relaxed">{t('homePage.growthGuide.subtitle')}</p>
                    <p className="text-base text-[var(--ag-text-muted)] mb-8 leading-relaxed">
                        {copy(
                            'يوفر دليل النمو محتوى منظمًا حول العناية بالنباتات والري والإضاءة والتربة والظروف المناسبة، مع دعم البحث والتصفية للوصول إلى المعلومة بسرعة.',
                            'The Growth Guide organizes practical information about plant care, watering, sunlight, soil, and growing conditions, with search and filters for faster access.'
                        )}
                    </p>
                    <ul className="space-y-4 mb-8">
                        <CheckListItem text={t('homePage.growthGuide.checklist.item1')} delay="sr-delay-100" />
                        <CheckListItem text={t('homePage.growthGuide.checklist.item3')} delay="sr-delay-200" />
                        <CheckListItem text={t('homePage.growthGuide.checklist.item4')} delay="sr-delay-300" />
                        <CheckListItem text={t('homePage.growthGuide.checklist.item6')} delay="sr-delay-400" />
                    </ul>
                    <button
                        type="button"
                        onClick={() => setActiveView('guide')}
                        className="group inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-bold shadow-xl transition-all duration-300 hover:-translate-y-1.5"
                        style={{ background: 'linear-gradient(135deg, #65a30d, #4d7c0f)', boxShadow: '0 16px 40px rgba(101,163,13,0.28)' }}
                    >
                        {copy('تصفح أدلة النمو', 'Browse growth guides')}
                        <I.arrow className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                    </button>
                </div>

                {/* Image */}
                <div className="sr-right relative group">
                    <div className="absolute inset-0 rounded-[2.5rem] blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-700"
                        style={{ background: 'linear-gradient(135deg, rgba(101,163,13,0.4), rgba(77,124,15,0.3))' }} />
                    <div className="hp-img-wrap relative z-10 rounded-[2.5rem] shadow-2xl"
                        style={{ border: '3px solid rgba(101,163,13,0.25)', boxShadow: '0 32px 80px rgba(101,163,13,0.22)' }}>
                        <img
                            src="/images/avm-3d/news-organic.png"
                            alt="Healthy Plant Growth"
                            className="w-full h-[260px] sm:h-[380px] md:h-[520px] object-cover rounded-[2.5rem]"
                        />
                        <div className="hp-img-overlay rounded-[2.5rem]" />
                        {/* Tags overlay */}
                        <div className="absolute bottom-6 left-6 right-6 z-20 flex gap-2.5 flex-wrap">
                            {[copy('💧 الري', '💧 Watering'), copy('☀️ الإضاءة', '☀️ Sunlight'), copy('🌱 التربة', '🌱 Soil'), copy('🌡️ الحرارة', '🌡️ Temperature')].map((tag, i) => (
                                <div key={i} className="text-[var(--ag-text)] px-3.5 py-2 rounded-full text-xs font-bold shadow whitespace-nowrap"
                                    style={{ background: 'rgba(245,252,248,0.94)', border: '1px solid rgba(47,138,87,0.18)' }}>
                                    {tag}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── ADVANCED DASHBOARD SPOTLIGHT ────────────────────────────────────────────
const AdvancedDashboardSection: React.FC<HomePageProps> = ({ setActiveView }) => {
    const { t } = useTranslation();
    const { copy } = useLocalizedCopy();
    return (
        <section className="container mx-auto px-6 py-8">
            <div className="text-center mb-14 sr-hidden">
                <div className="inline-block px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider mb-4"
                    style={{ background: 'rgba(13,148,136,0.10)', border: '1px solid rgba(13,148,136,0.22)', color: '#0d9488' }}>
                    {copy('ذكاء وإدارة المزرعة', 'Farm intelligence')}
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--ag-text)] mb-5">{t('homePage.advancedDashboard.title')}</h2>
                <p className="max-w-2xl mx-auto text-[var(--ag-text-soft)] text-xl mb-4">{t('homePage.advancedDashboard.subtitle')}</p>
                <p className="max-w-2xl mx-auto text-[var(--ag-text-muted)] text-base">
                    {copy(
                        'تجمع لوحة التحكم المزارع والمواسم والمهام ونتائج التشخيص والطقس والمراقبة الفضائية والسجلات المالية، لتقديم صورة تشغيلية موحدة في مكان واحد.',
                        'The dashboard brings together farms, cycles, tasks, diagnoses, weather, satellite monitoring, and financial records into one operational view.'
                    )}
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Image */}
                <div className="sr-left relative group">
                    <div className="absolute inset-4 rounded-[2.5rem] blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-700"
                        style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.5), rgba(13,148,136,0.4))' }} />
                    <div className="hp-img-wrap relative z-10 rounded-[2.5rem] shadow-2xl group-hover:rotate-1 transition-all duration-500"
                        style={{ border: '3px solid rgba(13,148,136,0.2)', boxShadow: '0 32px 80px rgba(13,148,136,0.22)' }}>
                        <img
                            src="/images/avm-3d/news-smart-farming.png"
                            alt="Drone Farm Monitoring"
                            className="w-full h-[240px] sm:h-[360px] md:h-[480px] object-cover rounded-[2.5rem]"
                        />
                        <div className="absolute inset-0 rounded-[2.5rem]"
                            style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.15) 0%, rgba(13,148,136,0.10) 100%)', pointerEvents: 'none' }} />
                    </div>
                </div>

                {/* Info cards */}
                <div className="space-y-5">
                    {[
                        { icon: <I.chart className="w-6 h-6" />,     title: t('homePage.advancedDashboard.cards.recoveryTracking.title'),  desc: t('homePage.advancedDashboard.cards.recoveryTracking.description'),  color: '#0d9488', delay: 100 },
                        { icon: <I.map className="w-6 h-6" />,       title: t('homePage.advancedDashboard.cards.farmManagement.title'),     desc: t('homePage.advancedDashboard.cards.farmManagement.description'),     color: '#059669', delay: 200 },
                        { icon: <I.shield className="w-6 h-6" />,    title: t('homePage.advancedDashboard.cards.diseaseLibrary.title'),     desc: t('homePage.advancedDashboard.cards.diseaseLibrary.description'),     color: '#0d9488', delay: 300 },
                        { icon: <I.drone className="w-6 h-6" />,     title: copy('المراقبة الفضائية والجغرافية', 'Satellite and geo intelligence'), desc: copy('اعرض مؤشرات الغطاء النباتي وصور الحقول للمساعدة في اكتشاف مؤشرات الإجهاد مبكرًا.', 'View vegetation indicators and field imagery to help identify early signs of crop stress.'),                           color: '#0284c7', delay: 400 },
                    ].map((item, i) => (
                        <div key={i} className={`sr-right sr-delay-${item.delay} hp-card-shine p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
                            style={{ background: 'var(--ag-surface-strong)', border: `1px solid ${item.color}18`, boxShadow: `0 2px 10px ${item.color}0a` }}>
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl flex-shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${item.color}18, ${item.color}10)`, color: item.color, border: `1px solid ${item.color}20` }}>
                                    {item.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-[var(--ag-text)] mb-1">{item.title}</h3>
                                    <p className="text-sm text-[var(--ag-text-muted)] leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setActiveView('dashboard')}
                            className="group inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-bold shadow-xl transition-all duration-300 hover:-translate-y-1.5"
                            style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', boxShadow: '0 16px 40px rgba(5,150,105,0.30)' }}
                        >
                            {copy('فتح لوحة التحكم', 'Open dashboard')}
                            <I.arrow className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── RESPONSIBLE DECISION SUPPORT ────────────────────────────────────────────
const ResponsibleAiSection: React.FC<Pick<HomePageProps, 'setActiveView'>> = ({ setActiveView }) => {
    const { copy } = useLocalizedCopy();

    const notes = [
        copy('احتفظ بسجل التشخيص والصور وملاحظات المتابعة بدل الاعتماد على نتيجة منفصلة.', 'Keep diagnosis, images, and follow-up notes together instead of relying on an isolated result.'),
        copy('قارن النتيجة ببيانات الطقس وحالة المزرعة قبل اتخاذ إجراء علاجي.', 'Compare the result with weather and farm context before taking treatment action.'),
        copy('استعن بمتخصص زراعي عند الحالات الشديدة أو غير الواضحة.', 'Consult an agricultural specialist for severe or unclear cases.'),
    ];

    return (
        <section className="container mx-auto px-6">
            <div className="relative overflow-hidden rounded-[2.5rem] hp-card-surface p-8 md:p-12">
                <div
                    className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 w-1/2 pointer-events-none"
                    style={{ background: 'radial-gradient(circle at center, rgba(16,185,129,0.12), transparent 70%)' }}
                />
                <div className="relative z-10 grid lg:grid-cols-[0.8fr_1.2fr] gap-10 items-center">
                    <div className="sr-left">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                            style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.24)' }}
                        >
                            <I.shield className="w-8 h-8" />
                        </div>
                        <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                            {copy('استخدام مسؤول للذكاء الاصطناعي', 'Responsible AI use')}
                        </span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--ag-text)] mt-3 mb-4">
                            {copy('المنصة تساعدك على اتخاذ القرار ولا تستبدل الخبرة الزراعية', 'The platform supports decisions; it does not replace agricultural expertise')}
                        </h2>
                        <p className="text-[var(--ag-text-muted)] leading-relaxed">
                            {copy(
                                'نتائج التحليل تُستخدم كإشارة مساعدة ضمن سجل المزرعة، ويجب مراجعتها مع الأعراض الفعلية والظروف البيئية قبل تطبيق أي علاج.',
                                'Analysis results are decision-support signals. Review them alongside visible symptoms and environmental conditions before applying treatment.'
                            )}
                        </p>
                    </div>

                    <div className="sr-right">
                        <ul className="space-y-4 mb-7">
                            {notes.map((note) => (
                                <li key={note} className="flex gap-3 items-start text-[var(--ag-text-soft)]">
                                    <span className="mt-0.5 w-7 h-7 min-w-7 rounded-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                                        <I.check className="w-4 h-4" />
                                    </span>
                                    <span className="leading-relaxed">{note}</span>
                                </li>
                            ))}
                        </ul>
                        <button
                            type="button"
                            onClick={() => setActiveView('contact')}
                            className="hp-interactive group inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-white transition-all duration-300 hover:-translate-y-1"
                            style={{ background: 'linear-gradient(135deg,#0f766e,#059669)' }}
                        >
                            {copy('التواصل وطلب الدعم', 'Contact and support')}
                            <I.arrow className="w-5 h-5 group-hover:translate-x-1 transition-transform rtl:rotate-180" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── CTA ─────────────────────────────────────────────────────────────────────
const CTASection: React.FC<HomePageProps> = ({ setActiveView, onOpenSignup }) => {
    const { t } = useTranslation();
    const { copy } = useLocalizedCopy();
    return (
        <section className="container mx-auto px-6 pb-8">
            <div className="relative rounded-[3rem] text-white p-12 md:p-24 text-center shadow-2xl overflow-hidden isolate group sr-zoom"
                style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 40%, #0f766e 100%)', boxShadow: '0 40px 100px rgba(5,150,105,0.40)' }}>

                {/* Background image */}
                <div className="absolute inset-0 z-[-1]">
                    <img
                        src="/images/avm-3d/news-wheat.png"
                        alt="Farm Sunrise"
                        className="w-full h-full object-cover opacity-25 group-hover:scale-105 transition-transform duration-[15s]"
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(2,44,34,0.85) 0%, rgba(2,44,34,0.40) 100%)' }} />
                </div>

                {/* Animated glow top */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[150px] blur-3xl -z-0"
                    style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.35) 0%, transparent 70%)' }} />

                {/* Dot grid overlay */}
                <div className="absolute inset-0 opacity-[0.05]"
                    style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest mb-7"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#6ee7b7' }}>
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="hp-pulse-ring absolute inline-flex h-full w-full" style={{ borderColor: 'rgba(110,231,183,0.5)' }} />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                        </span>
                        {copy('ابدأ من التشخيص ثم تابع داخل مزرعتك', 'Start with diagnosis, then continue inside your farm workspace')}
                    </div>

                    <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">{t('homePage.cta.title')}</h2>
                    <p className="max-w-2xl mx-auto text-emerald-100 text-xl leading-relaxed mb-5">{t('homePage.cta.subtitle')}</p>
                    <p className="max-w-xl mx-auto text-emerald-200/70 text-base leading-relaxed mb-14">
                        {copy(
                            'اجمع تشخيص النبات، إدارة المزرعة، أدلة النمو، مكتبة الأمراض، الطقس، المراقبة الفضائية، السجلات المالية، والمجتمع داخل تجربة واحدة.',
                            'Bring plant diagnosis, farm management, growth guides, disease knowledge, weather, satellite monitoring, finance, and community into one experience.'
                        )}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            type="button"
                            onClick={() => setActiveView('doctor')}
                            className="inline-flex items-center gap-3 px-10 py-5 font-bold text-xl rounded-full shadow-2xl transition-all duration-300 hover:-translate-y-2"
                            style={{ background: 'white', color: '#064e3b', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
                        >
                            {t('homePage.cta.button')}
                            <I.arrow className="w-6 h-6" />
                        </button>
                        <button
                            type="button"
                            onClick={onOpenSignup}
                            className="inline-flex items-center gap-3 px-10 py-5 font-bold text-xl rounded-full transition-all duration-300 hover:-translate-y-2 hover:bg-white/20"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.22)', color: 'white' }}
                        >
                            {t('homePage.landing.cta.secondary')}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── Shared Primitives ────────────────────────────────────────────────────────
const CheckListItem: React.FC<{ text: string; delay?: string }> = ({ text, delay = '' }) => (
    <li className={`sr-hidden ${delay} flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md`}
        style={{ background: 'var(--ag-surface-strong)', border: '1px solid rgba(16,185,129,0.14)' }}>
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
            <I.check className="w-4 h-4" />
        </div>
        <span className="text-[var(--ag-text)] font-medium text-base">{text}</span>
    </li>
);

export default HomePage;
