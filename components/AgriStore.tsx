import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, PackageSearch, Search, ShoppingBag, Store } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { storeApi } from '../services/apiService';
import type { StoreCategory, StoreProduct } from '../types';
import { EmptyPanel, SectionHeading, StatusChip, SurfaceCard } from './WorkspacePrimitives';

const PAGE_SIZE = 24;
type StoreSource = 'all' | 'harraz' | 'orkida';

const recommendedStoreSolutions = [
  {
    title: { en: 'Copper fungicide', ar: 'مبيد فطري نحاسي' },
    relation: { en: 'Related problem: early/late blight', ar: 'مرتبط بالندوة المبكرة والمتأخرة' },
    description: {
      en: 'Useful when Plant Doctor reports fungal leaf spots or blight pressure.',
      ar: 'مفيد عندما يرصد طبيب النبات بقعًا فطرية أو ضغط إصابة بالندوة.',
    },
    query: 'copper fungicide agriculture',
  },
  {
    title: { en: 'Calcium potassium foliar feed', ar: 'تسميد ورقي كالسيوم بوتاسيوم' },
    relation: { en: 'Related crop: tomato and cucumber', ar: 'مرتبط بالطماطم والخيار' },
    description: {
      en: 'Supports fruiting stages and helps reduce nutrition-stress symptoms.',
      ar: 'يدعم مراحل الإثمار ويساعد في تقليل أعراض الإجهاد الغذائي.',
    },
    query: 'calcium potassium foliar fertilizer',
  },
  {
    title: { en: 'Drip irrigation kit', ar: 'طقم ري بالتنقيط' },
    relation: { en: 'Related task: irrigation', ar: 'مرتبط بمهام الري' },
    description: {
      en: 'Recommended for cycle plans that need stable moisture without wet leaves.',
      ar: 'مناسب لخطط الزراعة التي تحتاج رطوبة ثابتة بدون بلل الأوراق.',
    },
    query: 'drip irrigation kit agriculture',
  },
  {
    title: { en: 'Soil pH test kit', ar: 'عدة قياس حموضة التربة' },
    relation: { en: 'Related issue: soil suitability', ar: 'مرتبطة بملاءمة التربة' },
    description: {
      en: 'Use before approving crop cycles when farm soil type or pH is uncertain.',
      ar: 'تستخدم قبل اعتماد دورة الزراعة عند عدم وضوح نوع التربة أو درجة الحموضة.',
    },
    query: 'soil ph test kit agriculture',
  },
];

const localized = (value: { en: string; ar: string }, language: string) => (
  language === 'ar' ? value.ar : value.en
);

const formatPrice = (product: StoreProduct, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: product.currency,
    maximumFractionDigits: 2,
  }).format(product.price);

const ProductCard: React.FC<{
  product: StoreProduct;
  locale: string;
  buyLabel: string;
  outOfStockLabel: string;
  priceUnavailableLabel: string;
  saleLabel: string;
}> = ({ product, locale, buyLabel, outOfStockLabel, priceUnavailableLabel, saleLabel }) => {
  const category = product.categories.at(-1)?.name;

  return (
    <article className="group overflow-hidden rounded-[1.5rem] border border-[var(--ag-border)] bg-[var(--ag-surface)] shadow-[0_16px_36px_rgba(15,23,18,0.07)] transition hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(15,23,18,0.12)]">
      <a href={product.productUrl} target="_blank" rel="noreferrer" className="block">
        <div className="relative aspect-square overflow-hidden bg-[var(--ag-surface-muted)]">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.imageAlt}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[var(--ag-text-soft)]">
              <PackageSearch size={42} />
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {category ? <StatusChip tone="forest">{category}</StatusChip> : null}
            {product.onSale ? <StatusChip tone="red">{saleLabel}</StatusChip> : null}
          </div>
        </div>
      </a>

      <div className="p-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ag-text-soft)]">
          {product.source}
        </p>
        <h3 className="mt-2 min-h-12 text-base font-extrabold leading-6 text-[var(--ag-text)]">
          {product.name}
        </h3>
        {product.description ? (
          <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[var(--ag-text-muted)]">
            {product.description}
          </p>
        ) : null}
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xl font-extrabold text-[var(--ag-forest)]">
              {product.price > 0 ? formatPrice(product, locale) : priceUnavailableLabel}
            </p>
            {product.onSale && product.regularPrice > product.price ? (
              <p className="text-xs text-[var(--ag-text-soft)] line-through">
                {new Intl.NumberFormat(locale).format(product.regularPrice)} {product.currency}
              </p>
            ) : null}
          </div>
          {!product.inStock ? <StatusChip tone="red">{outOfStockLabel}</StatusChip> : null}
        </div>
        <a
          href={product.productUrl}
          target="_blank"
          rel="noreferrer"
          className={`ui-button mt-5 w-full ${product.inStock ? 'ui-button-primary' : 'ui-button-secondary'}`}
        >
          <ShoppingBag size={18} />
          <span>{buyLabel}</span>
          <ExternalLink size={15} />
        </a>
      </div>
    </article>
  );
};

