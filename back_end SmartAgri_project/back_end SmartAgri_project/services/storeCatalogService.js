const { load } = require('cheerio');
const { Agent } = require('undici');

const STORE_SOURCES = {
  harraz: {
    id: 'harraz',
    name: 'Harraz Farm & Garden',
    url: 'https://harraz.shop/',
  },
  orkida: {
    id: 'orkida',
    name: 'Orkida Agricultural Store',
    url: 'https://orkidastore.com/ar/',
  },
};

const HARRAZ_API_BASE = 'https://harraz.shop/wp-json/wc/store/v1';
const ORKIDA_API_BASE = 'https://api.salla.dev/store/v1';
const ORKIDA_STORE_ID = '605868729';
const ORKIDA_CATEGORY_SITEMAP = 'https://orkidastore.com/ar/sitemap-1.xml';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 250;
const SAR_TO_EGP_RATE = Number.parseFloat(process.env.SAR_TO_EGP_RATE || '13.25');
const responseCache = new Map();
const pendingRequests = new Map();
const orkidaCursorChains = new Map();
const storeDispatcher = new Agent({
  connect: {
    family: 4,
    timeout: 15000,
  },
});

class StoreCatalogError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'StoreCatalogError';
    this.status = options?.status || 0;
  }
}

const HARRAZ_FALLBACK_PRODUCTS = [
  {
    id: 'soil-mix-3kg',
    nameEn: 'Treated potting mix - 3KG',
    nameAr: 'خلطة تربة معالجة - 3 كجم',
    descriptionEn: 'Ready-to-use growing media for seedlings, herbs, and balcony crops.',
    descriptionAr: 'بيئة زراعة جاهزة للشتلات والأعشاب ومحاصيل البلكونة.',
    price: 200,
    regularPrice: 225,
    categoryId: 'soil-media',
    categoryEn: 'Soil and media',
    categoryAr: 'التربة وبيئات الزراعة',
    imageUrl: 'https://harraz.shop/wp-content/uploads/2024/05/soil-mix.jpg',
    productUrl: 'https://harraz.shop/?s=potting+mix&post_type=product',
  },
  {
    id: 'neem-oil-250ml',
    nameEn: 'Neem oil - 250ML',
    nameAr: 'زيت نيم - 250 مل',
    descriptionEn: 'Plant-care oil used in integrated pest management routines.',
    descriptionAr: 'زيت للعناية بالنباتات ضمن برامج المكافحة المتكاملة للآفات.',
    price: 180,
    regularPrice: 180,
    categoryId: 'plant-care',
    categoryEn: 'Plant care',
    categoryAr: 'العناية بالنبات',
    imageUrl: 'https://harraz.shop/wp-content/uploads/2024/05/neem-oil.jpg',
    productUrl: 'https://harraz.shop/?s=neem+oil&post_type=product',
  },
  {
    id: 'npk-20-20-20',
    nameEn: 'NPK 20-20-20 fertilizer - 1KG',
    nameAr: 'سماد NPK 20-20-20 - 1 كجم',
    descriptionEn: 'Balanced water-soluble fertilizer for vegetative and flowering stages.',
    descriptionAr: 'سماد متوازن قابل للذوبان في الماء لمراحل النمو والتزهير.',
    price: 260,
    regularPrice: 290,
    categoryId: 'fertilizers',
    categoryEn: 'Fertilizers',
    categoryAr: 'الأسمدة',
    imageUrl: 'https://harraz.shop/wp-content/uploads/2024/05/fertilizer.jpg',
    productUrl: 'https://harraz.shop/?s=NPK+20-20-20&post_type=product',
  },
  {
    id: 'vermicompost-5kg',
    nameEn: 'Vermicompost - 5KG',
    nameAr: 'كمبوست دودي - 5 كجم',
    descriptionEn: 'Organic soil amendment that improves structure and nutrient availability.',
    descriptionAr: 'محسن تربة عضوي يساعد على تحسين البناء وتوفر العناصر الغذائية.',
    price: 220,
    regularPrice: 220,
    categoryId: 'organic-inputs',
    categoryEn: 'Organic inputs',
    categoryAr: 'مدخلات عضوية',
    imageUrl: 'https://harraz.shop/wp-content/uploads/2024/05/vermicompost.jpg',
    productUrl: 'https://harraz.shop/?s=vermicompost&post_type=product',
  },
  {
    id: 'coco-peat-block',
    nameEn: 'Coco peat block',
    nameAr: 'بلوك كوكوبيت',
    descriptionEn: 'Compressed coco peat block for seed starting and potting mixes.',
    descriptionAr: 'بلوك كوكوبيت مضغوط لتجهيز الشتلات وخلطات الزراعة.',
    price: 160,
    regularPrice: 175,
    categoryId: 'soil-media',
    categoryEn: 'Soil and media',
    categoryAr: 'التربة وبيئات الزراعة',
    imageUrl: 'https://harraz.shop/wp-content/uploads/2024/05/coco-peat.jpg',
    productUrl: 'https://harraz.shop/?s=coco+peat&post_type=product',
  },
  {
    id: 'pruning-shears',
    nameEn: 'Pruning shears',
    nameAr: 'مقص تقليم',
    descriptionEn: 'Hand tool for pruning branches, herbs, and greenhouse crops.',
    descriptionAr: 'أداة يدوية لتقليم الأفرع والأعشاب ومحاصيل الصوب.',
    price: 190,
    regularPrice: 190,
    categoryId: 'tools',
    categoryEn: 'Tools',
    categoryAr: 'الأدوات',
    imageUrl: 'https://harraz.shop/wp-content/uploads/2024/05/pruning-shears.jpg',
    productUrl: 'https://harraz.shop/?s=pruning+shears&post_type=product',
  },
];

