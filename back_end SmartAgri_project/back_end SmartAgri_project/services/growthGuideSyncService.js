const pool = require('../config/database');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const ALMANAC_SOURCE = {
  name: 'Almanac',
  language: 'en',
  homepage: 'https://www.almanac.com/gardening/growing-guides',
  baseUrl: 'https://www.almanac.com',
};

const RHS_SOURCE = {
  name: 'RHS',
  language: 'en',
  homepage: 'https://www.rhs.org.uk/advice/grow-your-own',
  baseUrl: 'https://www.rhs.org.uk',
};

// Configuration from Environment Variables
const SYNC_ENABLED = (process.env.GROWTH_GUIDE_SYNC_ENABLED || 'true').toLowerCase() === 'true';
const SYNC_INTERVAL_HOURS = Math.max(1, parseInt(process.env.GROWTH_GUIDE_SYNC_INTERVAL_HOURS || '24', 10) || 24);
const STARTUP_DELAY_MS = Math.max(1000, parseInt(process.env.GROWTH_GUIDE_SYNC_STARTUP_DELAY_MS || '5000', 10) || 5000);
const MAX_ITEMS_PER_SOURCE = Math.max(1, parseInt(process.env.GROWTH_GUIDE_SYNC_MAX_ITEMS_PER_SOURCE || '50', 10) || 50);
const CONCURRENCY = Math.max(1, parseInt(process.env.GROWTH_GUIDE_SYNC_CONCURRENCY || '2', 10) || 2);
const REQUEST_DELAY_MS = Math.max(100, parseInt(process.env.GROWTH_GUIDE_SYNC_REQUEST_DELAY_MS || '500', 10) || 500);
const TIMEOUT_MS = Math.max(2000, parseInt(process.env.GROWTH_GUIDE_SYNC_TIMEOUT_MS || '15000', 10) || 15000);

let syncTimer = null;
let syncInFlight = null;

// Global sync state to expose to Admin
let globalSyncStatus = {
  isSyncing: false,
  lastSyncedAt: null,
  lastResult: null,
  lastError: null,
  sources: {
    Almanac: { scanned: 0, created: 0, updated: 0, failed: 0, status: 'idle', error: null },
    RHS: { scanned: 0, created: 0, updated: 0, failed: 0, status: 'idle', error: null },
  }
};

const ENTITY_MAP = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#34;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&ndash;': '-',
  '&mdash;': '-',
  '&hellip;': '...',
};

const decodeHtmlEntities = (value = '') =>
  String(value)
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITY_MAP[entity] || entity);

const normalizeWhitespace = (value = '') =>
  decodeHtmlEntities(String(value))
     .replace(/\r/g, '')
     .replace(/\u00a0/g, ' ')
     .replace(/[ \t]+/g, ' ')
     .replace(/\n{3,}/g, '\n\n')
     .trim();

const slugifyName = (name = '') => {
  return normalizeWhitespace(name)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'plant-guide';
};

const toAbsoluteUrl = (href, baseUrl) => {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
};

const createHttpError = (status, url) => {
  const error = new Error(`HTTP ${status}`);
  error.status = status;
  error.url = url;
  return error;
};

const isHttpStatus = (error, status) =>
  error && (error.status === status || error.message === `HTTP ${status}`);

// Map raw parsed category into unified enum
const mapCategory = (rawCategory = '') => {
  const cat = rawCategory.toLowerCase();
  if (cat.includes('vegetable')) return 'vegetables';
  if (cat.includes('fruit')) return 'fruits';
  if (cat.includes('herb')) return 'herbs';
  if (cat.includes('tree')) return 'trees';
  if (cat.includes('flower')) return 'flowers';
  return 'other';
};

const fetchHtml = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) throw createHttpError(response.status, url);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const sanitizeHtml = (str) => {
  if (typeof str !== 'string') return '';
  // Strip script tags and their content
  let cleaned = str.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
  // Strip style tags and their content
  cleaned = cleaned.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '');
  // Strip object/iframe/embed/applet tags
  cleaned = cleaned.replace(/<(iframe|object|embed|applet)[^>]*>([\s\S]*?)<\/\1>/gi, '');
  // Remove event handlers like onload, onerror, onclick, etc.
  cleaned = cleaned.replace(/on\w+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '');
  // Remove javascript: URLs
  cleaned = cleaned.replace(/href\s*=\s*['"]javascript:[^'"]*['"]/gi, '');
  return cleaned.trim();
};

