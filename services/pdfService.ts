
import type { PlantDiagnosis, GrowthGuideData } from '../types';
import { translations } from '../translations';

// --- ICONS (as SVG strings) ---
const Icon = {
    Doctor: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 4 13V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M15 4A7 7 0 0 1 22 11v10"></path><path d="M12 11a2 2 0 0 0 2 2h2a2 2 0 0 0 0-4h-2a2 2 0 0 1-2-2Z"></path></svg>`,
    Guide: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`,
    VisualCues: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    Symptoms: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    Treatment: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10c0-2.6-2.2-4.8-5-5"></path><path d="M12 2v2"></path><path d="M12 7h.01"></path></svg>`,
    Products: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`,
    Prevention: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
    Advisory: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.94 18.06A12.02 12.02 0 0 1 12 22C6.48 22 2 17.52 2 12S6.48 2 12 2c2.59 0 4.96.8 6.94 2.19"></path><path d="M16 16c-1.5-1.5-3-2-4.5-2s-3 .5-4.5 2"></path><path d="M17 11a.5.5 0 0 1 .5.5 2 2 0 0 1-4 0 .5.5 0 0 1 .5-.5h3Z"></path></svg>`,
    Planting: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a2.5 2.5 0 0 1 2.5 2.5c0 1.06-.5 2.03-1.25 2.5"/><path d="M12 2a2.5 2.5 0 0 0-2.5 2.5c0 1.06.5 2.03 1.25 2.5"/><path d="M12 12v10"/><path d="M7 12a5 5 0 0 0 5-5 5 5 0 0 0 5 5Z"/></svg>`,
    Watering: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
    SunCare: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
    Soil: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22h20"/><path d="M11.29 14.71a6.13 6.13 0 0 1-1.18 2.53 6.13 6.13 0 0 1-2.53 1.18c-2.2.56-4.59-1.83-4.03-4.03a6.13 6.13 0 0 1 1.18-2.53 6.13 6.13 0 0 1 2.53-1.18c2.2-.56 4.59 1.83 4.03 4.03Z"/><path d="M12.71 14.71a6.13 6.13 0 0 1 1.18-2.53 6.13 6.13 0 0 1 2.53-1.18c2.2-.56 4.59 1.83 4.03 4.03a6.13 6.13 0 0 1-1.18 2.53 6.13 6.13 0 0 1 2.53-1.18c-2.2.56-4.59-1.83-4.03-4.03Z"/></svg>`,
    Fertilizer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-4-3-5s-3-2-3-3V4"/><path d="M8 16h8"/></svg>`,
    Pruning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 4 20"/><circle cx="6" cy="18" r="3"/><path d="M14.88 14.88 12 12"/></svg>`,
    Pests: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 15.38c0-.84-.68-1.52-1.52-1.52H5.52C4.68 13.86 4 14.54 4 15.38v.52c0 .84.68 1.52 1.52 1.52h12.96c.84 0 1.52-.68 1.52-1.52v-.52z"/><path d="M4.52 13.86V6.52C4.52 5.68 4 5 3.48 5S2.44 5.68 2.44 6.52v7.34"/><path d="M19.48 13.86V6.52c0-.84-.52-1.52-1.04-1.52s-1.04.68-1.04 1.52v7.34"/><path d="M10 13.86V5.5c0-1.1.9-2 2-2s2 .9 2 2v8.36"/></svg>`,
    Facts: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`,
    Sun: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
    Moon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
    Translate: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`,
    Print: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`
};

// --- NEW I18N HELPERS ---
const geti18nText = (key: string, lang: 'en' | 'ar', params?: { [key: string]: string | number }) => {
    const getNestedTranslation = (language: 'en' | 'ar', key: string): string | undefined => {
        return key.split('.').reduce((obj, k) => (obj as any)?.[k], translations[language]);
    }
    
    let enText = getNestedTranslation('en', key) || key;
    let arText = getNestedTranslation('ar', key) || enText;

    if (params) {
        Object.keys(params).forEach(paramKey => {
            const value = String(params[paramKey]);
            enText = enText.replace(`{{${paramKey}}}`, value);
            arText = arText.replace(`{{${paramKey}}}`, value);
        });
    }

    return {
        en: enText,
        ar: arText,
        current: lang === 'ar' ? arText : enText
    };
};

const i18nAttr = (key: string, params?: { [key: string]: string | number }) => {
    const enText = geti18nText(key, 'en', params).en.replace(/"/g, '&quot;');
    const arText = geti18nText(key, 'ar', params).ar.replace(/"/g, '&quot;');
    return `data-lang-en="${enText}" data-lang-ar="${arText}"`;
};


const displayHtmlInNewTab = (html: string) => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
        newWindow.document.open();
        newWindow.document.write(html);
        newWindow.document.close();
        newWindow.focus();
    } else {
        alert('Could not open report. Please disable your popup blocker and try again.');
    }
};

const generatePdfShell = (title: string, bodyHtml: string, initialLang: 'en' | 'ar', initialThemeDark: boolean) => {
    const isRTL = initialLang === 'ar';
    const initialThemeClass = initialThemeDark ? 'dark' : '';
    
    const html = `
        <!DOCTYPE html>
        <html lang="${initialLang}" dir="${isRTL ? 'rtl' : 'ltr'}" class="${initialThemeClass}">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Poppins:wght@400;600;700&family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
            <style>
                :root {
                    --bg-light: #f9fafb; --bg-dark: #111827; --card-bg-light: #ffffff; --card-bg-dark: #1f2937;
                    --text-light: #1f2937; --text-dark: #d1d5db; --text-muted-light: #6b7280; --text-muted-dark: #9ca3af;
                    --border-light: #e5e7eb; --border-dark: #374151; --accent: #3CB371; --accent-dark: #2e8b57;
                }
                html.dark {
                    --bg-light: var(--bg-dark); --card-bg-light: var(--card-bg-dark); --text-light: var(--text-dark);
                    --text-muted-light: var(--text-muted-dark); --border-light: var(--border-dark);
                }
                body { font-family: 'Poppins', 'Tajawal', 'Cairo', sans-serif; background-color: var(--bg-light); color: var(--text-light); margin: 0; padding: 0; transition: background-color 0.3s, color 0.3s; -webkit-print-color-adjust: exact; }
                .page-container { max-width: 800px; margin: 20px auto; }
                .controls { background-color: var(--card-bg-light); padding: 10px 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-bottom: 20px; border: 1px solid var(--border-light); }
                .controls .group { display: flex; align-items: center; gap: 10px; }
                .controls button { background-color: transparent; border: 1px solid var(--border-light); color: var(--text-muted-light); padding: 8px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: inherit; font-size: 14px; }
                .controls button:hover { background-color: var(--bg-light); border-color: #9ca3af; }
                .controls button svg { width: 16px; height: 16px; }
                .page { background: var(--card-bg-light); border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid var(--border-light); }
                .footer { text-align: center; margin-top: 20px; padding: 15px 20px; font-size: 12px; color: var(--text-muted-light); }
                .rtl { direction: rtl; }
                .ltr { direction: ltr; }
                @media print {
                    body { margin: 0; padding: 0; background-color: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .controls, .footer { display: none; }
                    .page-container { margin: 0; padding: 0; width: 100%; max-width: 100%; box-shadow: none; }
                    .page { border: none; box-shadow: none; border-radius: 0; margin: 0; }
                    /* Ensure dark mode colors are reverted for printing */
                    html, html.dark {
                        --bg-light: #ffffff; --card-bg-light: #ffffff; --text-light: #000000;
                        --text-muted-light: #4b5563; --border-light: #e5e7eb;
                    }
                    html.dark body { background-color: #ffffff !important; color: #000000 !important; }
                }
            </style>
        </head>
        <body>
            <div class="page-container">
                <div class="controls">
                    <div class="group">
                        <button id="theme-toggle" title="${geti18nText('pdf.toggleTheme', initialLang).current}">
                            <span class="theme-icon-sun">${Icon.Sun}</span>
                            <span class="theme-icon-moon" style="display:none;">${Icon.Moon}</span>
                            <span class="label" ${i18nAttr('pdf.theme')}>${geti18nText('pdf.theme', initialLang).current}</span>
                        </button>
                        <button id="lang-toggle" title="${geti18nText('pdf.toggleLang', initialLang).current}">
                            ${Icon.Translate}
                            <span class="label" ${i18nAttr('pdf.language')}>${geti18nText('pdf.language', initialLang).current}</span>
                        </button>
                    </div>
                     <div class="group">
                        <button id="print-button">
                            ${Icon.Print}
                            <span class="label" ${i18nAttr('pdf.print')}>${geti18nText('pdf.print', initialLang).current}</span>
                        </button>
                    </div>
                </div>
                <div class="page">${bodyHtml}</div>
                <div class="footer">
                    <span ${i18nAttr('footer.copyright', { year: new Date().getFullYear() })}>
                        ${geti18nText('footer.copyright', initialLang, { year: new Date().getFullYear() }).current}
                    </span>
                </div>
            </div>
            <script>
                const themeToggle = document.getElementById('theme-toggle');
                const langToggle = document.getElementById('lang-toggle');
                const printButton = document.getElementById('print-button');
                const htmlEl = document.documentElement;
                const sunIcon = document.querySelector('.theme-icon-sun');
                const moonIcon = document.querySelector('.theme-icon-moon');

                const updateThemeIcons = (isDark) => {
                    sunIcon.style.display = isDark ? 'none' : 'block';
                    moonIcon.style.display = isDark ? 'block' : 'none';
                };
                
                themeToggle.addEventListener('click', () => {
                    htmlEl.classList.toggle('dark');
                    const isDark = htmlEl.classList.contains('dark');
                    sessionStorage.setItem('reportTheme', isDark ? 'dark' : 'light');
                    updateThemeIcons(isDark);
                });

                langToggle.addEventListener('click', () => {
                    const newLang = htmlEl.lang === 'en' ? 'ar' : 'en';
                    htmlEl.lang = newLang;
                    htmlEl.dir = newLang === 'ar' ? 'rtl' : 'ltr';
                    document.querySelectorAll('[data-lang-en]').forEach(el => {
                        const newText = el.getAttribute('data-lang-' + newLang);
                        if (el.tagName.toLowerCase() === 'span' && el.classList.contains('label')) {
                             // Find the button parent to update its title
                            const parentButton = el.closest('button');
                            if (parentButton) {
                                if (parentButton.id === 'theme-toggle') parentButton.title = el.getAttribute('data-lang-' + newLang);
                                if (parentButton.id === 'lang-toggle') parentButton.title = el.getAttribute('data-lang-' + newLang);
                            }
                        }
                        el.textContent = newText;
                    });
                });
                
                printButton.addEventListener('click', () => window.print());

                // Set initial states
                const savedTheme = sessionStorage.getItem('reportTheme');
                if ((savedTheme === 'dark') || (!savedTheme && htmlEl.classList.contains('dark'))) {
                    htmlEl.classList.add('dark');
                    updateThemeIcons(true);
                } else {
                    htmlEl.classList.remove('dark');
                    updateThemeIcons(false);
                }
            </script>
        </body>
        </html>
    `;
    displayHtmlInNewTab(html);
};

// --- Diagnosis PDF Content ---
export const generateDiagnosisPdf = (diagnosis: PlantDiagnosis, image: string, t: Function, lang: 'en' | 'ar', isDarkMode: boolean) => {
    const isRTL = lang === 'ar';
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const enDate = new Date().toLocaleString('en-US', dateOptions as Intl.DateTimeFormatOptions);
    const arDate = new Date().toLocaleString('ar-EG', dateOptions as Intl.DateTimeFormatOptions);
    const reportDate = isRTL ? arDate : enDate;

    const getHealthMeterHTML = (percentage: number) => {
        const radius = 50; const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;
        let color = '#22c55e'; if (percentage < 75) color = '#f59e0b'; if (percentage < 40) color = '#ef4444';
        return `<div style="position: relative; width: 120px; height: 120px; margin: 10px auto;"><svg style="width: 100%; height: 100%;" viewBox="0 0 120 120"><circle stroke="var(--border-light)" stroke-width="10" fill="transparent" r="${radius}" cx="60" cy="60" /><circle stroke="${color}" stroke-dashoffset="${offset}" stroke-width="10" stroke-dasharray="${circumference}" stroke-linecap="round" fill="transparent" r="${radius}" cx="60" cy="60" transform="rotate(-90 60 60)" /></svg><span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px; font-weight: bold;">${percentage}%</span></div>`;
    };

     const getAdvisoryCard = (advisory: PlantDiagnosis['humanConsumptionAdvisory'], lang: 'en' | 'ar') => {
        if (!advisory) return '';
        const advisoryClass = `advisory-card advisory-${advisory.safetyStatus}`;
        const symptomsHtml = (advisory.symptoms && advisory.symptoms.length > 0) ? `
            <div>
                <strong ${i18nAttr('plantDoctor.consumptionAdvisory.symptomsTitle')}>
                    ${geti18nText('plantDoctor.consumptionAdvisory.symptomsTitle', lang).current}
                </strong>
                <ul class="styled-list">${advisory.symptoms.map(s => `<li>${s}</li>`).join('')}</ul>
            </div>` : '';
        const whatToDoHtml = advisory.whatToDo ? `
            <div style="margin-top: 10px;">
                <strong ${i18nAttr('plantDoctor.consumptionAdvisory.whatToDoTitle')}>
                    ${geti18nText('plantDoctor.consumptionAdvisory.whatToDoTitle', lang).current}
                </strong>
                <p style="margin-top: 4px; margin-bottom: 0;">${advisory.whatToDo}</p>
            </div>` : '';
        return `<div class="section"><h2 class="section-title">${Icon.Advisory} <span ${i18nAttr('plantDoctor.consumptionAdvisory.mainTitle')}>${geti18nText('plantDoctor.consumptionAdvisory.mainTitle', lang).current}</span></h2><div class="${advisoryClass}"><h3 style="margin-top:0; font-size: 16px;">${advisory.title}</h3><p style="font-size: 14px; margin-bottom: 10px;">${advisory.summary}</p>${symptomsHtml}${whatToDoHtml}</div></div>`;
    };

    const diagnosisBodyHtml = `
     <style>
        .pdf-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid var(--accent); padding: 15px 20px; }
        .pdf-header-title { display: flex; align-items: center; gap: 10px; } .pdf-header svg { height: 32px; width: 32px; background-color: var(--accent); color: white; padding: 4px; border-radius: 6px; }
        .pdf-header h1 { color: var(--accent); margin: 0; font-size: 24px; } .pdf-header-date { font-size: 12px; color: var(--text-muted-light); }
        .content-grid { display: grid; grid-template-columns: 250px 1fr; gap: 20px; padding: 20px; }
        .main-image { width: 100%; border-radius: 8px; object-fit: cover; }
        .card { background-color: var(--bg-light); border: 1px solid var(--border-light); border-radius: 8px; padding: 15px; margin-bottom: 15px; }
        .card h3 { margin-top: 0; font-size: 14px; font-weight: bold; }
        .section { padding: 0 20px 15px; }
        .section-title { display: flex; align-items: center; gap: 8px; font-size: 20px; color: var(--accent-dark); border-bottom: 1px solid var(--border-light); padding-bottom: 5px; margin-top: 0; margin-bottom: 15px; }
        .styled-list { padding-${isRTL ? 'right' : 'left'}: 20px; } .styled-list li { margin-bottom: 8px; }
        .product { border: 1px solid var(--border-light); padding: 10px; border-radius: 6px; margin-bottom: 8px; } .product .name { font-weight: bold; }
        .product .type { font-size: 12px; background-color: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; display: inline-block; margin: 0 5px; }
        html.dark .product .type { background-color: #1e3a8a; color: #bfdbfe; }
        .status-card-healthy { background-color: #f0fdf4; border-color: #bbf7d0; }
        .status-card-sick { background-color: #fef2f2; border-color: #fecaca; }
        html.dark .status-card-healthy { background-color: #052e16; border-color: #15803d; color: #d1fae5; }
        html.dark .status-card-sick { background-color: #3f0000; border-color: #b91c1c; color: #fee2e2; }
        html.dark .status-card-sick p, html.dark .status-card-healthy p { color: inherit; }
        .advisory-card { border-radius: 0 8px 8px 0; margin-top: 10px; padding: 15px; border-left: 4px solid; }
        .advisory-safe { border-left-color: #22c55e; background-color: #f0fdf4; }
        .advisory-caution { border-left-color: #f59e0b; background-color: #fffbeb; }
        .advisory-toxic { border-left-color: #ef4444; background-color: #fef2f2; }
        .advisory-unknown { border-left-color: #6b7280; background-color: #f9fafb; }
        html.dark .advisory-safe { background-color: #052e16; color: #d1fae5; }
        html.dark .advisory-caution { background-color: #422006; color: #fef3c7; }
        html.dark .advisory-toxic { background-color: #3f0000; color: #fee2e2; }
        html.dark .advisory-unknown { background-color: #1f2937; color: #d1d5db; }
    </style>
    <div class="pdf-header">
        <div class="pdf-header-title">${Icon.Doctor}<h1 ${i18nAttr('pdf.reportTitle')}>${geti18nText('pdf.reportTitle', lang).current}</h1></div>
        <div class="pdf-header-date" data-lang-en="${enDate}" data-lang-ar="${arDate}">${reportDate}</div>
    </div>
    <div class="content-grid">
        <div class="left-column">
            <img src="${image}" alt="${diagnosis.plantName}" class="main-image">
            <div class="card"><h3 ${i18nAttr('plantDoctor.healthScore')}>${geti18nText('plantDoctor.healthScore', lang).current}</h3>${getHealthMeterHTML(diagnosis.healthPercentage)}</div>
            <div class="card"><h3 ${i18nAttr('plantDoctor.growthStageTitle')}>${geti18nText('plantDoctor.growthStageTitle', lang).current}</h3><p><strong>${diagnosis.growthStage}</strong></p><p style="font-size: 12px; font-style: italic;">${diagnosis.growthStageReasoning}</p></div>
        </div>
        <div class="right-column">
            <div class="card ${diagnosis.isHealthy ? 'status-card-healthy' : 'status-card-sick'}">
                <p><strong><span ${i18nAttr('plantDoctor.identifiedPlant')}>${geti18nText('plantDoctor.identifiedPlant', lang).current}</span>:</strong> ${diagnosis.plantName}</p>
                ${!diagnosis.isHealthy ? `<p><strong><span ${i18nAttr('plantDoctor.identifiedIssue')}>${geti18nText('plantDoctor.identifiedIssue', lang).current}</span>:</strong> ${diagnosis.diseaseName}</p><p><strong><span ${i18nAttr('plantDoctor.confidence')}>${geti18nText('plantDoctor.confidence', lang).current}</span>:</strong> ${(diagnosis.confidenceScore * 100).toFixed(0)}%</p>` : `<p style="font-weight: bold;"><span ${i18nAttr('plantDoctor.healthyMessage')}>${geti18nText('plantDoctor.healthyMessage', lang).current}</span></p>`}
            </div>
            <div class="section" style="padding: 0;"><h2 class="section-title">${Icon.VisualCues} <span ${i18nAttr('plantDoctor.visualCuesFromImage')}>${geti18nText('plantDoctor.visualCuesFromImage', lang).current}</span></h2><p style="font-style: italic; background-color: var(--bg-light); padding: 10px; border-radius: 6px;">"${diagnosis.visualCues}"</p></div>
            ${!diagnosis.isHealthy ? `<div class="section" style="padding: 0; margin-top: 15px;"><h2 class="section-title">${Icon.Symptoms} <span ${i18nAttr('plantDoctor.symptoms')}>${geti18nText('plantDoctor.symptoms', lang).current}</span></h2><ul class="styled-list">${(diagnosis.symptoms || []).map(s => `<li>${s}</li>`).join('')}</ul></div>` : ''}
        </div>
    </div>
    ${!diagnosis.isHealthy ? `<div class="section"><h2 class="section-title">${Icon.Treatment} <span ${i18nAttr('plantDoctor.treatment')}>${geti18nText('plantDoctor.treatment', lang).current}</span></h2><ol class="styled-list">${(diagnosis.treatment || []).map(s => `<li>${s}</li>`).join('')}</ol></div><div class="section"><h2 class="section-title">${Icon.Products} <span ${i18nAttr('plantDoctor.recommendedProducts')}>${geti18nText('plantDoctor.recommendedProducts', lang).current}</span></h2>${(diagnosis.recommendedProducts || []).map(p => `<div class="product"><p class="name">${p.productName} <span class="type">${p.type}</span></p><p style="font-size: 13px; color: var(--text-muted-light);">${p.description}</p></div>`).join('')}</div><div class="section"><h2 class="section-title">${Icon.Prevention} <span ${i18nAttr('plantDoctor.prevention')}>${geti18nText('plantDoctor.prevention', lang).current}</span></h2><ul class="styled-list">${(diagnosis.prevention || []).map(p => `<li>${p}</li>`).join('')}</ul></div>` : ''}
    ${getAdvisoryCard(diagnosis.humanConsumptionAdvisory, lang)}
    `;

    generatePdfShell(`${geti18nText('pdf.reportTitle', lang).current}: ${diagnosis.plantName}`, diagnosisBodyHtml, lang, isDarkMode);
};


// --- Growth Guide PDF Content ---
export const generateGrowthGuidePdf = (guide: GrowthGuideData, image: string | null | undefined, t: Function, lang: 'en' | 'ar', isDarkMode: boolean) => {
    const isRTL = lang === 'ar';
    const resolvedImage = (image && image.trim()) ? image : '/images/tracked-plant.svg';

    const growthGuideBodyHtml = `
         <style>
            .pdf-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid var(--accent); padding: 15px 20px; }
            .pdf-header-title { display: flex; align-items: center; gap: 10px; } .pdf-header svg { height: 32px; width: 32px; background-color: var(--accent); color: white; padding: 4px; border-radius: 6px; }
            .pdf-header h1 { color: var(--accent); margin: 0; font-size: 24px; }
            .top-section { display: flex; gap: 20px; align-items: flex-start; padding: 20px; flex-direction: ${isRTL ? 'row-reverse' : 'row'}; }
            .main-image { width: 250px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
            .section h2 { display: flex; align-items: center; gap: 8px; font-size: 20px; color: var(--accent-dark); border-bottom: 1px solid var(--border-light); padding-bottom: 5px; margin-bottom: 10px; }
            .styled-list { padding-${isRTL ? 'right' : 'left'}: 20px; margin-top: 5px; }
            .plant-title { margin-top: 0; font-size: 28px; font-weight: bold; }
            .plant-subtitle { font-style: italic; color: var(--text-muted-light); margin-top: -5px; margin-bottom: 15px; }
            .info-chip { background-color: var(--bg-light); padding: 5px 12px; border-radius: 16px; display: inline-block; margin: 2px 5px 2px 0; font-size: 12px; }
            .care-item { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 15px; padding: 10px; border-radius: 8px; background-color: var(--bg-light); border: 1px solid var(--border-light); }
            .care-item-icon { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; background-color: #e0f2f1; display: flex; align-items: center; justify-content: center; }
            html.dark .care-item-icon { background-color: #2e8b5733; }
            .care-item-icon svg { width: 22px; height: 22px; color: var(--accent-dark); }
            .care-item-content h3 { margin: 0 0 4px 0; font-size: 16px; font-weight: bold; }
        </style>
        <div class="pdf-header"><div class="pdf-header-title">${Icon.Guide}<h1 ${i18nAttr('growthGuide.pdf.reportTitle')}>${geti18nText('growthGuide.pdf.reportTitle', lang).current}</h1></div></div>
        <div class="top-section">
            <img src="${resolvedImage}" alt="${guide.plantName}" class="main-image">
            <div>
                <h1 class="plant-title">${guide.plantName}</h1>
                <p class="plant-subtitle">${guide.scientificName}</p>
                <div class="info-chips"><span class="info-chip"><strong><span ${i18nAttr('growthGuide.family')}>${geti18nText('growthGuide.family', lang).current}</span>:</strong> ${guide.scientificClassification.family}</span><span class="info-chip"><strong><span ${i18nAttr('growthGuide.origin')}>${geti18nText('growthGuide.origin', lang).current}</span>:</strong> ${guide.origin}</span></div>
                <p>${guide.description}</p>
            </div>
        </div>
        <div style="padding: 0 20px 20px;">
            <div class="section"><h2>${Icon.Planting} <span ${i18nAttr('growthGuide.plantingInstructionsTitle')}>${geti18nText('growthGuide.plantingInstructionsTitle', lang).current}</span></h2><ol class="styled-list">${guide.plantingInstructions.map(s => `<li>${s}</li>`).join('')}</ol></div>
            <div class="section"><h2 ${i18nAttr('growthGuide.careDetailsTitle')}>${geti18nText('growthGuide.careDetailsTitle', lang).current}</h2>
                <div class="care-item"><div class="care-item-icon">${Icon.Watering}</div><div class="care-item-content"><h3 ${i18nAttr('growthGuide.watering')}>${geti18nText('growthGuide.watering', lang).current}</h3><p>${guide.careDetails.watering}</p></div></div>
                <div class="care-item"><div class="care-item-icon">${Icon.SunCare}</div><div class="care-item-content"><h3 ${i18nAttr('growthGuide.sunlight')}>${geti18nText('growthGuide.sunlight', lang).current}</h3><p>${guide.careDetails.sunlight}</p></div></div>
                <div class="care-item"><div class="care-item-icon">${Icon.Soil}</div><div class="care-item-content"><h3 ${i18nAttr('growthGuide.soil')}>${geti18nText('growthGuide.soil', lang).current}</h3><p>${guide.careDetails.soil}</p></div></div>
                <div class="care-item"><div class="care-item-icon">${Icon.Fertilizer}</div><div class="care-item-content"><h3 ${i18nAttr('growthGuide.fertilizer')}>${geti18nText('growthGuide.fertilizer', lang).current}</h3><p>${guide.careDetails.fertilizer}</p></div></div>
                <div class="care-item"><div class="care-item-icon">${Icon.Pruning}</div><div class="care-item-content"><h3 ${i18nAttr('growthGuide.pruning')}>${geti18nText('growthGuide.pruning', lang).current}</h3><p>${guide.careDetails.pruning}</p></div></div>
                <div class="care-item"><div class="care-item-icon">${Icon.Pests}</div><div class="care-item-content"><h3 ${i18nAttr('growthGuide.pestsAndDiseases')}>${geti18nText('growthGuide.pestsAndDiseases', lang).current}</h3><p>${guide.careDetails.pestsAndDiseases}</p></div></div>
            </div>
            <div class="section"><h2>${Icon.Facts} <span ${i18nAttr('growthGuide.funFactsTitle')}>${geti18nText('growthGuide.funFactsTitle', lang).current}</span></h2><ul class="styled-list">${guide.funFacts.map(f => `<li>${f}</li>`).join('')}</ul></div>
        </div>
    `;

    generatePdfShell(`${geti18nText('growthGuide.pdf.reportTitle', lang).current}: ${guide.plantName}`, growthGuideBodyHtml, lang, isDarkMode);
};
