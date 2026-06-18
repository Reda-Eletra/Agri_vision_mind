import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Leaf, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { getGoogleAuthUrl, isBackendAuthEnabled } from '../services/backendAuthService';

type AuthMode = 'login' | 'signup';
type CountryOption = { name: string; isoCode: string };
type StateOption = { name: string; isoCode: string };

interface LoginModalProps {
  onLogin: (name: string, email: string, password: string, mode: AuthMode, location?: string, phone?: string) => Promise<string | null>;
  onClose: () => void;
  initialMode?: AuthMode;
}

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.24-1.19-1.6z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onClose, initialMode = 'login' }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('EG');
  const [stateCode, setStateCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const selectedCountry = useMemo(
    () => countries.find((country) => country.isoCode === countryCode),
    [countries, countryCode],
  );
  const selectedState = useMemo(
    () => states.find((state) => state.isoCode === stateCode),
    [states, stateCode],
  );

  useEffect(() => {
    let isMounted = true;
    void import('country-state-city').then(({ Country }) => {
      if (isMounted) setCountries(Country.getAllCountries());
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    void import('country-state-city').then(({ State }) => {
      if (isMounted) setStates(State.getStatesOfCountry(countryCode));
    });
    return () => {
      isMounted = false;
    };
  }, [countryCode]);

  useEffect(() => {
    document.body.classList.add('auth-modal-open');
    return () => {
      document.body.classList.remove('auth-modal-open');
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setMode(initialMode);
    setAuthError(null);
  }, [initialMode]);

  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'signup' : 'login');
    setAuthError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (mode === 'signup' && !name.trim()) return;
    if (mode === 'signup' && !phone.trim()) return;
    if (mode === 'signup' && !countryCode) return;
    if (mode === 'signup' && states.length > 0 && !stateCode) return;
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    const loginName = mode === 'login' ? '' : name;
    const location = [selectedState?.name, selectedCountry?.name].filter(Boolean).join(', ');
    const errorMessage = await onLogin(loginName, email, password, mode, location, phone);

    if (errorMessage) {
      setAuthError(errorMessage);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  const handleGoogleLogin = () => {
    if (!isBackendAuthEnabled()) {
      setAuthError('Social sign-in is unavailable in this build.');
      return;
    }

    window.location.href = getGoogleAuthUrl();
  };

  return (
    <div className="auth-backdrop" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
      <div className={`auth-panel ${mode === 'signup' ? 'is-signup' : 'is-login'}`}>
        <button type="button" onClick={onClose} className="auth-close" aria-label="Close">
          <X size={18} />
        </button>

        <section className="auth-visual" aria-hidden="true">
          <img
            src="/images/avm-3d/auth-farm-ai.png"
            alt=""
            className="auth-visual-image"
            loading="eager"
            decoding="async"
          />
          <div className="auth-brand-lockup">
            <span><Leaf size={24} /></span>
            <div>
              <strong>Agricultural</strong>
              <small>Vision Mind</small>
            </div>
          </div>

          <div className="auth-visual-copy">
            <p><Sparkles size={15} /> AI farming workspace</p>
            <h2>Manage crops, diagnose faster, and track farm health.</h2>
            <ul>
              <li><CheckCircle2 size={16} /> Plant diagnosis with treatment plans</li>
              <li><CheckCircle2 size={16} /> Farm dashboard, finance, and monitoring</li>
              <li><CheckCircle2 size={16} /> Community, news, and growth guidance</li>
            </ul>
          </div>

          <div className="auth-metric-row">
            <div><strong>156</strong><span>diagnoses</span></div>
            <div><strong>68%</strong><span>avg health</span></div>
            <div><strong>24/7</strong><span>assistant</span></div>
          </div>
        </section>

        <section className="auth-form-shell">
          <div className="auth-form-head">
            <span id="login-modal-title" className="sr-only">
              {mode === 'login' ? 'Sign in to your account' : 'Create an account'}
            </span>
            <div className="auth-form-icon">
              <ShieldCheck size={28} />
            </div>
            <p>{mode === 'login' ? 'Welcome back' : 'Start your smart farm'}</p>
            <h2>{mode === 'login' ? 'Sign in to continue' : 'Create your account'}</h2>
          </div>

          <div className="auth-tabs">
            <button type="button" onClick={() => setMode('login')} className={mode === 'login' ? 'is-active' : ''}>
              {t('modals.profile.loginTab')}
            </button>
            <button type="button" onClick={() => setMode('signup')} className={mode === 'signup' ? 'is-active' : ''}>
              {t('modals.profile.signupTab')}
            </button>
          </div>

          <button type="button" onClick={handleGoogleLogin} disabled={isLoading} className="auth-google">
            <GoogleIcon />
            {t('modals.profile.loginWithGoogle')}
          </button>

          <div className="auth-divider"><span>{t('modals.profile.or')}</span></div>

          <form onSubmit={handleSubmit} className="auth-form" aria-describedby={authError ? 'login-auth-error' : undefined}>
            {authError ? (
              <div id="login-auth-error" role="alert" className="auth-error animate-fade-in">
                {authError}
              </div>
            ) : null}

            {mode === 'signup' ? (
              <>
                <div className="auth-field animate-slide-in-up">
                  <label htmlFor="name">{t('modals.profile.name')}</label>
                  <input
                    type="text"
                    id="name"
                    required={mode === 'signup'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ahmed Omar"
                  />
                </div>
                <div className="auth-field animate-slide-in-up">
                  <label htmlFor="phone">Phone number</label>
                  <input
                    type="tel"
                    id="phone"
                    required={mode === 'signup'}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +20 100 000 0000"
                  />
                </div>
                <div className="auth-location-grid">
                  <div className="auth-field animate-slide-in-up">
                    <label htmlFor="country">Country</label>
                    <select
                      id="country"
                      required={mode === 'signup'}
                      value={countryCode}
                      onChange={(e) => {
                        setCountryCode(e.target.value);
                        setStateCode('');
                      }}
                    >
                      <option value="">Select country</option>
                      {countries.map((country) => (
                        <option key={country.isoCode} value={country.isoCode}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="auth-field animate-slide-in-up">
                    <label htmlFor="state">Governorate / State</label>
                    <select
                      id="state"
                      required={mode === 'signup' && states.length > 0}
                      value={stateCode}
                      onChange={(e) => setStateCode(e.target.value)}
                      disabled={!countryCode || states.length === 0}
                    >
                      <option value="">
                        {states.length > 0 ? 'Select governorate/state' : 'No states available'}
                      </option>
                      {states.map((state) => (
                        <option key={state.isoCode} value={state.isoCode}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            ) : null}

            <div className="auth-field">
              <label htmlFor="email">{mode === 'login' ? 'Username or Email' : t('modals.profile.email')}</label>
              <input
                type="text"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'login' ? 'admin or name@example.com' : 'name@example.com'}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">{t('modals.profile.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="!pr-12"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="auth-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="auth-submit">
              {isLoading ? (
                <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                mode === 'login' ? t('app.login') : t('app.signUp')
              )}
            </button>
          </form>

          <div className="auth-switch">
            <span>{mode === 'login' ? t('modals.profile.noAccount') : t('modals.profile.hasAccount')}</span>
            <button type="button" onClick={toggleMode}>
              {mode === 'login' ? t('app.signUp') : t('app.login')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
