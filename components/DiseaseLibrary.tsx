import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bug,
  ChevronRight,
  ExternalLink,
  Filter,
  Leaf,
  RefreshCw,
  Search,
  Sprout,
  X,
} from 'lucide-react';
import { getDiseaseLibrary } from '../services/staticDataService';
import { diseaseLibraryApi } from '../services/apiService';
import { isBackendAuthEnabled } from '../services/backendAuthService';
import type { DiseaseInfo } from '../types';
import { Spinner } from './Spinner';
import { useTranslation } from '../contexts/LanguageContext';
import { EmptyPanel } from './WorkspacePrimitives';

const DEFAULT_DISEASE_IMAGE = '/images/avm-3d/disease-leaf-early-blight.png';
const DISEASE_ASSET_MAP = [
  { terms: ['aphid', 'insect', 'pest'], image: '/images/avm-3d/disease-leaf-aphids.png' },
  { terms: ['powdery', 'mildew'], image: '/images/avm-3d/disease-leaf-powdery.png' },
  { terms: ['rust'], image: '/images/avm-3d/disease-leaf-rust.png' },
  { terms: ['blight', 'spot', 'fungi', 'fungus', 'bacteria'], image: '/images/avm-3d/disease-leaf-early-blight.png' },
];
const ALL_FILTER = 'all';
const CATEGORY_ORDER = ['fungi', 'virus', 'mite', 'bacteria', 'insect', 'deficiency', 'others', 'additional', 'weed'];
const HOST_ORDER = [
  'lettuce', 'eggplant', 'pea', 'wheat', 'ornamental', 'tea', 'rice', 'carrot', 'banana', 'melon',
  'olive', 'turmeric', 'pomegranate', 'sweetpotato', 'pistachio', 'cherry', 'zucchini', 'apricot',
  'mango', 'lentil', 'citrus', 'tomato', 'pepper', 'millet', 'manioc', 'cauliflower', 'maize',
  'peanut', 'strawberry', 'currant', 'papaya', 'onion', 'pumpkin', 'bean', 'canola', 'sugarcane',
  'ginger', 'pigeonpea', 'rose', 'gram', 'sugarbeet', 'potato', 'peach', 'tobacco', 'barley',
  'additional', 'guava', 'cucumber', 'coffee', 'chickpea', 'bitter_gourd', 'almond', 'okra',
  'sorghum', 'cabbage', 'apple', 'garlic', 'cotton', 'pear', 'grape', 'soybean',
];

interface DiseaseLibraryProps {
  setActiveView: (view: 'doctor' | 'guide' | 'dashboard' | 'library') => void;
}

const text = {
  ar: {
    title: 'مكتبة أمراض النبات',
    subtitle: 'فهرس Plantix العربي للآفات والأمراض، منظم حسب المحصول ونوع الإصابة.',
    source: 'المصدر: Plantix',
    search: 'ابحث باسم المرض أو العرض أو المحصول',
    filters: 'الفلاتر',
    type: 'نوع الإصابة',
    crop: 'المحصول',
    allTypes: 'كل الأنواع',
    allCrops: 'كل المحاصيل',
    results: 'نتيجة',
    refresh: 'تحديث',
    clear: 'مسح',
    loading: 'جاري تحميل مكتبة الأمراض...',
    detailLoading: 'جاري تحميل تفاصيل المرض...',
    detailError: 'تعذر تحميل تفاصيل المرض من قاعدة البيانات.',
    back: 'العودة إلى مكتبة الأمراض',
    noResults: 'لا توجد نتائج مطابقة',
    noResultsDesc: 'غيّر كلمة البحث أو الفلتر الحالي.',
    symptoms: 'الأعراض',
    treatment: 'التوصيات',
    prevention: 'الوقاية',
    unavailable: 'غير متوفر من فهرس Plantix الحالي.',
    sourceLink: 'فتح المصدر الأصلي',
    close: 'إغلاق',
    crops: 'محاصيل',
    records: 'سجل',
    problemTypes: 'أنواع إصابة',
    cropFilters: 'محصول',
    scientificName: 'الاسم العلمي',
  },
  en: {
    title: 'Plant Disease Library',
    subtitle: 'The Arabic Plantix pest and disease index, organized by crop and problem type.',
    source: 'Source: Plantix',
    search: 'Search disease, symptom, or crop',
    filters: 'Filters',
    type: 'Problem type',
    crop: 'Crop',
    allTypes: 'All types',
    allCrops: 'All crops',
    results: 'results',
    refresh: 'Refresh',
    clear: 'Clear',
    loading: 'Loading disease library...',
    detailLoading: 'Loading disease details...',
    detailError: 'Could not load disease details from the database.',
    back: 'Back to disease library',
    noResults: 'No matching results',
    noResultsDesc: 'Try a different search term or filter.',
    symptoms: 'Symptoms',
    treatment: 'Recommendations',
    prevention: 'Prevention',
    unavailable: 'Not available from the current Plantix index.',
    sourceLink: 'Open source',
    close: 'Close',
    crops: 'Crops',
    records: 'records',
    problemTypes: 'problem types',
    cropFilters: 'crops',
    scientificName: 'Scientific name',
  },
} as const;

