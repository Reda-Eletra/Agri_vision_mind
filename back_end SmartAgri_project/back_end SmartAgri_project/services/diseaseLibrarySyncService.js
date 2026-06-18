const pool = require('../config/database');
const fs = require('fs/promises');
const path = require('path');
const cheerio = require('cheerio');

const PLANTIX_SOURCE = {
  name: 'Plantix',
  language: 'ar',
  homepage: 'https://plantix.net/ar/library/plant-diseases/',
  baseUrl: 'https://plantix.net/ar/library/',
};

const SYNC_ENABLED = (process.env.DISEASE_LIBRARY_SYNC_ENABLED || 'true').toLowerCase() !== 'false';
const SYNC_INTERVAL_MINUTES = Math.max(30, parseInt(process.env.DISEASE_LIBRARY_SYNC_INTERVAL_MINUTES || '360', 10) || 360);
const STARTUP_DELAY_MS = Math.max(1000, parseInt(process.env.DISEASE_LIBRARY_SYNC_STARTUP_DELAY_MS || '8000', 10) || 8000);
const parseMaxSyncItems = () => {
  const rawValue = process.env.DISEASE_LIBRARY_SYNC_MAX_ITEMS;
  if (rawValue == null || rawValue.trim() === '') return 0;

  const parsedValue = parseInt(rawValue, 10);
  return Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0;
};
const MAX_SYNC_ITEMS = parseMaxSyncItems();
const IMAGE_DOWNLOAD_CONCURRENCY = 8;
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'disease-library');
const PUBLIC_UPLOAD_PATH = '/uploads/disease-library';

let syncTimer = null;
let syncInFlight = null;

const ENTITY_MAP = {
  '&q;': '"',
  '&a;': '&',
  '&s;': "'",
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
    .replace(/\\/g, '')
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const unique = (values) => [...new Set(values.filter(Boolean))];

const compactList = (values, max = 8) =>
  unique(
    values
      .flatMap((value) => String(value || '').split(/\n+/))
      .map(normalizeWhitespace)
      .filter((value) => value.length >= 4)
  ).slice(0, max);

const summarize = (text = '', maxLength = 420) => {
  const cleaned = normalizeWhitespace(text);
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trim()}...`;
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

const slugifyPlantixName = (name = '') => {
  const slug = normalizeWhitespace(name)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'plant-disease';
};

const fetchHtmlOnce = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'accept-language': 'ar,en-US;q=0.9,en;q=0.8',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) throw createHttpError(response.status, url);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const fetchHtml = async (url) => {
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fetchHtmlOnce(url);
    } catch (error) {
      lastError = error;
      if (isHttpStatus(error, 404)) break;

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
  }

  throw lastError;
};

const fetchImage = async (url) => {
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
          accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });

      if (!response.ok) throw createHttpError(response.status, url);
      return {
        buffer: Buffer.from(await response.arrayBuffer()),
        contentType: response.headers.get('content-type') || '',
      };
    } catch (error) {
      lastError = error;
      if (isHttpStatus(error, 404)) break;

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
};

const decodePlantixIndexHtml = (html) =>
  decodeHtmlEntities(html);

const findJsonObjectEnd = (text, start) => {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }

  return -1;
};

const findJsonArrayEnd = (text, start) => {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }

  return -1;
};

const parsePlantixArray = (decodedHtml, key) => {
  const keyIndex = decodedHtml.indexOf(`"${key}"`);
  if (keyIndex === -1) return [];

  const start = decodedHtml.indexOf('[', keyIndex);
  if (start === -1) return [];

  const end = findJsonArrayEnd(decodedHtml, start);
  if (end === -1) return [];

  try {
    return JSON.parse(decodedHtml.slice(start, end));
  } catch {
    return [];
  }
};

const normalizeHostIds = (hostIds) =>
  (Array.isArray(hostIds) ? hostIds : [])
    .map((host) => normalizeWhitespace(host).toLowerCase())
    .filter((host) => /^[a-z][a-z_]{1,40}$/.test(host));

const buildHostsByDiseaseId = (allHosts) => {
  const hostsByDiseaseId = new Map();

  for (const host of allHosts) {
    const hostId = normalizeHostIds([host.id])[0];
    if (!hostId || !Array.isArray(host.pathogen_ids)) continue;

    for (const diseaseId of host.pathogen_ids) {
      const id = String(diseaseId);
      const currentHosts = hostsByDiseaseId.get(id) || [];
      currentHosts.push(hostId);
      hostsByDiseaseId.set(id, currentHosts);
    }
  }

  return hostsByDiseaseId;
};

const plantixRecordToDisease = (rawRecord, hostsByDiseaseId) => {
  const id = String(rawRecord.id || '');
  const bulletPoints = compactList(Array.isArray(rawRecord.bullet_points) ? rawRecord.bullet_points : [], 10);
  const name = normalizeWhitespace(rawRecord.name);
  const nameEn = normalizeWhitespace(rawRecord.name_en);
  const pathogenClass = normalizeWhitespace(rawRecord.pathogen_class).toLowerCase() || 'plant-disease';
  const sourceHosts = normalizeHostIds(rawRecord.host_ids);
  const filterHosts = hostsByDiseaseId.get(id) || [];
  const slug = slugifyPlantixName(nameEn || name);
  const sourceImageName = rawRecord.default_image ? decodeHtmlEntities(rawRecord.default_image) : '';
  const sourceImageUrl = sourceImageName ? `https://content.peat-cloud.com/thumbnails/${sourceImageName}` : null;

  return {
    id,
    name: name || nameEn || `Plantix disease ${id}`,
    nameEn,
    scientificName: normalizeWhitespace(rawRecord.scientific_name),
    sourceUrl: toAbsoluteUrl(`plant-diseases/${id}/${slug}/`, PLANTIX_SOURCE.baseUrl),
    imageUrl: sourceImageUrl,
    category: pathogenClass,
    hosts: unique([...filterHosts, ...sourceHosts]),
    symptoms: bulletPoints,
    description: summarize(bulletPoints.join(' ') || name || nameEn),
  };
};

