
import React, { useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { contactApi } from '../services/apiService';

const MailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;

export const ContactPage: React.FC = () => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
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
            setSubmitStatus('Message sent successfully.');
        } catch (error) {
            setSubmitStatus(error instanceof Error ? error.message : 'Failed to send message.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="animate-fade-in pb-12">
            <div className="container mx-auto px-4 pt-8 relative z-10">
                <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-[#07140f] shadow-[0_30px_90px_rgba(8,35,24,0.28)]">
                    <img
                        src="/images/contact-smart-farm-support.png"
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-cover opacity-75"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,18,12,0.94),rgba(7,28,17,0.78)_44%,rgba(246,250,245,0.92)_44%,rgba(246,250,245,0.98))] dark:bg-[linear-gradient(90deg,rgba(4,18,12,0.94),rgba(7,28,17,0.82)_44%,rgba(9,22,16,0.92)_44%,rgba(9,22,16,0.98))]" />
                    <div className="relative grid min-h-[38rem] lg:grid-cols-[0.95fr_1.05fr]">
                        <div className="flex flex-col justify-between p-8 text-white md:p-12">
                            <div className="max-w-md space-y-8">
                                <div>
                                    <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-green-100 backdrop-blur">
                                        Agricultural Vision Mind
                                    </p>
                                    <h2 className="mt-6 text-3xl font-black leading-tight md:text-5xl">
                                        {t('contactPage.getInTouch')}
                                    </h2>
                                    <p className="mt-4 text-base leading-8 text-green-50/85 md:text-lg">{t('contactPage.description')}</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="rounded-2xl border border-white/15 bg-white/12 p-3 backdrop-blur-sm">
                                            <MailIcon />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-green-100/70">{t('contactPage.email')}</h4>
                                            <p className="font-medium">ahmadomaradel@gmail.com</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-4">
                                        <div className="rounded-2xl border border-white/15 bg-white/12 p-3 backdrop-blur-sm">
                                            <MapPinIcon />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-green-100/70">{t('contactPage.location')}</h4>
                                            <p className="font-medium">{t('contactPage.locationValue')}</p>
                                        </div>
                                    </div>

                                     <div className="flex items-start gap-4">
                                        <div className="rounded-2xl border border-white/15 bg-white/12 p-3 backdrop-blur-sm">
                                            <PhoneIcon />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-green-100/70">{t('contactPage.phone')}</h4>
                                            <p className="font-medium">+1 (555) 123-4567</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 grid grid-cols-3 gap-3 text-center text-green-50">
                                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                                    <strong className="block text-2xl">24/7</strong>
                                    <span className="text-xs text-green-100/75">support</span>
                                </div>
                                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                                    <strong className="block text-2xl">AI</strong>
                                    <span className="text-xs text-green-100/75">routing</span>
                                </div>
                                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                                    <strong className="block text-2xl">Farm</strong>
                                    <span className="text-xs text-green-100/75">care</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center p-6 md:p-10">
                            <div className="w-full rounded-[1.5rem] border border-black/5 bg-white/90 p-6 shadow-[0_22px_60px_rgba(8,35,24,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1812]/88 md:p-8">
                                <h3 className="mb-6 text-2xl font-black text-gray-900 dark:text-white">{t('contactPage.sendMessage')}</h3>
                            
                                <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('contactPage.form.name')}</label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-brand-green focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                                            placeholder={t('contactPage.form.namePlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('contactPage.form.email')}</label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-brand-green focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                                            placeholder={t('contactPage.form.emailPlaceholder')}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('contactPage.form.subject')}</label>
                                    <input
                                        type="text"
                                        id="subject"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-brand-green focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                                        placeholder={t('contactPage.form.subjectPlaceholder')}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('contactPage.form.message')}</label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        rows={5}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-brand-green focus:border-transparent dark:bg-gray-700 dark:text-white transition-all resize-none"
                                        placeholder={t('contactPage.form.messagePlaceholder')}
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-brand-green text-white font-bold rounded-xl shadow-lg hover:bg-brand-green-dark transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
                                >
                                    <SendIcon />
                                    {isSubmitting ? 'Sending...' : t('contactPage.form.submit')}
                                </button>
                                {submitStatus && (
                                    <p className="text-sm text-center font-semibold text-brand-green dark:text-green-300">{submitStatus}</p>
                                )}
                                <p className="text-xs text-center text-gray-500 mt-4">{t('contactPage.form.disclaimer')}</p>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

