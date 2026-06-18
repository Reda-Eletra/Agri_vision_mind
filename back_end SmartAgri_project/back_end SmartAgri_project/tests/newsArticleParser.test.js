const assert = require('node:assert/strict');
const { test } = require('node:test');
const { parseNewsArticle } = require('../services/newsArticleParser');

test('truncated structured body does not replace the full article DOM content', () => {
  const article = parseNewsArticle(
    `
      <html>
        <head>
          <meta property="og:title" content="خبر زراعي مهم">
          <script type="application/ld+json">
            {
              "@type": "NewsArticle",
              "headline": "خبر زراعي مهم",
              "articleBody": "هذا نص مختصر داخل البيانات المنظمة ولا يمثل تفاصيل الخبر الكاملة المنشورة في الصفحة."
            }
          </script>
        </head>
        <body>
          <div id="article-content">
            <p>الفقرة الأولى تحتوي على تفاصيل الخبر الزراعي الكاملة وتشرح سياقه للمزارعين بصورة واضحة.</p>
            <p>الفقرة الثانية تضيف معلومات تنفيذية مهمة وتوصيات عملية مرتبطة بالخبر المنشور.</p>
            <p>الفقرة الثالثة تكمل التصريحات والنتائج بدل الاكتفاء بالمقدمة المختصرة فقط.</p>
          </div>
        </body>
      </html>
    `,
    {
      name: 'Test Source',
      baseUrl: 'https://example.com/',
      bodySelectors: ['#article-content'],
      defaultCategory: 'agri',
    },
    'https://example.com/News/42'
  );

  assert.match(article.content, /الفقرة الثالثة/);
  assert.ok(article.content.length > 200);
  assert.equal(article.sourceArticleId, '42');
});

test('source body selector excludes author and page boilerplate from article content', () => {
  const article = parseNewsArticle(
    `
      <html>
        <head><title>تحديث الصادرات الزراعية</title></head>
        <body>
          <div class="article-wrapper news-details">
            <div class="brief">
              <p>كتب: محرر الموقع</p>
              <p>أعلنت الجهات المختصة مجموعة جديدة من الإجراءات المنظمة لتصدير المحاصيل الزراعية.</p>
              <p>وتشمل الإجراءات توضيحات للمزارعين والمصدرين حول الفحص والتعبئة ومواعيد التقديم.</p>
            </div>
          </div>
          <footer><p>جميع الحقوق محفوظة للموقع</p></footer>
        </body>
      </html>
    `,
    {
      name: 'Agriculture Egypt',
      baseUrl: 'https://example.com/',
      bodySelectors: ['.article-wrapper.news-details .brief'],
      defaultCategory: 'agri',
    },
    'https://example.com/News/73/article'
  );

  assert.match(article.content, /الفحص والتعبئة/);
  assert.doesNotMatch(article.content, /محرر الموقع|جميع الحقوق/);
});
