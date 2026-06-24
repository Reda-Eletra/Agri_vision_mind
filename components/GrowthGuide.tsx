import React, { useState, useCallback, useRef, useEffect } from 'react';
import { growthGuideApi } from '../services/apiService';
import { generateGrowthGuidePdf } from '../services/pdfService';
import type { GrowthGuidePlant, Farm, GrowthGuideData } from '../types';
import { Spinner } from './Spinner';
import { useTranslation } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import { PageHeader } from './PageHeader';
import { FarmModal } from './FarmModal';
import { useAuth } from '../contexts/AuthContext';

// --- Icons ---
const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${props.className || ''}`} viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
  </svg>
);

const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${props.className || ''}`} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const FarmIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${props.className || ''}`} {...props}>
    <path d="M12 2L6 5v5l6 3 6-3V5Z" />
    <path d="M6 5v14" />
    <path d="M18 5v14" />
  </svg>
);

const BackIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${props.className || ''}`} {...props}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const LeafIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} {...props}>
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.58 1 9.3a7.5 7.5 0 0 1-9 8.7Z" />
    <path d="M9.8 6.1C13.5 8.1 16 11 17 15" />
  </svg>
);

const SunIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="M4.93 4.93l1.41 1.41" />
    <path d="M17.66 17.66l1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="M6.34 17.66l-1.41 1.41" />
    <path d="M19.07 4.93l-1.41 1.41" />
  </svg>
);

const WateringIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} {...props}>
    <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7Z" />
  </svg>
);

const SoilIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} {...props}>
    <path d="M20 20a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h16Z" />
    <path d="M12 4v16" />
    <path d="M3 12h18" />
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const DEFAULT_PLANT_PLACEHOLDER = '/images/avm-3d/news-organic.png';

const mapPlantToOldGuideData = (plant: GrowthGuidePlant): GrowthGuideData => {
  return {
    found: true,
    plantName: plant.name,
    scientificName: plant.scientificName || '',
    scientificClassification: {
      kingdom: plant.additionalDetails?.classification?.kingdom || 'Plantae',
      order: plant.additionalDetails?.classification?.order || 'N/A',
      family: plant.additionalDetails?.classification?.family || 'N/A',
      genus: plant.additionalDetails?.classification?.genus || 'N/A',
      species: plant.additionalDetails?.classification?.species || 'N/A',
    },
    origin: plant.additionalDetails?.origin || 'Cultivated',
    description: plant.description || plant.summary || '',
    plantingInstructions: plant.planting ? [plant.planting] : [],
    careDetails: {
      watering: plant.watering || 'N/A',
      sunlight: plant.sunlight || 'N/A',
      soil: plant.soil || 'N/A',
      fertilizer: plant.additionalDetails?.fertilizer || 'N/A',
      pruning: plant.care || 'N/A',
      pestsAndDiseases: plant.commonProblems || 'N/A',
    },
    healthBenefits: Array.isArray(plant.additionalDetails?.healthBenefits) ? plant.additionalDetails?.healthBenefits : [],
    culinaryUses: Array.isArray(plant.additionalDetails?.culinaryUses) ? plant.additionalDetails?.culinaryUses : [],
    culturalSignificance: plant.additionalDetails?.culturalSignificance || '',
    toxicity: plant.additionalDetails?.toxicity || '',
    funFacts: Array.isArray(plant.additionalDetails?.funFacts) ? plant.additionalDetails?.funFacts : [
      'Crop rotation is often key to prevention.',
      'Scouting weekly lets you spot issues early.'
    ],
  };
};

