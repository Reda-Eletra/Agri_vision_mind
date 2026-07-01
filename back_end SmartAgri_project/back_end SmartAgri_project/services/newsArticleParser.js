const cheerio = require('cheerio');

const ARABIC_MONTHS = {
  '\u064a\u0646\u0627\u064a\u0631': 1,
  '\u0641\u0628\u0631\u0627\u064a\u0631': 2,
  '\u0645\u0627\u0631\u0633': 3,
  '\u0623\u0628\u0631\u064a\u0644': 4,
  '\u0627\u0628\u0631\u064a\u0644': 4,
  '\u0645\u0627\u064a\u0648': 5,
  '\u064a\u0648\u0646\u064a\u0648': 6,
  '\u064a\u0648\u0644\u064a\u0648': 7,
  '\u0623\u063a\u0633\u0637\u0633': 8,
  '\u0627\u063a\u0633\u0637\u0633': 8,
  '\u0633\u0628\u062a\u0645\u0628\u0631': 9,
  '\u0623\u0643\u062a\u0648\u0628\u0631': 10,
  '\u0627\u0643\u062a\u0648\u0628\u0631': 10,
  '\u0646\u0648\u0641\u0645\u0628\u0631': 11,
  '\u062f\u064a\u0633\u0645\u0628\u0631': 12,
};

const BOILERPLATE_PATTERN =
  /\u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0642 \u0645\u062d\u0641\u0648\u0638\u0629|\u0631\u0626\u064a\u0633 \u0627\u0644\u062a\u062d\u0631\u064a\u0631|\u0644\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a|\u0627\u062a\u0635\u0644 \u0628\u0646\u0627|\u062a\u0627\u0628\u0639\u0646\u0627 \u0639\u0644\u0649|\u0643\u0644\u0645\u0627\u062a \u0627\u0644\u0628\u062d\u062b|\u0645\u0648\u0627\u0636\u064a\u0639 \u0645\u062a\u0639\u0644\u0642\u0629|\u0623\u062e\u0628\u0627\u0631 \u0627\u0644\u0633\u0627\u0639\u0629|\u062a\u0639\u0644\u064a\u0642 \u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629|\u0627\u0642\u0631\u0623 \u0623\u064a\u0636\u0627|\u0627\u0642\u0631\u0623 \u0627\u0644\u0645\u0632\u064a\u062f|\u0634\u0627\u0631\u0643|related|comments?|advert/i;
const AUTHOR_PATTERN =
  /^(?:\u0643\u062a\u0628|\u0643\u062a\u0628\u062a|\u0628\u0642\u0644\u0645|\u0625\u0639\u062f\u0627\u062f|\u0627\u0639\u062f\u0627\u062f|\u062a\u0635\u0648\u064a\u0631|by)\s*[:\uff1a]?\s*/i;

const GENERIC_BODY_SELECTORS = [
  '[itemprop="articleBody"]',
  '.article-body',
  '.article-content',
  '.article-text',
  '.articleText',
  '.entry-content',
  '.post-content',
  '.news-details .brief',
  '.news-details',
  '.newsDetails',
  '.news-article',
  '.story-body',
  '.articlebody',
  '.articleBody',
  '.article-wrapper',
  '.details',
  '.details-content',
  '.content-details',
  '#ctl00_ContentPlaceHolder1_divContent',
  'article',
];

const NON_CONTENT_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'form',
  'nav',
  'aside',
  'header',
  'footer',
  '.comment',
  '.comments',
  '.sidebar',
  '.side-bar',
  '.related',
  '.related-posts',
  '.share',
  '.sharing',
  '.social',
  '.ads',
  '.ad',
  '.advertisement',
  '.breadcrumb',
  '.pagination',
  '.tags',
  '.read-more',
  '.most-read',
  '.also-read',
  '[class*="advert"]',
  '[id*="advert"]',
  '[class*="sidebar"]',
  '[id*="sidebar"]',
  '[class*="related"]',
  '[id*="related"]',
].join(',');

const normalizeWhitespace = (text = '') =>
  String(text || '')
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const paragraphText = (text = '') =>
  normalizeWhitespace(text)
    .replace(/\n+/g, ' ')
    .trim();

