import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Leaf,
  Newspaper,
  Pause,
  Play,
  RefreshCw,
  Tag,
  Volume2,
  X,
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { newsApi } from '../services/apiService';
import { isBackendAuthEnabled } from '../services/backendAuthService';
import { getAgriculturalNews } from '../services/staticDataService';
import type { NewsArticle } from '../types';
import { EmptyPanel } from './WorkspacePrimitives';
import { Spinner } from './Spinner';

const NEWS_PAGE_SIZE = 24;
const NEWS_IMAGE_DEFAULT = '/images/avm-3d/news-smart-farming.png';
const NEWS_ASSET_MAP = [
  { terms: ['drought', 'water', 'climate', 'resistant'], image: '/images/avm-3d/news-drought.png' },
  { terms: ['wheat', 'grain', 'harvest', 'price', 'market'], image: '/images/avm-3d/news-wheat.png' },
  { terms: ['organic', 'soil', 'greenhouse', 'crop'], image: '/images/avm-3d/news-organic.png' },
  { terms: ['ai', 'smart', 'technology', 'digital', 'sensor'], image: '/images/avm-3d/news-smart-farming.png' },
];

const newsUi = {
  ar: {
    eyebrow: 'المشهد الزراعي اليوم',
    title: 'أخبار تساعدك على رؤية الصورة كاملة',
    subtitle: 'متابعة هادئة وواضحة لأهم الأخبار والقرارات والتطورات المؤثرة في الزراعة.',
    refresh: 'تحديث الأخبار',
    refreshing: 'جارٍ التحديث',
    filters: 'تصفية الأخبار',
    source: 'المصدر',
    allSources: 'كل المصادر',
    from: 'من تاريخ',
    to: 'إلى تاريخ',
    clear: 'مسح الفلاتر',
    total: 'خبر متاح',
    trustedSources: 'مصادر موثوقة',
    featured: 'الخبر الأبرز',
    latest: 'أحدث الأخبار',
    readArticle: 'اقرأ الخبر كاملًا',
    openArticle: 'فتح تفاصيل الخبر',
    sourceLabel: 'المصدر',
    published: 'تاريخ النشر',
    originalSource: 'زيارة المصدر الأصلي',
    back: 'العودة إلى الأخبار',
    listen: 'استمع للخبر',
    pause: 'إيقاف مؤقت',
    resume: 'متابعة الاستماع',
    articleBody: 'تفاصيل الخبر',
    loadingDetail: 'جارٍ تحميل تفاصيل الخبر الكاملة...',
    detailError: 'تعذر تحميل النسخة الكاملة الآن. يمكنك فتح المصدر الأصلي.',
    loadError: 'تعذر الاتصال بالخادم الآن، لذلك نعرض الأخبار الاحتياطية.',
    previous: 'السابق',
    next: 'التالي',
    page: 'صفحة',
    of: 'من',
    noNews: 'لا توجد أخبار مطابقة',
    noNewsSub: 'جرّب تعديل المصدر أو الفترة الزمنية.',
    fallbackSource: 'مصدر زراعي',
  },
  en: {
    eyebrow: 'Today in agriculture',
    title: 'News that helps you see the full picture',
    subtitle: 'Calm, clear coverage of the decisions and developments shaping agriculture.',
    refresh: 'Refresh news',
    refreshing: 'Refreshing',
    filters: 'Filter news',
    source: 'Source',
    allSources: 'All sources',
    from: 'From date',
    to: 'To date',
    clear: 'Clear filters',
    total: 'articles available',
    trustedSources: 'trusted sources',
    featured: 'Featured story',
    latest: 'Latest stories',
    readArticle: 'Read the full story',
    openArticle: 'Open article details',
    sourceLabel: 'Source',
    published: 'Published',
    originalSource: 'Visit original source',
    back: 'Back to news',
    listen: 'Listen to article',
    pause: 'Pause',
    resume: 'Resume',
    articleBody: 'Article details',
    loadingDetail: 'Loading the complete article...',
    detailError: 'The full article could not be loaded. You can open the original source.',
    loadError: 'The server is unavailable, so offline fallback stories are shown.',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    of: 'of',
    noNews: 'No matching stories',
    noNewsSub: 'Try changing the source or date range.',
    fallbackSource: 'Agricultural source',
  },
} as const;

type NewsUi = typeof newsUi.en;

const articleUrl = (article: NewsArticle) => article.sourceUrl || article.url;

const localeDate = (article: NewsArticle, language: 'ar' | 'en', short = false) => {
  const rawDate = article.publishedAt || article.publishedDate;
  if (!rawDate) return '';
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return rawDate;
  return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: short ? 'short' : 'long',
    day: 'numeric',
  });
};

