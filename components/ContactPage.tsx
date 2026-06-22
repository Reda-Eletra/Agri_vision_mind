import React, { useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { contactApi } from '../services/apiService';

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21a7 7 0 0 0-14 0" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const TagIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
  </svg>
);

const PenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 2 4 4" />
    <path d="m17 3-9.5 9.5L6 18l5.5-1.5L21 7" />
    <path d="M3 21h18" />
  </svg>
);

const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.18 4.18 2 2 0 0 1 4.16 2h3a2 2 0 0 1 2 1.72c.12.91.33 1.8.63 2.65a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.43-1.25a2 2 0 0 1 2.11-.45c.85.3 1.74.51 2.65.63A2 2 0 0 1 22 16.92z" />
  </svg>
);

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 4 13c0-5 7-9 16-9 0 9-4 16-9 16Z" />
    <path d="M4 20c4-4 7-6 12-8" />
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

const contactCopy = {
  en: {
    eyebrow: 'Contact us',
    title: "Let's Grow Together",
    subtitle: "We're here to help and answer any question you might have.",
    panelTitle: 'Send a Message',
    phones: 'Phone numbers',
    support: 'Farm support',
    response: 'Fast response',
    sending: 'Sending...',
    success: 'Message sent successfully.',
    failure: 'Failed to send message.',
  },
  ar: {
    eyebrow: 'تواصل معنا',
    title: 'خلينا نزرع النجاح سوا',
    subtitle: 'نحن هنا لمساعدتك والرد على أي سؤال يخص مزرعتك أو استخدام المنصة.',
    panelTitle: 'إرسال رسالة',
    phones: 'أرقام التواصل',
    support: 'دعم زراعي',
    response: 'رد سريع',
    sending: 'جاري الإرسال...',
    success: 'تم إرسال الرسالة بنجاح.',
    failure: 'تعذر إرسال الرسالة.',
  },
};

const FieldIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[#718070] ltr:left-4 rtl:right-4">
    {children}
  </span>
);

export const ContactPage: React.FC = () => {
  const { t, language } = useTranslation();
  const copy = contactCopy[language];
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('');
    try {
      await contactApi.createMessage(formData);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setSubmitStatus(copy.success);
    } catch (error) {
      setSubmitStatus(error instanceof Error ? error.message : copy.failure);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative isolate -mx-4 -mt-2 min-h-[calc(100vh-7rem)] overflow-hidden px-4 pb-16 pt-10 md:-mx-8 md:px-8">
      <img
        src="/images/contact-field-background.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(248,250,244,0.90),rgba(249,246,232,0.72)_42%,rgba(245,248,241,0.58))] dark:bg-[linear-gradient(90deg,rgba(10,21,15,0.84),rgba(11,25,17,0.68)_44%,rgba(10,23,15,0.56))]" />

      <div className="mx-auto grid min-h-[42rem] max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="max-w-xl text-[#123528] dark:text-white">
          <p className="inline-flex items-center gap-3 text-sm font-black uppercase tracking-[0.15em] text-[#5b923c]">
            <LeafIcon />
            {copy.eyebrow}
            <span className="h-px w-16 bg-[#5b923c]/70" />
          </p>
          <h1 className="mt-8 max-w-lg text-5xl font-black leading-[1.15] tracking-[-0.03em] md:text-7xl">
            {copy.title}
          </h1>
          <p className="mt-7 max-w-lg text-xl font-medium leading-9 text-[#183b2e]/85 dark:text-white/85">
            {copy.subtitle}
          </p>

          <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/55 bg-white/40 p-5 shadow-[0_18px_45px_rgba(46,73,38,0.12)] backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5b923c]">{copy.phones}</p>
              <div className="mt-3 space-y-1 text-lg font-black">
                <p dir="ltr">01069808994</p>
                <p dir="ltr">01204878996</p>
              </div>
            </div>
            <div className="rounded-3xl border border-white/55 bg-white/40 p-5 shadow-[0_18px_45px_rgba(46,73,38,0.12)] backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5b923c]">{t('contactPage.email')}</p>
              <p className="mt-3 break-words text-base font-black">ahmadomaradel@gmail.com</p>
            </div>
          </div>
        </div>

        <div className="justify-self-end lg:w-[min(100%,43rem)]">
          <div className="rounded-[1.8rem] border border-white/70 bg-white/82 p-6 shadow-[0_28px_90px_rgba(40,67,38,0.22)] backdrop-blur-2xl dark:border-white/12 dark:bg-[#f8fbf1]/90 md:p-9">
            <h2 className="text-3xl font-black text-[#123528]">{copy.panelTitle}</h2>
            <div className="mt-4 h-1 w-16 rounded-full bg-[#5f9f35]" />

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-[#143528]">{t('contactPage.form.name')}</span>
                  <span className="relative block">
                    <FieldIcon><UserIcon /></FieldIcon>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="h-14 w-full rounded-2xl border border-[#cfd8cc] bg-white/74 px-12 text-[#123528] outline-none transition placeholder:text-[#7b877c] focus:border-[#6ba53b] focus:ring-4 focus:ring-[#6ba53b]/20"
                      placeholder={t('contactPage.form.namePlaceholder')}
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-[#143528]">{t('contactPage.form.email')}</span>
                  <span className="relative block">
                    <FieldIcon><MailIcon /></FieldIcon>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="h-14 w-full rounded-2xl border border-[#cfd8cc] bg-white/74 px-12 text-[#123528] outline-none transition placeholder:text-[#7b877c] focus:border-[#6ba53b] focus:ring-4 focus:ring-[#6ba53b]/20"
                      placeholder={t('contactPage.form.emailPlaceholder')}
                    />
                  </span>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-[#143528]">{t('contactPage.form.subject')}</span>
                <span className="relative block">
                  <FieldIcon><TagIcon /></FieldIcon>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="h-14 w-full rounded-2xl border border-[#cfd8cc] bg-white/74 px-12 text-[#123528] outline-none transition placeholder:text-[#7b877c] focus:border-[#6ba53b] focus:ring-4 focus:ring-[#6ba53b]/20"
                    placeholder={t('contactPage.form.subjectPlaceholder')}
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-[#143528]">{t('contactPage.form.message')}</span>
                <span className="relative block">
                  <span className="pointer-events-none absolute top-5 text-[#718070] ltr:left-4 rtl:right-4">
                    <PenIcon />
                  </span>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full resize-none rounded-2xl border border-[#cfd8cc] bg-white/74 px-12 py-4 text-[#123528] outline-none transition placeholder:text-[#7b877c] focus:border-[#6ba53b] focus:ring-4 focus:ring-[#6ba53b]/20"
                    placeholder={t('contactPage.form.messagePlaceholder')}
                  />
                </span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#5d9c35] text-base font-black text-white shadow-[0_16px_35px_rgba(80,137,45,0.28)] transition hover:bg-[#477e29] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <SendIcon />
                {isSubmitting ? copy.sending : t('contactPage.form.submit')}
              </button>
              {submitStatus ? (
                <p className="text-center text-sm font-black text-[#477e29]">{submitStatus}</p>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