const summarize = (text = '', maxLength = 280) => {
  const cleanedText = paragraphText(text);
  if (cleanedText.length <= maxLength) return cleanedText;
  return `${cleanedText.slice(0, maxLength - 1).trim()}...`;
};

const absoluteUrl = (url, baseUrl) => {
  if (!url || /^data:/i.test(String(url))) return null;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return null;
  }
};

const srcsetUrls = (srcset = '') =>
  String(srcset || '')
    .split(',')
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean);

const imageAttributes = ($image) => [
  $image.attr('data-src'),
  $image.attr('data-original'),
  $image.attr('data-lazy-src'),
  $image.attr('data-lazy'),
  $image.attr('data-image'),
  $image.attr('data-img'),
  $image.attr('src'),
  ...srcsetUrls($image.attr('data-srcset')),
  ...srcsetUrls($image.attr('srcset')),
].filter(Boolean);

const metaContent = ($, names) => {
  for (const name of names) {
    const content = $(`meta[property="${name}"], meta[name="${name}"]`).first().attr('content');
    if (content) return paragraphText(content);
  }
  return null;
};

const flattenJsonLd = (structuredEntry) => {
  if (Array.isArray(structuredEntry)) return structuredEntry.flatMap(flattenJsonLd);
  if (!structuredEntry || typeof structuredEntry !== 'object') return [];
  const graphEntries = Array.isArray(structuredEntry['@graph'])
    ? structuredEntry['@graph'].flatMap(flattenJsonLd)
    : [];
  return [structuredEntry, ...graphEntries];
};

const jsonLdEntries = ($) => {
  const entries = [];
  $('script[type="application/ld+json"]').each((_index, scriptElement) => {
    const rawJson = $(scriptElement).html()?.trim();
    if (!rawJson) return;
    try {
      entries.push(...flattenJsonLd(JSON.parse(rawJson)));
    } catch {
      // Optional structured data can be malformed; the DOM parser remains the source of truth.
    }
  });
  return entries;
};

const articleEntry = (entries) =>
  entries.find((structuredEntry) => {
    const entryType = structuredEntry['@type'];
    const types = Array.isArray(entryType) ? entryType : [entryType];
    return types.some((type) => /article|newsarticle/i.test(String(type || '')));
  }) || null;

const cleanAuthorName = (value) => {
  const text = paragraphText(value).replace(AUTHOR_PATTERN, '').trim();
  if (!text || text.length > 100 || BOILERPLATE_PATTERN.test(text)) return null;
  return text;
};

const structuredAuthor = (structuredArticle) => {
  const author = structuredArticle?.author;
  if (!author) return null;
  const authorValue = Array.isArray(author) ? author[0] : author;
  if (typeof authorValue === 'string') return cleanAuthorName(authorValue);
  return cleanAuthorName(authorValue?.name);
};

const articleAuthor = ($, structuredArticle) => {
  const metadataAuthor = metaContent($, [
    'author',
    'article:author',
    'parsely-author',
    'sailthru.author',
    'byl',
  ]);
  const selectorAuthor = [
    '[rel="author"]',
    '[itemprop="author"]',
    '.author',
    '.writer',
    '.byline',
    '.article-author',
    '.news-author',
  ]
    .map((selector) => cleanAuthorName($(selector).first().text()))
    .find(Boolean);
  return cleanAuthorName(metadataAuthor) || structuredAuthor(structuredArticle) || selectorAuthor;
};

const usableParagraphs = ($, container) => {
  const paragraphs = [];
  container.find(NON_CONTENT_SELECTORS).remove();

  container.find('p, li, h2, h3, blockquote').each((_index, textElement) => {
    const text = paragraphText($(textElement).text());
    if (text.length < 20 || BOILERPLATE_PATTERN.test(text) || AUTHOR_PATTERN.test(text)) return;
    if (!paragraphs.includes(text)) paragraphs.push(text);
  });

  if (paragraphs.length > 0) return paragraphs;
  const fallbackText = paragraphText(container.text());
  return fallbackText.length >= 80 && !BOILERPLATE_PATTERN.test(fallbackText) ? [fallbackText] : [];
};

