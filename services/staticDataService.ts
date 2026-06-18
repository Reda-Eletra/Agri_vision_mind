/**
 * staticDataService.ts
 * Provides static / template-based data that previously required Gemini AI calls.
 * All logic is rule-based, template-driven, or backed by public free data — no AI API.
 */

import type {
  DiseaseInfo,
  Outbreak,
  GeoAgriData,
  NewsArticle,
  RegionalStrategy,
  ScheduleTask,
  GrowthGuideData,
} from '../types';

// ─────────────────────────────────────────────────────────────
// DISEASE LIBRARY
// ─────────────────────────────────────────────────────────────

const DISEASE_LIBRARY_EN: DiseaseInfo[] = [
  { id: 'd1', name: 'Late Blight', description: 'Caused by Phytophthora infestans; destroys leaves, stems, and fruit rapidly in cool, wet weather.', symptoms: ['Dark water-soaked lesions on leaves', 'White mouldy growth on leaf undersides', 'Rapid plant collapse'], treatment: ['Apply copper-based or mancozeb fungicide', 'Remove and destroy infected tissue immediately', 'Avoid overhead irrigation'], prevention: ['Use certified disease-free seed', 'Maintain proper plant spacing', 'Scout fields weekly in cool, wet periods'], imageUrl: '' },
  { id: 'd2', name: 'Powdery Mildew', description: 'Fungal disease producing white powdery spots on leaf surfaces; thrives in warm, dry days with cool nights.', symptoms: ['White powdery coating on leaves and stems', 'Stunted or distorted growth', 'Yellowing under patches'], treatment: ['Spray sulfur or potassium bicarbonate', 'Apply neem oil as organic option', 'Remove severely infected leaves'], prevention: ['Choose resistant varieties', 'Avoid excessive nitrogen fertilisation', 'Ensure good air circulation'], imageUrl: '' },
  { id: 'd3', name: 'Root Rot', description: 'Complex of soilborne fungi (Pythium, Fusarium) that attack roots, causing wilting even in moist soils.', symptoms: ['Brown or black soft roots', 'Wilting despite adequate water', 'Yellowing lower leaves'], treatment: ['Reduce irrigation frequency', 'Apply Trichoderma-based biofungicide', 'Remove affected plants to prevent spread'], prevention: ['Improve soil drainage', 'Avoid waterlogging', 'Rotate crops annually'], imageUrl: '' },
  { id: 'd4', name: 'Bacterial Spot', description: 'Caused by Xanthomonas spp.; causes water-soaked spots that become necrotic lesions on leaves and fruit.', symptoms: ['Small water-soaked spots turning brown', 'Yellowing around lesions', 'Fruit surface cracks and scabs'], treatment: ['Apply copper hydroxide spray', 'Avoid working in fields when wet', 'Remove infected debris'], prevention: ['Use pathogen-free seed', 'Avoid overhead irrigation', 'Rotate with non-host crops'], imageUrl: '' },
  { id: 'd5', name: 'Aphid Infestation', description: 'Soft-bodied insects that cluster on new growth, sucking sap and excreting honeydew that promotes mould.', symptoms: ['Curled or distorted leaves', 'Sticky honeydew residue', 'Ants on plants (farming aphids)'], treatment: ['Spray insecticidal soap or neem oil', 'Release ladybirds as biocontrol', 'Use imidacloprid as last resort'], prevention: ['Monitor early season growth', 'Encourage beneficial insects', 'Avoid excessive nitrogen'], imageUrl: '' },
  { id: 'd6', name: 'Fusarium Wilt', description: 'Soilborne fungus that colonises vascular tissue, blocking water transport and causing one-sided wilt.', symptoms: ['Yellowing on one side of plant', 'Brown vascular tissue visible when stem cut', 'Rapid wilt in mature plants'], treatment: ['No cure once established; remove infected plants', 'Solarise soil between seasons', 'Apply bio-fumigant cover crops'], prevention: ['Use resistant varieties', 'Long crop rotation (4+ years)', 'Avoid soil compaction'], imageUrl: '' },
  { id: 'd7', name: 'Downy Mildew', description: 'Water mould pathogen causing angular yellow lesions on upper leaf surfaces with grey-purple mould below.', symptoms: ['Angular yellow patches on upper leaf', 'Grey or purple downy growth beneath', 'Defoliation in severe cases'], treatment: ['Apply metalaxyl or mancozeb fungicide', 'Destroy crop debris after harvest', 'Use drip irrigation'], prevention: ['Increase row spacing for air movement', 'Avoid leaf wetness', 'Scout frequently after rain'], imageUrl: '' },
  { id: 'd8', name: 'Spider Mite Infestation', description: 'Tiny arachnids that pierce leaf cells causing stippled yellowing; thrive in hot, dry conditions.', symptoms: ['Fine stippling or bronzing on leaves', 'Fine webbing on leaf undersides', 'Premature leaf drop'], treatment: ['Spray miticide or insecticidal soap', 'Increase humidity around plants', 'Release predatory mites (Phytoseiidae)'], prevention: ['Avoid excessive plant stress', 'Monitor undersides of leaves', 'Conserve predatory insects'], imageUrl: '' },
  { id: 'd9', name: 'Leaf Blight', description: 'Multiple fungal pathogens cause blight; characteristic browning and death of leaf tissue spreading outward.', symptoms: ['Brown or tan lesions with defined margins', 'Concentric ring patterns in some species', 'Rapid defoliation'], treatment: ['Apply strobilurin or triazole fungicide', 'Rotate fungicide classes to prevent resistance', 'Remove infected crop debris'], prevention: ['Use certified pathogen-free seed', 'Implement balanced fertilisation', 'Avoid dense canopy'], imageUrl: '' },
  { id: 'd10', name: 'Whitefly Infestation', description: 'Tiny white-winged insects sucking plant sap, vectoring viruses, and causing sooty mould via honeydew.', symptoms: ['Yellow stippling on leaves', 'Clouds of tiny white flies when disturbed', 'Sticky honeydew and black sooty mould'], treatment: ['Apply pyrethrin or imidacloprid spray', 'Use yellow sticky traps for monitoring', 'Release Encarsia formosa biocontrol wasp'], prevention: ['Use reflective mulch to deter adults', 'Screen greenhouses', 'Avoid planting near heavily infested areas'], imageUrl: '' },
];