const cleanField = (text) => {
  if (!text) return null;
  const cleaned = sanitizeHtml(normalizeWhitespace(text));
  return cleaned.length > 0 ? cleaned : null;
};

const upsertGrowthGuide = async (guide) => {
  // Check if exists by canonical_url
  const checkRes = await pool.query(
    `SELECT id, name_ar, summary_ar, description_ar, sunlight_ar, soil_ar, watering_ar,
            planting_ar, sowing_ar, spacing_ar, care_ar, harvesting_ar, common_problems_ar,
            pests_ar, diseases_ar
     FROM growth_guides
     WHERE canonical_url = $1 LIMIT 1`,
    [guide.canonicalUrl]
  );
  
  const exists = checkRes.rows.length > 0;
  const id = exists ? checkRes.rows[0].id : uuidv4();
  const existingAr = exists ? checkRes.rows[0] : {};

  const params = [
    id,
    guide.slug,
    guide.name, // name_en
    existingAr.name_ar || null,
    guide.scientificName,
    guide.category,
    guide.summary, // summary_en
    existingAr.summary_ar || null,
    guide.description, // description_en
    existingAr.description_ar || null,
    guide.imageUrl,
    guide.sourceName,
    guide.sourceUrl,
    guide.canonicalUrl,
    guide.sunlight, // sunlight_en
    existingAr.sunlight_ar || null,
    guide.soil, // soil_en
    existingAr.soil_ar || null,
    guide.watering, // watering_en
    existingAr.watering_ar || null,
    guide.planting, // planting_en
    existingAr.planting_ar || null,
    guide.sowing, // sowing_en
    existingAr.sowing_ar || null,
    guide.spacing, // spacing_en
    existingAr.spacing_ar || null,
    guide.care, // care_en
    existingAr.care_ar || null,
    guide.harvesting, // harvesting_en
    existingAr.harvesting_ar || null,
    guide.commonProblems, // common_problems_en
    existingAr.common_problems_ar || null,
    guide.pests, // pests_en
    existingAr.pests_ar || null,
    guide.diseases, // diseases_en
    existingAr.diseases_ar || null,
    JSON.stringify(guide.additionalDetails || {}),
    guide.language,
  ];

  const query = `
    INSERT INTO growth_guides (
      id, slug, name_en, name_ar, scientific_name, category, summary_en, summary_ar,
      description_en, description_ar, image_url, source_name, source_url, canonical_url,
      sunlight_en, sunlight_ar, soil_en, soil_ar, watering_en, watering_ar,
      planting_en, planting_ar, sowing_en, sowing_ar, spacing_en, spacing_ar,
      care_en, care_ar, harvesting_en, harvesting_ar, common_problems_en, common_problems_ar,
      pests_en, pests_ar, diseases_en, diseases_ar, additional_details_json, language,
      is_active, is_visible, deleted_at, last_synced_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
      $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
      TRUE, TRUE, NULL, NOW()
    )
    ON CONFLICT (canonical_url) DO UPDATE SET
      slug = EXCLUDED.slug,
      name_en = EXCLUDED.name_en,
      scientific_name = COALESCE(EXCLUDED.scientific_name, growth_guides.scientific_name),
      category = EXCLUDED.category,
      summary_en = COALESCE(EXCLUDED.summary_en, growth_guides.summary_en),
      description_en = EXCLUDED.description_en,
      image_url = COALESCE(EXCLUDED.image_url, growth_guides.image_url),
      sunlight_en = COALESCE(EXCLUDED.sunlight_en, growth_guides.sunlight_en),
      soil_en = COALESCE(EXCLUDED.soil_en, growth_guides.soil_en),
      watering_en = COALESCE(EXCLUDED.watering_en, growth_guides.watering_en),
      planting_en = COALESCE(EXCLUDED.planting_en, growth_guides.planting_en),
      sowing_en = COALESCE(EXCLUDED.sowing_en, growth_guides.sowing_en),
      spacing_en = COALESCE(EXCLUDED.spacing_en, growth_guides.spacing_en),
      care_en = COALESCE(EXCLUDED.care_en, growth_guides.care_en),
      harvesting_en = COALESCE(EXCLUDED.harvesting_en, growth_guides.harvesting_en),
      common_problems_en = COALESCE(EXCLUDED.common_problems_en, growth_guides.common_problems_en),
      pests_en = COALESCE(EXCLUDED.pests_en, growth_guides.pests_en),
      diseases_en = COALESCE(EXCLUDED.diseases_en, growth_guides.diseases_en),
      additional_details_json = EXCLUDED.additional_details_json,
      language = EXCLUDED.language,
      is_active = TRUE,
      updated_at = NOW(),
      last_synced_at = NOW()
    RETURNING id;
  `;

  await pool.query(query, params);
  return exists ? 'updated' : 'created';
};