const selectorBodyCandidates = ($, selectors) => {
  const candidates = [];
  for (const selector of selectors) {
    $(selector).each((_index, bodyElement) => {
      const paragraphs = usableParagraphs($, $(bodyElement).clone());
      const content = paragraphs.join('\n\n');
      if (content.length >= 80) candidates.push({ content, paragraphs, element: $(bodyElement) });
    });
  }
  return candidates;
};

const jsonLdBodyCandidate = (structuredArticle) => {
  const articleBody = structuredArticle?.articleBody;
  if (typeof articleBody !== 'string') return null;

  const paragraphs = normalizeWhitespace(articleBody)
    .split(/\n{2,}/)
    .map(paragraphText)
    .filter((text) => text.length >= 20 && !BOILERPLATE_PATTERN.test(text) && !AUTHOR_PATTERN.test(text));
  const content = paragraphs.join('\n\n');
  return content.length >= 80 ? { content, paragraphs } : null;
};

const longestBodyCandidate = ($, source, structuredArticle) => {
  const selectors = [...(source.bodySelectors || []), ...GENERIC_BODY_SELECTORS];
  const candidates = selectorBodyCandidates($, selectors);
  const structuredCandidate = jsonLdBodyCandidate(structuredArticle);
  if (structuredCandidate) candidates.push(structuredCandidate);
  return candidates.sort((left, right) => right.content.length - left.content.length)[0] || null;
};

const articleTitle = ($, structuredArticle) =>
  paragraphText(
    metaContent($, ['og:title', 'twitter:title']) ||
    structuredArticle?.headline ||
    $('h1').first().text() ||
    $('title').first().text()
  )
    .replace(/\s*[-|]\s*(?:\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0623\u0647\u0631\u0627\u0645 \u0627\u0644\u0632\u0631\u0627\u0639\u064a|\u0627\u0644\u0623\u0647\u0631\u0627\u0645 \u0627\u0644\u0632\u0631\u0627\u0639\u064a|\u0639\u0627\u0644\u0645 \u0627\u0644\u0632\u0631\u0627\u0639\u0629|\u0623\u062e\u0628\u0627\u0631 \u0627\u0644\u064a\u0648\u0645)\s*$/i, '')
    .trim() || null;

const articleSummary = ($, structuredArticle, bodyCandidate, title) => {
  const metadataSummary = metaContent($, ['og:description', 'description', 'twitter:description']);
  const firstParagraph = bodyCandidate?.paragraphs[0];
  const summarySource = metadataSummary && metadataSummary !== title
    ? metadataSummary
    : firstParagraph || structuredArticle?.description || title;
  return summarize(summarySource, 260);
};

const structuredImageUrls = (structuredArticle) => {
  const image = structuredArticle?.image;
  if (!image) return [];
  if (typeof image === 'string') return [image];
  if (Array.isArray(image)) return image.flatMap((entry) => structuredImageUrls({ image: entry }));
  return [image.url, image.contentUrl].filter(Boolean);
};

