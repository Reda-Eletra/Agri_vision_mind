
// ... existing imports ...
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
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                    <div className="grid md:grid-cols-2">
                        
                        {/* Left Side: Contact Info & 3D Image */}
                        <div className="p-8 md:p-12 bg-brand-green-darker text-white relative overflow-hidden flex flex-col justify-between">
                            {/* Decorative Background */}
                            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                                <div className="absolute right-0 top-0 w-64 h-64 bg-white rounded-full filter blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                                <div className="absolute left-0 bottom-0 w-64 h-64 bg-brand-green rounded-full filter blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
                            </div>

                            <div className="relative z-10 space-y-8">
                                <div>
                                    <h3 className="text-2xl font-bold mb-4">{t('contactPage.getInTouch')}</h3>
                                    <p className="text-gray-300 leading-relaxed">{t('contactPage.description')}</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                                            <MailIcon />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm opacity-70">{t('contactPage.email')}</h4>
                                            <p className="font-medium">ahmadomaradel@gmail.com</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                                            <MapPinIcon />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm opacity-70">{t('contactPage.location')}</h4>
                                            <p className="font-medium">{t('contactPage.locationValue')}</p>
                                        </div>
                                    </div>

                                     <div className="flex items-start gap-4">
                                        <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                                            <PhoneIcon />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm opacity-70">{t('contactPage.phone')}</h4>
                                            <p className="font-medium">+1 (555) 123-4567</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3D Image Effect */}
                            <div className="relative mt-12 perspective-container h-64 hidden md:block">
                                <img 
                                    src="/images/scene-contact.svg" 
                                    alt="Contact Support" 
                                    className="w-full h-full object-cover image-3d-effect shadow-2xl"
                                />
                            </div>
                        </div>

                        {/* Right Side: Form */}
                        <div className="p-8 md:p-12 bg-white dark:bg-gray-800">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">{t('contactPage.sendMessage')}</h3>
                            
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
    );
};