const runScrapeQueue = async (urls, sourceAdapter) => {
  let created = 0;
  let updated = 0;
  let failed = 0;
  let scanned = 0;

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const chunk = urls.slice(i, i + CONCURRENCY);
    const promises = chunk.map(async (url) => {
      try {
        const html = await fetchHtml(url);
        const guide = sourceAdapter.parseDetail(html, url);
        if (!guide || !guide.name) {
          throw new Error('Parsed guide is missing name or essential fields');
        }

        const result = await upsertGrowthGuide(guide);
        scanned += 1;
        if (result === 'created') created += 1;
        else updated += 1;
      } catch (err) {
        if (isHttpStatus(err, 404)) {
          console.warn(`[growth-guide-sync] Skipped missing guide ${url}: HTTP 404`);
          return;
        }

        failed += 1;
        console.error(`[growth-guide-sync] Failed to scrape ${url}:`, err.message || err);
      }
    });

    await Promise.all(promises);

    if (i + CONCURRENCY < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    }
  }

  return { scanned, created, updated, failed };
};

const AlmanacAdapter = {
  parseList: (html) => {
    const $ = cheerio.load(html);
    const urls = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && /^\/plant\/[a-z0-9-]+$/i.test(href)) {
        const absUrl = toAbsoluteUrl(href, ALMANAC_SOURCE.baseUrl);
        if (absUrl && !urls.includes(absUrl)) {
          urls.push(absUrl);
        }
      }
    });
    return urls.slice(0, MAX_ITEMS_PER_SOURCE);
  },

  parseDetail: (html, url) => {
    const $ = cheerio.load(html);

    let name = $('h1').first().text().replace(/How to Grow|Complete Guide to Planting & Harvesting/gi, '').trim();
    if (!name) name = $('title').text().split(':')[0].trim();

    let scientificName = $('.field--name-field-botanicalname').text().replace(/Botanical Name/gi, '').trim();
    if (!scientificName) {
      scientificName = $('.field--name-field-body em').first().text().trim();
    }

    const ogImage = $('meta[property="og:image"]').attr('content');
    const imageUrl = ogImage ? toAbsoluteUrl(ogImage, ALMANAC_SOURCE.baseUrl) : null;

    const sunlight = $('.field--name-field-sun-exposure-term').text().replace(/Sun Exposure/gi, '').trim();
    const watering = $('.field--name-field-water-needs').text().replace(/Water Needs/gi, '').trim();
    const soil = $('.field--name-field-soil-ph-term').text().replace(/Soil pH/gi, '').trim();
    const toxicity = $('.field--name-field-toxicity').text().replace(/Toxicity/gi, '').trim();
    const rawCategory = $('.field--name-field-plant-type-term').text().replace(/Plant Type/gi, '').trim();

    const description = $('.field--name-field-body').text().trim();
    const planting = $('.field--name-field-planting').text().trim();
    const care = $('.field--name-field-care').text().trim();
    const harvesting = $('.field--name-field-harvest').text().trim();
    const pestsAndProblems = $('.field--name-field-pests').text().trim();
    const additionalText = $('.field--name-field-wit-and-wisdom').text().trim();

    return {
      slug: slugifyName(name),
      name: cleanField(name),
      scientificName: cleanField(scientificName),
      category: mapCategory(rawCategory || 'other'),
      summary: cleanField(description.split('.')[0] + '.'),
      description: cleanField(description),
      imageUrl: imageUrl,
      sourceName: ALMANAC_SOURCE.name,
      sourceUrl: url,
      canonicalUrl: url,
      sunlight: cleanField(sunlight),
      soil: cleanField(soil),
      watering: cleanField(watering),
      planting: cleanField(planting),
      sowing: null,
      spacing: null,
      care: cleanField(care),
      harvesting: cleanField(harvesting),
      commonProblems: cleanField(pestsAndProblems),
      pests: null,
      diseases: null,
      additionalDetails: {
        toxicity: cleanField(toxicity),
        witAndWisdom: cleanField(additionalText)
      },
      language: ALMANAC_SOURCE.language,
    };
  }
};