const parsePlantixEmbeddedRecords = (html) => {
  const decoded = decodePlantixIndexHtml(html);
  const pathogenList = parsePlantixArray(decoded, 'pathogen-list');
  const hostsByDiseaseId = buildHostsByDiseaseId(parsePlantixArray(decoded, 'all-hosts'));
  const records = [];
  const seenIds = new Set();

  for (const rawRecord of pathogenList) {
    const record = plantixRecordToDisease(rawRecord, hostsByDiseaseId);
    const { id } = record;
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    records.push(record);
  }

  if (records.length > 0) {
    return MAX_SYNC_ITEMS > 0 ? records.slice(0, MAX_SYNC_ITEMS) : records;
  }

  let cursor = 0;
  while (cursor < decoded.length) {
    const start = decoded.indexOf('{"bullet_points"', cursor);
    if (start === -1) break;

    const end = findJsonObjectEnd(decoded, start);
    cursor = end > start ? end : start + 1;
    if (end === -1) continue;

    let rawRecord;
    try {
      rawRecord = JSON.parse(decoded.slice(start, end));
    } catch {
      continue;
    }

    const record = plantixRecordToDisease(rawRecord, hostsByDiseaseId);
    const { id } = record;
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    records.push(record);
  }

  return MAX_SYNC_ITEMS > 0 ? records.slice(0, MAX_SYNC_ITEMS) : records;
};

const imageExtension = (url, contentType) => {
  if (/png/i.test(contentType)) return 'png';
  if (/webp/i.test(contentType)) return 'webp';
  if (/svg/i.test(contentType)) return 'svg';
  const match = String(url || '').match(/\.([a-z0-9]{3,4})(?:\?|$)/i);
  return match?.[1]?.toLowerCase() || 'jpg';
};

const localImagePath = (disease, extension) => {
  const slug = slugifyPlantixName(disease.nameEn || disease.name);
  const filename = `${disease.sourceArticleId}-${slug}.${extension}`;
  return {
    filePath: path.join(UPLOAD_DIR, filename),
    publicPath: `${PUBLIC_UPLOAD_PATH}/${filename}`,
  };
};

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const mapWithConcurrency = async (items, concurrency, worker) => {
  const results = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  });

  await Promise.all(workers);
  return results;
};

const cacheDiseaseImage = async (disease) => {
  if (!disease.imageUrl) return { disease, status: 'missing' };

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const defaultTarget = localImagePath(disease, imageExtension(disease.imageUrl, ''));

  if (await fileExists(defaultTarget.filePath)) {
    return { disease: { ...disease, imageUrl: defaultTarget.publicPath }, status: 'reused' };
  }

  const downloadedImage = await fetchImage(disease.imageUrl);
  const target = localImagePath(disease, imageExtension(disease.imageUrl, downloadedImage.contentType));
  await fs.writeFile(target.filePath, downloadedImage.buffer);
  return { disease: { ...disease, imageUrl: target.publicPath }, status: 'downloaded' };
};