export const GrowthGuide: React.FC = () => {
  const { t, language } = useTranslation();
  const { isDarkMode } = useConfig();
  const { addFarm, isLoggedIn } = useAuth();

  // Search & Catalog state
  const [plants, setPlants] = useState<GrowthGuidePlant[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');

  const [isLoadingList, setIsLoadingList] = useState(false);
  const [errorList, setErrorList] = useState<string | null>(null);

  // Selected Plant details state
  const [selectedPlantSlug, setSelectedPlantSlug] = useState<string | null>(null);
  const [plantDetail, setPlantDetail] = useState<GrowthGuidePlant | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // Modal / Add to Farm state
  const [isFarmModalOpen, setIsFarmModalOpen] = useState(false);
  const [farmToCreate, setFarmToCreate] = useState<Farm | null>(null);

  // TTS audio state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  // Debouncing search suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // 1. Fetch plants list
  const fetchPlantList = useCallback(async () => {
    setIsLoadingList(true);
    setErrorList(null);
    try {
      const res = await growthGuideApi.getPlants({
        page: currentPage,
        limit: 12,
        search: searchQuery,
        category: selectedCategory,
        source: selectedSource,
        sort: sortBy,
        language
      });

      setPlants(res.data);
      setTotalPages(res.pagination.totalPages);
      setCategories(res.filters.categories);
      setSources(res.filters.sources);
    } catch (err) {
      console.error(err);
      setErrorList(t('growthGuide.fetchError') || 'Failed to load botanical guides.');
    } finally {
      setIsLoadingList(false);
    }
  }, [currentPage, searchQuery, selectedCategory, selectedSource, sortBy, language, t]);

  useEffect(() => {
    fetchPlantList();
  }, [fetchPlantList]);

  // Debounced search typing suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = searchQuery.trim();
      if (q.length >= 2) {
        try {
          const res = await growthGuideApi.getPlants({ search: q, limit: 5, language });
          const matches = res.data.map(p => p.name);
          setSuggestions(matches);
          setShowSuggestions(matches.length > 0);
        } catch {
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, language]);

  // Click outside suggestions close
  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  // 2. Fetch single plant detail
  const handleOpenDetail = async (slug: string) => {
    setSelectedPlantSlug(slug);
    setIsLoadingDetail(true);
    setErrorDetail(null);
    setPlantDetail(null);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);

    try {
      const res = await growthGuideApi.getPlant(slug, language);
      setPlantDetail(res);
    } catch (err) {
      console.error(err);
      setErrorDetail(t('growthGuide.fetchError') || 'Failed to load details.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleBackToList = () => {
    setSelectedPlantSlug(null);
    setPlantDetail(null);
    setErrorDetail(null);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  const handleDownloadPdf = () => {
    if (plantDetail) {
      const legacyGuide = mapPlantToOldGuideData(plantDetail);
      generateGrowthGuidePdf(legacyGuide, plantDetail.imageUrl, t, language as any, isDarkMode);
    }
  };

  const handleAddToFarm = () => {
    if (plantDetail) {
      if (!isLoggedIn) {
        alert(language === 'ar' ? 'يرجى تسجيل الدخول أولاً لإضافة نبات إلى مزرعتك.' : 'Please log in to add a plant to your farm.');
        return;
      }
      const newFarm: Farm = {
        id: '',
        name: language === 'ar' ? `مزرعة ${plantDetail.name}` : `${plantDetail.name} Farm`,
        crop: plantDetail.name,
        area: 0,
        areaUnit: 'acre',
        soilType: plantDetail.soil || 'Loam',
        location: '',
        plantingDate: new Date().toISOString().split('T')[0],
        season: '',
        coordinates: [],
      };
      setFarmToCreate(newFarm);
      setIsFarmModalOpen(true);
    }
  };

  const handleSaveFarm = async (farm: Farm) => {
    const { id, ...farmData } = farm;
    await addFarm(farmData);
    setIsFarmModalOpen(false);
    setFarmToCreate(null);
  };

  const handlePlayAudio = () => {
    if (!plantDetail) return;
    if (!('speechSynthesis' in window)) {
      alert(language === 'ar' ? 'ميزة النطق الصوتي غير مدعومة في متصفحك.' : 'Audio playback is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    setIsAudioLoading(true);
    const parts = [
      plantDetail.name,
      plantDetail.scientificName ? `, الاسم العلمي: ${plantDetail.scientificName}` : '',
      plantDetail.summary || plantDetail.description || '',
      plantDetail.planting ? `, إرشادات الزراعة: ${plantDetail.planting}` : '',
      plantDetail.care ? `, تعليمات الرعاية: ${plantDetail.care}` : '',
    ].filter(Boolean).join('. ');

    const utterance = new SpeechSynthesisUtterance(parts);
    utterance.lang = language === 'ar' ? 'ar-EG' : 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      alert(language === 'ar' ? 'فشل تشغيل الصوت.' : 'Failed to play audio.');
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsAudioLoading(false);
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedSource('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Categories helper translation mapping
  const getCategoryLabel = (cat: string) => {
    if (language === 'ar') {
      switch (cat) {
        case 'vegetables': return 'خضروات';
        case 'fruits': return 'فواكه';
        case 'herbs': return 'أعشاب';
        case 'trees': return 'أشجار';
        case 'flowers': return 'زهور';
        default: return 'أخرى';
      }
    }
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  const isRtl = language === 'ar';
  const availableCategories = categories.length > 0
    ? categories
    : ['vegetables', 'fruits', 'herbs', 'trees', 'flowers', 'other'];

  return (
    <div className="animate-fade-in pb-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <PageHeader
        title={t('growthGuide.pageTitle')}
        subtitle={t('growthGuide.pageSubtitle')}
        imageUrl="/images/avm-3d/hero-seedling-hand.png"
        eyebrow={language === 'ar' ? 'رعاية النباتات خطوة بخطوة' : 'Seasonal crop care'}
        eyebrowIcon={<LeafIcon className="h-4 w-4" />}
      />

      {/* Main Subview Switch */}
      {!selectedPlantSlug ? (
        /* ─── Subview 1: Catalog List ─── */
        <div className="relative z-10 px-4 max-w-7xl mx-auto">
          {/* Hero search card */}
          <section className="ui-card ui-surface max-w-4xl mx-auto rounded-[2rem] p-6 md:p-10 mb-10">
            <h2 className="text-center text-2xl font-extrabold tracking-[-0.04em] text-[var(--ag-text)] md:text-4xl">
              {language === 'ar' ? 'الموسوعة النباتية الشاملة' : 'Botanical Knowledge Hub'}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-7 text-[var(--ag-text-muted)]">
              {language === 'ar'
                ? 'ابحث في الموسوعة الزراعية الشاملة للحصول على أدلة رعاية ومواعيد زراعة وري وتسميد المحاصيل المختلفة.'
                : 'Explore our curated dynamic database of crops, vegetables, and trees. Access structured care instructions instantly.'}
            </p>

            <form onSubmit={(e) => { e.preventDefault(); setCurrentPage(1); fetchPlantList(); }} className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto relative z-20 mt-6">
              <div className="relative flex-grow" ref={searchWrapperRef}>
                <div className={`absolute inset-y-0 ${isRtl ? 'left-auto right-3' : 'left-3 right-auto'} flex items-center pointer-events-none`}>
                  <SearchIcon className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  placeholder={t('growthGuide.searchPlaceholder')}
                  className={`ui-input ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                  autoComplete="off"
                />

                {/* Search suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-[1.3rem] border border-[var(--ag-border)] bg-[var(--ag-surface-strong)] shadow-[0_24px_48px_rgba(18,34,26,0.14)]">
                    {suggestions.map((sug, idx) => (
                      <li
                        key={idx}
                        onClick={() => {
                          setSearchQuery(sug);
                          setShowSuggestions(false);
                          setCurrentPage(1);
                        }}
                        className={`flex cursor-pointer items-center gap-2 border-b border-[var(--ag-border)] px-4 py-3 text-[var(--ag-text)] transition-colors hover:bg-[var(--ag-surface-muted)] last:border-0 ${isRtl ? 'text-right' : 'text-left'}`}
                      >
                        <SearchIcon className="w-4 h-4 text-gray-400" />
                        {sug}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="submit" disabled={isLoadingList} className="ui-button ui-button-primary">
                {isLoadingList ? <Spinner small /> : t('growthGuide.searchButton')}
              </button>
            </form>
          </section>

          {/* Toolbar Filters */}
          <div className="ui-card p-5 mb-8 flex flex-col md:flex-row gap-4 justify-between items-center bg-[var(--ag-surface-muted)] rounded-2xl">
            <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
              <span className="text-sm font-bold text-[var(--ag-text)] mr-2">
                {language === 'ar' ? 'التصنيف:' : 'Category:'}
              </span>
              <button
                onClick={() => { setSelectedCategory(''); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedCategory === '' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--ag-surface)] text-[var(--ag-text-muted)] border border-[var(--ag-border)]'}`}
              >
                {language === 'ar' ? 'الكل' : 'All'}
              </button>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedCategory === cat ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--ag-surface)] text-[var(--ag-text-muted)] border border-[var(--ag-border)]'}`}
                >
                  {getCategoryLabel(cat)}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 w-full md:w-auto justify-end">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[var(--ag-text-muted)]">
                  {language === 'ar' ? 'المصدر:' : 'Source:'}
                </label>
                <select
                  value={selectedSource}
                  onChange={(e) => { setSelectedSource(e.target.value); setCurrentPage(1); }}
                  className="ui-select !py-1.5 !px-3 !text-xs !w-36"
                >
                  <option value="">{language === 'ar' ? 'جميع المصادر' : 'All Sources'}</option>
                  {sources.map((source) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[var(--ag-text-muted)]">
                  {language === 'ar' ? 'الترتيب:' : 'Sort:'}
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="ui-select !py-1.5 !px-3 !text-xs !w-36"
                >
                  <option value="name">{language === 'ar' ? 'الاسم أ-ي' : 'Name A-Z'}</option>
                  <option value="newest">{language === 'ar' ? 'المضاف حديثاً' : 'Newest'}</option>
                  <option value="updated">{language === 'ar' ? 'المحدث مؤخراً' : 'Recently Updated'}</option>
                </select>
              </div>

              {(selectedCategory || selectedSource || searchQuery) && (
                <button onClick={clearFilters} className="ui-button ui-button-secondary !py-1.5 !px-3 !text-xs !min-h-0">
                  {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                </button>
              )}
            </div>
          </div>

          {/* Catalog grid */}
          {isLoadingList ? (
            /* Loading State (Skeletons) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="ui-card overflow-hidden rounded-2xl animate-pulse">
                  <div className="bg-gray-300 dark:bg-gray-700 h-48 w-full" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3" />
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : errorList ? (
            /* Error State */
            <div className="ui-empty-state rounded-2xl border-red-200 bg-red-50 dark:bg-red-950/10 p-10 text-center">
              <p className="text-red-600 dark:text-red-400 font-semibold">{errorList}</p>
              <button onClick={fetchPlantList} className="ui-button ui-button-primary mt-4">
                {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
              </button>
            </div>
          ) : plants.length === 0 ? (
            /* Empty State */
            <div className="ui-empty-state rounded-2xl p-16">
              <div className="ui-empty-icon">
                <LeafIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mt-4 text-[var(--ag-text)]">
                {language === 'ar' ? 'لم يتم العثور على نتائج' : 'No Botanical Guides Found'}
              </h3>
              <p className="text-[var(--ag-text-muted)] text-sm max-w-md mx-auto mt-2">
                {language === 'ar'
                  ? 'جرب البحث بكلمات أبسط أو إزالة بعض فلاتر التصنيفات والمصادر.'
                  : 'Try adjusting your filters or search keywords. You can also trigger a dynamic crawl inside the Admin Panel.'}
              </p>
              <button onClick={clearFilters} className="ui-button ui-button-secondary mt-6">
                {language === 'ar' ? 'عرض كافة النباتات' : 'Show All Plants'}
              </button>
            </div>
          ) : (
            /* Active Grid list */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {plants.map((plant) => (
                  <div
                    key={plant.id}
                    onClick={() => handleOpenDetail(plant.slug)}
                    className="ui-card ui-card-hover overflow-hidden rounded-2xl flex flex-col cursor-pointer group"
                  >
                    <div className="relative h-48 w-full overflow-hidden bg-[var(--ag-surface-muted)]">
                      <img
                        src={plant.imageUrl || DEFAULT_PLANT_PLACEHOLDER}
                        alt={plant.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_PLANT_PLACEHOLDER;
                        }}
                      />
                      <span className="absolute top-3 right-3 ui-chip ui-chip-dark !text-[10px] !py-0.5 !px-2 !min-h-0 backdrop-blur-md">
                        {getCategoryLabel(plant.category)}
                      </span>
                    </div>

                    <div className="p-5 flex-grow flex flex-col justify-between">
                      <div>
                        <h4 className="text-lg font-bold text-[var(--ag-text)] leading-snug group-hover:text-[var(--color-primary)] transition-colors">
                          {plant.name}
                        </h4>
                        {plant.scientificName && (
                          <p className="text-xs italic text-[var(--ag-text-muted)] mt-1">
                            {plant.scientificName}
                          </p>
                        )}
                        <p className="text-xs text-[var(--ag-text-muted)] line-clamp-2 mt-2 leading-relaxed">
                          {plant.summary || plant.description}
                        </p>
                      </div>

                      <div className="flex justify-between items-center border-t border-[var(--ag-border)] pt-3 mt-4 text-[10px] text-[var(--ag-text-muted)]">
                        <span>
                          {language === 'ar' ? 'المصدر:' : 'Source:'} <strong>{plant.sourceName || 'Unknown'}</strong>
                        </span>
                        <span>
                          {new Date(plant.updatedAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-10">
                  <button
                    disabled={currentPage === 1 || isLoadingList}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="ui-button ui-button-secondary !py-2 !px-4 !min-h-0 disabled:opacity-40"
                  >
                    {language === 'ar' ? 'السابق' : 'Prev'}
                  </button>
                  <span className="text-sm font-bold text-[var(--ag-text-muted)] px-3">
                    {language === 'ar'
                      ? `صفحة ${currentPage} من ${totalPages}`
                      : `Page ${currentPage} of ${totalPages}`}
                  </span>
                  <button
                    disabled={currentPage === totalPages || isLoadingList}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="ui-button ui-button-secondary !py-2 !px-4 !min-h-0 disabled:opacity-40"
                  >
                    {language === 'ar' ? 'التالي' : 'Next'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ─── Subview 2: Full Detail Page ─── */
        <div className="max-w-5xl mx-auto px-4 mt-[-4rem] relative z-10">
          {/* Back Action Bar */}
          <div className="mb-4">
            <button
              onClick={handleBackToList}
              className="flex items-center gap-2 ui-button ui-button-secondary !py-2 !px-4 !min-h-0 rounded-xl"
              style={{ minHeight: '44px' }}
            >
              <BackIcon className={isRtl ? 'rotate-180' : ''} />
              {language === 'ar' ? 'العودة للموسوعة' : 'Back to Encyclopedia'}
            </button>
          </div>

          {isLoadingDetail ? (
            /* Loading Detail Skeleton */
            <div className="ui-card rounded-[2rem] overflow-hidden p-8 animate-pulse space-y-6">
              <div className="h-64 bg-gray-300 dark:bg-gray-700 w-full rounded-2xl" />
              <div className="h-10 bg-gray-300 dark:bg-gray-700 w-1/3 rounded" />
              <div className="h-4 bg-gray-300 dark:bg-gray-700 w-1/4 rounded" />
              <div className="h-32 bg-gray-300 dark:bg-gray-700 w-full rounded" />
            </div>
          ) : errorDetail ? (
            /* Detail Error State */
            <div className="ui-card rounded-[2rem] p-10 text-center border-red-200 bg-red-50 dark:bg-red-950/10">
              <p className="text-red-600 dark:text-red-400 font-semibold">{errorDetail}</p>
              <button onClick={() => handleOpenDetail(selectedPlantSlug)} className="ui-button ui-button-primary mt-4">
                {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
              </button>
            </div>
          ) : plantDetail ? (
            /* Active Plant Detail View */
            <div className="space-y-8">
              {/* Plant Detail Hero banner */}
              <div className="ui-card overflow-hidden rounded-[2.5rem] flex flex-col md:flex-row shadow-lg">
                <div className="md:w-2/5 relative h-64 md:h-auto min-h-[300px] bg-[var(--ag-surface-muted)]">
                  <img
                    src={plantDetail.imageUrl || DEFAULT_PLANT_PLACEHOLDER}
                    alt={plantDetail.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_PLANT_PLACEHOLDER;
                    }}
                  />
                  <span className="absolute top-4 right-4 ui-chip ui-chip-forest !py-1 !px-3 text-xs shadow-md">
                    {getCategoryLabel(plantDetail.category)}
                  </span>
                </div>

                <div className="p-8 md:w-3/5 flex flex-col justify-center bg-[var(--ag-surface-strong)]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-extrabold text-[var(--color-primary)] uppercase tracking-wider bg-[var(--color-primary-soft)] px-2.5 py-1 rounded-md">
                      {plantDetail.sourceName || 'Botanical'}
                    </span>
                    {plantDetail.lastSyncedAt && (
                      <span className="text-[10px] text-[var(--ag-text-muted)]">
                        {language === 'ar' ? 'آخر مزامنة:' : 'Synced:'} {new Date(plantDetail.lastSyncedAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                      </span>
                    )}
                  </div>

                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-[-0.04em] text-[var(--ag-text)] mb-1">
                    {plantDetail.name}
                  </h1>
                  {plantDetail.scientificName && (
                    <p className="text-lg italic text-[var(--ag-text-muted)] mb-4">
                      {plantDetail.scientificName}
                    </p>
                  )}

                  <p className="text-sm text-[var(--ag-text-muted)] leading-relaxed mb-6">
                    {plantDetail.description || plantDetail.summary}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button onClick={handleDownloadPdf} className="ui-button ui-button-secondary !py-2 !px-4 !min-h-0 text-sm">
                      <DownloadIcon className={isRtl ? 'ml-2 mr-0' : 'mr-2 ml-0'} />
                      {t('growthGuide.downloadPdf')}
                    </button>
                    <button onClick={handleAddToFarm} className="ui-button ui-button-primary !py-2 !px-4 !min-h-0 text-sm">
                      <FarmIcon className={isRtl ? 'ml-2 mr-0' : 'mr-2 ml-0'} />
                      {t('growthGuide.addToFarm')}
                    </button>
                    <button
                      onClick={handlePlayAudio}
                      disabled={isAudioLoading}
                      className="ui-button ui-button-secondary !py-2 !px-4 !min-h-0 text-sm"
                    >
                      {isAudioLoading ? (
                        <Spinner small />
                      ) : (
                        <>
                          <span className={isRtl ? 'ml-2 mr-0' : 'mr-2 ml-0'}>
                            {isSpeaking ? <PauseIcon /> : <PlayIcon />}
                          </span>
                          {t('growthGuide.listen')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {plantDetail.sunlight && (
                  <div className="ui-card p-4 rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 rounded-xl">
                      <SunIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--ag-text-muted)] uppercase font-extrabold">
                        {t('growthGuide.sunlight')}
                      </div>
                      <div className="text-sm font-bold text-[var(--ag-text)]">{plantDetail.sunlight}</div>
                    </div>
                  </div>
                )}

                {plantDetail.watering && (
                  <div className="ui-card p-4 rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                      <WateringIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--ag-text-muted)] uppercase font-extrabold">
                        {t('growthGuide.watering')}
                      </div>
                      <div className="text-sm font-bold text-[var(--ag-text)]">{plantDetail.watering}</div>
                    </div>
                  </div>
                )}

                {plantDetail.soil && (
                  <div className="ui-card p-4 rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 bg-amber-100 dark:bg-amber-900/20 text-amber-700 rounded-xl">
                      <SoilIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--ag-text-muted)] uppercase font-extrabold">
                        {t('growthGuide.soil')}
                      </div>
                      <div className="text-sm font-bold text-[var(--ag-text)]">{plantDetail.soil}</div>
                    </div>
                  </div>
                )}

                {plantDetail.category && (
                  <div className="ui-card p-4 rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 bg-green-100 dark:bg-green-900/20 text-green-700 rounded-xl">
                      <LeafIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--ag-text-muted)] uppercase font-extrabold">
                        {language === 'ar' ? 'الفئة' : 'Plant Type'}
                      </div>
                      <div className="text-sm font-bold text-[var(--ag-text)]">{getCategoryLabel(plantDetail.category)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Detail Blocks */}
              <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                  {plantDetail.planting && (
                    <div className="ui-card p-6 rounded-2xl">
                      <h3 className="text-xl font-bold border-b border-[var(--ag-border)] pb-3 mb-4 text-[var(--ag-text)]">
                        {t('growthGuide.plantingInstructionsTitle')}
                      </h3>
                      <p className="text-sm text-[var(--ag-text-muted)] leading-relaxed whitespace-pre-line">
                        {plantDetail.planting}
                      </p>
                      {(plantDetail.sowing || plantDetail.spacing) && (
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[var(--ag-border)] text-xs text-[var(--ag-text-muted)]">
                          {plantDetail.sowing && (
                            <div>
                              <strong>{language === 'ar' ? 'موعد البذر:' : 'Sowing Time:'}</strong> {plantDetail.sowing}
                            </div>
                          )}
                          {plantDetail.spacing && (
                            <div>
                              <strong>{language === 'ar' ? 'مسافة الغرس:' : 'Spacing:'}</strong> {plantDetail.spacing}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {plantDetail.care && (
                    <div className="ui-card p-6 rounded-2xl">
                      <h3 className="text-xl font-bold border-b border-[var(--ag-border)] pb-3 mb-4 text-[var(--ag-text)]">
                        {language === 'ar' ? 'الرعاية والنمو' : 'Growing & Care Advice'}
                      </h3>
                      <p className="text-sm text-[var(--ag-text-muted)] leading-relaxed whitespace-pre-line">
                        {plantDetail.care}
                      </p>
                    </div>
                  )}

                  {plantDetail.harvesting && (
                    <div className="ui-card p-6 rounded-2xl">
                      <h3 className="text-xl font-bold border-b border-[var(--ag-border)] pb-3 mb-4 text-[var(--ag-text)]">
                        {language === 'ar' ? 'الحصاد والتخزين' : 'Harvesting & Storage'}
                      </h3>
                      <p className="text-sm text-[var(--ag-text-muted)] leading-relaxed whitespace-pre-line">
                        {plantDetail.harvesting}
                      </p>
                    </div>
                  )}

                  {plantDetail.commonProblems && (
                    <div className="ui-card p-6 rounded-2xl border-yellow-200 bg-yellow-50/20 dark:bg-yellow-950/5">
                      <h3 className="text-xl font-bold border-b border-[var(--ag-border)] pb-3 mb-4 text-[var(--ag-text)]">
                        {language === 'ar' ? 'مشاكل شائعة وآفات' : 'Pests, Diseases & Common Problems'}
                      </h3>
                      <p className="text-sm text-[var(--ag-text-muted)] leading-relaxed whitespace-pre-line">
                        {plantDetail.commonProblems}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Taxonomy & Source card */}
                  <div className="ui-card p-6 rounded-2xl bg-[var(--ag-surface-muted)]">
                    <h3 className="font-bold text-sm text-[var(--ag-text)] uppercase tracking-wider mb-4">
                      {t('growthGuide.sections.classification')}
                    </h3>
                    <div className="space-y-3 text-xs">
                      {plantDetail.scientificName && (
                        <div className="flex justify-between py-1 border-b border-[var(--ag-border)]">
                          <span className="text-[var(--ag-text-muted)]">{language === 'ar' ? 'الاسم العلمي' : 'Scientific Name'}</span>
                          <span className="font-bold italic text-[var(--ag-text)]">{plantDetail.scientificName}</span>
                        </div>
                      )}
                      {plantDetail.additionalDetails?.classification?.family && (
                        <div className="flex justify-between py-1 border-b border-[var(--ag-border)]">
                          <span className="text-[var(--ag-text-muted)]">{language === 'ar' ? 'الفصيلة' : 'Family'}</span>
                          <span className="font-bold text-[var(--ag-text)]">{plantDetail.additionalDetails.classification.family}</span>
                        </div>
                      )}
                      {plantDetail.additionalDetails?.classification?.genus && (
                        <div className="flex justify-between py-1 border-b border-[var(--ag-border)]">
                          <span className="text-[var(--ag-text-muted)]">{language === 'ar' ? 'الجنس' : 'Genus'}</span>
                          <span className="font-bold text-[var(--ag-text)]">{plantDetail.additionalDetails.classification.genus}</span>
                        </div>
                      )}
                      {plantDetail.additionalDetails?.origin && (
                        <div className="flex justify-between py-1 border-b border-[var(--ag-border)]">
                          <span className="text-[var(--ag-text-muted)]">{t('growthGuide.origin')}</span>
                          <span className="font-bold text-[var(--ag-text)]">{plantDetail.additionalDetails.origin}</span>
                        </div>
                      )}
                      {plantDetail.sourceUrl && (
                        <div className="pt-2 text-center">
                          <a
                            href={plantDetail.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--color-primary)] hover:underline font-bold"
                          >
                            {language === 'ar' ? 'عرض المصدر الأصلي ↗' : 'View Original Source ↗'}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Toxicity disclaimer */}
                  {plantDetail.additionalDetails?.toxicity && (
                    <div className="ui-card p-5 rounded-2xl border-red-200 bg-red-50/30 dark:bg-red-950/10">
                      <h4 className="text-red-700 dark:text-red-400 font-bold text-sm mb-2">
                        ⚠️ {t('growthGuide.sections.toxicity')}
                      </h4>
                      <p className="text-xs text-red-600 dark:text-red-300 leading-relaxed">
                        {plantDetail.additionalDetails.toxicity}
                      </p>
                    </div>
                  )}

                  {/* Fun Facts */}
                  {Array.isArray(plantDetail.additionalDetails?.funFacts) && plantDetail.additionalDetails.funFacts.length > 0 && (
                    <div className="ui-card p-6 rounded-2xl bg-yellow-50/10 dark:bg-yellow-950/5">
                      <h3 className="font-bold text-sm text-[var(--ag-text)] uppercase tracking-wider mb-4">
                        💡 {t('growthGuide.funFactsTitle')}
                      </h3>
                      <ul className="space-y-3">
                        {plantDetail.additionalDetails.funFacts.map((fact: string, idx: number) => (
                          <li key={idx} className="flex gap-2 text-xs text-[var(--ag-text-muted)] leading-relaxed">
                            <span className="text-[var(--color-primary)] font-bold">•</span>
                            <span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {isFarmModalOpen && (
        <FarmModal
          mode="add"
          farm={farmToCreate as Farm}
          onClose={() => setIsFarmModalOpen(false)}
          onSave={handleSaveFarm}
          onDelete={() => {}}
        />
      )}
    </div>
  );
};
