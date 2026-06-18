import React, { useEffect, useRef, useState } from 'react';
import { Camera, Lock, Mail, MapPin, Phone, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { SectionHeading, StatusChip, SurfaceCard } from './WorkspacePrimitives';

export const SettingsView: React.FC = () => {
  const { user, updateUser, updateAccountEmail, updateAccountPassword } = useAuth();
  const { t } = useTranslation();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.location || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(selectedFile);
    setAvatarPreview(URL.createObjectURL(selectedFile));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (password && password !== confirmPassword) {
      setErrorMessage(t('dashboard.settings.passwordMismatch'));
      return;
    }
    if (password && password.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const currentEmail = (user?.email || '').trim().toLowerCase();
    const emailChanged = normalizedEmail !== currentEmail;

    if ((emailChanged || password) && !currentPassword) {
      setErrorMessage('Current password is required to update email or password.');
      return;
    }

    setIsSaving(true);
    try {
      await updateUser({ name, phone, location }, avatarFile || undefined);

      if (emailChanged) {
        await updateAccountEmail(normalizedEmail, currentPassword);
      }

      if (password) {
        await updateAccountPassword(currentPassword, password, confirmPassword);
      }

      setSuccessMessage(t('dashboard.settings.success'));
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      setAvatarFile(null);
      setAvatarPreview(null);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save account settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="ui-reveal space-y-6">
      <SectionHeading
        eyebrow={t('dashboard.settings.title')}
        title="Account, language, and trust settings"
        description={t('dashboard.settings.subtitle')}
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SurfaceCard className="ui-surface p-6">
          <div className="text-center">
            <div className="relative mx-auto h-32 w-32">
              <img src={avatarPreview || user?.profilePicture} alt="Profile" className="h-32 w-32 rounded-[2rem] object-cover shadow-[0_24px_48px_rgba(18,34,26,0.16)]" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-3 -right-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-green-dark text-white shadow-[0_18px_32px_rgba(35,109,72,0.24)]"
                title={t('dashboard.settings.updatePhoto')}
                type="button"
              >
                <Camera size={18} />
              </button>
              <input ref={fileInputRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" onChange={handleImageUpload} />
            </div>

            <h3 className="mt-6 text-2xl font-extrabold tracking-[-0.04em] text-[var(--ag-text)]">{user?.name}</h3>
            <p className="mt-2 text-sm text-[var(--ag-text-muted)]">{user?.email}</p>
            <div className="mt-4 flex justify-center gap-2">
              <StatusChip tone="forest">{user?.role === 'admin' ? 'Administrator' : 'Farmer'}</StatusChip>
              {user?.location ? <StatusChip tone="blue">{user.location}</StatusChip> : null}
              {user?.phone ? <StatusChip tone="amber">{user.phone}</StatusChip> : null}
            </div>

            <div className="mt-6 rounded-[1.5rem] bg-[var(--ag-surface-muted)] p-4 text-left">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ag-text-soft)]">Profile summary</p>
              <p className="mt-3 text-sm leading-6 text-[var(--ag-text-muted)]">
                Keep your operator identity, preferred location, and security details current so the platform can present the right agronomic context.
              </p>
            </div>
          </div>
        </SurfaceCard>

        <form onSubmit={handleSave} className="space-y-6">
          <SurfaceCard className="ui-surface p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="ui-icon-badge">
                <UserIcon size={18} />
              </span>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ag-text-soft)]">{t('dashboard.settings.personalInfo')}</p>
                <h3 className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-[var(--ag-text)]">Identity and profile</h3>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="ui-field">
                <span className="ui-label">{t('modals.profile.name')}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[var(--ag-text-soft)]">
                    <UserIcon size={16} />
                  </span>
                  <input type="text" value={name} onChange={event => setName(event.target.value)} className="ui-input !pl-11" />
                </div>
              </label>

              <label className="ui-field">
                <span className="ui-label">{t('modals.profile.email')}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[var(--ag-text-soft)]">
                    <Mail size={16} />
                  </span>
                  <input type="email" value={email} onChange={event => setEmail(event.target.value)} className="ui-input !pl-11" />
                </div>
              </label>

              <label className="ui-field">
                <span className="ui-label">Phone number</span>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[var(--ag-text-soft)]">
                    <Phone size={16} />
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={event => setPhone(event.target.value)}
                    placeholder="+20 100 000 0000"
                    className="ui-input !pl-11"
                  />
                </div>
              </label>

              <label className="ui-field">
                <span className="ui-label">{t('dashboard.settings.location')}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[var(--ag-text-soft)]">
                    <MapPin size={16} />
                  </span>
                  <input
                    type="text"
                    value={location}
                    onChange={event => setLocation(event.target.value)}
                    placeholder={t('dashboard.settings.locationPlaceholder')}
                    className="ui-input !pl-11"
                  />
                </div>
              </label>
            </div>
          </SurfaceCard>

          <SurfaceCard className="ui-surface p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="ui-icon-badge ui-icon-badge-amber">
                <Lock size={18} />
              </span>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ag-text-soft)]">{t('dashboard.settings.security')}</p>
                <h3 className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-[var(--ag-text)]">Security controls</h3>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="ui-field md:col-span-2">
                <span className="ui-label">Current password</span>
                <input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="ui-input" placeholder="********" />
              </label>

              <label className="ui-field">
                <span className="ui-label">{t('dashboard.settings.newPassword')}</span>
                <input type="password" value={password} onChange={event => setPassword(event.target.value)} className="ui-input" placeholder="********" />
              </label>

              <label className="ui-field">
                <span className="ui-label">{t('dashboard.settings.confirmPassword')}</span>
                <input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="ui-input" placeholder="********" />
              </label>
            </div>
          </SurfaceCard>

          {successMessage ? (
            <div className="rounded-2xl border border-[rgba(47,138,87,0.18)] bg-[var(--ag-success-soft)] px-4 py-3 text-sm font-semibold text-brand-green-dark dark:text-brand-green-light">
              {successMessage}
            </div>
          ) : null}
          {errorMessage ? (
            <div className="rounded-2xl border border-[rgba(185,77,67,0.18)] bg-[var(--ag-red-soft)] px-4 py-3 text-sm font-semibold text-[var(--ag-red)]">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button type="submit" disabled={isSaving} className="ui-button ui-button-primary disabled:opacity-60">
              {t('dashboard.settings.saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