const cacheDiseaseImages = async (diseases) => {
  const imageStats = { downloaded: 0, reused: 0, failed: 0, missing: 0 };
  const imageResults = await mapWithConcurrency(diseases, IMAGE_DOWNLOAD_CONCURRENCY, async (disease) => {
    try {
      return await cacheDiseaseImage(disease);
    } catch (error) {
      console.error(`[disease-library-sync] image failed for ${disease.sourceUrl}:`, error.message || error);
      return { disease, status: 'failed' };
    }
  });

  imageResults.forEach((result) => {
    imageStats[result.status] += 1;
  });

  return {
    diseases: imageResults.map((result) => result.disease),
    imageStats,
  };
};

const parseDiseaseDetailHtml = (html) => {
  const $ = cheerio.load(html);
  
  let symptoms = [];
  let treatment = [];
  let prevention = [];

  $('.card.collapsible').each((i, el) => {
    const h2Text = $(el).find('h2').text().trim();
    
    // Check if Symptoms
    if (h2Text.includes('الأعراض') || $(el).hasClass('symptoms')) {
      $(el).find('p, li').each((_, item) => {
        const text = normalizeWhitespace($(item).text());
        if (text && !symptoms.includes(text)) {
          symptoms.push(text);
        }
      });
    }
    
    // Check if Biological/Organic Control
    if (
      h2Text.includes('المكافحه العضوية') || 
      h2Text.includes('المكافحة العضوية') || 
      h2Text.includes('المكافحة الحيوية') || 
      h2Text.includes('المكافحه الحيويه')
    ) {
      $(el).find('p, li').each((_, item) => {
        const text = normalizeWhitespace($(item).text());
        if (text && !treatment.includes(text)) {
          treatment.push(text);
        }
      });
    }
    
    // Check if Chemical Control
    if (
      h2Text.includes('المكافحة الكيميائية') || 
      h2Text.includes('المكافحه الكيميائيه') || 
      $(el).hasClass('chemical-control')
    ) {
      $(el).find('p, li').each((_, item) => {
        const text = normalizeWhitespace($(item).text());
        if (text && !treatment.includes(text)) {
          treatment.push(text);
        }
      });
    }
    
    // Check if Prevention
    if (
      h2Text.includes('اجراءات وقائية') || 
      h2Text.includes('إجراءات وقائية') || 
      h2Text.includes('الوقاية')
    ) {
      $(el).find('li, p').each((_, item) => {
        const text = normalizeWhitespace($(item).text());
        if (text && !prevention.includes(text)) {
          prevention.push(text);
        }
      });
    }
  });

  return { symptoms, treatment, prevention };
};

const extractPlantixDiseases = async () => {
  const html = await fetchHtml(PLANTIX_SOURCE.homepage);
  const basicRecords = parsePlantixEmbeddedRecords(html)
    .filter((record) => record.sourceUrl && record.name && record.description)
    .map((record) => ({
      name: record.name,
      description: record.description,
      symptoms: record.symptoms,
      treatment: [],
      prevention: [],
      imageUrl: record.imageUrl,
      category: record.category,
      hosts: record.hosts,
      scientificName: record.scientificName,
      nameEn: record.nameEn,
      language: PLANTIX_SOURCE.language,
      sourceName: PLANTIX_SOURCE.name,
      sourceUrl: record.sourceUrl,
      sourceArticleId: record.id,
    }));

  const itemsToScrape = MAX_SYNC_ITEMS > 0 ? basicRecords.slice(0, MAX_SYNC_ITEMS) : basicRecords;
  const syncLimitLabel = MAX_SYNC_ITEMS > 0 ? String(MAX_SYNC_ITEMS) : 'all';
  console.log(`[disease-library-sync] Scraped ${basicRecords.length} basic disease records from index. Fetching detail pages (limit: ${syncLimitLabel})...`);

  const CONCURRENCY = 5;
  const REQUEST_DELAY_MS = 150;
  
  for (let i = 0; i < itemsToScrape.length; i += CONCURRENCY) {
    const chunk = itemsToScrape.slice(i, i + CONCURRENCY);
    const promises = chunk.map(async (disease) => {
      try {
        const detailHtml = await fetchHtml(disease.sourceUrl);
        const details = parseDiseaseDetailHtml(detailHtml);
        
        if (details.symptoms && details.symptoms.length > 0) {
          disease.symptoms = details.symptoms;
        }
        if (details.treatment && details.treatment.length > 0) {
          disease.treatment = details.treatment;
        }
        if (details.prevention && details.prevention.length > 0) {
          disease.prevention = details.prevention;
        }
      } catch (err) {
        if (isHttpStatus(err, 404)) {
          console.warn(`[disease-library-sync] Skipped missing details for ${disease.name} (${disease.sourceUrl}): HTTP 404`);
          return;
        }

        console.error(`[disease-library-sync] Failed to scrape details for ${disease.name} (${disease.sourceUrl}):`, err.message || err);
      }
    });

    await Promise.all(promises);

    if (i + CONCURRENCY < itemsToScrape.length) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    }
  }

  return itemsToScrape;
};