const categoryLabels: Record<string, { ar: string; en: string }> = {
  bacteria: { ar: 'بكتيريا', en: 'Bacteria' },
  fungi: { ar: 'فطريات', en: 'Fungi' },
  insect: { ar: 'حشرات', en: 'Insects' },
  mite: { ar: 'حلم', en: 'Mites' },
  mites: { ar: 'حلم', en: 'Mites' },
  nematode: { ar: 'نيماتودا', en: 'Nematodes' },
  nematodes: { ar: 'نيماتودا', en: 'Nematodes' },
  virus: { ar: 'فيروسات', en: 'Viruses' },
  viral: { ar: 'فيروسات', en: 'Viruses' },
  deficiency: { ar: 'نقص عناصر', en: 'Deficiency' },
  disorder: { ar: 'اضطرابات', en: 'Disorders' },
  others: { ar: 'مشكلات أخرى', en: 'Other issues' },
  additional: { ar: 'إضافي', en: 'Additional' },
  weed: { ar: 'حشائش', en: 'Weeds' },
  'plant-disease': { ar: 'أمراض نبات', en: 'Plant diseases' },
};

const hostLabels: Record<string, { ar: string; en: string }> = {
  additional: { ar: 'أخرى', en: 'Additional' },
  almond: { ar: 'اللوز', en: 'Almond' },
  apple: { ar: 'التفاح', en: 'Apple' },
  apricot: { ar: 'المشمش', en: 'Apricot' },
  banana: { ar: 'الموز', en: 'Banana' },
  barley: { ar: 'الشعير', en: 'Barley' },
  bean: { ar: 'الفاصولياء', en: 'Bean' },
  bitter_gourd: { ar: 'الكريلا (القثاء المر)', en: 'Bitter gourd' },
  cabbage: { ar: 'الكرنب', en: 'Cabbage' },
  canola: { ar: 'كانولا', en: 'Canola' },
  carrot: { ar: 'الجزر', en: 'Carrot' },
  cauliflower: { ar: 'القرنبيط', en: 'Cauliflower' },
  cherry: { ar: 'الكرز', en: 'Cherry' },
  chickpea: { ar: 'البازيلاء والحمص', en: 'Chickpea' },
  citrus: { ar: 'الحمضيات (الموالح)', en: 'Citrus' },
  coffee: { ar: 'القهوة', en: 'Coffee' },
  cotton: { ar: 'القطن', en: 'Cotton' },
  cucumber: { ar: 'الخيار', en: 'Cucumber' },
  currant: { ar: 'الكشمش', en: 'Currant' },
  eggplant: { ar: 'الباذنجان', en: 'Eggplant' },
  garlic: { ar: 'الثوم', en: 'Garlic' },
  ginger: { ar: 'الزنجبيل', en: 'Ginger' },
  gram: { ar: 'اللوبيا الخضراء والسوداء', en: 'Gram' },
  grape: { ar: 'العنب', en: 'Grape' },
  guava: { ar: 'الجوافة', en: 'Guava' },
  lentil: { ar: 'عدس', en: 'Lentil' },
  lettuce: { ar: 'الخس', en: 'Lettuce' },
  maize: { ar: 'الذرة', en: 'Maize' },
  mango: { ar: 'المانجو', en: 'Mango' },
  manioc: { ar: 'الكسافا', en: 'Manioc' },
  melon: { ar: 'البطيخ', en: 'Melon' },
  millet: { ar: 'الدخن', en: 'Millet' },
  okra: { ar: 'البامية', en: 'Okra' },
  olive: { ar: 'الزيتون', en: 'Olive' },
  onion: { ar: 'البصل', en: 'Onion' },
  ornamental: { ar: 'نباتات الزينة', en: 'Ornamental' },
  papaya: { ar: 'البابايا', en: 'Papaya' },
  pea: { ar: 'البسلة', en: 'Pea' },
  peach: { ar: 'الخوخ', en: 'Peach' },
  peanut: { ar: 'الفول السوداني', en: 'Peanut' },
  pear: { ar: 'الإجاص', en: 'Pear' },
  pepper: { ar: 'الفليفلة والفلفل الحار', en: 'Pepper' },
  pigeonpea: { ar: 'البسلة الهندية والبسلة الحمراء', en: 'Pigeon pea' },
  pistachio: { ar: 'الفستق الحلبي', en: 'Pistachio' },
  pomegranate: { ar: 'الرمان', en: 'Pomegranate' },
  potato: { ar: 'البطاطا', en: 'Potato' },
  pumpkin: { ar: 'اليقطين', en: 'Pumpkin' },
  rice: { ar: 'الأرز', en: 'Rice' },
  rose: { ar: 'الورود', en: 'Rose' },
  sorghum: { ar: 'الذرة الرفيعة', en: 'Sorghum' },
  soybean: { ar: 'فول الصويا', en: 'Soybean' },
  strawberry: { ar: 'الفراولة', en: 'Strawberry' },
  sugarbeet: { ar: 'بنجر السكر', en: 'Sugar beet' },
  sugarcane: { ar: 'قصب السكر', en: 'Sugarcane' },
  sweetpotato: { ar: 'البطاطا الحلوة', en: 'Sweet potato' },
  tea: { ar: 'الشاي', en: 'Tea' },
  tobacco: { ar: 'التبغ', en: 'Tobacco' },
  tomato: { ar: 'الطماطم', en: 'Tomato' },
  turmeric: { ar: 'الكركم', en: 'Turmeric' },
  wheat: { ar: 'قمح', en: 'Wheat' },
  zucchini: { ar: 'الكوسة', en: 'Zucchini' },
};