const imageQualityScore = (url) => {
  const lower = String(url || '').toLowerCase();
  if (/logo|icon|avatar|sprite|placeholder|default|loading|blank/.test(lower)) return -1000;
  const dimensions = [...lower.matchAll(/(?:w|width|h|height)[=_-](\d{2,5})/g)].map((match) => Number(match[1]));
  const filenameDimensions = lower.match(/(\d{3,5})[x_-](\d{3,5})/);
  const sizeScore = dimensions.reduce((total, value) => total + value, 0)
    + (filenameDimensions ? Number(filenameDimensions[1]) + Number(filenameDimensions[2]) : 0);
  return sizeScore + (/\.(jpe?g|png|webp)(?:[?#].*)?$/i.test(lower) ? 100 : 0);
};

const collectImageUrls = ($, source, structuredArticle, articleUrl, bodyCandidate) => {
  const urls = [
    metaContent($, ['og:image:secure_url', 'og:image', 'twitter:image']),
    ...structuredImageUrls(structuredArticle),
  ];

  const imageSelectors = [
    ...(source.imageSelectors || []),
    '[itemprop="articleBody"] img',
    'article img',
    '.news-details img',
    '.details img',
    '.articlebody img',
    '.articleBody img',
    '.brief img',
  ];

  for (const selector of imageSelectors) {
    $(selector).each((_index, imageElement) => {
      urls.push(...imageAttributes($(imageElement)));
    });
  }

  bodyCandidate?.element?.find('img').each((_index, imageElement) => {
    urls.push(...imageAttributes($(imageElement)));
  });

  return [...new Set(
    urls
      .map((url) => absoluteUrl(url, articleUrl))
      .filter(Boolean)
      .filter((url) => imageQualityScore(url) > -1000)
  )].sort((left, right) => imageQualityScore(right) - imageQualityScore(left));
};

const normalizeDigits = (value = '') =>
  String(value)
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));

const parsedDate = (dateValue) => {
  if (!dateValue) return null;
  const date = new Date(normalizeDigits(dateValue));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const arabicDate = (pageText) => {
  const normalizedText = normalizeDigits(pageText);
  const match = normalizedText.match(
    /(\d{1,2})\s+([\u0621-\u064aA-Za-z]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*([\u0635\u0645APMapm.]+)?)?/
  );
  if (!match) return null;

  const [, day, monthLabel, year, hourText = '0', minuteText = '0', meridiemText = ''] = match;
  const month = ARABIC_MONTHS[monthLabel];
  if (!month) return null;

  let hour = Number(hourText);
  const meridiem = meridiemText.toLowerCase();
  if ((meridiem.includes('\u0645') || meridiem.includes('pm')) && hour < 12) hour += 12;
  if ((meridiem.includes('\u0635') || meridiem.includes('am')) && hour === 12) hour = 0;
  return new Date(Date.UTC(Number(year), month - 1, Number(day), hour, Number(minuteText))).toISOString();
};

const articlePublishedAt = ($, structuredArticle) => {
  const metadataDate = metaContent($, [
    'article:published_time',
    'og:published_time',
    'datePublished',
    'pubdate',
  ]);
  const directDate = parsedDate(
    metadataDate ||
    structuredArticle?.datePublished ||
    structuredArticle?.dateCreated ||
    $('time[datetime]').first().attr('datetime')
  );
  return directDate || arabicDate(paragraphText($.root().text())) || new Date().toISOString();
};

const articleCategory = ($, source) =>
  paragraphText(
    metaContent($, ['article:section', 'section']) ||
    $('[itemprop="articleSection"]').first().text() ||
    $('.breadcrumb a, .breadcrumbs a').last().text()
  ).toLowerCase() || source.defaultCategory;

const sourceArticleId = (articleUrl) => {
  try {
    const pathname = new URL(articleUrl).pathname;
    return pathname.match(/\/News\/(\d+)/i)?.[1]
      || pathname.match(/\/news\/(?:newdetails|newsdetails)\/(\d+)/i)?.[1]
      || pathname.match(/(\d{4,})/)?.[1]
      || null;
  } catch {
    return articleUrl.match(/(\d{4,})/)?.[1] || null;
  }
};

const parseNewsArticle = (html, source, articleUrl) => {
  const $ = cheerio.load(html);
  const structuredArticle = articleEntry(jsonLdEntries($));
  const title = articleTitle($, structuredArticle);
  if (!title) return null;

  const authorName = articleAuthor($, structuredArticle);
  const bodyCandidate = longestBodyCandidate($, source, structuredArticle);
  const summary = articleSummary($, structuredArticle, bodyCandidate, title);
  const content = bodyCandidate?.content || summary;
  const imageUrls = collectImageUrls($, source, structuredArticle, articleUrl, bodyCandidate);

  return {
    title,
    summary,
    content,
    imageUrl: imageUrls[0] || null,
    imageUrls,
    authorName,
    category: articleCategory($, source),
    publishedAt: articlePublishedAt($, structuredArticle),
    source: source.name,
    sourceUrl: articleUrl,
    sourceArticleId: sourceArticleId(articleUrl),
  };
};

module.exports = { parseNewsArticle };
