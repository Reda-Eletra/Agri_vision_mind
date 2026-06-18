
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';

const RobotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
const ChevronLeft = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const ChevronRight = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;

interface Notification {
    id: string;
    type: 'checkup' | 'weather' | 'harvest';
    message: string;
    actionLabel?: string;
    action?: () => void;
}

export const SmartAssistantSidebar: React.FC = () => {
    const { user, trackedPlants, farms } = useAuth();
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (!user) return;

        const newNotifications: Notification[] = [];

        // 1. Checkup Alerts
        trackedPlants.forEach(plant => {
            const lastCheck = new Date(plant.lastCheckDate);
            const diffDays = Math.ceil((Date.now() - lastCheck.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 7 && plant.recoveryProgressPercentage < 100) {
                newNotifications.push({
                    id: `check-${plant.id}`,
                    type: 'checkup',
                    message: t('sidebar.checkupAlert', { plant: plant.name }),
                    actionLabel: t('sidebar.checkupAction')
                });
            }
        });

        // 2. Weather Alert (Mock)
        newNotifications.push({
            id: 'weather-alert',
            type: 'weather',
            message: t('sidebar.weatherAlert'),
        });

        setNotifications(newNotifications);
    }, [user, trackedPlants, farms, t]);

    if (!user) return null;

    return (
        <>
            {/* Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed top-32 right-0 z-40 bg-white dark:bg-gray-800 p-2 rounded-l-xl shadow-lg border-y border-l border-gray-200 dark:border-gray-700 transition-transform duration-300 ${isOpen ? 'translate-x-64' : 'translate-x-0'}`}
                aria-label="Toggle Assistant"
            >
                {isOpen ? <ChevronRight /> : <div className="relative"><RobotIcon /><span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span></div>}
            </button>

            {/* Sidebar Panel */}
            <div className={`fixed top-0 right-0 h-full w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} pt-24 px-4`}>
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="bg-brand-green/10 p-2 rounded-lg text-brand-green">
                        <RobotIcon />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm">{t('sidebar.title')}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('sidebar.welcome', {name: user.name.split(' ')[0]})}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                        <BellIcon /> {t('sidebar.notifications')}
                    </h4>
                    
                    {notifications.length > 0 ? (
                        <div className="space-y-3">
                            {notifications.map(notif => (
                                <div key={notif.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border-l-4 border-brand-green shadow-sm animate-fade-in">
                                    <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">{notif.message}</p>
                                    {notif.actionLabel && (
                                        <button className="text-xs bg-brand-green text-white px-2 py-1 rounded hover:bg-brand-green-dark transition-colors">
                                            {notif.actionLabel}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic">No new alerts.</p>
                    )}
                </div>
            </div>
        </>
    );
};