const RhsAdapter = {
  parseList: (html) => {
    const $ = cheerio.load(html);
    const urls = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && (href.includes('/advice/grow-your-own/') || href.includes('/plants/details'))) {
        const absUrl = toAbsoluteUrl(href, RHS_SOURCE.baseUrl);
        if (absUrl && !urls.includes(absUrl)) {
          urls.push(absUrl);
        }
      }
    });
    return urls.slice(0, MAX_ITEMS_PER_SOURCE);
  },

  parseDetail: (html, url) => {
    const $ = cheerio.load(html);

    let name = $('h1').text().trim();
    if (!name) name = $('title').text().split('|')[0].trim();

    let scientificName = $('.scientific-name, .botanical-name').text().trim();
    if (!scientificName) {
      scientificName = $('span[style*="italic"], em').first().text().trim();
    }

    const ogImage = $('meta[property="og:image"]').attr('content');
    const imageUrl = ogImage ? toAbsoluteUrl(ogImage, RHS_SOURCE.baseUrl) : null;

    const description = $('.introduction, p').first().text().trim();
    const planting = $('#how-to-grow, .how-to-grow').text().trim();
    const care = $('#how-to-care, .how-to-care, #watering').text().trim();
    const harvesting = $('#how-to-harvest, .how-to-harvest').text().trim();
    const commonProblems = $('#problems, .problems, #pests-diseases').text().trim();

    return {
      slug: slugifyName(name),
      name: cleanField(name),
      scientificName: cleanField(scientificName),
      category: mapCategory(url),
      summary: cleanField(description.split('.')[0] + '.'),
      description: cleanField(description || name),
      imageUrl: imageUrl,
      sourceName: RHS_SOURCE.name,
      sourceUrl: url,
      canonicalUrl: url,
      sunlight: null,
      soil: null,
      watering: null,
      planting: cleanField(planting),
      sowing: null,
      spacing: null,
      care: cleanField(care),
      harvesting: cleanField(harvesting),
      commonProblems: cleanField(commonProblems),
      pests: null,
      diseases: null,
      additionalDetails: {},
      language: RHS_SOURCE.language,
    };
  }
};

const ensureGrowthGuideSchema = async () => {
  const tableCheck = await pool.query(`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'growth_guides'
    LIMIT 1;
  `);

  if (tableCheck.rows.length === 0) {
    throw new Error('Growth guide schema is missing. Run npm run db:migrate before synchronization.');
  }
};

