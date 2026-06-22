const pool = require('../config/database');
const { load } = require('cheerio');
const { parseNewsArticle } = require('./newsArticleParser');

const NEWS_SOURCES = [
  {
    name: 'Ahram Agri',
    homepage: 'https://agri.ahram.org.eg/',
    baseUrl: 'https://agri.ahram.org.eg/',
    articlePatterns: [/\/News\/\d+\.aspx(?:\?.*)?$/i, /\/News\/\d+(?:\/|$)/i],
    bodySelectors: ['#ctl00_ContentPlaceHolder1_divContent'],
    imageSelectors: ['#ctl00_ContentPlaceHolder1_imgNews'],
    defaultCategory: 'agri',
  },
  {
    name: 'Agriculture Egypt',
    homepage: 'https://agricultureegypt.com/News/',
    baseUrl: 'https://agricultureegypt.com/',
    articlePatterns: [/\/News\/\d+(?:\/|$)/i, /\/News\/\d+\/[^"'#?]+/i],
    bodySelectors: ['.article-wrapper.news-details .brief'],
    imageSelectors: ['.article-wrapper.news-details img', '.news-header img'],
    defaultCategory: 'agri',
  },
];

const SYNC_ENABLED = (process.env.NEWS_SYNC_ENABLED || 'true').toLowerCase() !== 'false';
const SYNC_INTERVAL_MINUTES = Math.max(5, parseInt(process.env.NEWS_SYNC_INTERVAL_MINUTES || '30', 10) || 30);
const STARTUP_DELAY_MS = Math.max(1000, parseInt(process.env.NEWS_SYNC_STARTUP_DELAY_MS || '5000', 10) || 5000);

const parseMaxArticlesPerSource = () => {
  const rawValue = process.env.NEWS_SYNC_MAX_ARTICLES_PER_SOURCE;
  if (rawValue == null || rawValue.trim() === '') return 50;

  const parsedValue = parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue)) return 12;
  return Math.max(0, parsedValue);
};
const MAX_ARTICLES_PER_SOURCE = parseMaxArticlesPerSource();

let syncTimer = null;
let syncInFlight = null;

const toAbsoluteUrl = (href, baseUrl) => {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
};

const fetchHtml = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; SmartAgriNewsSync/1.0)',
        'accept-language': 'ar,en;q=0.8',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const extractArticleDetails = async (source, articleUrl) => {
  const html = await fetchHtml(articleUrl);
  return parseNewsArticle(html, source, articleUrl);
};

const textFromHtml = (html = '') => load(`<div>${html}</div>`)('div').text().replace(/\s+/g, ' ').trim();

const findPreviewContainer = ($, anchor) => {
  const candidates = [
    $(anchor).closest('article'),
    $(anchor).closest('.news-item'),
    $(anchor).closest('.item'),
    $(anchor).closest('.card'),
    $(anchor).closest('.col-md-4, .col-md-6, .col-lg-4, .col-sm-6'),
    $(anchor).parent(),
  ].filter((candidate) => candidate.length > 0);

  return candidates.find((candidate) => textFromHtml(candidate.text()).length >= 30) || $(anchor).parent();
};

const extractPreviewImage = ($, container, source) => {
  const image = container.find('img').first();
  const src = image.attr('data-src') || image.attr('data-original') || image.attr('src');
  return toAbsoluteUrl(src, source.baseUrl);
};

const extractPreviewDate = (text) => {
  const isoMatch = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
  }

  const slashMatch = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
  }

  return null;
};

const extractCandidateArticles = (html, source) => {
  const $ = load(html);
  const candidates = new Map();
  const anchorRegex = /<a\b[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    const absoluteUrl = toAbsoluteUrl(href, source.baseUrl);
    if (!absoluteUrl) continue;

    const isArticleUrl = source.articlePatterns.some((pattern) => pattern.test(new URL(absoluteUrl).pathname + new URL(absoluteUrl).search));
    if (!isArticleUrl) continue;

    if (candidates.has(absoluteUrl)) continue;

    const anchor = $(`a[href="${href.replace(/"/g, '\\"')}"]`).first();
    const container = anchor.length > 0 ? findPreviewContainer($, anchor) : null;
    const title = textFromHtml(anchor.text() || match[2]);
    const previewText = container ? textFromHtml(container.text()) : title;
    const summary = previewText && previewText !== title
      ? previewText.replace(title, '').trim().slice(0, 260)
      : title;

    candidates.set(absoluteUrl, {
      url: absoluteUrl,
      title,
      summary,
      imageUrl: container ? extractPreviewImage($, container, source) : null,
      publishedAt: extractPreviewDate(previewText),
    });
  }

  const articles = [...candidates.values()]
    .filter((candidate) => candidate.title && candidate.title.length >= 12);
  return MAX_ARTICLES_PER_SOURCE > 0 ? articles.slice(0, MAX_ARTICLES_PER_SOURCE) : articles;
};