const normalizeFilter = (value?: string | null) => (value || '').trim().toLowerCase();

const uniqueValues = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const getDiseaseImage = (disease: DiseaseInfo) => {
  if (disease.imageUrl?.trim()) return disease.imageUrl;
  const searchable = [
    disease.name,
    disease.description,
    disease.category,
    ...(disease.hosts || []),
  ].join(' ').toLowerCase();
  return DISEASE_ASSET_MAP.find(({ terms }) => terms.some((term) => searchable.includes(term)))?.image || DEFAULT_DISEASE_IMAGE;
};

const hostLabel = (host: string) =>
  host
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getCategoryLabel = (category: string, language: 'ar' | 'en') => {
  const normalized = normalizeFilter(category);
  return categoryLabels[normalized]?.[language] || hostLabel(normalized || 'plant disease');
};

const getHostLabel = (host: string, language: 'ar' | 'en') => {
  const normalized = normalizeFilter(host);
  return hostLabels[normalized]?.[language] || hostLabel(normalized);
};

const formatCount = (count: number, language: 'ar' | 'en') =>
  new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US').format(count);

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

const sortBySourceOrder = (values: string[], order: string[]) =>
  [...values].sort((left, right) => {
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    if (leftIndex !== -1 && rightIndex !== -1) return leftIndex - rightIndex;
    if (leftIndex !== -1) return -1;
    if (rightIndex !== -1) return 1;
    return left.localeCompare(right);
  });