const sourceName = (article: NewsArticle, fallback: string) => article.source || fallback;

const getNewsImage = (article: NewsArticle) => {
  if (article.imageUrl?.trim()) return article.imageUrl;
  const searchable = [article.title, article.summary, article.category, article.source].join(' ').toLowerCase();
  return NEWS_ASSET_MAP.find(({ terms }) => terms.some((term) => searchable.includes(term)))?.image || NEWS_IMAGE_DEFAULT;
};

const articleParagraphs = (content?: string) =>
  (content || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

const CategoryBadge: React.FC<{ category?: string }> = ({ category }) => {
  if (!category) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ag-border-strong)] bg-[var(--ag-surface-muted)] px-3 py-1 text-xs font-extrabold text-[var(--ag-text-muted)]">
      <Tag size={12} aria-hidden="true" />
      {category}
    </span>
  );
};

interface NewsImageProps {
  src?: string | null;
  alt: string;
  className: string;
}

const NewsImage: React.FC<NewsImageProps> = ({ src, alt, className }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} flex items-center justify-center bg-[linear-gradient(145deg,var(--ag-surface-muted),var(--color-primary-soft))]`}>
        <Leaf size={42} className="text-[var(--ag-green)] opacity-60" aria-hidden="true" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
};

interface NewsCardProps {
  article: NewsArticle;
  language: 'ar' | 'en';
  ui: NewsUi;
  onOpen: () => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ article, language, ui, onOpen }) => (
  <article className="group flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-[var(--ag-border)] bg-[var(--ag-surface)] shadow-[var(--ag-shadow-soft)] transition hover:-translate-y-1 hover:border-[var(--ag-border-strong)] hover:shadow-[var(--ag-shadow-strong)]">
    <NewsImage
      src={getNewsImage(article)}
      alt={article.title}
      className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
    />
    <div className="flex flex-1 flex-col p-5">
      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={article.category} />
        {localeDate(article, language, true) ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ag-text-soft)]">
            <CalendarDays size={13} aria-hidden="true" />
            {localeDate(article, language, true)}
          </span>
        ) : null}
      </div>
      <h3 className="mt-4 line-clamp-2 text-lg font-extrabold leading-8 text-[var(--ag-text)] transition group-hover:text-[var(--ag-green)]">
        {article.title}
      </h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-7 text-[var(--ag-text-muted)]">
        {article.summary}
      </p>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--ag-border)] pt-4">
        <span className="line-clamp-1 text-xs font-extrabold text-[var(--ag-text-soft)]">
          {sourceName(article, ui.fallbackSource)}
        </span>
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${ui.openArticle}: ${article.title}`}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--ag-green)] px-4 text-xs font-extrabold text-white transition hover:bg-[var(--ag-forest-strong)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(22,101,52,0.22)]"
        >
          {ui.readArticle}
          {language === 'ar' ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
        </button>
      </div>
    </div>
  </article>
);

type FeaturedArticleProps = NewsCardProps;

const FeaturedArticle: React.FC<FeaturedArticleProps> = ({ article, language, ui, onOpen }) => (
  <article className="overflow-hidden rounded-[2rem] border border-[var(--ag-border)] bg-[var(--ag-surface)] shadow-[var(--ag-shadow-strong)]">
    <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
      <NewsImage
        src={getNewsImage(article)}
        alt={article.title}
        className="h-64 w-full object-cover lg:h-full lg:min-h-[25rem]"
      />
      <div className="flex flex-col justify-center p-6 md:p-9">
        <p className="mb-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--ag-green)]">
          <Newspaper size={16} aria-hidden="true" />
          {ui.featured}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={article.category} />
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ag-text-soft)]">
            <CalendarDays size={13} aria-hidden="true" />
            {localeDate(article, language)}
          </span>
        </div>
        <h2 className="mt-5 text-2xl font-black leading-[1.55] text-[var(--ag-text)] md:text-3xl">
          {article.title}
        </h2>
        <p className="mt-4 line-clamp-4 text-base leading-8 text-[var(--ag-text-muted)]">
          {article.summary}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm font-extrabold text-[var(--ag-text-soft)]">
            {sourceName(article, ui.fallbackSource)}
          </span>
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--ag-green)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--ag-forest-strong)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(22,101,52,0.22)]"
          >
            {ui.readArticle}
            {language === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  </article>
);

interface NewsDetailProps {
  article: NewsArticle;
  language: 'ar' | 'en';
  ui: NewsUi;
  isLoading: boolean;
  error: string | null;
  onBack: () => void;
}

