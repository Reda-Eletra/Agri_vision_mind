const pool = require('../config/database');

// Curated static growth guides as temporary fallback
const STATIC_FALLBACK_PLANTS = [
  {
    id: 'static-tomato-uuid-1111',
    slug: 'tomato',
    scientific_name: 'Solanum lycopersicum',
    category: 'vegetables',
    image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600',
    source_name: 'Static Fallback',
    source_url: 'https://www.almanac.com/plant/tomatoes',
    canonical_url: 'https://www.almanac.com/plant/tomatoes',
    additional_details_json: { toxicity: 'Leaves are toxic' },
    is_active: true,
    is_visible: true,
    deleted_at: null,
    name_en: 'Tomato',
    name_ar: 'طماطم',
    summary_en: 'Tomatoes are versatile and widely grown warm-season crops.',
    summary_ar: 'الطماطم من المحاصيل الصيفية المتنوعة وواسعة الانتشار.',
    description_en: 'Grow in fertile, well-draining soil with 6-8 hours of direct sunlight daily.',
    description_ar: 'تنمو في تربة خصبة جيدة الصرف مع التعرض لأشعة الشمس المباشرة 6-8 ساعات يومياً.',
    sunlight_en: 'Full sun',
    sunlight_ar: 'شمس كاملة',
    soil_en: 'Slightly acidic loam (pH 6.0-6.8)',
    soil_ar: 'تربة طينية حمضية قليلاً (pH 6.0-6.8)',
    watering_en: '1-2 inches per week, keep soil moist',
    watering_ar: '1-2 بوصة أسبوعياً، حافظ على رطوبة التربة',
    planting_en: 'Plant deep, burying up to 2/3 of the stem',
    planting_ar: 'اغرسها عميقاً، وادفن ما يصل إلى ثلثي الساق',
    sowing_en: 'Sow indoors 6 weeks before frost',
    sowing_ar: 'ابذر داخل المنزل قبل 6 أسابيع من الصقيع',
    spacing_en: '24-36 inches apart',
    spacing_ar: 'تباعد 24-36 بوصة',
    care_en: 'Stake support and prune suckers regularly',
    care_ar: 'ادعم بالأوتاد وقلم البراعم الجانبية بانتظام',
    harvesting_en: 'Pick when firm and fully colored',
    harvesting_ar: 'اقطفها عندما تكون متماسكة ومكتملة اللون',
    common_problems_en: 'Blossom end rot, hornworms',
    common_problems_ar: 'عفن الطرف الزهري، ديدان القرن',
    pests_en: 'Aphids, hornworms',
    pests_ar: 'المن، ديدان القرن',
    diseases_en: 'Early blight, late blight',
    diseases_ar: 'اللفحة المبكرة، اللفحة المتأخرة'
  },
  {
    id: 'static-corn-uuid-2222',
    slug: 'corn',
    scientific_name: 'Zea mays',
    category: 'vegetables',
    image_url: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600',
    source_name: 'Static Fallback',
    source_url: 'https://www.almanac.com/plant/corn',
    canonical_url: 'https://www.almanac.com/plant/corn',
    additional_details_json: {},
    is_active: true,
    is_visible: true,
    deleted_at: null,
    name_en: 'Corn',
    name_ar: 'ذرة',
    summary_en: 'Corn is a tall cereal grass that thrives in hot summers.',
    summary_ar: 'الذرة عشب حبوب طويل يزدهر في الصيف الحار.',
    description_en: 'Requires rich soil, heavy feeding, and pollination in block planting.',
    description_ar: 'تتطلب تربة خصبة، وتسميداً مكثفاً، وتلقيحاً عن طريق زراعتها في كتل.',
    sunlight_en: 'Full sun',
    sunlight_ar: 'شمس كاملة',
    soil_en: 'Well-drained loam, pH 6.0-6.8',
    soil_ar: 'تربة طينية جيدة الصرف، pH 6.0-6.8',
    watering_en: '1 inch per week, critical during pollination',
    watering_ar: 'بوصة واحدة أسبوعياً، ري حرج أثناء التلقيح',
    planting_en: 'Sow directly in blocks of at least 4 rows',
    planting_ar: 'ابذر مباشرة في كتل لا تقل عن 4 صفوف',
    sowing_en: 'Sow outdoor 2 weeks after last frost',
    sowing_ar: 'ابذر في الخارج بعد أسبوعين من آخر صقيع',
    spacing_en: '8-12 inches apart, rows 30 inches apart',
    spacing_ar: 'تباعد 8-12 بوصة، والصفوف 30 بوصة',
    care_en: 'Keep weeded and supply nitrogen mid-season',
    care_ar: 'حافظ على إزالة الأعشاب الضارة ووفر النيتروجين في منتصف الموسم',
    harvesting_en: 'Harvest when husks are green and silks are brown',
    harvesting_ar: 'احصد عندما تكون القشور خضراء والشواشي بنية',
    common_problems_en: 'Corn earworms, smut',
    common_problems_ar: 'ديدان لوز الذرة، التفحم',
    pests_en: 'Earworms, aphids',
    pests_ar: 'ديدان اللوز، المن',
    diseases_en: 'Rust, corn smut',
    diseases_ar: 'الصدأ، تفحم الذرة'
  }
];

