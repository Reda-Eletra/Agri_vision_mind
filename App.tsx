import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bell,
  BookOpen,
  ChevronDown,
  Globe2,
  Home,
  Leaf,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareMore,
  Mic,
  MoonStar,
  Newspaper,
  Search,
  Settings,
  Sprout,
  SunMedium,
  Users,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useTranslation } from './contexts/LanguageContext';
import { useConfig } from './contexts/ConfigContext';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { Spinner } from './components/Spinner';
import { Footer } from './components/Footer';
import { LoginModal } from './components/LoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { NewsPage } from './components/NewsPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OnboardingModal, shouldShowOnboarding } from './components/OnboardingModal';
import type { DashboardView } from './components/Dashboard';

const PlantDoctor = lazy(() => import('./components/PlantDoctor').then(module => ({ default: module.PlantDoctor })));
const GrowthGuide = lazy(() => import('./components/GrowthGuide').then(module => ({ default: module.GrowthGuide })));
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const Chatbot = lazy(() => import('./components/Chatbot').then(module => ({ default: module.Chatbot })));
const HomePage = lazy(() => import('./components/HomePage').then(module => ({ default: module.HomePage })));
const DiseaseLibrary = lazy(() => import('./components/DiseaseLibrary').then(module => ({ default: module.DiseaseLibrary })));
const VoiceAssistant = lazy(() => import('./components/VoiceAssistant').then(module => ({ default: module.VoiceAssistant })));
const ContactPage = lazy(() => import('./components/ContactPage').then(module => ({ default: module.ContactPage })));
const CommunityHub = lazy(() => import('./components/CommunityHub').then(module => ({ default: module.CommunityHub })));

type View = 'home' | 'doctor' | 'guide' | 'dashboard' | 'library' | 'contact' | 'community' | 'admin' | 'news';

const viewMeta: Record<View, { labelKey: string }> = {
  home: { labelKey: 'app.buttons.home' },
  doctor: { labelKey: 'app.buttons.doctor' },
  guide: { labelKey: 'app.buttons.guide' },
  dashboard: { labelKey: 'app.buttons.dashboard' },
  library: { labelKey: 'app.buttons.library' },
  community: { labelKey: 'app.buttons.community' },
  contact: { labelKey: 'app.buttons.contact' },
  news: { labelKey: 'News' },
  admin: { labelKey: 'Admin Panel' },
};