const textFromHtml = (html) => {
  if (!html) return '';
  return load(`<div>${html}</div>`)('div').first().text().replace(/\s+/g, ' ').trim();
};

const slugify = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '-');

const readCachedResponse = (cacheKey, allowExpired = false) => {
  const cached = responseCache.get(cacheKey);
  if (!cached) return null;
  if (!allowExpired && Date.now() - cached.savedAt >= CACHE_TTL_MS) return null;
  return cached.value;
};

const saveCachedResponse = (cacheKey, value) => {
  if (!responseCache.has(cacheKey) && responseCache.size >= MAX_CACHE_ENTRIES) {
    responseCache.delete(responseCache.keys().next().value);
  }
  responseCache.set(cacheKey, { savedAt: Date.now(), value });
};

const requestExternal = async (url, { sourceName, headers = {}, parse }) => {
  const response = await fetch(url, {
    dispatcher: storeDispatcher,
    signal: AbortSignal.timeout(90000),
    headers: {
      accept: 'application/json',
      'user-agent': 'AgriculturalVisionMind/1.0 (public product catalog)',
      ...headers,
    },
  });
  if (!response.ok) {
    throw new StoreCatalogError(`${sourceName} catalog returned HTTP ${response.status}.`, {
      status: response.status,
    });
  }
  return parse(response);
};

const fetchCached = (url, options) => {
  const cacheKey = String(url);
  const cached = readCachedResponse(cacheKey);
  if (cached) return Promise.resolve(cached);
  if (pendingRequests.has(cacheKey)) return pendingRequests.get(cacheKey);

  const request = requestExternal(cacheKey, options)
    .then((catalogResponse) => {
      saveCachedResponse(cacheKey, catalogResponse);
      return catalogResponse;
    })
    .catch((error) => {
      const stale = readCachedResponse(cacheKey, true);
      if (stale) return stale;
      if (error instanceof StoreCatalogError) throw error;
      throw new StoreCatalogError(`${options.sourceName} catalog is temporarily unavailable.`, {
        cause: error,
      });
    })
    .finally(() => pendingRequests.delete(cacheKey));
  pendingRequests.set(cacheKey, request);
  return request;
};