const mapRow = (row, lang) => {
  const isAr = lang === 'ar';
  
  return {
    id: row.id,
    slug: row.slug,
    name: isAr ? (row.name_ar || row.name_en || row.name) : (row.name_en || row.name_ar || row.name),
    scientificName: row.scientific_name || null,
    category: row.category || 'other',
    summary: isAr ? (row.summary_ar || row.summary_en || row.summary) : (row.summary_en || row.summary_ar || row.summary),
    description: isAr ? (row.description_ar || row.description_en || row.description) : (row.description_en || row.description_ar || row.description),
    imageUrl: row.image_url || null,
    sourceName: row.source_name || null,
    sourceUrl: row.source_url || null,
    canonicalUrl: row.canonical_url || null,
    sunlight: isAr ? (row.sunlight_ar || row.sunlight_en || row.sunlight) : (row.sunlight_en || row.sunlight_ar || row.sunlight),
    soil: isAr ? (row.soil_ar || row.soil_en || row.soil) : (row.soil_en || row.soil_ar || row.soil),
    watering: isAr ? (row.watering_ar || row.watering_en || row.watering) : (row.watering_en || row.watering_ar || row.watering),
    planting: isAr ? (row.planting_ar || row.planting_en || row.planting) : (row.planting_en || row.planting_ar || row.planting),
    sowing: isAr ? (row.sowing_ar || row.sowing_en || row.sowing) : (row.sowing_en || row.sowing_ar || row.sowing),
    spacing: isAr ? (row.spacing_ar || row.spacing_en || row.spacing) : (row.spacing_en || row.spacing_ar || row.spacing),
    care: isAr ? (row.care_ar || row.care_en || row.care) : (row.care_en || row.care_ar || row.care),
    harvesting: isAr ? (row.harvesting_ar || row.harvesting_en || row.harvesting) : (row.harvesting_en || row.harvesting_ar || row.harvesting),
    commonProblems: isAr ? (row.common_problems_ar || row.common_problems_en || row.common_problems) : (row.common_problems_en || row.common_problems_ar || row.common_problems),
    pests: isAr ? (row.pests_ar || row.pests_en || row.pests) : (row.pests_en || row.pests_ar || row.pests),
    diseases: isAr ? (row.diseases_ar || row.diseases_en || row.diseases) : (row.diseases_en || row.diseases_ar || row.diseases),
    additionalDetails: row.additional_details_json || {},
    language: row.language || 'en',
    is_visible: Boolean(row.is_visible),
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const getRequestedLang = (req) => {
  if (req.query.lang === 'ar' || req.query.lang === 'en') return req.query.lang;
  return req.headers['accept-language']?.startsWith('ar') ? 'ar' : 'en';
};

const getPlants = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const offset = (page - 1) * limit;
    
    // Detect requested language
    const lang = getRequestedLang(req);

    // Check if table contains any records
    const checkCountRes = await pool.query('SELECT COUNT(*) FROM growth_guides WHERE deleted_at IS NULL');
    const dbCount = parseInt(checkCountRes.rows[0].count, 10);

    if (dbCount === 0) {
      // Return static fallback plants
      console.log('[growth-guide-controller] DB empty, serving static fallbacks.');
      
      let filtered = [...STATIC_FALLBACK_PLANTS];
      
      if (req.query.search) {
        const term = req.query.search.toLowerCase();
        filtered = filtered.filter(p => 
          p.name_en.toLowerCase().includes(term) || 
          (p.name_ar && p.name_ar.includes(term)) || 
          p.scientific_name.toLowerCase().includes(term)
        );
      }
      
      if (req.query.category) {
        const cat = req.query.category.toLowerCase();
        filtered = filtered.filter(p => p.category === cat);
      }

      const total = filtered.length;
      const paginated = filtered.slice(offset, offset + limit);

      return res.json({
        message: 'Success (Static Fallback)',
        data: paginated.map(p => mapRow(p, lang)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        filters: {
          categories: ['vegetables'],
          sources: ['Static Fallback'],
        }
      });
    }

    // DB has records, fetch from DB
    const conditions = ['deleted_at IS NULL', 'is_visible = TRUE'];
    const params = [];

    // Search filter
    if (req.query.search) {
      params.push(`%${req.query.search.trim()}%`);
      conditions.push(`(name_en ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR scientific_name ILIKE $${params.length})`);
    }

    // Category filter
    if (req.query.category) {
      params.push(req.query.category.trim());
      conditions.push(`category = $${params.length}`);
    }

    // Source filter
    if (req.query.source) {
      params.push(req.query.source.trim());
      conditions.push(`source_name = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Sorting options
    let orderBy = 'name_en ASC';
    if (req.query.sort === 'newest') {
      orderBy = 'created_at DESC';
    } else if (req.query.sort === 'updated') {
      orderBy = 'updated_at DESC';
    }

    const countQuery = `SELECT COUNT(*) FROM growth_guides ${whereClause}`;
    const dataQuery = `
      SELECT * FROM growth_guides
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countRes = await pool.query(countQuery, params);
    const dataRes = await pool.query(dataQuery, [...params, limit, offset]);

    const total = parseInt(countRes.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    // Fetch dynamic categories and sources
    const catQuery = `SELECT DISTINCT category FROM growth_guides WHERE deleted_at IS NULL AND is_visible = TRUE AND category IS NOT NULL`;
    const srcQuery = `SELECT DISTINCT source_name FROM growth_guides WHERE deleted_at IS NULL AND is_visible = TRUE AND source_name IS NOT NULL`;
    
    const [catRes, srcRes] = await Promise.all([
      pool.query(catQuery),
      pool.query(srcQuery),
    ]);

    res.json({
      message: 'Success',
      data: dataRes.rows.map(r => mapRow(r, lang)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      filters: {
        categories: catRes.rows.map(r => r.category),
        sources: srcRes.rows.map(r => r.source_name),
      }
    });
  } catch (err) {
    console.error('[growth-guide-controller] getPlants error:', err);
    res.status(500).json({ message: 'Server error loading growth guides' });
  }
};

const getPlantByIdOrSlug = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const lang = getRequestedLang(req);

    // First check if table is empty
    const checkCountRes = await pool.query('SELECT COUNT(*) FROM growth_guides WHERE deleted_at IS NULL');
    const dbCount = parseInt(checkCountRes.rows[0].count, 10);

    if (dbCount === 0) {
      // Find in static fallbacks
      const matched = STATIC_FALLBACK_PLANTS.find(p => p.slug === idOrSlug || p.id === idOrSlug);
      if (matched) {
        return res.json({
          message: 'Success (Static Fallback)',
          data: mapRow(matched, lang),
        });
      }
      return res.status(404).json({ error: 'Growth guide not found' });
    }

    let query = '';
    let params = [idOrSlug];

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid) {
      query = `SELECT * FROM growth_guides WHERE id = $1 AND deleted_at IS NULL AND is_visible = TRUE`;
    } else {
      query = `SELECT * FROM growth_guides WHERE slug = $1 AND deleted_at IS NULL AND is_visible = TRUE`;
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      // Check static fallbacks as a secondary safety net
      const matched = STATIC_FALLBACK_PLANTS.find(p => p.slug === idOrSlug || p.id === idOrSlug);
      if (matched) {
        return res.json({
          message: 'Success (Static Fallback)',
          data: mapRow(matched, lang),
        });
      }
      return res.status(404).json({ error: 'Growth guide not found' });
    }

    res.json({
      message: 'Success',
      data: mapRow(result.rows[0], lang),
    });
  } catch (err) {
    console.error('[growth-guide-controller] getPlantByIdOrSlug error:', err);
    res.status(500).json({ message: 'Server error loading growth guide details' });
  }
};

module.exports = {
  getPlants,
  getPlantByIdOrSlug,
};