const NewsDetail: React.FC<NewsDetailProps> = ({
  article,
  language,
  ui,
  isLoading,
  error,
  onBack,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const paragraphs = articleParagraphs(article.content);
  const originalUrl = articleUrl(article);
  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  const stopSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    speechRef.current = null;
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  useEffect(() => () => stopSpeech(), [stopSpeech]);

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;
    const speechEngine = window.speechSynthesis;
    if (isSpeaking) {
      if (speechEngine.paused) {
        speechEngine.resume();
        setIsPaused(false);
      } else {
        speechEngine.pause();
        setIsPaused(true);
      }
      return;
    }

    const utterance = new SpeechSynthesisUtterance(
      `${article.title}. ${article.summary}. ${article.content || ''}`
    );
    utterance.lang = language === 'ar' ? 'ar-EG' : 'en-US';
    utterance.onend = stopSpeech;
    utterance.onerror = stopSpeech;
    speechRef.current = utterance;
    speechEngine.cancel();
    speechEngine.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className="animate-fade-in bg-[var(--ag-bg)] pb-16">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface)] px-4 text-sm font-extrabold text-[var(--ag-text-muted)] transition hover:border-[var(--ag-border-strong)] hover:text-[var(--ag-text)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(22,101,52,0.18)]"
        >
          <BackIcon size={17} />
          {ui.back}
        </button>

        <article className="overflow-hidden rounded-[2rem] border border-[var(--ag-border)] bg-[var(--ag-surface)] shadow-[var(--ag-shadow-strong)]">
          <NewsImage
            src={getNewsImage(article)}
            alt={article.title}
            className="max-h-[22rem] min-h-56 w-full object-cover"
          />
          <div className="grid gap-10 p-5 md:p-9 lg:grid-cols-[minmax(0,1fr)_16rem] lg:p-12">
            <main>
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={article.category} />
                {localeDate(article, language) ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--ag-text-soft)]">
                    <CalendarDays size={15} aria-hidden="true" />
                    {localeDate(article, language)}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-5 text-3xl font-black leading-[1.5] text-[var(--ag-text)] md:text-4xl">
                {article.title}
              </h1>
              <p
                className="mt-6 border-s-4 border-[var(--ag-green)] ps-5 text-lg font-semibold leading-9 text-[var(--ag-text-muted)]"
              >
                {article.summary}
              </p>

              {isLoading ? (
                <div className="mt-10 rounded-2xl bg-[var(--ag-surface-muted)] py-8 text-center">
                  <Spinner />
                  <p className="text-sm font-bold text-[var(--ag-text-muted)]">{ui.loadingDetail}</p>
                </div>
              ) : (
                <>
                  {error ? (
                    <div className="mt-8 rounded-2xl border border-[rgba(185,77,67,0.2)] bg-[var(--ag-red-soft)] p-4 text-sm font-bold text-[var(--ag-red)]">
                      {error}
                    </div>
                  ) : null}
                  {paragraphs.length > 0 ? (
                    <section className="mt-10" aria-labelledby="article-body-heading">
                      <h2 id="article-body-heading" className="mb-6 flex items-center gap-2 text-xl font-black text-[var(--ag-text)]">
                        <Leaf size={20} className="text-[var(--ag-green)]" aria-hidden="true" />
                        {ui.articleBody}
                      </h2>
                      <div className="space-y-5 text-[1.05rem] leading-9 text-[var(--ag-text-muted)]">
                        {paragraphs.map((paragraph, index) => (
                          <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              )}
            </main>

            <aside className="h-fit rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] p-5 lg:sticky lg:top-6">
              <dl className="space-y-5">
                <div>
                  <dt className="text-xs font-black uppercase tracking-[0.12em] text-[var(--ag-text-soft)]">
                    {ui.sourceLabel}
                  </dt>
                  <dd className="mt-1 text-sm font-extrabold text-[var(--ag-text)]">
                    {sourceName(article, ui.fallbackSource)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-black uppercase tracking-[0.12em] text-[var(--ag-text-soft)]">
                    {ui.published}
                  </dt>
                  <dd className="mt-1 text-sm font-extrabold text-[var(--ag-text)]">
                    {localeDate(article, language) || '—'}
                  </dd>
                </div>
              </dl>

              {'speechSynthesis' in window ? (
                <button
                  type="button"
                  onClick={toggleSpeech}
                  disabled={isLoading}
                  className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--ag-border-strong)] bg-[var(--ag-surface)] px-4 text-sm font-extrabold text-[var(--ag-green)] transition hover:bg-[var(--color-primary-soft)] disabled:opacity-50"
                >
                  {isSpeaking && !isPaused ? <Pause size={17} /> : isPaused ? <Play size={17} /> : <Volume2 size={17} />}
                  {isSpeaking && !isPaused ? ui.pause : isPaused ? ui.resume : ui.listen}
                </button>
              ) : null}

              {originalUrl ? (
                <a
                  href={originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--ag-green)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--ag-forest-strong)]"
                >
                  <ExternalLink size={16} />
                  {ui.originalSource}
                </a>
              ) : null}
            </aside>
          </div>
        </article>
      </div>
    </div>
  );
};