// Shown when an unauthenticated user navigates to the Dashboard view
const DashboardLockedView: React.FC<{ onSignIn: () => void }> = ({ onSignIn }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 py-16">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8 mx-auto"
        style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.08))', border: '1px solid rgba(16,185,129,0.2)' }}>
        <LayoutDashboard size={36} className="text-brand-green dark:text-brand-green-light" />
      </div>
      <h2 className="text-3xl font-extrabold text-[var(--ag-text)] mb-3">{t('dashboard.locked.title')}</h2>
      <p className="text-[var(--ag-text-muted)] text-lg max-w-md mx-auto mb-8 leading-relaxed">{t('dashboard.locked.message')}</p>
      <button
        onClick={onSignIn}
        className="ui-button ui-button-primary"
      >
        {t('dashboard.locked.button')}
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('home');
  const [requestedDashboardView, setRequestedDashboardView] = useState<DashboardView | null>(null);
  const { user, isLoggedIn, login, logout, refreshUserData } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const { isDarkMode, setIsDarkMode } = useConfig();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => shouldShowOnboarding());
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isFeaturesMenuOpen, setIsFeaturesMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const featuresDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (featuresDropdownRef.current && !featuresDropdownRef.current.contains(event.target as Node)) {
        setIsFeaturesMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileDropdownOpen(false);
        setIsFeaturesMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 22);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (activeView === 'dashboard' && !isLoggedIn) {
      setIsLoginModalOpen(true);
    }
  }, [activeView, isLoggedIn]);

  const getViewLabel = useCallback((view: View) => {
    if (view === 'news') return language === 'ar' ? 'الأخبار الزراعية' : 'Agricultural News';
    const key = viewMeta[view].labelKey;
    return key.startsWith('app.') ? t(key) : key;
  }, [language, t]);

  const handleOpenChat = useCallback(() => {
    setIsVoiceAssistantOpen(false);
    setIsChatOpen(true);
  }, []);
  const handleOpenVoice = useCallback(() => {
    setIsChatOpen(false);
    setIsVoiceAssistantOpen(true);
  }, []);
  const handleOpenLogin = useCallback(() => {
    setAuthMode('login');
    setIsLoginModalOpen(true);
  }, []);
  const handleOpenSignup = useCallback(() => {
    setAuthMode('signup');
    setIsLoginModalOpen(true);
  }, []);
  const handleHomeSectionNav = useCallback((sectionId?: string) => {
    const scroll = () => {
      if (!sectionId) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (activeView !== 'home') {
      setActiveView('home');
      window.setTimeout(scroll, 80);
      return;
    }

    scroll();
  }, [activeView]);
  const handleTrackPlantSuccess = useCallback(async () => {
    await refreshUserData();
    setRequestedDashboardView('tracking');
    setActiveView('dashboard');
  }, [refreshUserData]);
  const handleRequestedViewHandled = useCallback(() => setRequestedDashboardView(null), []);
  const openDashboardView = useCallback((view: DashboardView = 'overview') => {
    setRequestedDashboardView(view);
    setActiveView('dashboard');
    setIsFeaturesMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const openTopLevelView = useCallback((view: View) => {
    setActiveView(view);
    setIsFeaturesMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Memoize active view content so it only re-computes when the view or its deps change,
  // not on every App state update (scrolled, dropdown open, etc.).
  const activeViewContent = useMemo(() => {
    if (activeView === 'admin' && user?.role === 'admin') {
      return <AdminDashboard />;
    }

    switch (activeView) {
      case 'home':
        return <HomePage setActiveView={setActiveView} onOpenChat={handleOpenChat} onOpenVoice={handleOpenVoice} onOpenSignup={handleOpenSignup} />;
      case 'doctor':
        return <PlantDoctor onTrackPlantSuccess={handleTrackPlantSuccess} />;
      case 'guide':
        return <GrowthGuide />;
      case 'dashboard':
        return isLoggedIn ? (
          <Dashboard
            setActiveView={setActiveView}
            requestedView={requestedDashboardView || undefined}
            onRequestedViewHandled={handleRequestedViewHandled}
          />
        ) : <DashboardLockedView onSignIn={handleOpenLogin} />;
      case 'library':
        return <DiseaseLibrary setActiveView={setActiveView} />;
      case 'community':
        return <CommunityHub />;
      case 'contact':
        return <ContactPage />;
      case 'news':
        return <NewsPage />;
      default:
        return <HomePage setActiveView={setActiveView} onOpenChat={handleOpenChat} onOpenVoice={handleOpenVoice} onOpenSignup={handleOpenSignup} />;
    }
  }, [activeView, user?.role, isLoggedIn, requestedDashboardView, handleOpenChat, handleOpenVoice, handleOpenSignup, handleOpenLogin, handleTrackPlantSuccess, handleRequestedViewHandled]);

  const handleLogin = useCallback(async (
    name: string,
    email: string,
    password: string,
    mode: 'login' | 'signup',
    location?: string,
    phone?: string,
  ): Promise<string | null> => {
    const result = await login(name, email, password, mode, location, phone);
    if (!result.success) {
      return result.error || 'Login failed.';
    }

    setIsLoginModalOpen(false);
    if (result.user?.role === 'admin') {
      setActiveView('admin');
    }

    return null;
  }, [login]);

  const headerNavItems = [
    { key: 'home', label: t('homePage.landing.nav.home'), onClick: () => handleHomeSectionNav() },
    { key: 'features', label: t('homePage.landing.nav.features'), onClick: () => handleHomeSectionNav('home-features') },
    { key: 'workflow', label: t('homePage.landing.nav.workflow'), onClick: () => handleHomeSectionNav('home-workflow') },
    { key: 'about', label: t('homePage.landing.nav.about'), onClick: () => handleHomeSectionNav('home-about') },
    { key: 'news', label: language === 'ar' ? 'الأخبار' : 'News', onClick: () => { setActiveView('news'); window.scrollTo({ top: 0 }); } },
    { key: 'contact', label: t('homePage.landing.nav.contact'), onClick: () => { setActiveView('contact'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
  ];

  const runHeaderAction = (action: () => void) => {
    action();
    setIsMobileMenuOpen(false);
  };

  const featureMenuItems: Array<{
    key: string;
    label: string;
    description: string;
    status?: string;
    onClick: () => void;
  }> = [
    {
      key: 'doctor',
      label: language === 'ar' ? 'Plant Doctor' : 'Plant Doctor',
      description: language === 'ar' ? 'تشخيص الصور وخطة العلاج' : 'Image diagnosis and treatment plan',
      onClick: () => openTopLevelView('doctor'),
    },
    {
      key: 'farms',
      label: language === 'ar' ? 'My Farm System' : 'My Farm System',
      description: language === 'ar' ? 'مزرعة، دورة، نباتات، ومهام' : 'Farm, cycles, plants, and tasks',
      onClick: () => openDashboardView('myFarms'),
    },
    {
      key: 'guide',
      label: language === 'ar' ? 'Growth Guide' : 'Growth Guide',
      description: language === 'ar' ? 'متطلبات المحاصيل والتحليل' : 'Crop requirements and analysis',
      onClick: () => openTopLevelView('guide'),
    },
    {
      key: 'library',
      label: language === 'ar' ? 'Disease Library' : 'Disease Library',
      description: language === 'ar' ? 'أمراض النبات وطرق الوقاية' : 'Plant diseases and prevention',
      onClick: () => openTopLevelView('library'),
    },
    {
      key: 'store',
      label: language === 'ar' ? 'Agri Store' : 'Agri Store',
      description: language === 'ar' ? 'كتالوج منتجات وروابط شراء' : 'Product catalog and buy links',
      onClick: () => openDashboardView('store'),
    },
    {
      key: 'community',
      label: language === 'ar' ? 'Community' : 'Community',
      description: language === 'ar' ? 'أسئلة ونصائح وقصص نجاح' : 'Questions, tips, and success stories',
      onClick: () => openTopLevelView('community'),
    },
    {
      key: 'tasks',
      label: language === 'ar' ? 'Smart Tasks' : 'Smart Tasks',
      description: language === 'ar' ? 'مهام ناتجة من الخطة والطقس' : 'Plan and weather-aware tasks',
      status: language === 'ar' ? 'داخل My Farm' : 'Inside My Farm',
      onClick: () => openDashboardView('myFarms'),
    },
  ];

  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  const appNavItems: Array<{ view: View; label: string; icon: React.ReactNode }> = [
    { view: 'home', label: t('app.buttons.home'), icon: <Home size={17} /> },
    { view: 'dashboard', label: t('app.buttons.dashboard'), icon: <LayoutDashboard size={17} /> },
    { view: 'doctor', label: t('app.buttons.doctor'), icon: <Activity size={17} /> },
    { view: 'guide', label: t('app.buttons.guide'), icon: <Sprout size={17} /> },
    { view: 'library', label: t('app.buttons.library'), icon: <BookOpen size={17} /> },
    { view: 'community', label: t('app.buttons.community'), icon: <Users size={17} /> },
    { view: 'news', label: language === 'ar' ? 'الأخبار' : 'News', icon: <Newspaper size={17} /> },
    { view: 'contact', label: t('app.buttons.contact'), icon: <MessageSquareMore size={17} /> },
  ];

  const useConsoleLayout: boolean = false;

  if (useConsoleLayout && isLoggedIn && user) {
    return (
      <div className="app-console-shell">
        <aside className="app-console-sidebar">
          <button type="button" className="app-console-brand" onClick={() => setActiveView('dashboard')}>
            <span className="app-console-brand-icon">
              <Leaf size={22} />
            </span>
            <span>
              <strong>Agricultural</strong>
              <small>Vision Mind</small>
            </span>
          </button>

          <nav className="app-console-nav" aria-label="Application navigation">
            {appNavItems.map(item => (
              <button
                key={item.view}
                type="button"
                onClick={() => {
                  setActiveView(item.view);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`app-console-nav-item ${activeView === item.view ? 'is-active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
            {user.role === 'admin' ? (
              <button
                type="button"
                onClick={() => setActiveView('admin')}
                className={`app-console-nav-item ${activeView === 'admin' ? 'is-active' : ''}`}
              >
                <Settings size={17} />
                <span>Admin Dashboard</span>
              </button>
            ) : null}
          </nav>

          <button type="button" className="app-console-logout" onClick={() => { logout(); setActiveView('home'); }}>
            <LogOut size={17} />
            <span>{t('app.logout')}</span>
          </button>
        </aside>

        <div className="app-console-main">
          <header className="app-console-topbar">
            <div>
              <p className="app-console-kicker">{activeView === 'home' ? 'Workspace' : getViewLabel(activeView)}</p>
              <h1>{activeView === 'home' ? 'AI-Powered Agriculture' : getViewLabel(activeView)}</h1>
            </div>

            <div className="app-console-actions">
              <button type="button" className="app-console-icon" aria-label="Search">
                <Search size={18} />
              </button>
              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                className="app-console-icon"
                aria-label={t('homePage.landing.header.toggleLanguage')}
              >
                <Globe2 size={18} />
              </button>
              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="app-console-icon"
                aria-label={t('homePage.landing.header.toggleTheme')}
              >
                {isDarkMode ? <SunMedium size={18} /> : <MoonStar size={18} />}
              </button>
              <button type="button" className="app-console-icon" aria-label="Notifications">
                <Bell size={18} />
              </button>
              <button type="button" className="app-console-user" onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}>
                <img src={user.profilePicture} alt={`${user.name}'s profile picture`} />
                <span>
                  <strong>{user.name}</strong>
                  <small>{user.role === 'admin' ? 'Admin' : 'Farmer'}</small>
                </span>
              </button>
              {isProfileDropdownOpen ? (
                <div className="app-console-profile-menu">
                  <button type="button" onClick={() => { setIsProfileModalOpen(true); setIsProfileDropdownOpen(false); }}>
                    <UserRound size={16} />
                    <span>{t('homePage.landing.header.profile')}</span>
                  </button>
                  <button type="button" onClick={() => { logout(); setActiveView('home'); }}>
                    <LogOut size={16} />
                    <span>{t('app.logout')}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </header>

          <main className="app-console-content">
            <ErrorBoundary>
              <Suspense
                fallback={
                  <div className="app-console-loading">
                    <Spinner />
                  </div>
                }
              >
                <div key={activeView} className="animate-fade-in">
                  {activeViewContent}
                </div>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>

        {isProfileModalOpen ? <ProfileSettingsModal onClose={() => setIsProfileModalOpen(false)} /> : null}
        {isLoginModalOpen ? <LoginModal onLogin={handleLogin} onClose={() => setIsLoginModalOpen(false)} initialMode={authMode} /> : null}

        <div className="app-console-floating">
          <button onClick={handleOpenVoice} aria-label="Open Voice Assistant">
            <Mic size={21} />
          </button>
          <button onClick={handleOpenChat} aria-label={t('app.openChat')}>
            <MessageSquareMore size={21} />
          </button>
        </div>

        {isChatOpen ? (
          <Suspense fallback={<div />}>
            <Chatbot onClose={() => setIsChatOpen(false)} />
          </Suspense>
        ) : null}

        {isVoiceAssistantOpen ? (
          <Suspense fallback={<div />}>
            <VoiceAssistant
              onClose={() => setIsVoiceAssistantOpen(false)}
              onNavigate={(view) => {
                setActiveView(view);
                setIsVoiceAssistantOpen(false);
              }}
            />
          </Suspense>
        ) : null}
      </div>
    );
  }

  return (
    <div className="ui-shell flex min-h-screen flex-col text-[var(--ag-text)]">
      <header className={`app-header ${scrolled ? 'is-scrolled' : ''}`}>
        <nav className="app-header-shell" aria-label="Primary navigation">
          <button type="button" className="app-brand" onClick={() => handleHomeSectionNav()} aria-label={t('app.buttons.home')}>
            <span className="app-brand-icon" aria-hidden="true">
              <Leaf size={22} />
            </span>
            <span>
              <span className="app-brand-title">Agricultural Vision Mind</span>
              <span className="app-brand-subtitle">{t('homePage.landing.header.subtitle')}</span>
            </span>
          </button>

          <div className="app-desktop-nav" role="menubar" aria-label={t('app.buttons.home')}>
            {headerNavItems.map((item) => item.key === 'features' ? (
              <div key={item.key} className="app-nav-item-with-menu" ref={featuresDropdownRef}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setIsFeaturesMenuOpen((open) => !open)}
                  className={`app-nav-link app-features-trigger ${isFeaturesMenuOpen ? 'is-active' : ''}`}
                  aria-haspopup="menu"
                  aria-expanded={isFeaturesMenuOpen}
                >
                  <span>{item.label}</span>
                  <ChevronDown size={14} className={isFeaturesMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden="true" />
                </button>
                {isFeaturesMenuOpen ? (
                  <div className="app-features-menu" role="menu" aria-label={language === 'ar' ? 'قائمة المميزات' : 'Features menu'}>
                    {featureMenuItems.map((feature) => (
                      <button key={feature.key} type="button" role="menuitem" onClick={feature.onClick} className="app-feature-menu-item">
                        <span>
                          <strong>{feature.label}</strong>
                          <small>{feature.description}</small>
                        </span>
                        {feature.status ? <em>{feature.status}</em> : <ChevronDown size={14} aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={item.onClick}
                className={`app-nav-link ${(item.key === 'home' && activeView === 'home') || item.key === activeView ? 'is-active' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="app-header-actions">
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="app-icon-button"
              aria-label={t('homePage.landing.header.toggleLanguage')}
              title={t('homePage.landing.header.toggleLanguage')}
            >
              <Globe2 size={18} aria-hidden="true" />
              <span className="sr-only">{language === 'en' ? 'AR' : 'EN'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="app-icon-button"
              aria-label={t('homePage.landing.header.toggleTheme')}
              title={t('homePage.landing.header.toggleTheme')}
            >
              {isDarkMode ? <SunMedium size={18} aria-hidden="true" /> : <MoonStar size={18} aria-hidden="true" />}
            </button>

            {isLoggedIn && user ? (
              <div className="app-profile" ref={profileDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  aria-expanded={isProfileDropdownOpen}
                  aria-haspopup="menu"
                  aria-controls="profile-menu"
                  className="app-profile-button"
                  aria-label={t('homePage.landing.header.profileMenu')}
                >
                  <img src={user.profilePicture} alt={`${user.name}'s profile picture`} className="app-profile-avatar" />
                  <span className="app-profile-name">{user.name}</span>
                  <ChevronDown size={15} className={isProfileDropdownOpen ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden="true" />
                </button>

                {isProfileDropdownOpen ? (
                  <div id="profile-menu" role="menu" className="app-profile-menu">
                    <div className="app-profile-summary">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setActiveView('dashboard'); setIsProfileDropdownOpen(false); }}
                      className="app-profile-menu-item"
                    >
                      <LayoutDashboard size={16} aria-hidden="true" />
                      <span>{t('homePage.landing.header.dashboard')}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setIsProfileModalOpen(true); setIsProfileDropdownOpen(false); }}
                      className="app-profile-menu-item"
                    >
                      <UserRound size={16} aria-hidden="true" />
                      <span>{t('homePage.landing.header.profile')}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { logout(); setActiveView('home'); setIsProfileDropdownOpen(false); }}
                      className="app-profile-menu-item is-danger"
                    >
                      <LogOut size={16} aria-hidden="true" />
                      <span>{t('homePage.landing.header.logout')}</span>
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <button type="button" onClick={handleOpenLogin} className="app-auth-button app-login-button">
                  {t('app.login')}
                </button>
                <button type="button" onClick={handleOpenSignup} className="app-auth-button app-signup-button">
                  {t('app.signUp')}
                </button>
              </>
            )}

            <button
              type="button"
              className="app-mobile-toggle"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label={t('homePage.landing.header.openMenu')}
              aria-expanded={isMobileMenuOpen}
            >
              <Menu size={21} aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      {isMobileMenuOpen ? (
        <>
          <button
            type="button"
            className="app-mobile-overlay"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label={t('homePage.landing.header.closeMenu')}
          />
          <aside className="app-mobile-drawer" aria-label="Mobile navigation">
            <div className="app-mobile-panel">
              <div className="app-mobile-head">
                <button type="button" className="app-brand" onClick={() => runHeaderAction(() => handleHomeSectionNav())}>
                  <span className="app-brand-icon" aria-hidden="true">
                    <Leaf size={22} />
                  </span>
                  <span>
                    <span className="app-brand-title text-[var(--ag-text)]">Agricultural Vision Mind</span>
                    <span className="app-brand-subtitle !text-[var(--ag-text-muted)]">{t('homePage.landing.header.subtitle')}</span>
                  </span>
                </button>
                <button type="button" className="app-icon-button" onClick={() => setIsMobileMenuOpen(false)} aria-label={t('homePage.landing.header.closeMenu')}>
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <div className="app-mobile-links">
                {headerNavItems.map((item) => (
                  item.key === 'features' ? (
                    <div key={item.key} className="app-mobile-feature-group">
                      <button
                        type="button"
                        onClick={() => setIsFeaturesMenuOpen((open) => !open)}
                        className={`app-mobile-link ${isFeaturesMenuOpen ? 'is-active' : ''}`}
                        aria-expanded={isFeaturesMenuOpen}
                      >
                        <span>{item.label}</span>
                        <ChevronDown size={16} className={isFeaturesMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden="true" />
                      </button>
                      {isFeaturesMenuOpen ? (
                        <div className="app-mobile-feature-list">
                          {featureMenuItems.map((feature) => (
                            <button key={feature.key} type="button" onClick={() => runHeaderAction(feature.onClick)}>
                              <span>{feature.label}</span>
                              {feature.status ? <em>{feature.status}</em> : null}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => runHeaderAction(item.onClick)}
                      className={`app-mobile-link ${(item.key === 'home' && activeView === 'home') || item.key === activeView ? 'is-active' : ''}`}
                    >
                      <span>{item.label}</span>
                      <ChevronDown className="app-mobile-arrow" size={16} aria-hidden="true" />
                    </button>
                  )
                ))}
              </div>

              <div className="app-mobile-actions">
                <button type="button" className="app-mobile-link" onClick={() => runHeaderAction(() => setLanguage(language === 'en' ? 'ar' : 'en'))}>
                  <span>{t('homePage.landing.header.toggleLanguage')}</span>
                  <span>{language === 'en' ? 'AR' : 'EN'}</span>
                </button>
                <button type="button" className="app-mobile-link" onClick={() => runHeaderAction(() => setIsDarkMode(!isDarkMode))}>
                  <span>{t('homePage.landing.header.toggleTheme')}</span>
                  {isDarkMode ? <SunMedium size={18} aria-hidden="true" /> : <MoonStar size={18} aria-hidden="true" />}
                </button>

                {isLoggedIn && user ? (
                  <>
                    <div className="app-profile-summary">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <button type="button" className="app-mobile-link" onClick={() => runHeaderAction(() => setActiveView('dashboard'))}>
                      <span>{t('homePage.landing.header.dashboard')}</span>
                      <LayoutDashboard size={18} aria-hidden="true" />
                    </button>
                    <button type="button" className="app-mobile-link" onClick={() => runHeaderAction(() => setIsProfileModalOpen(true))}>
                      <span>{t('homePage.landing.header.profile')}</span>
                      <UserRound size={18} aria-hidden="true" />
                    </button>
                    <button type="button" className="app-mobile-link" onClick={() => runHeaderAction(() => { logout(); setActiveView('home'); })}>
                      <span>{t('homePage.landing.header.logout')}</span>
                      <LogOut size={18} aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <div className="app-mobile-auth-row">
                    <button type="button" onClick={() => runHeaderAction(handleOpenLogin)} className="app-auth-button app-login-button">
                      {t('app.login')}
                    </button>
                    <button type="button" onClick={() => runHeaderAction(handleOpenSignup)} className="app-auth-button app-signup-button">
                      {t('app.signUp')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </>
      ) : null}

      {activeView === 'home' ? null : <div className="h-24 sm:h-28" />}

      <main className={activeView === 'home' ? 'flex-1 pb-12' : 'flex-1 px-4 pb-12 sm:px-6 lg:px-8'}>
        <div className={activeView === 'home' ? '' : 'mx-auto max-w-[92rem]'}>
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="ui-card ui-surface p-12 text-center">
                  <Spinner />
                </div>
              }
            >
              <div key={activeView} className="animate-fade-in">
                {activeViewContent}
              </div>
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      {isProfileModalOpen ? <ProfileSettingsModal onClose={() => setIsProfileModalOpen(false)} /> : null}
      {isLoginModalOpen ? <LoginModal onLogin={handleLogin} onClose={() => setIsLoginModalOpen(false)} initialMode={authMode} /> : null}
      {showOnboarding ? <OnboardingModal onClose={() => setShowOnboarding(false)} setActiveView={setActiveView} /> : null}

      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-3">
        <button
          onClick={handleOpenVoice}
          className="ui-floating-dock flex h-14 w-14 items-center justify-center text-brand-green-dark transition-all hover:-translate-y-1 hover:text-brand-green dark:text-brand-green-light"
          aria-label="Open Voice Assistant"
        >
          <Mic size={22} />
        </button>
        <button
          onClick={handleOpenChat}
          className="ui-floating-dock flex h-14 w-14 items-center justify-center text-brand-green-dark transition-all hover:-translate-y-1 hover:text-brand-green dark:text-brand-green-light"
          aria-label={t('app.openChat')}
        >
          <MessageSquareMore size={22} />
        </button>
      </div>

      {isChatOpen ? (
        <Suspense fallback={<div />}>
          <Chatbot onClose={() => setIsChatOpen(false)} />
        </Suspense>
      ) : null}

      {isVoiceAssistantOpen ? (
        <Suspense fallback={<div />}>
          <VoiceAssistant
            onClose={() => setIsVoiceAssistantOpen(false)}
            onNavigate={(view) => {
              setActiveView(view);
              setIsVoiceAssistantOpen(false);
            }}
          />
        </Suspense>
      ) : null}

      <Footer setActiveView={setActiveView} />
    </div>
  );
};


export default App;