export const DiseaseLibrary: React.FC<DiseaseLibraryProps> = ({ setActiveView: _setActiveView }) => {
  const { language } = useTranslation();
  const ui = text[language === 'ar' ? 'ar' : 'en'];
  const backendEnabled = isBackendAuthEnabled();
  const [diseases, setDiseases] = useState<DiseaseInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDisease, setSelectedDisease] = useState<DiseaseInfo | null>(null);
  const [selectedDiseaseId, setSelectedDiseaseId] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL_FILTER);
  const [selectedHost, setSelectedHost] = useState(ALL_FILTER);

  const loadDiseases = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const importedDiseases = backendEnabled ? await diseaseLibraryApi.getAll(language) : [];
      const nextDiseases = importedDiseases.length > 0 ? importedDiseases : getDiseaseLibrary(language);
      setDiseases(nextDiseases);
    } catch {
      const fallbackDiseases = getDiseaseLibrary(language);
      setDiseases(fallbackDiseases);
      setError(fallbackDiseases.length === 0 ? 'Disease library is unavailable.' : null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [backendEnabled, language]);

  useEffect(() => {
    void loadDiseases();
  }, [loadDiseases]);

  const categories = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    diseases.forEach((disease) => {
      const category = normalizeFilter(disease.category);
      if (category) counts.set(category, (counts.get(category) || 0) + 1);
    });

    const languageCode = language === 'ar' ? 'ar' : 'en';
    const options = sortBySourceOrder(Array.from(counts.keys()), CATEGORY_ORDER).map((category) => ({
      value: category,
      label: getCategoryLabel(category, languageCode),
      count: counts.get(category) || 0,
    }));

    return [{ value: ALL_FILTER, label: ui.allTypes, count: diseases.length }, ...options];
  }, [diseases, language, ui.allTypes]);

  const hosts = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    diseases.forEach((disease) => {
      uniqueValues((disease.hosts || []).map(normalizeFilter)).forEach((host) => {
        counts.set(host, (counts.get(host) || 0) + 1);
      });
    });

    const languageCode = language === 'ar' ? 'ar' : 'en';
    const options = sortBySourceOrder(Array.from(counts.keys()), HOST_ORDER).map((host) => ({
      value: host,
      label: getHostLabel(host, languageCode),
      count: counts.get(host) || 0,
    }));

    return [{ value: ALL_FILTER, label: ui.allCrops, count: diseases.length }, ...options];
  }, [diseases, language, ui.allCrops]);

  const filteredDiseases = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return diseases.filter((disease) => {
      const haystack = [
        disease.name,
        disease.description,
        disease.category,
        ...(disease.hosts || []),
        ...(disease.symptoms || []),
      ].join(' ').toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesCategory = selectedCategory === ALL_FILTER || normalizeFilter(disease.category) === selectedCategory;
      const matchesHost = selectedHost === ALL_FILTER || (disease.hosts || []).map(normalizeFilter).includes(selectedHost);

      return matchesSearch && matchesCategory && matchesHost;
    });
  }, [diseases, searchTerm, selectedCategory, selectedHost]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory(ALL_FILTER);
    setSelectedHost(ALL_FILTER);
  };

  const openDiseaseDetail = useCallback(async (disease: DiseaseInfo) => {
    setSelectedDiseaseId(disease.id);
    setSelectedDisease(disease);
    setIsLoadingDetail(backendEnabled);
    setDetailError(null);

    if (!backendEnabled) return;

    try {
      const detail = await diseaseLibraryApi.getById(disease.id);
      setSelectedDisease(detail);
    } catch {
      setDetailError(ui.detailError);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [backendEnabled, ui.detailError]);

  const closeDiseaseDetail = () => {
    setSelectedDiseaseId(null);
    setSelectedDisease(null);
    setDetailError(null);
    setIsLoadingDetail(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <Spinner />
        <p className="mt-4 font-semibold text-[var(--ag-text-muted)]">{ui.loading}</p>
      </div>
    );
  }

  if (selectedDiseaseId) {
    return (
      <DiseaseDetailPage
        disease={selectedDisease}
        language={language === 'ar' ? 'ar' : 'en'}
        isLoading={isLoadingDetail}
        error={detailError}
        onBack={closeDiseaseDetail}
      />
    );
  }

  return (
    <div className="animate-fade-in pb-12" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <section className="border-b border-[var(--ag-border)] bg-[var(--ag-surface)]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-strong)] px-3 text-sm font-bold text-brand-green-dark dark:text-brand-green-light">
                <Leaf className="h-4 w-4" aria-hidden="true" />
                <span>{ui.source}</span>
              </div>
              <h1 className="text-3xl font-extrabold text-[var(--ag-text)] sm:text-4xl">{ui.title}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--ag-text-muted)]">{ui.subtitle}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <MetricPill value={formatCount(diseases.length, language === 'ar' ? 'ar' : 'en')} label={ui.records} />
                <MetricPill value={formatCount(Math.max(categories.length - 1, 0), language === 'ar' ? 'ar' : 'en')} label={ui.problemTypes} />
                <MetricPill value={formatCount(Math.max(hosts.length - 1, 0), language === 'ar' ? 'ar' : 'en')} label={ui.cropFilters} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadDiseases(true)}
              disabled={isRefreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-green-dark disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              {ui.refresh}
            </button>
          </div>

          <div className="mt-6 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-strong)] p-3 shadow-sm">
            <div className="relative">
              <Search className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--ag-text-soft)] ${language === 'ar' ? 'right-4' : 'left-4'}`} aria-hidden="true" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={ui.search}
                className={`min-h-12 w-full rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] py-3 text-[var(--ag-text)] outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/25 ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className={`absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--ag-text-muted)] transition hover:bg-[var(--ag-surface)] hover:text-[var(--ag-text)] ${language === 'ar' ? 'left-2' : 'right-2'}`}
                  aria-label={ui.clear}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="h-fit rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-strong)] p-4 shadow-sm lg:sticky lg:top-24">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-[var(--ag-text)]">
              <Filter className="h-5 w-5 text-brand-green" aria-hidden="true" />
              {ui.filters}
            </h2>
            <button
              type="button"
              onClick={resetFilters}
              className="min-h-11 rounded-lg px-3 text-sm font-bold text-brand-green-dark transition hover:bg-[var(--ag-surface-muted)] dark:text-brand-green-light"
            >
              {ui.clear}
            </button>
          </div>

          <FilterGroup
            title={ui.type}
            options={categories}
            selected={selectedCategory}
            language={language === 'ar' ? 'ar' : 'en'}
            onSelect={setSelectedCategory}
          />

          <FilterGroup
            title={ui.crop}
            options={hosts}
            selected={selectedHost}
            language={language === 'ar' ? 'ar' : 'en'}
            onSelect={setSelectedHost}
          />
        </aside>

        <main>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-strong)] px-4 py-3 shadow-sm">
            <p className="text-lg font-extrabold text-[var(--ag-text)]">
              {formatCount(filteredDiseases.length, language === 'ar' ? 'ar' : 'en')} {ui.results}
            </p>
            {error ? (
              <p className="rounded-lg border border-[var(--ag-red)] bg-[var(--ag-red-soft)] px-3 py-2 text-sm font-semibold text-[var(--ag-red)]">
                {error}
              </p>
            ) : null}
          </div>

          {filteredDiseases.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredDiseases.map((disease) => (
                <DiseaseCard
                  key={disease.id}
                  disease={disease}
                  language={language === 'ar' ? 'ar' : 'en'}
                  onSelect={(item) => void openDiseaseDetail(item)}
                />
              ))}
            </div>
          ) : (
            <EmptyPanel
              title={ui.noResults}
              description={ui.noResultsDesc}
              icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />}
            />
          )}
        </main>
      </section>

    </div>
  );
};