const removeUnsupportedDiseaseSources = async () => {
  await pool.query(
    `DELETE FROM disease_library
     WHERE COALESCE(source_name, '') <> $1 OR COALESCE(language, '') <> $2`,
    [PLANTIX_SOURCE.name, PLANTIX_SOURCE.language]
  );
};

const upsertImportedDisease = async (disease) => {
  const existing = await pool.query(
    'SELECT id FROM disease_library WHERE source_url = $1',
    [disease.sourceUrl]
  );

  const params = [
    disease.name,
    disease.description,
    JSON.stringify(disease.symptoms || []),
    JSON.stringify(disease.treatment || []),
    JSON.stringify(disease.prevention || []),
    disease.imageUrl,
    disease.category,
    JSON.stringify(disease.hosts || []),
    disease.language,
    disease.sourceName,
    disease.sourceUrl,
    disease.sourceArticleId,
    disease.scientificName,
  ];

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO disease_library
         (name, description, symptoms_json, treatment_json, prevention_json, image_url,
          category, hosts_json, language, source_name, source_url, source_article_id, scientific_name, is_imported)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE)`,
      params
    );
    return 'created';
  }

  await pool.query(
    `UPDATE disease_library SET
       name = $1,
       description = $2,
       symptoms_json = $3,
       treatment_json = $4,
       prevention_json = $5,
       image_url = COALESCE($6, image_url),
       category = COALESCE($7, category),
       hosts_json = $8,
       language = $9,
       source_name = $10,
       source_article_id = COALESCE($12, source_article_id),
       scientific_name = COALESCE($13, scientific_name),
       is_imported = TRUE,
       updated_at = NOW()
     WHERE source_url = $11`,
    params
  );
  return 'updated';
};

const syncPlantixArabic = async () => {
  const extractedDiseases = await extractPlantixDiseases();
  const { diseases, imageStats } = await cacheDiseaseImages(extractedDiseases);
  let created = 0;
  let updated = 0;
  let failed = 0;

  await removeUnsupportedDiseaseSources();

  for (const disease of diseases) {
    try {
      const result = await upsertImportedDisease(disease);
      if (result === 'created') created += 1;
      else updated += 1;
    } catch (error) {
      failed += 1;
      console.error(`[disease-library-sync] Plantix failed for ${disease.sourceUrl}:`, error.message || error);
    }
  }

  return {
    source: `${PLANTIX_SOURCE.name} (${PLANTIX_SOURCE.language})`,
    scanned: diseases.length,
    created,
    updated,
    failed,
    images: imageStats,
  };
};

const ensureDiseaseLibrarySchema = async () => {
  const tableCheck = await pool.query(`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'disease_library'
    LIMIT 1;
  `);

  if (tableCheck.rows.length === 0) {
    throw new Error('Disease library schema is missing. Run npm run db:migrate before synchronization.');
  }
};

const syncImportedDiseaseLibrary = async () => {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    await ensureDiseaseLibrarySchema();
    const result = await syncPlantixArabic();

    return {
      scanned: result.scanned,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
      images: result.images,
      perSource: [result],
      syncedAt: new Date().toISOString(),
    };
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
};

const startDiseaseLibraryAutoSync = () => {
  if (!SYNC_ENABLED) {
    console.log('[disease-library-sync] automatic sync disabled');
    return;
  }

  if (syncTimer) clearInterval(syncTimer);

  setTimeout(() => {
    void syncImportedDiseaseLibrary().catch((error) => {
      console.error('[disease-library-sync] startup sync failed:', error.message || error);
    });
  }, STARTUP_DELAY_MS);

  syncTimer = setInterval(() => {
    void syncImportedDiseaseLibrary().catch((error) => {
      console.error('[disease-library-sync] scheduled sync failed:', error.message || error);
    });
  }, SYNC_INTERVAL_MINUTES * 60 * 1000);

  if (typeof syncTimer.unref === 'function') syncTimer.unref();

  console.log(`[disease-library-sync] automatic sync scheduled every ${SYNC_INTERVAL_MINUTES} minute(s)`);
};

module.exports = {
  ensureDiseaseLibrarySchema,
  syncImportedDiseaseLibrary,
  startDiseaseLibraryAutoSync,
};
