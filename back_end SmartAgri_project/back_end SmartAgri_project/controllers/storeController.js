const {
  STORE_SOURCES,
  StoreCatalogError,
  listCategories,
  listProducts,
} = require('../services/storeCatalogService');

const getStoreProducts = async (req, res, next) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(48, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
  const search = String(req.query.search || '').trim().slice(0, 100);
  const requestedCategory = String(req.query.category || '').trim();
  const requestedSource = String(req.query.source || 'all').trim().toLowerCase();
  const lang = String(req.query.lang || req.headers['accept-language'] || 'en').toLowerCase().startsWith('ar')
    ? 'ar'
    : 'en';
  const source = ['all', ...Object.keys(STORE_SOURCES)].includes(requestedSource)
    ? requestedSource
    : 'all';
  const categoryMatch = requestedCategory.match(/^(harraz|orkida):([a-z0-9-]+)$/i);
  const categorySource = categoryMatch?.[1] || '';
  const category = categoryMatch?.[2] || '';
  const effectiveSource = categorySource || source;

  try {
    const catalog = await listProducts({
      page,
      limit,
      search,
      category,
      source: effectiveSource,
      lang,
    });
    res.json({
      data: catalog.products,
      pagination: catalog.pagination,
      sources: Object.values(STORE_SOURCES),
    });
  } catch (error) {
    if (error instanceof StoreCatalogError) {
      return res.status(502).json({ error: error.message });
    }
    return next(error);
  }
};

const getStoreCategories = async (_req, res, next) => {
  try {
    const categories = await listCategories();
    res.json({
      data: categories,
      sources: Object.values(STORE_SOURCES),
    });
  } catch (error) {
    if (error instanceof StoreCatalogError) {
      return res.status(502).json({ error: error.message });
    }
    return next(error);
  }
};

module.exports = { getStoreProducts, getStoreCategories };