const fallbackArticleFromPreview = (source, preview) => ({
  title: preview.title,
  summary: preview.summary || preview.title,
  content: preview.summary || preview.title,
  imageUrl: preview.imageUrl,
  category: source.defaultCategory,
  publishedAt: preview.publishedAt || new Date().toISOString(),
  source: source.name,
  sourceUrl: preview.url,
  sourceArticleId: preview.url.match(/\/News\/(\d+)/i)?.[1] || null,
});

const mergeArticleWithPreview = (article, source, preview) => {
  if (!article) return fallbackArticleFromPreview(source, preview);
  return {
    ...article,
    title: article.title || preview.title,
    summary: article.summary || preview.summary || article.title || preview.title,
    content: article.content || preview.summary || article.summary || preview.title,
    imageUrl: article.imageUrl || preview.imageUrl,
    publishedAt: article.publishedAt || preview.publishedAt || new Date().toISOString(),
  };
};

const upsertImportedArticle = async (article) => {
  const existing = await pool.query(
    'SELECT id FROM news WHERE source_url = $1',
    [article.sourceUrl]
  );

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO news
         (title, summary, content, image_url, category, published_at, source_name, source_url, source_article_id, is_imported)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)`,
      [
        article.title,
        article.summary,
        article.content,
        article.imageUrl,
        article.category,
        article.publishedAt,
        article.source,
        article.sourceUrl,
        article.sourceArticleId,
      ]
    );
    return 'created';
  }

  await pool.query(
    `UPDATE news SET
       title = $1,
       summary = $2,
       content = $3,
       image_url = COALESCE($4, image_url),
       category = COALESCE($5, category),
       published_at = COALESCE($6, published_at),
       source_name = $7,
       source_article_id = COALESCE($8, source_article_id),
       is_imported = TRUE,
       updated_at = NOW()
     WHERE source_url = $9`,
    [
      article.title,
      article.summary,
      article.content,
      article.imageUrl,
      article.category,
      article.publishedAt,
      article.source,
      article.sourceArticleId,
      article.sourceUrl,
    ]
  );

  return 'updated';
};

const syncSource = async (source) => {
  const homepageHtml = await fetchHtml(source.homepage);
  const articlePreviews = extractCandidateArticles(homepageHtml, source);

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const preview of articlePreviews) {
    try {
      const parsedArticle = await extractArticleDetails(source, preview.url);
      const article = mergeArticleWithPreview(parsedArticle, source, preview);
      if (!article?.title || !article?.summary) continue;

      const result = await upsertImportedArticle(article);
      if (result === 'created') created += 1;
      else updated += 1;
    } catch (error) {
      try {
        const article = fallbackArticleFromPreview(source, preview);
        const result = await upsertImportedArticle(article);
        if (result === 'created') created += 1;
        else updated += 1;
      } catch (fallbackError) {
        failed += 1;
        console.error(`[news-sync] ${source.name} failed for ${preview.url}:`, fallbackError.message || fallbackError);
      }
    }
  }

  return {
    source: source.name,
    scanned: articlePreviews.length,
    created,
    updated,
    failed,
  };
};

const ensureNewsSchema = async () => {
  const tableCheck = await pool.query(`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'news'
    LIMIT 1;
  `);

  if (tableCheck.rows.length === 0) {
    throw new Error('News schema is missing. Run npm run db:migrate before synchronization.');
  }
};

const syncImportedNews = async () => {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    await ensureNewsSchema();

    const perSource = [];
    let created = 0;
    let updated = 0;
    let failed = 0;
    let scanned = 0;

    for (const source of NEWS_SOURCES) {
      try {
        const result = await syncSource(source);
        perSource.push(result);
        created += result.created;
        updated += result.updated;
        failed += result.failed;
        scanned += result.scanned;
      } catch (error) {
        perSource.push({
          source: source.name,
          scanned: 0,
          created: 0,
          updated: 0,
          failed: 1,
          error: error.message || 'Unknown sync error',
        });
        failed += 1;
        console.error(`[news-sync] ${source.name} failed:`, error.message || error);
      }
    }

    return {
      scanned,
      created,
      updated,
      failed,
      perSource,
      syncedAt: new Date().toISOString(),
    };
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
};

const startNewsAutoSync = () => {
  if (!SYNC_ENABLED) {
    console.log('[news-sync] automatic sync disabled');
    return;
  }

  if (syncTimer) {
    clearInterval(syncTimer);
  }

  setTimeout(() => {
    void syncImportedNews().catch((error) => {
      console.error('[news-sync] startup sync failed:', error.message || error);
    });
  }, STARTUP_DELAY_MS);

  syncTimer = setInterval(() => {
    void syncImportedNews().catch((error) => {
      console.error('[news-sync] scheduled sync failed:', error.message || error);
    });
  }, SYNC_INTERVAL_MINUTES * 60 * 1000);

  if (typeof syncTimer.unref === 'function') {
    syncTimer.unref();
  }

  console.log(`[news-sync] automatic sync scheduled every ${SYNC_INTERVAL_MINUTES} minute(s)`);
};

module.exports = {
  ensureNewsSchema,
  syncImportedNews,
  startNewsAutoSync,
};