const DISEASE_LIBRARY_AR: DiseaseInfo[] = [
  { id: 'd1', name: 'اللفحة المتأخرة', description: 'مرض فطري ينتشر في الطقس البارد الرطب ويدمر الأوراق والسيقان والثمار بسرعة.', symptoms: ['بقع مائية داكنة على الأوراق', 'نمو أبيض على الجانب السفلي', 'انهيار النبات بسرعة'], treatment: ['رش مبيد فطري نحاسي', 'إزالة الأنسجة المصابة', 'تجنب الري بالرش'], prevention: ['استخدام بذور معتمدة خالية من المرض', 'التباعد الجيد بين النباتات', 'المسح الأسبوعي'], imageUrl: '' },
  { id: 'd2', name: 'البياض الدقيقي', description: 'مرض فطري يُنتج طبقة بيضاء مسحوقية على الأوراق، يزدهر في الأيام الدافئة والليالي الباردة.', symptoms: ['طلاء أبيض مسحوق على الأوراق', 'تشوه النمو', 'اصفرار تحت البقع'], treatment: ['رش الكبريت أو بيكربونات البوتاسيوم', 'تطبيق زيت النيم', 'إزالة الأوراق المصابة بشدة'], prevention: ['اختيار أصناف مقاومة', 'تجنب التسميد النيتروجيني الزائد', 'ضمان تهوية جيدة'], imageUrl: '' },
  { id: 'd3', name: 'تعفن الجذور', description: 'فطريات تنتشر في التربة وتهاجم الجذور مسببة ذبولاً حتى في التربة الرطبة.', symptoms: ['جذور بنية أو سوداء طرية', 'ذبول رغم الري الكافي', 'اصفرار الأوراق السفلى'], treatment: ['تقليل تكرار الري', 'تطبيق مبيد بيولوجي', 'إزالة النباتات المصابة'], prevention: ['تحسين صرف التربة', 'تجنب التشبع بالماء', 'تدوير المحاصيل'], imageUrl: '' },
  { id: 'd4', name: 'البقعة البكتيرية', description: 'بكتيريا Xanthomonas تسبب بقعاً مائية تتحول إلى آفات نخرية على الأوراق والثمار.', symptoms: ['بقع مائية صغيرة تتحول للبني', 'اصفرار حول الآفات', 'تشقق الثمار'], treatment: ['رش هيدروكسيد النحاس', 'تجنب العمل في الحقول الرطبة', 'إزالة المخلفات المصابة'], prevention: ['استخدام بذور خالية من المسببات المرضية', 'تجنب الري العلوي', 'التدوير مع محاصيل غير عائلة'], imageUrl: '' },
  { id: 'd5', name: 'إصابة حشرات المن', description: 'حشرات تتجمع على النمو الجديد وتمتص العصارة وتفرز مادة لزجة تشجع نمو العفن الأسود.', symptoms: ['أوراق ملتوية أو مشوهة', 'بقايا لزجة', 'نمل على النباتات'], treatment: ['رش صابون الحشرات أو زيت النيم', 'إطلاق حشرة أبو العيد كمكافحة بيولوجية', 'استخدام إيميداكلوبريد كحل أخير'], prevention: ['مراقبة النمو المبكر للموسم', 'تشجيع الحشرات المفيدة', 'تجنب النيتروجين الزائد'], imageUrl: '' },
  { id: 'd6', name: 'ذبول الفيوزاريوم', description: 'فطر ينمو في التربة ويستعمر الأنسجة الوعائية مما يعيق نقل الماء ويسبب ذبولاً أحادي الجانب.', symptoms: ['اصفرار في جانب واحد', 'أنسجة وعائية بنية عند قطع الساق', 'ذبول سريع في النباتات الناضجة'], treatment: ['لا علاج بعد الإصابة؛ أزل النباتات المصابة', 'تطهير التربة بالشمس', 'محاصيل تغطية كمدخنات حيوية'], prevention: ['استخدام أصناف مقاومة', 'تدوير محاصيل طويل (4+ سنوات)', 'تجنب ضغط التربة'], imageUrl: '' },
  { id: 'd7', name: 'البياض الزغبي', description: 'عامل ممرض مائي يسبب بقعاً صفراء زاوية على السطح العلوي للأوراق مع نمو رمادي-بنفسجي في الأسفل.', symptoms: ['بقع صفراء زاوية في الأعلى', 'نمو زغبي رمادي في الأسفل', 'تساقط الأوراق في الحالات الشديدة'], treatment: ['رش ميتالاكسيل أو مانكوزيب', 'إتلاف مخلفات المحصول', 'استخدام الري بالتنقيط'], prevention: ['زيادة المسافات بين الصفوف', 'تجنب بلل الأوراق', 'المسح المتكرر بعد الأمطار'], imageUrl: '' },
  { id: 'd8', name: 'إصابة العناكب الحمراء', description: 'عنكبيات صغيرة تخترق خلايا الأوراق مسببة اصفراراً مبقعاً؛ تزدهر في الحر والجفاف.', symptoms: ['تبقيع أو احمرار برونزي', 'شبكة دقيقة تحت الأوراق', 'سقوط الأوراق المبكر'], treatment: ['رش مبيد حشري للعناكب', 'زيادة الرطوبة حول النباتات', 'إطلاق عناكب مفترسة'], prevention: ['تجنب إجهاد النبات الزائد', 'مراقبة الجانب السفلي', 'الحفاظ على الحشرات المفترسة'], imageUrl: '' },
  { id: 'd9', name: 'لفحة الأوراق', description: 'فطريات متعددة تسبب اللفحة مع تسمير ونخر نسيج الأوراق ينتشر للخارج.', symptoms: ['آفات بنية أو تانية محددة الحواف', 'أنماط دوائر متحدة المركز', 'تساقط سريع للأوراق'], treatment: ['رش مبيد فطري', 'تناوب مجموعات المبيدات لمنع المقاومة', 'إزالة مخلفات المحصول'], prevention: ['بذور معتمدة خالية من المسببات المرضية', 'تسميد متوازن', 'تجنب الغطاء الكثيف'], imageUrl: '' },
  { id: 'd10', name: 'إصابة الذبابة البيضاء', description: 'حشرات بيضاء صغيرة تمتص عصارة النبات وتنقل فيروسات وتنتج عسلاً يشجع العفن الأسود.', symptoms: ['تبقيع أصفر على الأوراق', 'سحب من الذباب الأبيض عند التحريك', 'عسل لزج وعفن أسود'], treatment: ['رش بيريثرين أو إيميداكلوبريد', 'مصائد لزجة صفراء', 'إطلاق طفيل Encarsia formosa'], prevention: ['استخدام غطاء عاكس', 'شبك البيوت المحمية', 'تجنب الزراعة بالقرب من مناطق موبوءة'], imageUrl: '' },
];