export const AgriStore: React.FC = () => {
  const { t, language } = useTranslation();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<StoreSource>('all');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalExact, setTotalExact] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const [retryCount, setRetryCount] = useState(0);
  const locale = language === 'ar' ? 'ar-EG' : 'en-EG';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    storeApi.getCategories()
      .then((response) => setCategories(response.data))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);

    storeApi.getProducts({ page, limit: PAGE_SIZE, search, category, source, language })
      .then((response) => {
        if (requestId !== requestSequence.current) return;
        setProducts(response.data);
        setTotal(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
        setTotalExact(response.pagination.totalExact);
        setHasNext(response.pagination.hasNext);
      })
      .catch((catalogError) => {
        if (requestId !== requestSequence.current) return;
        setProducts([]);
        setTotal(0);
        setTotalPages(0);
        setTotalExact(false);
        setHasNext(false);
        setError(catalogError instanceof Error ? catalogError.message : t('agriStore.loadError'));
      })
      .finally(() => {
        if (requestId === requestSequence.current) setLoading(false);
      });
  }, [category, language, page, retryCount, search, source, t]);

  const resultLabel = useMemo(
    () => totalExact
      ? t('agriStore.results', { count: total })
      : t('agriStore.catalogReady'),
    [t, total, totalExact],
  );
  const visibleCategories = useMemo(
    () => source === 'all'
      ? categories
      : categories.filter((storeCategory) => storeCategory.sourceId === source),
    [categories, source],
  );

  return (
    <div className="space-y-6">
      <SurfaceCard className="ui-surface overflow-hidden p-6 md:p-8">
        <SectionHeading
          eyebrow={t('agriStore.eyebrow')}
          title={t('agriStore.title')}
          description={t('agriStore.subtitle')}
          icon={<Store size={15} />}
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_280px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ag-text-soft)]" size={19} />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('agriStore.searchPlaceholder')}
              className="ui-input w-full !pl-12"
            />
          </label>
          <select
            value={source}
            onChange={(event) => {
              setSource(event.target.value as StoreSource);
              setCategory('');
              setPage(1);
            }}
            className="ui-input w-full"
            aria-label={t('agriStore.sourceLabel')}
          >
            <option value="all">{t('agriStore.allStores')}</option>
            <option value="harraz">{language === 'ar' ? 'هراز فارم آند جاردن' : 'Harraz Farm & Garden'}</option>
            <option value="orkida">{language === 'ar' ? 'متجر أوركيدا الزراعي' : 'Orkida Agricultural Store'}</option>
          </select>
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            className="ui-input w-full"
            aria-label={t('agriStore.categoryLabel')}
          >
            <option value="">{t('agriStore.allCategories')}</option>
            {visibleCategories.map((storeCategory) => (
              <option key={storeCategory.id} value={storeCategory.id}>
                {storeCategory.name}
                {storeCategory.count ? ` (${storeCategory.count})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--ag-text-muted)]">
          <span>{resultLabel}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-bold text-[var(--ag-forest)]">
            <span>{t('agriStore.sourceNotice')}</span>
            <a href="https://harraz.shop/" target="_blank" rel="noreferrer" className="hover:underline">
              Harraz <ExternalLink className="inline" size={13} />
            </a>
            <a href="https://orkidastore.com/ar/" target="_blank" rel="noreferrer" className="hover:underline">
              Orkida <ExternalLink className="inline" size={13} />
            </a>
          </span>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-6">
        <SectionHeading
          eyebrow={language === 'ar' ? 'ترشيحات مرتبطة بالمزرعة' : 'Recommended products'}
          title={language === 'ar' ? 'كتالوج مرتبط بالتشخيص ودورات الزراعة' : 'Treatment and cycle-linked catalog'}
          description={language === 'ar'
            ? 'ترشيحات سريعة مرتبطة بالتشخيصات ودورات المحاصيل وفحوصات التربة والمهام المولدة. روابط الشراء تفتح متاجر أو بحثًا خارجيًا.'
            : 'These are quick recommendations tied to diagnoses, crop cycles, soil checks, and generated tasks. Buy links open external stores/search.'}
          icon={<ShoppingBag size={15} />}
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {recommendedStoreSolutions.map((item) => (
            <article key={item.query} className="smart-store-recommendation">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3>{localized(item.title, language)}</h3>
                  <span>{localized(item.relation, language)}</span>
                </div>
                <ShoppingBag size={18} />
              </div>
              <p>{localized(item.description, language)}</p>
              <a href={`https://www.google.com/search?q=${encodeURIComponent(item.query)}`} target="_blank" rel="noreferrer">
                {language === 'ar' ? 'عرض خيارات خارجية' : 'View external options'} <ExternalLink size={13} />
              </a>
            </article>
          ))}
        </div>
      </SurfaceCard>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-[30rem] animate-pulse rounded-[1.5rem] bg-[var(--ag-surface-muted)]" />
          ))}
        </div>
      ) : error ? (
        <EmptyPanel
          title={t('agriStore.loadError')}
          description={error}
          icon={<PackageSearch size={24} />}
          action={<button className="ui-button ui-button-secondary" onClick={() => setRetryCount((count) => count + 1)}>{t('agriStore.retry')}</button>}
        />
      ) : products.length === 0 ? (
        <EmptyPanel
          title={t('agriStore.noProducts')}
          description={t('agriStore.noProductsHint')}
          icon={<PackageSearch size={24} />}
        />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={`${product.sourceId}:${product.id}`}
                product={product}
                locale={locale}
                buyLabel={t('agriStore.buyNow')}
                outOfStockLabel={t('agriStore.outOfStock')}
                priceUnavailableLabel={t('agriStore.priceUnavailable')}
                saleLabel={t('agriStore.sale')}
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-4">
            <button
              className="ui-button ui-button-secondary"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t('agriStore.previous')}
            </button>
            <span className="text-sm font-bold text-[var(--ag-text-muted)]">
              {totalExact
                ? t('agriStore.pageStatus', { page, totalPages })
                : t('agriStore.currentPage', { page })}
            </span>
            <button
              className="ui-button ui-button-secondary"
              disabled={!hasNext}
              onClick={() => setPage((current) => current + 1)}
            >
              {t('agriStore.next')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
