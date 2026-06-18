import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, Mail, MapPin, Phone, ShieldCheck, User, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { isBackendAuthEnabled } from '../services/backendAuthService';

export const ProfileSettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.location || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(selectedFile);
    setAvatarPreview(URL.createObjectURL(selectedFile));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('');
    setError('');
    setIsSaving(true);

    try {
      await updateUser({ name: name.trim(), phone: phone.trim(), location: location.trim() }, avatarFile || undefined);
      setAvatarFile(null);
      setStatus('Profile updated successfully.');
      setTimeout(() => setStatus(''), 3000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <form onSubmit={handleSave} className="profile-modal-panel">
        <button type="button" onClick={onClose} className="profile-modal-close" aria-label="Close profile settings">
          <X size={18} />
        </button>

        <aside className="profile-modal-hero">
          <div className="profile-avatar-stage">
            <img
              src={avatarPreview || user?.profilePicture}
              alt={user?.name ? `${user.name}'s profile picture` : 'Profile picture'}
              className="profile-avatar-image"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="profile-avatar-button"
              title={t('modals.profile.changePicture')}
            >
              <Camera size={18} />
            </button>
            <input ref={fileInputRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" onChange={handleAvatarChange} />
          </div>

          <div>
            <p className="profile-eyebrow">Farmer profile</p>
            <h2 id="profile-modal-title">{user?.name || 'Your profile'}</h2>
            <p>{user?.email}</p>
          </div>

          <div className="profile-mini-grid">
            <span><ShieldCheck size={15} /> {user?.role === 'admin' ? 'Admin' : 'Farmer'}</span>
            <span><MapPin size={15} /> {user?.location || 'No location'}</span>
          </div>
        </aside>

        <section className="profile-modal-content">
          <div className="profile-section-head">
            <div>
              <p className="profile-eyebrow">Account details</p>
              <h3>Identity and contact</h3>
            </div>
            {status ? <span className="profile-status"><CheckCircle2 size={15} /> {status}</span> : null}
          </div>

          {error ? <div className="profile-error">{error}</div> : null}

          <div className="profile-field-grid">
            <label className="profile-field">
              <span>{t('modals.profile.name')}</span>
              <div>
                <User size={16} />
                <input value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
            </label>

            <label className="profile-field">
              <span>{t('modals.profile.email')}</span>
              <div className={isBackendAuthEnabled() ? 'is-readonly' : ''}>
                <Mail size={16} />
                <input value={email} readOnly title="Use account settings to change your email." />
              </div>
            </label>

            <label className="profile-field">
              <span>Phone number</span>
              <div>
                <Phone size={16} />
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+20 100 000 0000" />
              </div>
            </label>

            <label className="profile-field">
              <span>Address / Location</span>
              <div>
                <MapPin size={16} />
                <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Cairo, Egypt" />
              </div>
            </label>
          </div>

          <div className="profile-contact-strip">
            <span><ShieldCheck size={16} /> Secure account</span>
            <span><Phone size={16} /> {phone || 'Add phone number'}</span>
            <span><MapPin size={16} /> {location || 'Add your address'}</span>
          </div>

          <div className="profile-actions">
            <button type="button" onClick={onClose} className="profile-secondary-button">
              {t('modals.profile.cancel')}
            </button>
            <button type="submit" disabled={isSaving} className="profile-primary-button">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              {t('modals.profile.save')}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
};
