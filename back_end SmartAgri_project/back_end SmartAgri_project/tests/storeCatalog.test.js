const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const request = require('supertest');
const app = require('../app');

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

test('public store endpoint maps Harraz products to the frontend catalog contract', async () => {
  global.fetch = async () => new Response(JSON.stringify([{
    id: 110195,
    name: 'Treated Potting Mix - 3KG',
    permalink: 'https://harraz.shop/shop/potting-mix/',
    short_description: '<p>Ready-to-use <strong>soil blend</strong>.</p>',
    on_sale: true,
    is_purchasable: true,
    is_in_stock: true,
    prices: {
      price: '200',
      regular_price: '225',
      sale_price: '200',
      currency_code: 'EGP',
    },
    categories: [{ id: 71, name: 'Potting Soil', slug: 'potting-soil' }],
    images: [{
      thumbnail: 'https://harraz.shop/product.jpg',
      alt: 'Potting mix',
    }],
  }]), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Total': '565',
      'X-WP-TotalPages': '24',
    },
  });

  const response = await request(app)
    .get('/api/store/products?page=1&limit=24&source=harraz');

  assert.equal(response.status, 200);
  assert.equal(response.body.pagination.total, 565);
  assert.deepEqual(response.body.data[0], {
    id: '110195',
    sourceId: 'harraz',
    name: 'Treated Potting Mix - 3KG',
    description: 'Ready-to-use soil blend.',
    productUrl: 'https://harraz.shop/shop/potting-mix/',
    imageUrl: 'https://harraz.shop/product.jpg',
    imageAlt: 'Potting mix',
    price: 200,
    regularPrice: 225,
    salePrice: 200,
    currency: 'EGP',
    onSale: true,
    inStock: true,
    purchasable: true,
    categories: [{ id: 'harraz:71', name: 'Potting Soil', slug: 'potting-soil' }],
    source: 'Harraz Farm & Garden',
  });
});

test('Harraz HTTP 403 falls back to a local catalog snapshot', async () => {
  global.fetch = async () => new Response('Forbidden', { status: 403 });

  const response = await request(app)
    .get('/api/store/products?page=1&limit=24&source=harraz&search=سماد&lang=ar');

  assert.equal(response.status, 200);
  assert.equal(response.body.data[0].sourceId, 'harraz');
  assert.equal(response.body.data[0].currency, 'EGP');
  assert.match(response.body.data[0].name, /خلطة|زيت|سماد|كمبوست|كوكوبيت|مقص/);
});

test('Orkida products are mapped and cursor pagination reaches the next page', async () => {
  const fetchedUrls = [];
  global.fetch = async (url) => {
    fetchedUrls.push(String(url));
    const isSecondPage = String(url).includes('cursor=next-page');
    const product = isSecondPage
      ? {
        id: '202',
        name: 'Second Orkida product',
        description: 'Second page product',
        url: 'https://orkidastore.com/ar/second/p202',
        image: { url: 'https://cdn.salla.sa/second.png' },
        category: { name: 'الأسمدة الزراعية' },
        price: 120,
        regular_price: 150,
        sale_price: 120,
        is_on_sale: true,
        is_available: true,
        is_out_of_stock: false,
      }
      : {
        id: '101',
        name: 'First Orkida product',
        description: '<p>First <strong>page</strong> product</p>',
        url: 'https://orkidastore.com/ar/first/p101',
        image: { url: 'https://cdn.salla.sa/first.png' },
        category: { name: 'المبيدات الزراعية' },
        price: 89,
        regular_price: 109,
        sale_price: 89,
        is_on_sale: true,
        is_available: true,
        is_out_of_stock: false,
      };

    return new Response(JSON.stringify({
      status: 200,
      success: true,
      data: [product],
      cursor: {
        current: isSecondPage ? 2 : 1,
        next: isSecondPage
          ? null
          : 'https://api.salla.dev/store/v1/products?cursor=next-page',
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const firstPage = await request(app)
    .get('/api/store/products?page=1&limit=2&source=orkida&search=cursor-contract-test');
  const secondPage = await request(app)
    .get('/api/store/products?page=2&limit=2&source=orkida&search=cursor-contract-test');

  assert.equal(firstPage.status, 200);
  assert.equal(firstPage.body.data[0].sourceId, 'orkida');
  assert.equal(firstPage.body.data[0].description, 'First page product');
  assert.equal(firstPage.body.data[0].currency, 'EGP');
  assert.equal(firstPage.body.data[0].price, 1179.25);
  assert.equal(firstPage.body.pagination.hasNext, true);
  assert.equal(secondPage.status, 200);
  assert.equal(secondPage.body.data[0].id, '202');
  assert.equal(secondPage.body.pagination.hasNext, false);
  assert.equal(fetchedUrls.length, 2);
});

test('store categories include namespaced Harraz and Orkida categories', async () => {
  global.fetch = async (url) => {
    if (String(url).includes('sitemap-1.xml')) {
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>
        <urlset>
          <url><loc>https://orkidastore.com/ar/%D8%A7%D9%84%D8%A3%D8%B3%D9%85%D8%AF%D8%A9-%D8%A7%D9%84%D8%B2%D8%B1%D8%A7%D8%B9%D9%8A%D8%A9/c973085470</loc></url>
        </urlset>`, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    return new Response(JSON.stringify([{
      id: 71,
      name: 'Potting Soil',
      slug: 'potting-soil',
      count: 12,
    }]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Total': '1',
        'X-WP-TotalPages': '1',
      },
    });
  };

  const response = await request(app).get('/api/store/categories');

  assert.equal(response.status, 200);
  assert.ok(response.body.data.some((category) => (
    category.id === 'harraz:71'
    && category.sourceId === 'harraz'
  )));
  assert.ok(response.body.data.some((category) => (
    category.id === 'orkida:973085470'
    && category.name === 'الأسمدة الزراعية'
    && category.sourceId === 'orkida'
  )));
});