export const NewsPage: React.FC = () => {
  const { language } = useTranslation();
  const backendEnabled = isBackendAuthEnabled();
  const ui = newsUi[language];
  const detailRequestRef = useRef(0);

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const setFallbackArticles = useCallback(() => {
    const fallbackArticles = getAgriculturalNews(language);
    setArticles(fallbackArticles);
    setTotalCount(fallbackArticles.length);
    setTotalPages(1);
    setSources([...new Set(fallbackArticles.map((article) => article.source).filter(Boolean) as string[])]);
  }, [language]);

  const loadNews = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      if (!backendEnabled) {
        setFallbackArticles();
        return;
      }

      const response = await newsApi.getList({
        page: currentPage,
        limit: NEWS_PAGE_SIZE,
        source: selectedSource,
        dateFrom,
        dateTo,
      });
      setSources(response.filters.sources);
      setTotalCount(response.pagination.total);
      setTotalPages(Math.max(1, response.pagination.totalPages || 1));

      const hasFilters = Boolean(selectedSource || dateFrom || dateTo);
      if (response.data.length > 0 || response.pagination.total > 0 || hasFilters) {
        setArticles(response.data);
      } else {
        setFallbackArticles();
      }
    } catch {
      setLoadError(ui.loadError);
      setFallbackArticles();
    } finally {
      setIsLoading(false);
    }
  }, [
    backendEnabled,
    currentPage,
    dateFrom,
    dateTo,
    selectedSource,
    setFallbackArticles,
    ui.loadError,
  ]);

  useEffect(() => {
    void loadNews();
  }, [loadNews]);

  const openArticle = async (article: NewsArticle) => {
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setSelectedArticle(article);
    setDetailError(null);
    window.scrollTo({ top: 0 });

    const isStoredArticle = backendEnabled && Boolean(article.createdAt || article.isImported !== undefined);
    if (!isStoredArticle) return;

    setIsDetailLoading(true);
    try {
      const fullArticle = await newsApi.getById(article.id);
      if (detailRequestRef.current === requestId) setSelectedArticle(fullArticle);
    } catch {
      if (detailRequestRef.current === requestId) setDetailError(ui.detailError);
    } finally {
      if (detailRequestRef.current === requestId) setIsDetailLoading(false);
    }
  };

  const closeArticle = () => {
    detailRequestRef.current += 1;
    setSelectedArticle(null);
    setIsDetailLoading(false);
    setDetailError(null);
    window.scrollTo({ top: 0 });
  };

  const clearFilters = () => {
    setSelectedSource('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  if (selectedArticle) {
    return (
      <NewsDetail
        article={selectedArticle}
        language={language}
        ui={ui}
        isLoading={isDetailLoading}
        error={detailError}
        onBack={closeArticle}
      />
    );
  }

  const featuredArticle = articles[0];
  const remainingArticles = articles.slice(1);
  const hasActiveFilters = Boolean(selectedSource || dateFrom || dateTo);

  return (
    <div className="animate-fade-in bg-[var(--ag-bg)] pb-16">
      <header
        className="relative isolate overflow-hidden border-b border-white/10 bg-[#123c28] text-white"
      >
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center opacity-[0.12]"
          style={{ backgroundImage: 'url("/images/avm-3d/news-smart-farming.png")' }}
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,rgba(7,25,16,0.97),rgba(17,71,43,0.93)_55%,rgba(44,78,45,0.88))]" />
        <div className="mx-auto grid min-h-[24rem] max-w-6xl items-end gap-8 px-4 pb-20 pt-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:pb-20">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/90 backdrop-blur">
              <Leaf size={15} aria-hidden="true" />
              {ui.eyebrow}
            </p>
            <h1 className="mt-5 text-4xl font-black leading-[1.3] tracking-[-0.03em] md:text-6xl">
              {ui.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/85 md:text-lg">
              {ui.subtitle}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-64">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <strong className="block text-2xl font-black">{totalCount.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</strong>
              <span className="mt-1 block text-xs font-bold text-white/75">{ui.total}</span>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <strong className="block text-2xl font-black">{sources.length.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</strong>
              <span className="mt-1 block text-xs font-bold text-white/75">{ui.trustedSources}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadNews()}
              disabled={isLoading}
              className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-[#14532d] transition hover:bg-[#f0f8ef] disabled:opacity-60"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? ui.refreshing : ui.refresh}
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto -mt-12 max-w-6xl px-4">
        <section className="rounded-[1.6rem] border border-[var(--ag-border)] bg-[var(--ag-surface)] p-5 shadow-[var(--ag-shadow-strong)] md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-black text-[var(--ag-text)]">
              <Filter size={19} className="text-[var(--ag-green)]" aria-hidden="true" />
              {ui.filters}
            </h2>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-[var(--ag-green)] hover:bg-[var(--color-primary-soft)]"
              >
                <X size={15} />
                {ui.clear}
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_190px_190px]">
            <label>
              <span className="mb-1.5 block text-xs font-black text-[var(--ag-text-soft)]">{ui.source}</span>
              <select
                value={selectedSource}
                onChange={(event) => {
                  setSelectedSource(event.target.value);
                  setCurrentPage(1);
                }}
                className="ui-select min-h-11 w-full"
              >
                <option value="">{ui.allSources}</option>
                {sources.map((source) => <option key={source} value={source}>{source}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-black text-[var(--ag-text-soft)]">{ui.from}</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setCurrentPage(1);
                }}
                className="ui-input min-h-11 w-full"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-black text-[var(--ag-text-soft)]">{ui.to}</span>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setCurrentPage(1);
                }}
                className="ui-input min-h-11 w-full"
              />
            </label>
          </div>
        </section>

        {loadError ? (
          <div className="mt-6 rounded-2xl border border-[rgba(185,77,67,0.2)] bg-[var(--ag-red-soft)] px-5 py-4 text-sm font-bold text-[var(--ag-red)]">
            {loadError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {[1, 2, 3].map((skeleton) => (
              <div key={skeleton} className="h-[25rem] rounded-[1.6rem] border border-[var(--ag-border)] bg-[var(--ag-surface)] p-4">
                <div className="ui-skeleton h-48 rounded-2xl" />
                <div className="mt-5 space-y-3">
                  <div className="ui-skeleton h-4 w-1/3 rounded-full" />
                  <div className="ui-skeleton h-7 w-5/6 rounded-full" />
                  <div className="ui-skeleton h-4 w-full rounded-full" />
                  <div className="ui-skeleton h-4 w-4/5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : !featuredArticle ? (
          <div className="mt-8">
            <EmptyPanel
              icon={<Newspaper size={28} />}
              title={ui.noNews}
              description={ui.noNewsSub}
            />
          </div>
        ) : (
          <>
            <div className="mt-8">
              <FeaturedArticle
                article={featuredArticle}
                language={language}
                ui={ui}
                onOpen={() => void openArticle(featuredArticle)}
              />
            </div>

            {remainingArticles.length > 0 ? (
              <section className="mt-10" aria-labelledby="latest-news-heading">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 id="latest-news-heading" className="text-2xl font-black text-[var(--ag-text)]">
                    {ui.latest}
                  </h2>
                  <span className="rounded-full bg-[var(--ag-surface-muted)] px-3 py-1.5 text-xs font-extrabold text-[var(--ag-text-muted)]">
                    {totalCount.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} {ui.total}
                  </span>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {remainingArticles.map((article) => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      language={language}
                      ui={ui}
                      onOpen={() => void openArticle(article)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {totalPages > 1 ? (
              <nav className="mt-10 flex flex-wrap items-center justify-center gap-3" aria-label={ui.page}>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface)] px-5 text-sm font-extrabold text-[var(--ag-text-muted)] transition hover:border-[var(--ag-border-strong)] hover:text-[var(--ag-text)] disabled:opacity-45"
                >
                  {language === 'ar' ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
                  {ui.previous}
                </button>
                <span className="rounded-full bg-[var(--ag-surface-muted)] px-4 py-2 text-sm font-extrabold text-[var(--ag-text-muted)]">
                  {ui.page} {currentPage.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} {ui.of} {totalPages.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface)] px-5 text-sm font-extrabold text-[var(--ag-text-muted)] transition hover:border-[var(--ag-border-strong)] hover:text-[var(--ag-text)] disabled:opacity-45"
                >
                  {ui.next}
                  {language === 'ar' ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
                </button>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default NewsPage;
