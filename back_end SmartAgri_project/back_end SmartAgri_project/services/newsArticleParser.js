const cheerio = require('cheerio');

const ARABIC_MONTHS = {
  يناير: 1,
  فبراير: 2,
  مارس: 3,
  أبريل: 4,
  ابريل: 4,
  مايو: 5,
  يونيو: 6,
  يوليو: 7,
  أغسطس: 8,
  اغسطس: 8,
  سبتمبر: 9,
  أكتوبر: 10,
  اكتوبر: 10,
  نوفمبر: 11,
  ديسمبر: 12,
};

const BOILERPLATE_PATTERN =
  /جميع الحقوق محفوظة|رئيس التحرير|للاشتراكات|اتصل بنا|تابعنا على|كلمات البحث|مواضيع متعلقة|أخبار الساعة|تعليق قيد المراجعة/i;
const AUTHOR_PATTERN = /^(?:كتب|بقلم)\s*[:：]?\s*/i;
const GENERIC_BODY_SELECTORS = [
  '[itemprop="articleBody"]',
  '.article-body',
  '.article-content',
  '.entry-content',
  '.post-content',
  '.news-details .brief',
  '.articlebody',
  '.articleBody',
  '.article-wrapper',
  '.details',
  '#ctl00_ContentPlaceHolder1_divContent',
  'article',
];

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
  return `${cleanedText.slice(0, maxLength - 1).trim()}…`;
};

const absoluteUrl = (url, baseUrl) => {
  if (!url) return null;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return null;
  }
};

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
      // Some publishers emit malformed optional structured data; the DOM remains usable.
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

const usableParagraphs = ($, container) => {
  const paragraphs = [];
  container.find('script, style, noscript, iframe, form, .comment, .comments').remove();

  container.find('p, li, h2, h3, blockquote').each((_index, textElement) => {
    const text = paragraphText($(textElement).text());
    if (text.length < 20 || BOILERPLATE_PATTERN.test(text) || AUTHOR_PATTERN.test(text)) return;
    if (!paragraphs.includes(text)) paragraphs.push(text);
  });

  if (paragraphs.length > 0) return paragraphs;
  const fallbackText = paragraphText(container.text());
  return fallbackText.length >= 80 ? [fallbackText] : [];
};

const selectorBodyCandidates = ($, selectors) => {
  const candidates = [];
  for (const selector of selectors) {
    $(selector).each((_index, bodyElement) => {
      const paragraphs = usableParagraphs($, $(bodyElement).clone());
      const content = paragraphs.join('\n\n');
      if (content.length >= 80) candidates.push({ content, paragraphs });
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
    .filter((text) => text.length >= 20);
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
  ) || null;

const articleSummary = ($, structuredArticle, bodyCandidate, title) => {
  const metadataSummary = metaContent($, ['og:description', 'description', 'twitter:description']);
  const firstParagraph = bodyCandidate?.paragraphs[0];
  const summarySource = metadataSummary && metadataSummary !== title
    ? metadataSummary
    : firstParagraph || structuredArticle?.description || title;
  return summarize(summarySource, 260);
};

const structuredImageUrl = (structuredArticle) => {
  const image = structuredArticle?.image;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return structuredImageUrl({ image: image[0] });
  return image?.url || image?.contentUrl || null;
};

const articleImage = ($, source, structuredArticle, articleUrl) => {
  const metadataImage = metaContent($, ['og:image', 'twitter:image']);
  const selectorImage = (source.imageSelectors || [])
    .map((selector) => $(selector).first().attr('src'))
    .find(Boolean);
  const bodyImage = $('[itemprop="articleBody"] img, article img, .news-details img').first().attr('src');
  return absoluteUrl(
    metadataImage || structuredImageUrl(structuredArticle) || selectorImage || bodyImage,
    articleUrl
  );
};

const parsedDate = (dateValue) => {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const arabicDate = (pageText) => {
  const match = pageText.match(
    /(\d{1,2})\s+([أ-يA-Za-z]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*([صمAPMapm.]+)?)?/
  );
  if (!match) return null;

  const [, day, monthLabel, year, hourText = '0', minuteText = '0', meridiemText = ''] = match;
  const month = ARABIC_MONTHS[monthLabel];
  if (!month) return null;

  let hour = Number(hourText);
  const meridiem = meridiemText.toLowerCase();
  if ((meridiem.includes('م') || meridiem.includes('pm')) && hour < 12) hour += 12;
  if ((meridiem.includes('ص') || meridiem.includes('am')) && hour === 12) hour = 0;
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
    $('[itemprop="articleSection"]').first().text()
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

  const bodyCandidate = longestBodyCandidate($, source, structuredArticle);
  const summary = articleSummary($, structuredArticle, bodyCandidate, title);
  const content = bodyCandidate?.content || summary;

  return {
    title,
    summary,
    content,
    imageUrl: articleImage($, source, structuredArticle, articleUrl),
    category: articleCategory($, source),
    publishedAt: articlePublishedAt($, structuredArticle),
    source: source.name,
    sourceUrl: articleUrl,
    sourceArticleId: sourceArticleId(articleUrl),
  };
};

module.exports = { parseNewsArticle };