const buildUrl = (base, path, query = {}) => {
  const url = new URL(`${base}${path}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });
  return url;
};

const fetchHarrazJson = (path, query) => {
  const url = buildUrl(HARRAZ_API_BASE, path, query);
  return fetchCached(url, {
    sourceName: STORE_SOURCES.harraz.name,
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9,ar;q=0.8',
      referer: STORE_SOURCES.harraz.url,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
    },
    parse: async (response) => {
      const body = await response.json();
      if (!Array.isArray(body)) {
        throw new StoreCatalogError('Harraz catalog returned an unexpected response.');
      }
      return {
        body,
        total: Number.parseInt(response.headers.get('x-wp-total') || '0', 10),
        totalPages: Number.parseInt(response.headers.get('x-wp-totalpages') || '0', 10),
      };
    },
  });
};

const orkidaHeaders = {
  'accept-language': 'ar',
  currency: 'SAR',
  's-source': 'twilight',
  'store-identifier': ORKIDA_STORE_ID,
};

const fetchOrkidaJson = (url) => fetchCached(url, {
  sourceName: STORE_SOURCES.orkida.name,
  headers: orkidaHeaders,
  parse: async (response) => {
    const body = await response.json();
    if (!body?.success || !Array.isArray(body.data)) {
      throw new StoreCatalogError('Orkida catalog returned an unexpected response.');
    }
    return body;
  },
});

const fetchOrkidaCategorySitemap = () => fetchCached(ORKIDA_CATEGORY_SITEMAP, {
  sourceName: STORE_SOURCES.orkida.name,
  headers: { accept: 'application/xml,text/xml' },
  parse: (response) => response.text(),
});

const parsePrice = (value, minorUnit) => {
  const amount = Number(value || 0);
  return amount / (10 ** Number(minorUnit || 0));
};

const normalizeLang = (lang) => (String(lang || '').toLowerCase().startsWith('ar') ? 'ar' : 'en');

const convertSarToEgp = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * SAR_TO_EGP_RATE * 100) / 100;
};

const localValue = (item, key, lang) => item[`${key}${lang === 'ar' ? 'Ar' : 'En'}`] || item[`${key}En`] || '';

const mapFallbackHarrazProduct = (product, lang) => ({
  id: product.id,
  sourceId: STORE_SOURCES.harraz.id,
  name: localValue(product, 'name', lang),
  description: localValue(product, 'description', lang),
  productUrl: product.productUrl,
  imageUrl: product.imageUrl,
  imageAlt: localValue(product, 'name', lang),
  price: product.price,
  regularPrice: product.regularPrice,
  salePrice: product.regularPrice > product.price ? product.price : null,
  currency: 'EGP',
  onSale: product.regularPrice > product.price,
  inStock: true,
  purchasable: true,
  categories: [{
    id: `${STORE_SOURCES.harraz.id}:${product.categoryId}`,
    name: localValue(product, 'category', lang),
    slug: product.categoryId,
  }],
  source: STORE_SOURCES.harraz.name,
});

const listFallbackHarrazProducts = ({ page, limit, search, category, lang }) => {
  const normalizedLang = normalizeLang(lang);
  const needle = String(search || '').trim().toLowerCase();
  const filtered = HARRAZ_FALLBACK_PRODUCTS
    .filter((product) => {
      if (category && category !== product.categoryId) return false;
      if (!needle) return true;
      return [
        product.nameEn,
        product.nameAr,
        product.descriptionEn,
        product.descriptionAr,
        product.categoryEn,
        product.categoryAr,
      ].some((value) => String(value || '').toLowerCase().includes(needle));
    });
  const offset = (page - 1) * limit;
  const paged = filtered.slice(offset, offset + limit);

  return {
    products: paged.map((product) => mapFallbackHarrazProduct(product, normalizedLang)),
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
      totalExact: true,
      hasNext: offset + limit < filtered.length,
    },
  };
};

const mapHarrazProduct = (product) => {
  const prices = product.prices || {};
  const minorUnit = prices.currency_minor_unit;
  const categories = Array.isArray(product.categories) ? product.categories : [];
  const image = Array.isArray(product.images) ? product.images[0] : null;

  return {
    id: String(product.id),
    sourceId: STORE_SOURCES.harraz.id,
    name: textFromHtml(product.name),
    description: textFromHtml(product.short_description).slice(0, 240),
    productUrl: product.permalink,
    imageUrl: image?.thumbnail || image?.src || null,
    imageAlt: image?.alt || image?.name || textFromHtml(product.name),
    price: parsePrice(prices.price, minorUnit),
    regularPrice: parsePrice(prices.regular_price || prices.price, minorUnit),
    salePrice: prices.sale_price ? parsePrice(prices.sale_price, minorUnit) : null,
    currency: prices.currency_code || 'EGP',
    onSale: Boolean(product.on_sale),
    inStock: Boolean(product.is_in_stock),
    purchasable: Boolean(product.is_purchasable),
    categories: categories.map((category) => ({
      id: `${STORE_SOURCES.harraz.id}:${category.id}`,
      name: textFromHtml(category.name),
      slug: category.slug,
    })),
    source: STORE_SOURCES.harraz.name,
  };
};

const mapOrkidaProduct = (product) => {
  const price = convertSarToEgp(product.price);
  const regularPrice = convertSarToEgp(product.regular_price || product.price);
  const salePrice = product.sale_price ? convertSarToEgp(product.sale_price) : null;
  const categoryName = textFromHtml(product.category?.name);

  return {
    id: String(product.id),
    sourceId: STORE_SOURCES.orkida.id,
    name: textFromHtml(product.name),
    description: textFromHtml(product.description).slice(0, 240),
    productUrl: product.url,
    imageUrl: product.image?.url || product.original_image || null,
    imageAlt: textFromHtml(product.name),
    price,
    regularPrice,
    salePrice,
    currency: 'EGP',
    onSale: Boolean(product.is_on_sale || (regularPrice > price && price > 0)),
    inStock: Boolean(product.is_available && !product.is_out_of_stock),
    purchasable: Boolean(product.is_available),
    categories: categoryName ? [{
      id: `${STORE_SOURCES.orkida.id}:${slugify(categoryName)}`,
      name: categoryName,
      slug: slugify(categoryName),
    }] : [],
    source: STORE_SOURCES.orkida.name,
  };
};

const listHarrazProducts = async ({ page, limit, search, category, lang }) => {
  let response;
  try {
    response = await fetchHarrazJson('/products', {
      page,
      per_page: limit,
      search,
      category,
      orderby: 'date',
      order: 'desc',
    });
  } catch (error) {
    if (error instanceof StoreCatalogError && error.status === 403) {
      return listFallbackHarrazProducts({ page, limit, search, category, lang });
    }
    throw error;
  }

  return {
    products: response.body.map(mapHarrazProduct),
    pagination: {
      page,
      limit,
      total: response.total,
      totalPages: response.totalPages,
      totalExact: true,
      hasNext: page < response.totalPages,
    },
  };
};

const buildOrkidaProductsUrl = ({ limit, search, category }) => {
  const url = new URL(`${ORKIDA_API_BASE}/products`);
  if (search) {
    url.searchParams.set('source', 'search');
    url.searchParams.set('source_value', search);
    if (category) url.searchParams.set('filters[category_id]', category);
  } else if (category) {
    url.searchParams.set('source', 'categories');
    url.searchParams.append('source_value[]', category);
  } else {
    url.searchParams.set('source', 'latest');
  }
  url.searchParams.set('per_page', String(Math.min(32, limit)));
  url.searchParams.set('filterable', '1');
  return url.toString();
};

const getOrkidaCursorChain = (chainKey, firstPageUrl) => {
  const existing = orkidaCursorChains.get(chainKey);
  if (existing && Date.now() - existing.savedAt < CACHE_TTL_MS) return existing;

  const fresh = {
    savedAt: Date.now(),
    pageUrls: new Map([[1, firstPageUrl]]),
  };
  orkidaCursorChains.set(chainKey, fresh);
  return fresh;
};

const fetchOrkidaPage = async ({ page, limit, search, category }) => {
  const firstPageUrl = buildOrkidaProductsUrl({ limit, search, category });
  const chainKey = JSON.stringify({ limit, search, category });
  const chain = getOrkidaCursorChain(chainKey, firstPageUrl);

  for (let currentPage = 1; currentPage <= page; currentPage += 1) {
    const pageUrl = chain.pageUrls.get(currentPage);
    if (!pageUrl) {
      return { data: [], cursor: { current: currentPage, next: null } };
    }

    const response = await fetchOrkidaJson(pageUrl);
    if (response.cursor?.next) {
      chain.pageUrls.set(currentPage + 1, response.cursor.next);
    }
    if (currentPage === page) return response;
  }

  return { data: [], cursor: { current: page, next: null } };
};

const listOrkidaProducts = async ({ page, limit, search, category }) => {
  const response = await fetchOrkidaPage({ page, limit, search, category });
  const hasNext = Boolean(response.cursor?.next);
  const total = ((page - 1) * limit) + response.data.length + (hasNext ? 1 : 0);

  return {
    products: response.data.map(mapOrkidaProduct),
    pagination: {
      page,
      limit,
      total,
      totalPages: hasNext ? page + 1 : page,
      totalExact: false,
      hasNext,
    },
  };
};

const listProducts = async ({ page, limit, search, category, source, lang }) => {
  if (source === STORE_SOURCES.harraz.id) {
    return listHarrazProducts({ page, limit, search, category, lang });
  }
  if (source === STORE_SOURCES.orkida.id) {
    return listOrkidaProducts({ page, limit, search, category });
  }

  const harrazLimit = Math.ceil(limit / 2);
  const orkidaLimit = Math.floor(limit / 2);
  const requests = [
    listHarrazProducts({ page, limit: harrazLimit, search, category: '', lang }),
    listOrkidaProducts({ page, limit: orkidaLimit, search, category: '' }),
  ];
  const [harrazResult, orkidaResult] = await Promise.allSettled(requests);
  const available = [harrazResult, orkidaResult]
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);

  if (available.length === 0) {
    throw harrazResult.reason || orkidaResult.reason;
  }

  return {
    products: available.flatMap((catalog) => catalog.products),
    pagination: {
      page,
      limit,
      total: available.reduce((sum, catalog) => sum + catalog.pagination.total, 0),
      totalPages: Math.max(...available.map((catalog) => catalog.pagination.totalPages)),
      totalExact: available.every((catalog) => catalog.pagination.totalExact),
      hasNext: available.some((catalog) => catalog.pagination.hasNext),
    },
  };
};

const listHarrazCategories = async () => {
  let response;
  try {
    response = await fetchHarrazJson('/products/categories', {
      per_page: 100,
      hide_empty: true,
    });
  } catch (error) {
    if (error instanceof StoreCatalogError && error.status === 403) {
      const categories = new Map();
      HARRAZ_FALLBACK_PRODUCTS.forEach((product) => {
        categories.set(product.categoryId, {
          id: `${STORE_SOURCES.harraz.id}:${product.categoryId}`,
          sourceId: STORE_SOURCES.harraz.id,
          source: STORE_SOURCES.harraz.name,
          name: product.categoryEn,
          slug: product.categoryId,
          count: HARRAZ_FALLBACK_PRODUCTS.filter((item) => item.categoryId === product.categoryId).length,
        });
      });
      return [...categories.values()];
    }
    throw error;
  }
  return response.body
    .map((category) => ({
      id: `${STORE_SOURCES.harraz.id}:${category.id}`,
      sourceId: STORE_SOURCES.harraz.id,
      source: STORE_SOURCES.harraz.name,
      name: textFromHtml(category.name),
      slug: category.slug,
      count: Number(category.count || 0),
    }))
    .filter((category) => category.count > 0);
};

const listOrkidaCategories = async () => {
  const sitemap = await fetchOrkidaCategorySitemap();
  const $ = load(sitemap, { xmlMode: true });
  const categories = new Map();

  $('loc').each((_index, element) => {
    const location = $(element).text().trim();
    const match = location.match(/\/([^/]+)\/c(\d+)\/?$/u);
    if (!match) return;

    const rawName = decodeURIComponent(match[1]).replace(/[-+]+/g, ' ').trim();
    const categoryId = match[2];
    categories.set(categoryId, {
      id: `${STORE_SOURCES.orkida.id}:${categoryId}`,
      sourceId: STORE_SOURCES.orkida.id,
      source: STORE_SOURCES.orkida.name,
      name: rawName,
      slug: match[1],
    });
  });

  return [...categories.values()];
};

const listCategories = async () => {
  const results = await Promise.allSettled([
    listHarrazCategories(),
    listOrkidaCategories(),
  ]);
  const available = results
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value);

  if (available.length === 0) {
    throw results[0].reason || results[1].reason;
  }

  return available.sort((left, right) => left.name.localeCompare(right.name, 'ar'));
};

module.exports = {
  STORE_SOURCES,
  StoreCatalogError,
  listProducts,
  listCategories,
};