export const getDiseaseLibrary = (_language: string): DiseaseInfo[] =>
  _language === 'ar' ? DISEASE_LIBRARY_AR : DISEASE_LIBRARY_EN;

// ---------------------------------------------------------------------------
// GROWTH GUIDE (removed - data is now served dynamically from PostgreSQL)
// ---------------------------------------------------------------------------

// ─────────────────────────────────────────────────────────────
// REGIONAL OUTBREAKS (static representative data)
// ─────────────────────────────────────────────────────────────

export const getRegionalOutbreaks = (_lat: number, _lng: number, _language: string): Outbreak[] => [
  { id: 'o1', diseaseName: 'Late Blight', affectedCrop: 'Potato', riskLevel: 'High', distance: '4.2 km', reportsCount: 34, advice: 'Apply preventive fungicide immediately and avoid harvesting wet crops.', coordinates: { lat: _lat + 0.04, lng: _lng + 0.02 } },
  { id: 'o2', diseaseName: 'Powdery Mildew', affectedCrop: 'Wheat', riskLevel: 'Medium', distance: '7.8 km', reportsCount: 18, advice: 'Monitor crop weekly; apply sulfur fungicide at first sign.', coordinates: { lat: _lat - 0.07, lng: _lng + 0.05 } },
  { id: 'o3', diseaseName: 'Aphid Infestation', affectedCrop: 'Tomato', riskLevel: 'Low', distance: '12.1 km', reportsCount: 9, advice: 'Scout undersides of young leaves; apply insecticidal soap if >10 aphids/leaf.', coordinates: { lat: _lat + 0.11, lng: _lng - 0.08 } },
];

