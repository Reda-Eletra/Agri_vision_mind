import React, { useEffect, useState, useMemo } from 'react';
import {
  ChevronDown, ChevronUp, Edit2, MessageSquare, Newspaper, Plus, RefreshCw, Save,
  ShieldCheck, Trash2, Users, Wheat, X, Eye, EyeOff, Archive, AlertTriangle,
  CheckCircle, Globe, RotateCcw, ExternalLink, ShieldAlert, Stethoscope, Home
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { newsApi, adminApi, diseaseLibraryApi } from '../services/apiService';
import { PageHeader } from './PageHeader';
import type { AdminStats, NewsArticle, User, GrowthGuidePlant, GrowthGuideSyncStatus, DiseaseInfo, ContactMessage, AdminUserDetails } from '../types';
import { EmptyPanel, SectionHeading, StatTile, StatusChip, SurfaceCard } from './WorkspacePrimitives';

// ─── Edit User Modal ──────────────────────────────────────────
interface EditModalProps {
  target: User;
  onClose: () => void;
  onSave: (userId: string, data: { name?: string; email?: string; password?: string }) => Promise<void>;
}
const EditUserModal: React.FC<EditModalProps> = ({ target, onClose, onSave }) => {
  const [name,     setName]     = useState(target.name);
  const [email,    setEmail]    = useState(target.email);
  const [password, setPassword] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  const handleSave = async () => {
    setSaving(true);
    setErr('');
    try {
      const payload: { name?: string; email?: string; password?: string } = {};
      if (name.trim()     !== target.name)  payload.name  = name.trim();
      if (email.trim()    !== target.email) payload.email = email.trim();
      if (password.trim() !== '')           payload.password = password.trim();

      if (Object.keys(payload).length === 0) { onClose(); return; }
      await onSave(target.id!, payload);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[var(--ag-surface)] p-6 shadow-2xl border border-[var(--ag-border)]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-[var(--ag-text)]">Edit User</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--ag-bg)] text-[var(--ag-text-soft)]"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ag-green)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ag-green)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">New Password <span className="font-normal opacity-60">(leave blank to keep current)</span></label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ag-green)]"
            />
          </div>
          {err && <p className="text-xs text-[var(--ag-red)]">{err}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--ag-border)] py-2 text-sm text-[var(--ag-text-soft)] hover:bg-[var(--ag-bg)]"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--ag-green)] py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Save size={14} />{saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Diagnoses Panel ─────────────────────────────────────────
interface DiagnosesRowProps {
  userId: string;
  getUserDetails: (id: string) => Promise<AdminUserDetails>;
}
const DiagnosesRow: React.FC<DiagnosesRowProps> = ({ userId, getUserDetails }) => {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<AdminUserDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!open && !details) {
      setLoading(true);
      try { setDetails(await getUserDetails(userId)); }
      catch { /* ignore */ }
      finally { setLoading(false); }
    }
    setOpen((v) => !v);
  };

  const farmScans = details?.diagnoses.farmScans || [];
  const doctorScans = details?.diagnoses.plantDoctor || [];
  const transactions = details?.transactions || [];
  const diagnoses = [...farmScans, ...doctorScans];

  return (
    <>
      <tr>
        <td colSpan={4} className="py-0 px-0">
          <button
            onClick={() => void toggle()}
            className="w-full flex items-center gap-2 px-6 py-2 text-xs text-[var(--ag-text-muted)] hover:bg-[var(--ag-bg)] transition-colors"
          >
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {loading ? 'Loading user details...' : `${open ? 'Hide' : 'View'} farm details and uploads`}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={4} className="px-6 pb-4 bg-[var(--ag-bg)]">
            {!details ? (
              <p className="text-xs text-[var(--ag-text-muted)] italic">No user details available.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <div className="grid gap-3 md:grid-cols-4">
                  <StatusChip tone="forest">Farms: {details.farms.length}</StatusChip>
                  <StatusChip tone="blue">Plants: {details.standalonePlants.length}</StatusChip>
                  <StatusChip tone="amber">Diagnoses: {diagnoses.length}</StatusChip>
                  <StatusChip tone="red">Transactions: {transactions.length}</StatusChip>
                </div>
                {details.farms.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {details.farms.map((farm) => (
                      <div key={String(farm.id)} className="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface)] p-3">
                        <p className="text-sm font-bold text-[var(--ag-text)]">{String(farm.name || 'Unnamed farm')}</p>
                        <p className="text-xs text-[var(--ag-text-muted)]">
                          {String(farm.location || 'No location')} · {String(farm.area || '-')} {String(farm.area_unit || '')} · {String(farm.soil_type || 'No soil type')}
                        </p>
                        <p className="mt-1 text-xs text-[var(--ag-text-soft)]">
                          Coordinates: {farm.coordinates?.length || 0} · Cycles: {farm.cycles?.length || 0}
                        </p>
                        {(farm.cycles || []).slice(0, 3).map((cycle) => (
                          <div key={String(cycle.id)} className="mt-2 rounded-lg bg-[var(--ag-bg)] px-3 py-2 text-xs text-[var(--ag-text-muted)]">
                            <span className="font-semibold text-[var(--ag-text)]">{String(cycle.crop || 'Crop')}</span>
                            {' '}· {String(cycle.season || 'season')} · Plants: {cycle.plants?.length || 0}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--ag-text-muted)] italic">No farms uploaded by this user.</p>
                )}
                {diagnoses.map((d, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface)] p-3">
                    {d.image_url && (
                      <img
                        src={String(d.image_url)}
                        alt="plant"
                        className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--ag-text)] truncate">{String(d.disease_name || 'Unknown')}</p>
                      <p className="text-xs text-[var(--ag-text-muted)]">
                        Plant: {String(d.plant_name || '—')} · Severity: {String(d.severity || '—')} · Confidence: {d.confidence ? `${(parseFloat(String(d.confidence)) * 100).toFixed(0)}%` : '—'}
                      </p>
                      {d.recommendations && (
                        <p className="text-xs text-[var(--ag-text-soft)] mt-0.5 truncate">{String(d.recommendations)}</p>
                      )}
                    </div>
                    <span className="text-xs text-[var(--ag-text-muted)] flex-shrink-0">
                      {d.created_at ? new Date(String(d.created_at)).toLocaleDateString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
};

// ─── Create News Modal ────────────────────────────────────────
interface CreateNewsModalProps { onClose: () => void; onCreated: (a: NewsArticle) => void; }
const CreateNewsModal: React.FC<CreateNewsModalProps> = ({ onClose, onCreated }) => {
  const [title,    setTitle]    = useState('');
  const [summary,  setSummary]  = useState('');
  const [content,  setContent]  = useState('');
  const [category, setCategory] = useState('general');
  const [imageUrl, setImageUrl] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  const handleSave = async () => {
    if (!title.trim() || !summary.trim() || !content.trim()) {
      setErr('Title, summary, and content are required.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const article = await newsApi.create({
        title: title.trim(), summary: summary.trim(), content: content.trim(),
        category, ...(imageUrl.trim() ? { image_url: imageUrl.trim() } : {}),
      });
      onCreated(article);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create article');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm py-10 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--ag-surface)] p-6 shadow-2xl border border-[var(--ag-border)]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-[var(--ag-text)] flex items-center gap-2"><Newspaper size={18} /> New Article</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--ag-bg)] text-[var(--ag-text-soft)]"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article headline…"
              className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ag-green)]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ag-green)]">
              {['general','agri','technology','weather','market','research'].map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Summary <span className="font-normal opacity-60">(short preview text)</span></label>
            <textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One-paragraph summary shown on cards…"
              className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ag-green)] resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Full Content</label>
            <textarea rows={7} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the full article here…"
              className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ag-green)] resize-y" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Image URL <span className="font-normal opacity-60">(optional)</span></label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…"
              className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ag-green)]" />
          </div>
          {err && <p className="text-xs text-[var(--ag-red)]">{err}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[var(--ag-border)] py-2 text-sm text-[var(--ag-text-soft)] hover:bg-[var(--ag-bg)]">Cancel</button>
          <button onClick={() => void handleSave()} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--ag-green)] py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
            <Save size={14} />{saving ? 'Publishing…' : 'Publish Article'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Edit/Create Growth Guide Modal ─────────────────────────
interface CreateDiseaseModalProps { onClose: () => void; onCreated: (disease: DiseaseInfo) => void; }
const CreateDiseaseModal: React.FC<CreateDiseaseModalProps> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    name: '',
    scientificName: '',
    category: 'plant-disease',
    imageUrl: '',
    description: '',
    symptoms: '',
    treatment: '',
    prevention: '',
    hosts: '',
    language: 'ar',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const splitLines = (text: string) => text.split(/\r?\n|,/).map((entry) => entry.trim()).filter(Boolean);

  const saveDisease = async () => {
    if (!form.name.trim() || !form.description.trim()) {
      setErr('Name and description are required.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const createdDisease = await diseaseLibraryApi.create({
        name: form.name.trim(),
        scientificName: form.scientificName.trim() || undefined,
        category: form.category.trim() || 'plant-disease',
        imageUrl: form.imageUrl.trim() || undefined,
        description: form.description.trim(),
        symptoms: splitLines(form.symptoms),
        treatment: splitLines(form.treatment),
        prevention: splitLines(form.prevention),
        hosts: splitLines(form.hosts),
        language: form.language,
      });
      onCreated(createdDisease);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create disease entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm py-10 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[var(--ag-surface)] p-6 shadow-2xl border border-[var(--ag-border)]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-[var(--ag-text)] flex items-center gap-2"><Stethoscope size={18} /> Add Disease</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--ag-bg)] text-[var(--ag-text-soft)]"><X size={18} /></button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Disease name" className="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
          <input value={form.scientificName} onChange={(e) => updateField('scientificName', e.target.value)} placeholder="Scientific name" className="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
          <input value={form.category} onChange={(e) => updateField('category', e.target.value)} placeholder="Category" className="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
          <select value={form.language} onChange={(e) => updateField('language', e.target.value)} className="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]">
            <option value="ar">Arabic</option>
            <option value="en">English</option>
          </select>
          <input value={form.imageUrl} onChange={(e) => updateField('imageUrl', e.target.value)} placeholder="Image URL" className="md:col-span-2 rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
          <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Description" rows={3} className="md:col-span-2 rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
          <textarea value={form.symptoms} onChange={(e) => updateField('symptoms', e.target.value)} placeholder="Symptoms, one per line" rows={4} className="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
          <textarea value={form.treatment} onChange={(e) => updateField('treatment', e.target.value)} placeholder="Treatment, one per line" rows={4} className="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
          <textarea value={form.prevention} onChange={(e) => updateField('prevention', e.target.value)} placeholder="Prevention, one per line" rows={4} className="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
          <textarea value={form.hosts} onChange={(e) => updateField('hosts', e.target.value)} placeholder="Hosts, one per line" rows={4} className="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
        </div>
        {err && <p className="mt-4 text-xs text-[var(--ag-red)]">{err}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[var(--ag-border)] py-2 text-sm text-[var(--ag-text-soft)] hover:bg-[var(--ag-bg)]">Cancel</button>
          <button onClick={() => void saveDisease()} disabled={saving} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--ag-green)] py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
            <Save size={14} />{saving ? 'Saving...' : 'Save Disease'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface EditGuideModalProps {
  target: Partial<GrowthGuidePlant> | null;
  onClose: () => void;
  onSave: (data: Partial<GrowthGuidePlant>) => Promise<void>;
}
const EditGuideModal: React.FC<EditGuideModalProps> = ({ target, onClose, onSave }) => {
  const [activeFormTab, setActiveFormTab] = useState<'basic' | 'en' | 'ar'>('basic');

  // Fields
  const [name_en, setNameEn] = useState(target?.name_en || target?.name || '');
  const [name_ar, setNameAr] = useState(target?.name_ar || '');
  const [scientificName, setScientificName] = useState(target?.scientificName || target?.scientific_name || '');
  const [category, setCategory] = useState(target?.category || 'vegetables');
  const [imageUrl, setImageUrl] = useState(target?.imageUrl || target?.image_url || '');

  const [summary_en, setSummaryEn] = useState(target?.summary_en || target?.summary || '');
  const [summary_ar, setSummaryAr] = useState(target?.summary_ar || '');

  const [description_en, setDescriptionEn] = useState(target?.description_en || target?.description || '');
  const [description_ar, setDescriptionAr] = useState(target?.description_ar || '');

  const [sunlight_en, setSunlightEn] = useState(target?.sunlight_en || target?.sunlight || '');
  const [sunlight_ar, setSunlightAr] = useState(target?.sunlight_ar || '');

  const [soil_en, setSoilEn] = useState(target?.soil_en || target?.soil || '');
  const [soil_ar, setSoilAr] = useState(target?.soil_ar || '');

  const [watering_en, setWateringEn] = useState(target?.watering_en || target?.watering || '');
  const [watering_ar, setWateringAr] = useState(target?.watering_ar || '');

  const [planting_en, setPlantingEn] = useState(target?.planting_en || target?.planting || '');
  const [planting_ar, setPlantingAr] = useState(target?.planting_ar || '');

  const [sowing_en, setSowingEn] = useState(target?.sowing_en || target?.sowing || '');
  const [sowing_ar, setSowingAr] = useState(target?.sowing_ar || '');

  const [spacing_en, setSpacingEn] = useState(target?.spacing_en || target?.spacing || '');
  const [spacing_ar, setSpacingAr] = useState(target?.spacing_ar || '');

  const [care_en, setCareEn] = useState(target?.care_en || target?.care || '');
  const [care_ar, setCareAr] = useState(target?.care_ar || '');

  const [harvesting_en, setHarvestingEn] = useState(target?.harvesting_en || target?.harvesting || '');
  const [harvesting_ar, setHarvestingAr] = useState(target?.harvesting_ar || '');

  const [common_problems_en, setCommonProblemsEn] = useState(target?.common_problems_en || target?.commonProblems || '');
  const [common_problems_ar, setCommonProblemsAr] = useState(target?.common_problems_ar || '');

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    if (!name_en.trim()) {
      setErr('English name is required.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const payload: Partial<GrowthGuidePlant> = {
        name_en: name_en.trim(),
        name_ar: name_ar.trim() || undefined,
        scientificName: scientificName.trim() || undefined,
        category: category as any,
        imageUrl: imageUrl.trim() || undefined,
        summary_en: summary_en.trim() || undefined,
        summary_ar: summary_ar.trim() || undefined,
        description_en: description_en.trim() || undefined,
        description_ar: description_ar.trim() || undefined,
        sunlight_en: sunlight_en.trim() || undefined,
        sunlight_ar: sunlight_ar.trim() || undefined,
        soil_en: soil_en.trim() || undefined,
        soil_ar: soil_ar.trim() || undefined,
        watering_en: watering_en.trim() || undefined,
        watering_ar: watering_ar.trim() || undefined,
        planting_en: planting_en.trim() || undefined,
        planting_ar: planting_ar.trim() || undefined,
        sowing_en: sowing_en.trim() || undefined,
        sowing_ar: sowing_ar.trim() || undefined,
        spacing_en: spacing_en.trim() || undefined,
        spacing_ar: spacing_ar.trim() || undefined,
        care_en: care_en.trim() || undefined,
        care_ar: care_ar.trim() || undefined,
        harvesting_en: harvesting_en.trim() || undefined,
        harvesting_ar: harvesting_ar.trim() || undefined,
        common_problems_en: common_problems_en.trim() || undefined,
        common_problems_ar: common_problems_ar.trim() || undefined,
      };

      await onSave(payload);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm py-10 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[var(--ag-surface)] p-6 shadow-2xl border border-[var(--ag-border)]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-[var(--ag-text)] flex items-center gap-2">
            <Wheat size={18} /> {target ? 'Edit Plant Guide' : 'Create New Plant Guide'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--ag-bg)] text-[var(--ag-text-soft)]"><X size={18} /></button>
        </div>

        {/* Sub-tabs inside Form */}
        <div className="flex gap-2 border-b border-[var(--ag-border)] mb-4">
          {[
            { id: 'basic', label: 'Basic Info / معلومات أساسية' },
            { id: 'en', label: 'English Specs' },
            { id: 'ar', label: 'Arabic Specs (العربية)' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveFormTab(t.id as any)}
              className={`px-4 py-2 text-xs font-bold transition-all rounded-t-lg ${
                activeFormTab === t.id
                  ? 'bg-[var(--ag-bg)] text-[var(--ag-green)] border-b-2 border-[var(--ag-green)]'
                  : 'text-[var(--ag-text-muted)] hover:text-[var(--ag-text)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {activeFormTab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Name (English) *</label>
                <input value={name_en} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Tomato"
                  className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">الاسم (بالعربية)</label>
                <input value={name_ar} onChange={(e) => setNameAr(e.target.value)} placeholder="مثال: طماطم"
                  className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] text-right" dir="rtl" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Scientific Name</label>
                <input value={scientificName} onChange={(e) => setScientificName(e.target.value)} placeholder="e.g. Solanum lycopersicum"
                  className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ag-green)]">
                  {['vegetables', 'fruits', 'herbs', 'trees', 'flowers', 'other'].map((c) => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Image URL</label>
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
                {imageUrl && (
                  <img src={imageUrl} alt="preview" className="mt-2 h-24 rounded-lg object-cover border"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Invalid+Image+URL'; }} />
                )}
              </div>
            </div>
          )}

          {activeFormTab === 'en' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Summary (EN)</label>
                <input value={summary_en} onChange={(e) => setSummaryEn(e.target.value)} placeholder="Short outline..."
                  className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Description (EN)</label>
                <textarea rows={3} value={description_en} onChange={(e) => setDescriptionEn(e.target.value)} placeholder="Full description..."
                  className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] resize-y" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Sunlight (EN)</label>
                  <input value={sunlight_en} onChange={(e) => setSunlightEn(e.target.value)} placeholder="e.g. Full sun"
                    className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Soil (EN)</label>
                  <input value={soil_en} onChange={(e) => setSoilEn(e.target.value)} placeholder="e.g. Well-draining, pH 6.0"
                    className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Watering (EN)</label>
                  <input value={watering_en} onChange={(e) => setWateringEn(e.target.value)} placeholder="e.g. 1-2 inches per week"
                    className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Planting (EN)</label>
                  <input value={planting_en} onChange={(e) => setPlantingEn(e.target.value)} placeholder="e.g. Bury stem deep"
                    className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Sowing (EN)</label>
                  <input value={sowing_en} onChange={(e) => setSowingEn(e.target.value)} placeholder="e.g. 6 weeks indoor"
                    className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Spacing (EN)</label>
                  <input value={spacing_en} onChange={(e) => setSpacingEn(e.target.value)} placeholder="e.g. 24-36 inches"
                    className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Care & Upkeep (EN)</label>
                <textarea rows={2} value={care_en} onChange={(e) => setCareEn(e.target.value)} placeholder="Stake, prune, etc..."
                  className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] resize-y" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Harvesting (EN)</label>
                <input value={harvesting_en} onChange={(e) => setHarvestingEn(e.target.value)} placeholder="e.g. Pick when firm"
                  className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1">Common Problems (EN)</label>
                <input value={common_problems_en} onChange={(e) => setCommonProblemsEn(e.target.value)} placeholder="e.g. Blossom end rot"
                  className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)]" />
              </div>
            </div>
          )}

          {activeFormTab === 'ar' && (
            <div className="space-y-4 text-right" dir="rtl">
              <div>
                <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1 text-right">ملخص الدليل (بالعربية)</label>
                <input value={summary_ar} onChange={(e) => setSummaryAr(e.target.value)} placeholder="ملخص قصير..."
                  className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] text-right" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1 text-right">الوصف الكامل (بالعربية)</label>
                <textarea rows={3} value={description_ar} onChange={(e) => setDescriptionAr(e.target.value)} placeholder="اكتب تفاصيل النبات هنا..."
                  className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] text-right resize-y" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1 text-right">أشعة الشمس (بالعربية)</label>
                  <input value={sunlight_ar} onChange={(e) => setSunlightAr(e.target.value)} placeholder="مثال: شمس كاملة"
                    className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] text-right" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1 text-right">التربة المناسبة (بالعربية)</label>
                  <input value={soil_ar} onChange={(e) => setSoilAr(e.target.value)} placeholder="مثال: تربة خصبة جيدة الصرف"
                    className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] text-right" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1 text-right">الري (بالعربية)</label>
                  <input value={watering_ar} onChange={(e) => setWateringAr(e.target.value)} placeholder="مثال: ري عميق بانتظام"
                    className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] text-right" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1 text-right">الزراعة (بالعربية)</label>
                  <input value={planting_ar} onChange={(e) => setPlantingAr(e.target.value)} placeholder="مثال: اغرس الشتلات بعمق"
                    className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] text-right" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1 text-right">بذر البذور (بالعربية)</label>
                  <input value={sowing_ar} onChange={(e) => setSowingAr(e.target.value)} placeholder="مثال: ابذر قبل 6 أسابيع من الصقيع"
                    className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] text-right" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1 text-right">المسافات (بالعربية)</label>
                  <input value={spacing_ar} onChange={(e) => setSpacingAr(e.target.value)} placeholder="مثال: تباعد 24-36 بوصة"
                    className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] text-right" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1 text-right">العناية والتقليم (بالعربية)</label>
                <textarea rows={2} value={care_ar} onChange={(e) => setCareAr(e.target.value)} placeholder="التثبيت بالأوتاد، التسميد الدوري..."
                  className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] text-right resize-y" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1 text-right">الحصاد (بالعربية)</label>
                <input value={harvesting_ar} onChange={(e) => setHarvestingAr(e.target.value)} placeholder="مثال: احصد عند اكتمال النضج واللون"
                  className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] text-right" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ag-text-muted)] mb-1 text-right">مشاكل شائعة (بالعربية)</label>
                <input value={common_problems_ar} onChange={(e) => setCommonProblemsAr(e.target.value)} placeholder="مثال: تعفن الثمار، الديدان"
                  className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-bg)] px-3 py-2 text-sm text-[var(--ag-text)] text-right" />
              </div>
            </div>
          )}

          {err && <p className="text-xs text-[var(--ag-red)] font-semibold mt-2">{err}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[var(--ag-border)] py-2 text-sm text-[var(--ag-text-soft)] hover:bg-[var(--ag-bg)]">Cancel</button>
          <button onClick={() => void handleSave()} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--ag-green)] py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
            <Save size={14} />{saving ? 'Saving…' : 'Save Guide'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Dashboard ──────────────────────────────────────────
type AdminTab = 'users' | 'posts' | 'news' | 'growth-guides' | 'disease-library' | 'messages' | 'scraping-center';

interface AdminDashboardProps {
  onExit?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
  const {
    getAdminStats, getAllUsers, deleteUser, updateUserByAdmin,
    getAllPostsAdmin, deleteAnyPost, user,
  } = useAuth();
  const { language } = useTranslation();

  const [stats,        setStats]        = useState<AdminStats | null>(null);
  const [users,        setUsers]        = useState<User[]>([]);
  const [posts,        setPosts]        = useState<Record<string, unknown>[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [activeTab,    setActiveTab]    = useState<AdminTab>('users');
  const [editTarget,   setEditTarget]   = useState<User | null>(null);
  const [showCreateNews, setShowCreateNews] = useState(false);

  // Disease Library State
  const [diseasesList, setDiseasesList] = useState<DiseaseInfo[]>([]);
  const [diseasesSearch, setDiseasesSearch] = useState('');
  const [diseasesCategory, setDiseasesCategory] = useState('');
  const [isSyncingDiseases, setIsSyncingDiseases] = useState(false);
  const [diseaseSyncInfo, setDiseaseSyncInfo] = useState('');
  const [isLoadingDiseases, setIsLoadingDiseases] = useState(false);
  const [viewingDisease, setViewingDisease] = useState<DiseaseInfo | null>(null);
  const [showCreateDisease, setShowCreateDisease] = useState(false);
  const [isDeletingDisease, setIsDeletingDisease] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // News Sync
  const [isSyncingNews, setIsSyncingNews] = useState(false);
  const [newsSyncInfo, setNewsSyncInfo] = useState('');

  // Growth Guides Management State
  const [guides, setGuides] = useState<GrowthGuidePlant[]>([]);
  const [guidesPagination, setGuidesPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [guidesSearch, setGuidesSearch] = useState('');
  const [guidesCategory, setGuidesCategory] = useState('');
  const [guidesTrash, setGuidesTrash] = useState(false);
  const [editGuideTarget, setEditGuideTarget] = useState<Partial<GrowthGuidePlant> | null>(null);
  const [showEditGuideModal, setShowEditGuideModal] = useState(false);

  // Scraping Center State
  const [isSyncingGuides, setIsSyncingGuides] = useState(false);
  const [guidesSyncStatus, setGuidesSyncStatus] = useState<(GrowthGuideSyncStatus & { logs?: any[] }) | null>(null);
  const [guidesSyncInfo, setGuidesSyncInfo] = useState('');

  const loadDiseases = async () => {
    setIsLoadingDiseases(true);
    try {
      const res = await diseaseLibraryApi.getAdminAll();
      setDiseasesList(res);
    } catch (e) {
      console.error('Failed to load diseases:', e);
    } finally {
      setIsLoadingDiseases(false);
    }
  };

  const handleSyncDiseases = async () => {
    setIsSyncingDiseases(true);
    setDiseaseSyncInfo('');
    try {
      const result = await diseaseLibraryApi.sync();
      await loadDiseases();
      setDiseaseSyncInfo(`Sync complete: ${result.created} new, ${result.updated} updated, ${result.failed} failed.`);
    } catch (e) {
      setDiseaseSyncInfo(e instanceof Error ? e.message : 'Disease library sync failed.');
    } finally {
      setIsSyncingDiseases(false);
    }
  };

  const handleDeleteDisease = async (diseaseId: string) => {
    if (!window.confirm('Delete this disease entry?')) return;
    setIsDeletingDisease(diseaseId);
    try {
      await diseaseLibraryApi.delete(diseaseId);
      setDiseasesList((prev) => prev.filter((disease) => disease.id !== diseaseId));
    } finally {
      setIsDeletingDisease('');
    }
  };

  const filteredDiseases = useMemo(() => {
    return diseasesList.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(diseasesSearch.toLowerCase()) ||
        (d.scientificName || '').toLowerCase().includes(diseasesSearch.toLowerCase()) ||
        (d.description || '').toLowerCase().includes(diseasesSearch.toLowerCase());
      const matchesCategory = !diseasesCategory || d.category === diseasesCategory;
      return matchesSearch && matchesCategory;
    });
  }, [diseasesList, diseasesSearch, diseasesCategory]);

  const diseaseCategories = useMemo(() => {
    const cats = diseasesList.map((d) => d.category).filter(Boolean);
    return [...new Set(cats)];
  }, [diseasesList]);

  const refreshData = async () => {
    setIsLoading(true);
    const [statsR, usersR] = await Promise.allSettled([getAdminStats(), getAllUsers()]);
    if (statsR.status === 'fulfilled') setStats(statsR.value);
    if (usersR.status === 'fulfilled') setUsers(usersR.value);
    setIsLoading(false);
  };

  const loadPosts = async () => {
    try { setPosts(await getAllPostsAdmin()); }
    catch (e) { console.error('Failed to load posts:', e); }
  };

  const loadNews = async () => {
    try { setNewsArticles(await newsApi.getAdminAll()); }
    catch (e) { console.error('Failed to load news:', e); }
  };

  const loadMessages = async () => {
    setIsLoadingMessages(true);
    try { setMessages(await adminApi.getContactMessages()); }
    catch (e) { console.error('Failed to load contact messages:', e); }
    finally { setIsLoadingMessages(false); }
  };

  const loadGuidesList = async (page = 1) => {
    try {
      const res = await adminApi.getGrowthGuides({
        page,
        limit: 10,
        search: guidesSearch,
        category: guidesCategory,
        trash: guidesTrash
      });
      setGuides(res.data);
      setGuidesPagination(res.pagination);
    } catch (e) {
      console.error('Failed to load growth guides:', e);
    }
  };

  const loadGuidesSyncStatus = async () => {
    try {
      const res = await adminApi.getGrowthGuidesSyncStatus();
      setGuidesSyncStatus(res);
    } catch (e) {
      console.error('Failed to load growth guide sync status:', e);
    }
  };

  useEffect(() => { void refreshData(); }, []);

  useEffect(() => {
    if (activeTab === 'posts' && posts.length === 0) void loadPosts();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'news') void loadNews();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'growth-guides') void loadGuidesList(1);
  }, [activeTab, guidesSearch, guidesCategory, guidesTrash]);

  useEffect(() => {
    if (activeTab === 'disease-library') void loadDiseases();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'messages') void loadMessages();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'scraping-center') {
      void loadGuidesSyncStatus();
      void loadDiseases();
      // Poll every 3 seconds while syncing
      const interval = setInterval(() => {
        void loadGuidesSyncStatus();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Auth Operations
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Delete this user? This cannot be undone.')) {
      await deleteUser(userId);
      void refreshData();
    }
  };

  const handleSaveUser = async (userId: string, data: { name?: string; email?: string; password?: string }) => {
    await updateUserByAdmin(userId, data);
    void refreshData();
  };

  const handleDeletePost = async (postId: string) => {
    if (window.confirm('Delete this post? This cannot be undone.')) {
      await deleteAnyPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  const handleDeleteNews = async (articleId: string) => {
    if (window.confirm('Delete this article? This cannot be undone.')) {
      await newsApi.delete(articleId);
      setNewsArticles((prev) => prev.filter((a) => a.id !== articleId));
    }
  };

  const handleSyncNews = async () => {
    setIsSyncingNews(true);
    setNewsSyncInfo('');
    try {
      const result = await newsApi.sync();
      await loadNews();
      setNewsSyncInfo(`Sync complete: ${result.created} new, ${result.updated} updated, ${result.failed} failed.`);
    } catch (e) {
      setNewsSyncInfo(e instanceof Error ? e.message : 'News sync failed.');
    } finally {
      setIsSyncingNews(false);
    }
  };

  const handleUpdateMessageStatus = async (messageId: string, status: ContactMessage['status']) => {
    const updatedMessage = await adminApi.updateContactMessage(messageId, status);
    setMessages((prev) => prev.map((message) => (message.id === messageId ? updatedMessage : message)));
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (window.confirm('Delete this customer message?')) {
      await adminApi.deleteContactMessage(messageId);
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    }
  };

  // Growth Guide CRUD operations
  const handleToggleGuideVisibility = async (id: string) => {
    try {
      const res = await adminApi.toggleGrowthGuideVisibility(id);
      setGuides((prev) =>
        prev.map((g) => (g.id === id ? { ...g, is_visible: res.is_visible } : g))
      );
    } catch (e) {
      alert('Failed to toggle visibility');
    }
  };

  const handleDeleteGuide = async (id: string, force = false) => {
    const confirmMsg = force
      ? 'Are you sure you want to permanently delete this plant guide? This action is irreversible.'
      : 'Move this plant guide to Trash?';
    if (window.confirm(confirmMsg)) {
      try {
        await adminApi.deleteGrowthGuide(id, force);
        void loadGuidesList(guidesPagination.page);
      } catch (e) {
        alert('Failed to delete guide');
      }
    }
  };

  const handleRestoreGuide = async (id: string) => {
    try {
      await adminApi.updateGrowthGuide(id, { restore: true });
      void loadGuidesList(guidesPagination.page);
    } catch (e) {
      alert('Failed to restore guide');
    }
  };

  const handleSaveGuide = async (data: Partial<GrowthGuidePlant>) => {
    if (editGuideTarget?.id) {
      // Update
      await adminApi.updateGrowthGuide(editGuideTarget.id, data);
    } else {
      // Create
      await adminApi.createGrowthGuide(data);
    }
    void loadGuidesList(1);
  };

  // Scraping Center Operations
  const handleSyncGuides = async () => {
    setIsSyncingGuides(true);
    setGuidesSyncInfo('');
    try {
      await adminApi.syncGrowthGuides();
      setGuidesSyncInfo('Synchronization task triggered successfully in the background.');
      void loadGuidesSyncStatus();
    } catch (e) {
      setGuidesSyncInfo(e instanceof Error ? e.message : 'Growth guide sync trigger failed.');
    } finally {
      setIsSyncingGuides(false);
    }
  };

  if (user?.role !== 'admin') {
    return <div className="p-8 text-center text-[var(--ag-red)]">Access Denied</div>;
  }

  return (
    <div className="admin-console-shell animate-fade-in pb-12">
      {editTarget && (
        <EditUserModal
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveUser}
        />
      )}
      {showCreateNews && (
        <CreateNewsModal
          onClose={() => setShowCreateNews(false)}
          onCreated={(a) => setNewsArticles((prev) => [a, ...prev])}
        />
      )}
      {showEditGuideModal && (
        <EditGuideModal
          target={editGuideTarget}
          onClose={() => {
            setEditGuideTarget(null);
            setShowEditGuideModal(false);
          }}
          onSave={handleSaveGuide}
        />
      )}
      {viewingDisease && (
        <ViewDiseaseModal
          disease={viewingDisease}
          onClose={() => setViewingDisease(null)}
        />
      )}
      {showCreateDisease && (
        <CreateDiseaseModal
          onClose={() => setShowCreateDisease(false)}
          onCreated={(disease) => setDiseasesList((prev) => [disease, ...prev])}
        />
      )}

      <div className="relative">
        <PageHeader title="Admin Dashboard" subtitle="Enterprise oversight, user management, and platform health." imageUrl="/images/scene-dashboard.svg" />
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/90 px-4 py-2 text-sm font-bold text-[var(--ag-text)] shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-black/35 dark:text-white"
          >
            <Home size={16} aria-hidden="true" />
            <span>{language === 'ar' ? 'الرجوع للموقع' : 'Back to site'}</span>
          </button>
        ) : null}
      </div>

      <div className="admin-panel-frame mx-auto mt-6 max-w-6xl px-4 space-y-6">
        <SectionHeading
          eyebrow="Administrative controls"
          title="Platform operations control panel"
          description="Enterprise monitoring surface for workspace growth, active farms, registered operators, and community content."
        />

        {/* KPIs */}
        <div className="ui-kpi-grid">
          <StatTile title="Total users"    value={stats?.totalUsers  || 0} tone="blue"   icon={<Users size={18} />}      meta="Registered operators across the application." />
          <StatTile title="Active farms"   value={stats?.totalFarms  || 0} tone="forest" icon={<Wheat size={18} />}      meta="Farm records currently associated with platform users." />
          <StatTile title="Tracked plants" value={stats?.totalPlants || 0} tone="amber"  icon={<ShieldCheck size={18} />} meta="Plants currently being monitored across all user accounts." />
        </div>

        <div className="admin-tab-bar flex gap-1 border-b border-[var(--ag-border)] overflow-x-auto">
          {(['users', 'posts', 'news', 'growth-guides', 'disease-library', 'messages', 'scraping-center'] as AdminTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`admin-tab-button px-5 py-2.5 text-sm font-semibold capitalize transition-colors rounded-t-lg flex-shrink-0 flex items-center gap-1.5 ${
                activeTab === tab
                  ? 'admin-tab-button-active bg-[var(--ag-surface)] text-[var(--ag-text)] border border-b-0 border-[var(--ag-border)]'
                  : 'text-[var(--ag-text-muted)] hover:text-[var(--ag-text)]'
              }`}
            >
              {tab === 'users'  && <><Users size={14} />{language === 'ar' ? `المستخدمين (${users.length})` : `Users (${users.length})`}</>}
              {tab === 'posts'  && <><MessageSquare size={14} />{language === 'ar' ? `المنشورات (${posts.length})` : `Posts (${posts.length})`}</>}
              {tab === 'news'   && <><Newspaper size={14} />{language === 'ar' ? `الأخبار (${newsArticles.length})` : `News (${newsArticles.length})`}</>}
              {tab === 'growth-guides' && <><Wheat size={14} />{language === 'ar' ? 'أدلة النمو' : 'Growth Guides'}</>}
              {tab === 'disease-library' && <><Stethoscope size={14} />{language === 'ar' ? 'مكتبة الأمراض' : 'Disease Library'}</>}
              {tab === 'messages' && <><MessageSquare size={14} />{language === 'ar' ? `إدارة المسدجات (${messages.length})` : `Messages (${messages.length})`}</>}
              {tab === 'scraping-center' && <><Globe size={14} />{language === 'ar' ? 'مركز المزامنة' : 'Scraping Center'}</>}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          isLoading ? (
            <SurfaceCard className="ui-surface p-8 text-center text-sm text-[var(--ag-text-muted)]">Loading users…</SurfaceCard>
          ) : users.length > 0 ? (
            <SurfaceCard className="ui-surface p-0 overflow-hidden">
              <div className="border-b border-[var(--ag-border)] px-6 py-5">
                <SectionHeading
                  eyebrow="User management"
                  title="Registered workspace users"
                  description="Review active platform users, edit their details, reset passwords, and remove non-admin accounts."
                />
              </div>
              <div className="overflow-x-auto">
                <table className="ui-table-shell">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Activity</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((platformUser) => (
                      <React.Fragment key={platformUser.id || platformUser.email}>
                        <tr>
                          <td>
                            <div className="flex items-center gap-3">
                              <img
                                src={platformUser.profilePicture}
                                alt={platformUser.name}
                                className="h-11 w-11 rounded-2xl object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(platformUser.name)}&background=random`; }}
                              />
                              <div>
                                <p className="font-bold text-[var(--ag-text)]">{platformUser.name}</p>
                                <p className="text-sm text-[var(--ag-text-muted)]">{platformUser.email}</p>
                                {(platformUser as User & { createdAt?: string }).createdAt && (
                                  <p className="text-xs text-[var(--ag-text-soft)]">
                                    Joined {new Date(String((platformUser as User & { createdAt?: string }).createdAt)).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <StatusChip tone={platformUser.role === 'admin' ? 'blue' : 'forest'}>
                              {platformUser.role || 'user'}
                            </StatusChip>
                          </td>
                          <td>
                            <div className="flex gap-4 text-xs text-[var(--ag-text-muted)]">
                              <span><span className="font-bold text-[var(--ag-text)]">{(platformUser as User & { farmCount?: number }).farmCount ?? '—'}</span> farms</span>
                              <span><span className="font-bold text-[var(--ag-text)]">{(platformUser as User & { diagnosisCount?: number }).diagnosisCount ?? '—'}</span> diagnoses</span>
                            </div>
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditTarget(platformUser)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ag-text-soft)] transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                                title="Edit User"
                              >
                                <Edit2 size={15} />
                              </button>
                              {platformUser.role !== 'admin' ? (
                                <button
                                  onClick={() => void handleDeleteUser(platformUser.id ?? platformUser.email)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ag-text-soft)] transition-colors hover:bg-red-50 hover:text-[var(--ag-red)] dark:hover:bg-red-900/20"
                                  title="Delete User"
                                >
                                  <Trash2 size={15} />
                                </button>
                              ) : (
                                <StatusChip tone="blue">Protected</StatusChip>
                              )}
                            </div>
                          </td>
                        </tr>
                        {platformUser.id && (
                          <DiagnosesRow userId={platformUser.id} getUserDetails={adminApi.getUserDetails} />
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </SurfaceCard>
          ) : (
            <EmptyPanel title="No users found." description="No registered users are currently available." icon={<Users size={22} />} />
          )
        )}

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          posts.length > 0 ? (
            <SurfaceCard className="ui-surface p-0 overflow-hidden">
              <div className="border-b border-[var(--ag-border)] px-6 py-5">
                <SectionHeading
                  eyebrow="Content moderation"
                  title="All community posts"
                  description="Review and remove any community content across all users."
                />
              </div>
              <div className="overflow-x-auto">
                <table className="ui-table-shell">
                  <thead>
                    <tr>
                      <th>Post</th>
                      <th>Author</th>
                      <th>Category</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post, i) => (
                      <tr key={String(post.id ?? i)}>
                        <td>
                          <div className="max-w-xs">
                            <p className="font-semibold text-[var(--ag-text)] truncate">{String(post.title || '—')}</p>
                            <p className="text-xs text-[var(--ag-text-muted)] truncate">{String(post.body || '')}</p>
                            <p className="text-xs text-[var(--ag-text-soft)]">{post.created_at ? new Date(String(post.created_at)).toLocaleDateString() : ''} · {post.likes_count ?? 0} likes</p>
                          </div>
                        </td>
                        <td>
                          <p className="text-sm font-medium text-[var(--ag-text)]">{String(post.author_name || '—')}</p>
                          <p className="text-xs text-[var(--ag-text-muted)]">{String(post.author_email || '')}</p>
                        </td>
                        <td>
                          <StatusChip tone="forest">{String(post.category || 'general')}</StatusChip>
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => void handleDeletePost(String(post.id))}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ag-text-soft)] transition-colors hover:bg-red-50 hover:text-[var(--ag-red)] dark:hover:bg-red-900/20"
                            title="Delete Post"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SurfaceCard>
          ) : (
            <EmptyPanel title="No posts found." description="No community posts are currently available." icon={<MessageSquare size={22} />} />
          )
        )}

        {/* News Tab */}
        {activeTab === 'news' && (
          <SurfaceCard className="ui-surface p-0 overflow-hidden">
            <div className="flex items-start justify-between border-b border-[var(--ag-border)] px-6 py-5">
              <SectionHeading
                eyebrow="News management"
                title="Internal platform articles"
                description="Publish manual articles, keep imported news in sync, and manage everything users see on the news page."
              />
              <div className="ml-4 mt-1 flex flex-shrink-0 items-center gap-2">
                <button
                  onClick={() => void handleSyncNews()}
                  disabled={isSyncingNews}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--ag-text)] hover:bg-[var(--ag-bg)] transition disabled:opacity-60"
                >
                  <RefreshCw size={15} className={isSyncingNews ? 'animate-spin' : ''} />
                  {isSyncingNews ? 'Syncing…' : 'Sync Sources'}
                </button>
                <button
                  onClick={() => setShowCreateNews(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--ag-green)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
                >
                  <Plus size={15} /> New Article
                </button>
              </div>
            </div>
            {newsSyncInfo ? (
              <div className="border-b border-[var(--ag-border)] px-6 py-3 text-sm text-[var(--ag-text-muted)]">
                {newsSyncInfo}
              </div>
            ) : null}
            {newsArticles.length === 0 ? (
              <div className="p-8">
                <EmptyPanel
                  title="No articles published yet."
                  description="Click 'New Article' above to create the first news article."
                  icon={<Newspaper size={22} />}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="ui-table-shell">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Origin</th>
                      <th>Category</th>
                      <th>Published</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newsArticles.map((article) => (
                      <tr key={article.id}>
                        <td>
                          <div className="flex items-center gap-3 max-w-sm">
                            {article.imageUrl && (
                              <img
                                src={article.imageUrl}
                                alt={article.title}
                                className="h-12 w-16 rounded-lg object-cover flex-shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-[var(--ag-text)] truncate">{article.title}</p>
                              <p className="text-xs text-[var(--ag-text-muted)] truncate">{article.summary}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col gap-1">
                            <StatusChip tone={article.isImported ? 'blue' : 'forest'}>
                              {article.isImported ? 'Imported' : 'Manual'}
                            </StatusChip>
                            <span className="text-xs text-[var(--ag-text-soft)]">{article.source ?? 'Admin'}</span>
                          </div>
                        </td>
                        <td>
                          <StatusChip tone="forest">{article.category ?? 'general'}</StatusChip>
                        </td>
                        <td>
                          <span className="text-xs text-[var(--ag-text-muted)]">
                            {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '—'}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => void handleDeleteNews(article.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ag-text-soft)] transition-colors hover:bg-red-50 hover:text-[var(--ag-red)] dark:hover:bg-red-900/20"
                            title="Delete Article"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SurfaceCard>
        )}

        {/* Growth Guide Management Tab */}
        {activeTab === 'growth-guides' && (
          <SurfaceCard className="ui-surface p-0 overflow-hidden">
            <div className="border-b border-[var(--ag-border)] px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <SectionHeading
                eyebrow="Botanical Catalog"
                title="Growth Guide Management"
                description="Create, edit, toggle visibility, and delete plant growth guides from this interface."
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setGuidesTrash((prev) => !prev);
                    setGuidesPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                    guidesTrash
                      ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                      : 'bg-[var(--ag-surface-muted)] border-[var(--ag-border)] text-[var(--ag-text)] hover:bg-[var(--ag-bg)]'
                  }`}
                >
                  <Archive size={15} />
                  {guidesTrash ? 'Exit Trash Bin / سلة المهملات' : 'View Trash / سلة المهملات'}
                </button>
                <button
                  onClick={() => {
                    setEditGuideTarget(null);
                    setShowEditGuideModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--ag-green)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
                >
                  <Plus size={15} /> Add Plant Guide
                </button>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="px-6 py-4 border-b border-[var(--ag-border)] bg-[var(--ag-bg)] flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={guidesSearch}
                onChange={(e) => setGuidesSearch(e.target.value)}
                placeholder="Search plants by English/Arabic name, or scientific name..."
                className="flex-1 rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface)] px-3 py-2 text-sm text-[var(--ag-text)]"
              />
              <select
                value={guidesCategory}
                onChange={(e) => setGuidesCategory(e.target.value)}
                className="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface)] px-3 py-2 text-sm text-[var(--ag-text)]"
              >
                <option value="">All Categories</option>
                {['vegetables', 'fruits', 'herbs', 'trees', 'flowers', 'other'].map((c) => (
                  <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {guides.length === 0 ? (
              <div className="p-8">
                <EmptyPanel
                  title={guidesTrash ? "Trash is empty." : "No plants found in the database."}
                  description={guidesTrash ? "Deleted plants will appear here." : "Change search keywords or add a plant above."}
                  icon={<Wheat size={22} />}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="ui-table-shell">
                  <thead>
                    <tr>
                      <th>Plant</th>
                      <th>Category</th>
                      <th>Source</th>
                      <th>Visibility</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guides.map((plant) => (
                      <tr key={plant.id}>
                        <td>
                          <div className="flex items-center gap-3 max-w-sm">
                            <img
                              src={plant.imageUrl || plant.image_url || ''}
                              alt={plant.name_en || plant.name}
                              className="h-12 w-12 rounded-xl object-cover flex-shrink-0 bg-gray-100"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/150?text=No+Image';
                              }}
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-[var(--ag-text)] truncate">
                                {plant.name_en || plant.name} {plant.name_ar && <span className="text-[var(--ag-text-muted)] text-xs font-normal">({plant.name_ar})</span>}
                              </p>
                              <p className="text-xs text-[var(--ag-text-muted)] italic truncate">{plant.scientificName || plant.scientific_name || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-xs font-bold text-[var(--ag-text-soft)] uppercase tracking-wide">
                            {plant.category}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs text-[var(--ag-text-muted)]">
                            {plant.sourceName || plant.source_name || 'Manual'}
                          </span>
                        </td>
                        <td>
                          {guidesTrash ? (
                            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">Soft Deleted</span>
                          ) : (
                            <button
                              onClick={() => void handleToggleGuideVisibility(plant.id)}
                              className="inline-flex items-center gap-1.5 focus:outline-none"
                              title="Toggle show/hide"
                            >
                              {plant.is_visible ? (
                                <StatusChip tone="forest"><Eye size={12} /> Visible</StatusChip>
                              ) : (
                                <StatusChip tone="amber"><EyeOff size={12} /> Hidden</StatusChip>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {guidesTrash ? (
                              <>
                                <button
                                  onClick={() => void handleRestoreGuide(plant.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-green-600 hover:bg-green-50"
                                  title="Restore plant guide"
                                >
                                  <RotateCcw size={15} />
                                </button>
                                <button
                                  onClick={() => void handleDeleteGuide(plant.id, true)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-600 hover:bg-red-50"
                                  title="Delete permanently"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditGuideTarget(plant);
                                    setShowEditGuideModal(true);
                                  }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--ag-text-soft)] hover:bg-blue-50 hover:text-blue-600"
                                  title="Edit details"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  onClick={() => void handleDeleteGuide(plant.id, false)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--ag-text-soft)] hover:bg-red-50 hover:text-red-600"
                                  title="Move to Trash"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {guidesPagination.total > 10 && (
              <div className="px-6 py-4 border-t border-[var(--ag-border)] flex items-center justify-between">
                <span className="text-xs text-[var(--ag-text-muted)]">
                  Showing {(guidesPagination.page - 1) * 10 + 1} - {Math.min(guidesPagination.page * 10, guidesPagination.total)} of {guidesPagination.total} plants
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => void loadGuidesList(guidesPagination.page - 1)}
                    disabled={guidesPagination.page <= 1}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface)] text-[var(--ag-text)] disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => void loadGuidesList(guidesPagination.page + 1)}
                    disabled={guidesPagination.page * 10 >= guidesPagination.total}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface)] text-[var(--ag-text)] disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </SurfaceCard>
        )}

        {/* Disease Library Management Tab */}
        {activeTab === 'disease-library' && (
          <SurfaceCard className="ui-surface p-0 overflow-hidden">
            <div className="border-b border-[var(--ag-border)] px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <SectionHeading
                eyebrow={language === 'ar' ? "الكتالوج الطبي" : "Medical Catalog"}
                title={language === 'ar' ? "إدارة مكتبة الأمراض" : "Disease Library Management"}
                description={language === 'ar' ? "تصفح وابحث وقم بمزامنة بيانات مكتبة أمراض النبات." : "Browse, search, and trigger sync for the plant disease library dataset."}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateDisease(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
                >
                  <Plus size={15} />
                  {language === 'ar' ? 'إضافة مرض' : 'Add Disease'}
                </button>
                <button
                  onClick={() => void handleSyncDiseases()}
                  disabled={isSyncingDiseases}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--ag-green)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60"
                >
                  <RefreshCw size={15} className={isSyncingDiseases ? 'animate-spin' : ''} />
                  {isSyncingDiseases
                    ? (language === 'ar' ? 'جاري المزامنة...' : 'Syncing Disease Library…')
                    : (language === 'ar' ? 'مزامنة مكتبة الأمراض' : 'Sync Disease Library')}
                </button>
              </div>
            </div>

            {diseaseSyncInfo && (
              <div className="px-6 py-3 border-b border-[var(--ag-border)] bg-[var(--ag-surface-muted)] text-sm text-[var(--ag-text-muted)] font-semibold">
                {diseaseSyncInfo}
              </div>
            )}

            {/* Filters & Search */}
            <div className="px-6 py-4 border-b border-[var(--ag-border)] bg-[var(--ag-bg)] flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={diseasesSearch}
                onChange={(e) => setDiseasesSearch(e.target.value)}
                placeholder={language === 'ar' ? "ابحث عن الأمراض بالاسم أو الوصف أو الاسم العلمي..." : "Search diseases by name, description, or scientific name..."}
                className="flex-1 rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface)] px-3 py-2 text-sm text-[var(--ag-text)]"
              />
              <select
                value={diseasesCategory}
                onChange={(e) => setDiseasesCategory(e.target.value)}
                className="rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface)] px-3 py-2 text-sm text-[var(--ag-text)] capitalize"
              >
                <option value="">{language === 'ar' ? "كل الفئات" : "All Categories"}</option>
                {diseaseCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Content list */}
            {isLoadingDiseases ? (
              <div className="p-8 text-center text-sm text-[var(--ag-text-muted)]">{language === 'ar' ? "جاري تحميل إدخالات مكتبة الأمراض..." : "Loading disease library entries…"}</div>
            ) : filteredDiseases.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="ui-table-shell">
                  <thead>
                    <tr>
                      <th>{language === 'ar' ? "المرض / الاسم في بلانتكس" : "Disease / Plantix Name"}</th>
                      <th>{language === 'ar' ? "الاسم العلمي / الفئة" : "Scientific Name / Category"}</th>
                      <th>{language === 'ar' ? "العوائل" : "Hosts"}</th>
                      <th className="text-right">{language === 'ar' ? "الإجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDiseases.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            {d.imageUrl ? (
                              <img
                                src={d.imageUrl}
                                alt={d.name}
                                className="h-10 w-10 rounded-lg object-cover border"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-[var(--ag-surface-muted)] flex items-center justify-center text-[var(--ag-text-muted)] font-black text-xs">NO IMG</div>
                            )}
                            <div>
                              <p className="font-bold text-[var(--ag-text)]">{d.name}</p>
                              {d.source && (
                                <p className="text-xs text-[var(--ag-text-soft)]">Source: {d.source}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <p className="text-sm italic font-semibold text-[var(--ag-text)]">{d.scientificName || '—'}</p>
                          <p className="text-xs text-[var(--ag-text-muted)] capitalize">{d.category || '—'}</p>
                        </td>
                        <td>
                          <p className="text-xs text-[var(--ag-text-muted)] max-w-xs truncate" title={d.hosts?.join(', ')}>
                            {d.hosts && d.hosts.length > 0 ? d.hosts.join(', ') : '—'}
                          </p>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingDisease(d)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--ag-surface-muted)] text-xs font-semibold text-[var(--ag-text)] border hover:bg-[var(--ag-bg)] transition"
                          >
                            {language === 'ar' ? "عرض التفاصيل" : "View Details"}
                          </button>
                          <button
                            onClick={() => void handleDeleteDisease(d.id)}
                            disabled={isDeletingDisease === d.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-xs font-semibold text-[var(--ag-red)] border border-red-100 hover:bg-red-100 transition disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                            {language === 'ar' ? "حذف" : "Delete"}
                          </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyPanel
                title={language === 'ar' ? "لم يتم العثور على أي أمراض" : "No disease entries found"}
                description={
                  diseasesSearch || diseasesCategory
                    ? (language === 'ar' ? "جرّب تعديل معايير البحث." : "Try adjusting your search criteria.")
                    : (language === 'ar' ? "قم بتشغيل المزامنة لتعبئة المكتبة." : "Run sync to populate the library.")
                }
                icon={<Stethoscope size={22} />}
              />
            )}
          </SurfaceCard>
        )}

        {activeTab === 'messages' && (
          <SurfaceCard className="ui-surface p-0 overflow-hidden">
            <div className="border-b border-[var(--ag-border)] px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <SectionHeading
                eyebrow={language === 'ar' ? "رسائل العملاء" : "Customer Inbox"}
                title={language === 'ar' ? "إدارة المسدجات" : "Message Management"}
                description={language === 'ar' ? "كل رسالة يرسلها العميل من صفحة اتصل بنا تظهر هنا." : "Messages submitted from the Contact Us form appear here."}
              />
              <button
                onClick={() => void loadMessages()}
                disabled={isLoadingMessages}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--ag-green)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60"
              >
                <RefreshCw size={15} className={isLoadingMessages ? 'animate-spin' : ''} />
                {language === 'ar' ? 'تحديث' : 'Refresh'}
              </button>
            </div>
            {isLoadingMessages ? (
              <div className="p-8 text-center text-sm text-[var(--ag-text-muted)]">Loading messages...</div>
            ) : messages.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="ui-table-shell">
                  <thead>
                    <tr>
                      <th>{language === 'ar' ? 'العميل' : 'Customer'}</th>
                      <th>{language === 'ar' ? 'الرسالة' : 'Message'}</th>
                      <th>{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="text-right">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((message) => (
                      <tr key={message.id}>
                        <td>
                          <p className="font-bold text-[var(--ag-text)]">{message.name}</p>
                          <p className="text-xs text-[var(--ag-text-muted)]">{message.email}</p>
                          <p className="text-xs text-[var(--ag-text-soft)]">
                            {new Date(String(message.createdAt || message.created_at || Date.now())).toLocaleString()}
                          </p>
                        </td>
                        <td>
                          <div className="max-w-xl">
                            <p className="text-sm font-semibold text-[var(--ag-text)]">{message.subject}</p>
                            <p className="text-xs text-[var(--ag-text-muted)] whitespace-pre-wrap">{message.message}</p>
                          </div>
                        </td>
                        <td>
                          <StatusChip tone={message.status === 'new' ? 'amber' : message.status === 'read' ? 'blue' : 'forest'}>
                            {message.status}
                          </StatusChip>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => void handleUpdateMessageStatus(message.id, 'read')} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-blue-600 hover:bg-blue-50" title="Mark read">
                              <CheckCircle size={15} />
                            </button>
                            <button onClick={() => void handleUpdateMessageStatus(message.id, 'archived')} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ag-text-soft)] hover:bg-[var(--ag-bg)]" title="Archive">
                              <Archive size={15} />
                            </button>
                            <button onClick={() => void handleDeleteMessage(message.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ag-red)] hover:bg-red-50" title="Delete">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyPanel title={language === 'ar' ? "لا توجد رسائل" : "No messages yet"} description={language === 'ar' ? "رسائل صفحة اتصل بنا ستظهر هنا." : "Contact form submissions will appear here."} icon={<MessageSquare size={22} />} />
            )}
          </SurfaceCard>
        )}

        {/* Scraping Center Tab */}
        {activeTab === 'scraping-center' && (
          <SurfaceCard className="ui-surface p-0 overflow-hidden">
            <div className="flex items-start justify-between border-b border-[var(--ag-border)] px-6 py-5">
              <SectionHeading
                eyebrow="Scraper Hub"
                title="Growth Guides Scraping Center"
                description="Examine crawler metrics, trigger background catalog updates, and audit historical sync logs."
              />
              <div className="ml-4 mt-1 flex flex-shrink-0 items-center gap-2">
                <button
                  onClick={() => void handleSyncGuides()}
                  disabled={isSyncingGuides || guidesSyncStatus?.isSyncing}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--ag-green)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60"
                >
                  <RefreshCw size={15} className={isSyncingGuides || guidesSyncStatus?.isSyncing ? 'animate-spin' : ''} />
                  {isSyncingGuides || guidesSyncStatus?.isSyncing ? 'Synchronizing…' : 'Trigger Sync Now'}
                </button>
              </div>
            </div>

            {guidesSyncInfo && (
              <div className="border-b border-[var(--ag-border)] px-6 py-3 text-sm text-[var(--ag-text-muted)] bg-[var(--ag-surface-muted)]">
                {guidesSyncInfo}
              </div>
            )}

            <div className="p-6 space-y-6">
              {/* Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="ui-card p-4 rounded-xl">
                  <span className="text-[10px] text-[var(--ag-text-muted)] uppercase font-extrabold">Total Plant Guides</span>
                  <div className="text-2xl font-black text-[var(--ag-green)] mt-1">
                    {guidesSyncStatus?.totalPlantsInDb ?? '—'}
                  </div>
                </div>
                <div className="ui-card p-4 rounded-xl">
                  <span className="text-[10px] text-[var(--ag-text-muted)] uppercase font-extrabold">Crawl Status</span>
                  <div className="text-sm font-bold mt-2">
                    {guidesSyncStatus?.isSyncing ? (
                      <span className="text-yellow-600 animate-pulse font-extrabold flex items-center gap-1.5">
                        <RefreshCw size={14} className="animate-spin" /> In Progress
                      </span>
                    ) : (
                      <span className="text-green-600 font-extrabold flex items-center gap-1.5">
                        <CheckCircle size={14} /> Idle (Scheduled)
                      </span>
                    )}
                  </div>
                </div>
                <div className="ui-card p-4 rounded-xl">
                  <span className="text-[10px] text-[var(--ag-text-muted)] uppercase font-extrabold">Last Synced Date</span>
                  <div className="text-xs text-[var(--ag-text)] mt-2 font-bold">
                    {guidesSyncStatus?.lastSyncedAt ? new Date(guidesSyncStatus.lastSyncedAt).toLocaleString() : 'Never'}
                  </div>
                </div>
              </div>

              {/* Crawler Details */}
              {guidesSyncStatus?.sources && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.entries(guidesSyncStatus.sources) as [string, any][]).map(([name, src]) => (
                    <div key={name} className="ui-card p-4 rounded-xl space-y-2 border">
                      <div className="flex justify-between items-center border-b pb-1">
                        <span className="font-extrabold text-sm text-[var(--ag-green)]">{name} Adapter</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${src.status === 'completed' ? 'bg-green-100 text-green-700' : src.status === 'running' ? 'bg-yellow-100 text-yellow-700 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
                          {src.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-center text-xs pt-1">
                        <div>
                          <span className="text-[10px] text-[var(--ag-text-muted)] block">Scanned</span>
                          <span className="font-bold">{src.scanned}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--ag-text-muted)] block text-green-600">Created</span>
                          <span className="font-bold text-green-600">{src.created}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--ag-text-muted)] block text-blue-600">Updated</span>
                          <span className="font-bold text-blue-600">{src.updated}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--ag-text-muted)] block text-red-600">Failed</span>
                          <span className="font-bold text-red-600">{src.failed}</span>
                        </div>
                      </div>
                      {src.error && (
                        <div className="text-[10px] text-red-600 bg-red-50 p-2 rounded border border-red-200 mt-2">
                          {src.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Historical Logs List */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[var(--ag-text)] uppercase tracking-wider flex items-center gap-1.5">
                  <Archive size={16} /> Sync Activity Logs (سجلات المزامنة)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-[var(--ag-border)]">
                  <table className="ui-table-shell !border-0">
                    <thead>
                      <tr className="bg-[var(--ag-bg)]">
                        <th className="!py-3">Start Time</th>
                        <th>End Time</th>
                        <th>Status</th>
                        <th>Crops Processed</th>
                        <th>New</th>
                        <th>Updated</th>
                        <th>Failed</th>
                        <th>Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!guidesSyncStatus?.logs || guidesSyncStatus.logs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-6 text-sm text-[var(--ag-text-muted)] italic">
                            No scraping executions logged in DB.
                          </td>
                        </tr>
                      ) : (
                        guidesSyncStatus.logs.map((log) => (
                          <tr key={log.id}>
                            <td className="!py-2 text-xs font-semibold">
                              {new Date(log.start_time).toLocaleString()}
                            </td>
                            <td className="text-xs text-[var(--ag-text-soft)]">
                              {log.end_time ? new Date(log.end_time).toLocaleString() : '—'}
                            </td>
                            <td>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                log.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : log.status === 'partial_success'
                                  ? 'bg-blue-100 text-blue-700'
                                  : log.status === 'running'
                                  ? 'bg-yellow-100 text-yellow-700 animate-pulse'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="font-bold text-xs">{log.scanned_count}</td>
                            <td className="text-green-600 font-bold text-xs">{log.created_count}</td>
                            <td className="text-blue-600 font-bold text-xs">{log.updated_count}</td>
                            <td className="text-red-600 font-bold text-xs">{log.failed_count}</td>
                            <td className="text-[10px] text-red-600 max-w-xs truncate" title={log.error_message || ''}>
                              {log.error_message || 'None'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Disease Library Crawler Section */}
              <div className="border-t border-[var(--ag-border)] pt-6 mt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-extrabold text-base text-[var(--ag-text)]">
                      {language === 'ar' ? "مستخرج مكتبة الأمراض" : "Disease Library Scraper"}
                    </h3>
                    <p className="text-xs text-[var(--ag-text-soft)]">
                      {language === 'ar' ? "تفعيل المزامنة وعرض الحالة لقاعدة بيانات أمراض النبات باللغة العربية." : "Trigger sync and view status for the Plantix Arabic disease database."}
                    </p>
                  </div>
                  <button
                    onClick={() => void handleSyncDiseases()}
                    disabled={isSyncingDiseases}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--ag-green)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60"
                  >
                    <RefreshCw size={15} className={isSyncingDiseases ? 'animate-spin' : ''} />
                    {isSyncingDiseases
                      ? (language === 'ar' ? 'جاري المزامنة...' : 'Synchronizing…')
                      : (language === 'ar' ? 'ابدأ المزامنة الآن' : 'Trigger Sync Now')}
                  </button>
                </div>

                {diseaseSyncInfo && (
                  <div className="mb-4 p-3 text-xs font-semibold rounded-xl bg-[var(--ag-surface-muted)] text-[var(--ag-text-muted)]">
                    {diseaseSyncInfo}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="ui-card p-4 rounded-xl">
                    <span className="text-[10px] text-[var(--ag-text-muted)] uppercase font-extrabold">
                      {language === 'ar' ? "إجمالي الأمراض في قاعدة البيانات" : "Total Diseases in Database"}
                    </span>
                    <div className="text-2xl font-black text-[var(--ag-green)] mt-1">
                      {diseasesList.length || '—'}
                    </div>
                  </div>
                  <div className="ui-card p-4 rounded-xl">
                    <span className="text-[10px] text-[var(--ag-text-muted)] uppercase font-extrabold">
                      {language === 'ar' ? "حالة المزامنة" : "Sync Status"}
                    </span>
                    <div className="text-sm font-bold mt-2">
                      {isSyncingDiseases ? (
                        <span className="text-yellow-600 animate-pulse flex items-center gap-1.5 font-extrabold">
                          <RefreshCw size={14} className="animate-spin" /> {language === 'ar' ? "جاري العمل" : "In Progress"}
                        </span>
                      ) : (
                        <span className="text-green-600 font-extrabold flex items-center gap-1.5">
                          <CheckCircle size={14} /> {language === 'ar' ? "خامل (مجدول)" : "Idle (Scheduled)"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SurfaceCard>
        )}
      </div>
    </div>
  );
};

// ─── View Disease Modal ──────────────────────────────────────
interface ViewDiseaseModalProps {
  disease: DiseaseInfo;
  onClose: () => void;
}
const ViewDiseaseModal: React.FC<ViewDiseaseModalProps> = ({ disease, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm py-10 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[var(--ag-surface)] p-6 shadow-2xl border border-[var(--ag-border)]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-[var(--ag-text)] flex items-center gap-2">
            <ShieldAlert size={18} className="text-[var(--ag-red)]" /> {disease.name}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--ag-bg)] text-[var(--ag-text-soft)]"><X size={18} /></button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {disease.imageUrl && (
            <img src={disease.imageUrl} alt={disease.name} className="w-full h-48 rounded-xl object-cover border" />
          )}

          <div className="grid grid-cols-2 gap-4 text-sm bg-[var(--ag-surface-muted)] p-3 rounded-xl">
            <div>
              <span className="font-bold text-[var(--ag-text-muted)] block text-xs">Scientific Name</span>
              <span className="italic">{disease.scientificName || '—'}</span>
            </div>
            <div>
              <span className="font-bold text-[var(--ag-text-muted)] block text-xs">Category / Pathogen</span>
              <span className="capitalize">{disease.category || '—'}</span>
            </div>
            {disease.hosts && disease.hosts.length > 0 && (
              <div className="col-span-2">
                <span className="font-bold text-[var(--ag-text-muted)] block text-xs">Hosts</span>
                <span>{disease.hosts.join(', ')}</span>
              </div>
            )}
            {disease.sourceUrl && (
              <div className="col-span-2">
                <span className="font-bold text-[var(--ag-text-muted)] block text-xs">Source Reference</span>
                <a href={disease.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--ag-green)] hover:underline flex items-center gap-1">
                  View on {disease.source || 'Plantix'} <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

          <div>
            <h4 className="font-bold text-[var(--ag-text)] mb-1">Description / الوصف</h4>
            <p className="text-sm text-[var(--ag-text-muted)] leading-relaxed">{disease.description}</p>
          </div>

          {disease.symptoms && disease.symptoms.length > 0 && (
            <div>
              <h4 className="font-bold text-[var(--ag-text)] mb-1">Symptoms / الأعراض</h4>
              <ul className="list-disc list-inside text-sm text-[var(--ag-text-muted)] space-y-1">
                {disease.symptoms.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {disease.treatment && disease.treatment.length > 0 && (
            <div>
              <h4 className="font-bold text-[var(--ag-text)] mb-1">Control & Treatment / العلاج والمكافحة</h4>
              <ul className="list-disc list-inside text-sm text-[var(--ag-text-muted)] space-y-1">
                {disease.treatment.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}

          {disease.prevention && disease.prevention.length > 0 && (
            <div>
              <h4 className="font-bold text-[var(--ag-text)] mb-1">Prevention / الوقاية</h4>
              <ul className="list-disc list-inside text-sm text-[var(--ag-text-muted)] space-y-1">
                {disease.prevention.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-6">
          <button onClick={onClose} className="w-full rounded-xl bg-[var(--ag-surface-muted)] hover:bg-[var(--ag-bg)] py-2 text-sm text-[var(--ag-text-soft)] font-semibold border">Close</button>
        </div>
      </div>
    </div>
  );
};