const MetricPill: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <span className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-strong)] px-3 text-sm font-bold text-[var(--ag-text-muted)]">
    <span className="text-brand-green-dark dark:text-brand-green-light">{value}</span>
    <span>{label}</span>
  </span>
);

interface FilterGroupProps {
  title: string;
  options: FilterOption[];
  selected: string;
  language: 'ar' | 'en';
  onSelect: (value: string) => void;
}

const FilterGroup: React.FC<FilterGroupProps> = ({ title, options, selected, language, onSelect }) => (
  <div className="border-t border-[var(--ag-border)] py-4 first:border-t-0 first:pt-0">
    <h3 className="mb-3 text-sm font-extrabold uppercase text-[var(--ag-text-soft)]">{title}</h3>
    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
      {options.map((option) => {
        const active = selected === option.value;
        const count = formatCount(option.count, language);

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm font-bold transition ${
              active
                ? 'border-brand-green bg-brand-green text-white'
                : 'border-[var(--ag-border)] bg-[var(--ag-surface)] text-[var(--ag-text-muted)] hover:border-brand-green hover:text-[var(--ag-text)]'
            }`}
          >
            <span className="truncate">{option.label}</span>
            <span className="inline-flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/20 text-white' : 'bg-[var(--ag-surface-muted)] text-[var(--ag-text-soft)]'}`}>
                {count}
              </span>
              <ChevronRight className={`h-4 w-4 shrink-0 ${language === 'ar' ? 'rotate-180' : ''}`} aria-hidden="true" />
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

interface DiseaseCardProps {
  disease: DiseaseInfo;
  language: 'ar' | 'en';
  onSelect: (disease: DiseaseInfo) => void;
}

const DiseaseCard: React.FC<DiseaseCardProps> = ({ disease, language, onSelect }) => {
  const category = getCategoryLabel(disease.category || 'plant-disease', language);
  const hosts = (disease.hosts || []).slice(0, 3);

  return (
    <button
      type="button"
      onClick={() => onSelect(disease)}
      className="group overflow-hidden rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-strong)] text-start shadow-sm transition hover:-translate-y-0.5 hover:border-brand-green hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-green/40"
    >
      <div className="aspect-[4/3] bg-[var(--ag-surface-muted)]">
        <img
          src={getDiseaseImage(disease)}
          alt={disease.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          onError={(event) => {
            event.currentTarget.src = DEFAULT_DISEASE_IMAGE;
          }}
        />
      </div>
      <div className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-[var(--ag-green-soft)] px-2 text-xs font-extrabold text-brand-green-dark dark:text-brand-green-light">
            {category === getCategoryLabel('insect', language) ? <Bug className="h-3.5 w-3.5" aria-hidden="true" /> : <Sprout className="h-3.5 w-3.5" aria-hidden="true" />}
            {category}
          </span>
          {disease.sourceName ? (
            <span className="rounded-lg border border-[var(--ag-border)] px-2 py-1 text-xs font-bold text-[var(--ag-text-soft)]">
              {disease.sourceName}
            </span>
          ) : null}
        </div>
        <h3 className="line-clamp-2 text-lg font-extrabold leading-6 text-[var(--ag-text)]">{disease.name}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--ag-text-muted)]">{disease.description}</p>
        {hosts.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {hosts.map((host) => (
              <span key={host} className="rounded-lg bg-[var(--ag-surface-muted)] px-2 py-1 text-xs font-bold text-[var(--ag-text-muted)]">
                {getHostLabel(host, language)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </button>
  );
};

interface DiseaseDetailPageProps {
  disease: DiseaseInfo | null;
  language: 'ar' | 'en';
  isLoading: boolean;
  error: string | null;
  onBack: () => void;
}

const DiseaseDetailPage: React.FC<DiseaseDetailPageProps> = ({ disease, language, isLoading, error, onBack }) => {
  const ui = text[language];
  const hosts = disease?.hosts || [];

  return (
    <div className="animate-fade-in pb-12" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <section className="border-b border-[var(--ag-border)] bg-[var(--ag-surface)]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={onBack}
            className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-strong)] px-4 py-2 text-sm font-bold text-brand-green-dark transition hover:bg-[var(--ag-surface-muted)] dark:text-brand-green-light"
          >
            <ChevronRight className={`h-4 w-4 ${language === 'en' ? 'rotate-180' : ''}`} aria-hidden="true" />
            {ui.back}
          </button>

          {isLoading && !disease ? (
            <div className="flex min-h-[45vh] flex-col items-center justify-center text-center">
              <Spinner />
              <p className="mt-4 font-semibold text-[var(--ag-text-muted)]">{ui.detailLoading}</p>
            </div>
          ) : disease ? (
            <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
              <div className="overflow-hidden rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-strong)] shadow-sm">
                <img
                  src={getDiseaseImage(disease)}
                  alt={disease.name}
                  className="aspect-[4/3] w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = DEFAULT_DISEASE_IMAGE;
                  }}
                />
                <div className="space-y-3 p-4">
                  <span className="inline-flex min-h-8 items-center rounded-lg bg-[var(--ag-green-soft)] px-3 text-xs font-extrabold text-brand-green-dark dark:text-brand-green-light">
                    {getCategoryLabel(disease.category || 'plant-disease', language)}
                  </span>
                  {disease.sourceName ? (
                    <p className="text-sm font-semibold text-[var(--ag-text-muted)]">
                      {language === 'ar' ? 'المصدر' : 'Source'}: {disease.sourceName}
                    </p>
                  ) : null}
                  {disease.sourceUrl ? (
                    <a
                      href={disease.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-green-dark"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      {ui.sourceLink}
                    </a>
                  ) : null}
                </div>
              </div>

              <article className="rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-strong)] p-5 shadow-sm sm:p-7">
                {error ? (
                  <p className="mb-4 rounded-lg border border-[var(--ag-red)] bg-[var(--ag-red-soft)] px-3 py-2 text-sm font-semibold text-[var(--ag-red)]">
                    {error}
                  </p>
                ) : null}
                {isLoading ? (
                  <p className="mb-4 rounded-lg bg-[var(--ag-surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--ag-text-muted)]">
                    {ui.detailLoading}
                  </p>
                ) : null}

                <p className="text-sm font-extrabold text-brand-green-dark dark:text-brand-green-light">
                  {getCategoryLabel(disease.category || 'plant-disease', language)}
                </p>
                <h1 className="mt-2 text-3xl font-extrabold leading-tight text-[var(--ag-text)] sm:text-4xl">{disease.name}</h1>
                <p className="mt-4 leading-8 text-[var(--ag-text-muted)]">{disease.description || ui.unavailable}</p>

                {disease.scientificName ? (
                  <div className="mt-5 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] px-3 py-2">
                    <p className="text-xs font-extrabold uppercase text-[var(--ag-text-soft)]">{ui.scientificName}</p>
                    <p className="mt-1 italic text-[var(--ag-text)]">{disease.scientificName}</p>
                  </div>
                ) : null}

                {hosts.length > 0 ? (
                  <div className="mt-5">
                    <h2 className="mb-2 text-sm font-extrabold text-[var(--ag-text-soft)]">{ui.crops}</h2>
                    <div className="flex flex-wrap gap-2">
                      {hosts.map((host) => (
                        <span key={host} className="rounded-lg bg-[var(--ag-green-soft)] px-2 py-1 text-xs font-bold text-brand-green-dark dark:text-brand-green-light">
                          {getHostLabel(host, language)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <DetailSection title={ui.symptoms} items={disease.symptoms} fallback={ui.unavailable} />
                <DetailSection title={ui.treatment} items={disease.treatment} fallback={ui.unavailable} />
                <DetailSection title={ui.prevention} items={disease.prevention} fallback={ui.unavailable} />
              </article>
            </div>
          ) : (
            <EmptyPanel
              title={ui.detailError}
              description={ui.noResultsDesc}
              icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />}
            />
          )}
        </div>
      </section>
    </div>
  );
};

const DetailSection: React.FC<{ title: string; items: string[]; fallback: string }> = ({ title, items, fallback }) => (
  <section className="mt-5 border-t border-[var(--ag-border)] pt-4">
    <h3 className="mb-3 text-lg font-extrabold text-[var(--ag-text)]">{title}</h3>
    {items.length > 0 ? (
      <ul className="space-y-2 text-[var(--ag-text-muted)]">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="rounded-lg bg-[var(--ag-surface-muted)] px-3 py-2 leading-7">
            {item}
          </li>
        ))}
      </ul>
    ) : (
      <p className="rounded-lg bg-[var(--ag-surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--ag-text-muted)]">{fallback}</p>
    )}
  </section>
);

export default DiseaseLibrary;