const syncImportedGrowthGuides = async () => {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    globalSyncStatus.isSyncing = true;
    globalSyncStatus.lastError = null;

    const logId = uuidv4();
    await pool.query(
      `INSERT INTO sync_logs (id, section, status, start_time, scanned_count, created_count, updated_count, failed_count)
       VALUES ($1, $2, $3, NOW(), 0, 0, 0, 0)`,
      [logId, 'growth-guides', 'running']
    );

    await ensureGrowthGuideSchema();

    let errors = [];

    // 1. Almanac Crawl
    let almanacRes = { scanned: 0, created: 0, updated: 0, failed: 0 };
    globalSyncStatus.sources.Almanac = { ...almanacRes, status: 'running', error: null };
    try {
      const indexHtml = await fetchHtml(ALMANAC_SOURCE.homepage);
      const detailUrls = AlmanacAdapter.parseList(indexHtml);
      console.log(`[growth-guide-sync] Ingesting ${detailUrls.length} links from Almanac...`);

      almanacRes = await runScrapeQueue(detailUrls, AlmanacAdapter);
      globalSyncStatus.sources.Almanac = { ...almanacRes, status: 'completed', error: null };
    } catch (err) {
      const errMsg = err.message || 'Scraper blocked or failed';
      console.error('[growth-guide-sync] Almanac sync failed:', errMsg);
      globalSyncStatus.sources.Almanac.status = 'failed';
      globalSyncStatus.sources.Almanac.error = errMsg;
      errors.push(`Almanac: ${errMsg}`);
    }

    // 2. RHS Crawl (isolated, Almanac failures do not block this)
    let rhsRes = { scanned: 0, created: 0, updated: 0, failed: 0 };
    globalSyncStatus.sources.RHS = { ...rhsRes, status: 'running', error: null };
    try {
      const indexHtml = await fetchHtml(RHS_SOURCE.homepage);
      const detailUrls = RhsAdapter.parseList(indexHtml);
      console.log(`[growth-guide-sync] Ingesting ${detailUrls.length} links from RHS...`);

      rhsRes = await runScrapeQueue(detailUrls, RhsAdapter);
      globalSyncStatus.sources.RHS = { ...rhsRes, status: 'completed', error: null };
    } catch (err) {
      const errMsg = err.message || 'Scraper blocked or failed';
      if (isHttpStatus(err, 404)) {
        console.warn('[growth-guide-sync] RHS source skipped: homepage returned HTTP 404');
        globalSyncStatus.sources.RHS = { ...rhsRes, status: 'skipped', error: null };
      } else {
        console.error('[growth-guide-sync] RHS sync failed (graceful bypass):', errMsg);
        globalSyncStatus.sources.RHS.status = 'failed';
        globalSyncStatus.sources.RHS.error = errMsg;
        errors.push(`RHS: ${errMsg}`);
      }
    }

    const totalScanned = (globalSyncStatus.sources.Almanac.scanned || 0) + (globalSyncStatus.sources.RHS.scanned || 0);
    const totalCreated = (globalSyncStatus.sources.Almanac.created || 0) + (globalSyncStatus.sources.RHS.created || 0);
    const totalUpdated = (globalSyncStatus.sources.Almanac.updated || 0) + (globalSyncStatus.sources.RHS.updated || 0);
    const totalFailed  = (globalSyncStatus.sources.Almanac.failed || 0) + (globalSyncStatus.sources.RHS.failed || 0);

    const resultSummary = {
      scanned: totalScanned,
      created: totalCreated,
      updated: totalUpdated,
      failed: totalFailed,
      syncedAt: new Date().toISOString(),
    };

    globalSyncStatus.lastSyncedAt = resultSummary.syncedAt;
    globalSyncStatus.lastResult = resultSummary;
    globalSyncStatus.isSyncing = false;

    // Determine final status
    let finalStatus = 'completed';
    if (errors.length > 0) {
      if (totalScanned > 0) {
        finalStatus = 'partial_success';
      } else {
        finalStatus = 'failed';
      }
    }

    const errorMsg = errors.length > 0 ? errors.join(' | ') : null;
    await pool.query(
      `UPDATE sync_logs
       SET status = $1, end_time = NOW(), scanned_count = $2, created_count = $3, updated_count = $4, failed_count = $5, error_message = $6
       WHERE id = $7`,
      [finalStatus, totalScanned, totalCreated, totalUpdated, totalFailed, errorMsg, logId]
    );

    return resultSummary;
  })();

  try {
    return await syncInFlight;
  } catch (err) {
    globalSyncStatus.isSyncing = false;
    globalSyncStatus.lastError = err.message || 'Sync failed';
    throw err;
  } finally {
    syncInFlight = null;
  }
};

const startGrowthGuideAutoSync = () => {
  if (!SYNC_ENABLED) {
    console.log('[growth-guide-sync] automatic sync disabled');
    return;
  }

  if (syncTimer) clearInterval(syncTimer);

  setTimeout(() => {
    void syncImportedGrowthGuides().catch((error) => {
      console.error('[growth-guide-sync] startup sync failed:', error.message || error);
    });
  }, STARTUP_DELAY_MS);

  syncTimer = setInterval(() => {
    void syncImportedGrowthGuides().catch((error) => {
      console.error('[growth-guide-sync] scheduled sync failed:', error.message || error);
    });
  }, SYNC_INTERVAL_HOURS * 60 * 60 * 1000);

  if (typeof syncTimer.unref === 'function') syncTimer.unref();

  console.log(`[growth-guide-sync] automatic sync scheduled every ${SYNC_INTERVAL_HOURS} hour(s)`);
};

const getScrapeSyncStatus = () => {
  return globalSyncStatus;
};

module.exports = {
  ensureGrowthGuideSchema,
  syncImportedGrowthGuides,
  startGrowthGuideAutoSync,
  getScrapeSyncStatus,
};