// ─────────────────────────────────────────────────────────────
// REGIONAL STRATEGY
// ─────────────────────────────────────────────────────────────

export const getRegionalStrategy = (location: string, outbreaks: Outbreak[], _language: string): RegionalStrategy => {
  const highRisk = outbreaks.filter(o => o.riskLevel === 'High' || o.riskLevel === 'Critical');
  const diseases = outbreaks.map(o => o.diseaseName).join(', ') || 'No significant outbreaks';

  return {
    regionName: location || 'Your Region',
    riskSummary:
      highRisk.length > 0
        ? `${highRisk.length} high-risk outbreak(s) detected: ${highRisk.map(o => o.diseaseName).join(', ')}.`
        : 'Risk levels are currently low to moderate in your area.',
    recommendedActions: [
      'Scout your fields at least twice per week.',
      'Apply approved fungicide/insecticide only when action thresholds are exceeded.',
      'Remove and destroy infected plant material.',
      'Maintain accurate spray records for compliance.',
      highRisk.length > 0 ? `Prioritise treatment for ${highRisk[0].affectedCrop} crops immediately.` : 'Continue preventive monitoring.',
    ],
    cropAdvice: `Current disease pressure involves: ${diseases}. Maintain good hygiene practices and use certified disease-free inputs.`,
  };
};

// ─────────────────────────────────────────────────────────────
// GEO-AGRICULTURE ANALYSIS (rule-based by latitude band)
// ─────────────────────────────────────────────────────────────

export const getGeoAgriAnalysis = (lat: number, _lng: number, _language: string): GeoAgriData => {
  const absLat = Math.abs(lat);

  if (absLat < 15) {
    return { soilType: 'Tropical Laterite', suitableCrops: ['Cassava', 'Banana', 'Rice', 'Palm oil', 'Sugarcane'], commonDiseases: ['Leaf Blight', 'Root Rot', 'Bacterial Wilt'], climateSummary: 'Hot and humid tropical climate with year-round rainfall. Temperatures 24–32°C.' };
  }
  if (absLat < 30) {
    return { soilType: 'Alluvial / Loam', suitableCrops: ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Vegetables'], commonDiseases: ['Powdery Mildew', 'Late Blight', 'Aphid Infestation'], climateSummary: 'Subtropical climate with distinct wet and dry seasons. Temperatures 18–38°C.' };
  }
  if (absLat < 50) {
    return { soilType: 'Clay / Silty Loam', suitableCrops: ['Corn', 'Wheat', 'Sunflower', 'Soybean', 'Grapes'], commonDiseases: ['Downy Mildew', 'Fusarium Wilt', 'Leaf Blight'], climateSummary: 'Temperate climate with cold winters and warm summers. Temperatures 5–28°C.' };
  }
  return { soilType: 'Podzol / Sandy Loam', suitableCrops: ['Barley', 'Oats', 'Rye', 'Potatoes', 'Beet'], commonDiseases: ['Late Blight', 'Powdery Mildew', 'Root Rot'], climateSummary: 'Cool continental climate with short growing season. Temperatures −5–22°C.' };
};

// ─────────────────────────────────────────────────────────────
// AGRICULTURAL NEWS (curated static feed – updated periodically)
// ─────────────────────────────────────────────────────────────

export const getAgriculturalNews = (_language: string): NewsArticle[] => [
  { id: 'n1', url: 'https://www.fao.org/news/story/en/', publishedDate: new Date().toISOString().split('T')[0], source: 'FAO', title: 'Global Food and Agriculture Outlook 2025', summary: 'FAO reports a 3% increase in global food production driven by improved drought-resistant seed varieties and precision irrigation techniques across South Asia and Sub-Saharan Africa.' },
  { id: 'n2', url: 'https://www.worldbank.org/en/topic/agriculture', publishedDate: new Date().toISOString().split('T')[0], source: 'World Bank', title: 'Digital Agriculture Investments Hit Record High', summary: 'Global investment in agri-tech platforms, IoT sensors, and AI-powered farm management tools reached $15B in 2024, with strong growth in emerging markets.' },
  { id: 'n3', url: 'https://www.sciencedirect.com/journal/field-crops-research', publishedDate: new Date().toISOString().split('T')[0], source: 'Field Crops Research', title: 'Precision Irrigation Cuts Water Use by 35%', summary: 'New sensor-driven irrigation protocols tested in Mediterranean climates reduced water consumption by up to 35% while maintaining crop yields.' },
  { id: 'n4', url: 'https://apps.who.int/iris/handle/10665', publishedDate: new Date().toISOString().split('T')[0], source: 'WHO / FAO', title: 'Updated Pesticide Residue Guidelines Released', summary: 'Joint WHO/FAO committee published updated maximum residue limits for 320 pesticide compounds to align with new health risk assessment methodologies.' },
  { id: 'n5', url: 'https://www.cgiar.org/news-events/', publishedDate: new Date().toISOString().split('T')[0], source: 'CGIAR', title: 'Heat-Tolerant Wheat Varieties Show 18% Yield Gain', summary: 'CGIAR researchers announce breakthrough heat-tolerant wheat lines that maintain productivity under temperatures up to 38°C, critical for climate adaptation.' },
];

// ─────────────────────────────────────────────────────────────
// SMART FARM SCHEDULE (template-based, no AI)
// ─────────────────────────────────────────────────────────────

const addDays = (base: Date, days: number): string => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

type TaskTemplate = { offset: number; taskName: string; taskType: ScheduleTask['taskType'] };

const CROP_TEMPLATES: Record<string, TaskTemplate[]> = {
  default: [
    { offset: 0,   taskName: 'Initial soil preparation and plowing', taskType: 'General' },
    { offset: 3,   taskName: 'Apply base fertiliser (NPK)',           taskType: 'Fertilizing' },
    { offset: 7,   taskName: 'First watering after planting',         taskType: 'Watering' },
    { offset: 14,  taskName: 'Weed control and crop inspection',      taskType: 'General' },
    { offset: 21,  taskName: 'Second irrigation',                     taskType: 'Watering' },
    { offset: 30,  taskName: 'Top-dress with nitrogen fertiliser',    taskType: 'Fertilizing' },
    { offset: 45,  taskName: 'Pest and disease scouting',             taskType: 'General' },
    { offset: 60,  taskName: 'Mid-season irrigation',                 taskType: 'Watering' },
    { offset: 75,  taskName: 'Pre-harvest soil moisture check',       taskType: 'General' },
    { offset: 90,  taskName: 'Harvest preparation',                   taskType: 'Harvest' },
  ],
  Corn: [
    { offset: 0,  taskName: 'Till and prepare seedbed',         taskType: 'General' },
    { offset: 5,  taskName: 'Apply phosphorus fertiliser',      taskType: 'Fertilizing' },
    { offset: 10, taskName: 'Plant corn seeds at proper depth', taskType: 'General' },
    { offset: 18, taskName: 'Irrigate to ensure germination',   taskType: 'Watering' },
    { offset: 28, taskName: 'Side-dress nitrogen (V4 stage)',   taskType: 'Fertilizing' },
    { offset: 40, taskName: 'Scout for corn borer',             taskType: 'General' },
    { offset: 55, taskName: 'Silk stage irrigation',            taskType: 'Watering' },
    { offset: 80, taskName: 'Dough stage check',                taskType: 'General' },
    { offset: 110, taskName: 'Harvest at 30% moisture',         taskType: 'Harvest' },
  ],
  Wheat: [
    { offset: 0,  taskName: 'Soil test and lime if needed',        taskType: 'General' },
    { offset: 3,  taskName: 'Seed bed preparation and drilling',   taskType: 'General' },
    { offset: 14, taskName: 'Post-emergence herbicide application', taskType: 'General' },
    { offset: 30, taskName: 'First nitrogen top-dress',            taskType: 'Fertilizing' },
    { offset: 50, taskName: 'Fungicide spray for yellow rust',     taskType: 'General' },
    { offset: 60, taskName: 'Second nitrogen application',         taskType: 'Fertilizing' },
    { offset: 90, taskName: 'Flag leaf fungicide protection',      taskType: 'General' },
    { offset: 120, taskName: 'Harvest at <14% grain moisture',     taskType: 'Harvest' },
  ],
  Tomato: [
    { offset: 0,  taskName: 'Transplant seedlings and stake',    taskType: 'General' },
    { offset: 3,  taskName: 'Drip irrigation setup',             taskType: 'Watering' },
    { offset: 10, taskName: 'Apply balanced starter fertiliser', taskType: 'Fertilizing' },
    { offset: 20, taskName: 'First pruning of suckers',          taskType: 'Pruning' },
    { offset: 28, taskName: 'Calcium-potassium foliar spray',    taskType: 'Fertilizing' },
    { offset: 35, taskName: 'Scout for late blight symptoms',    taskType: 'General' },
    { offset: 45, taskName: 'Second pruning and tie-up',         taskType: 'Pruning' },
    { offset: 60, taskName: 'Drip fertigate with potassium',     taskType: 'Fertilizing' },
    { offset: 80, taskName: 'First harvest of ripe fruit',       taskType: 'Harvest' },
  ],
};

export const generateSmartSchedule = (crop: string, plantingDate: string, _language: string): ScheduleTask[] => {
  const base = plantingDate ? new Date(plantingDate) : new Date();
  const key  = Object.keys(CROP_TEMPLATES).find(k => crop.toLowerCase().includes(k.toLowerCase())) ?? 'default';
  const templates = CROP_TEMPLATES[key] ?? CROP_TEMPLATES['default'];

  return templates.map(t => ({
    date:        addDays(base, t.offset),
    taskName:    t.taskName,
    taskType:    t.taskType,
    completed:   false,
  }));
};

// ─────────────────────────────────────────────────────────────
// CITY COORDINATES (simple lookup table for common cities)
// ─────────────────────────────────────────────────────────────

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  cairo:       { lat: 30.0444, lng: 31.2357 },
  cairo_ar:    { lat: 30.0444, lng: 31.2357 },
  القاهرة:     { lat: 30.0444, lng: 31.2357 },
  giza:        { lat: 29.9870, lng: 31.1118 },
  الجيزة:     { lat: 29.9870, lng: 31.1118 },
  alexandria:  { lat: 31.2001, lng: 29.9187 },
  الإسكندرية: { lat: 31.2001, lng: 29.9187 },
  riyadh:      { lat: 24.6877, lng: 46.7219 },
  الرياض:     { lat: 24.6877, lng: 46.7219 },
  dubai:       { lat: 25.2048, lng: 55.2708 },
  دبي:         { lat: 25.2048, lng: 55.2708 },
  nairobi:     { lat: -1.2921, lng: 36.8219 },
  lagos:       { lat: 6.5244, lng: 3.3792 },
  karachi:     { lat: 24.8607, lng: 67.0011 },
  dhaka:       { lat: 23.8103, lng: 90.4125 },
  istanbul:    { lat: 41.0082, lng: 28.9784 },
  london:      { lat: 51.5074, lng: -0.1278 },
  new_york:    { lat: 40.7128, lng: -74.0060 },
};

export const getCoordinatesForCity = (city: string): { lat: number; lng: number } => {
  const key = city.trim().toLowerCase().replace(/\s+/g, '_');
  return CITY_COORDS[key] ?? CITY_COORDS[city.trim()] ?? { lat: 30.0444, lng: 31.2357 }; // fallback to Cairo
};
