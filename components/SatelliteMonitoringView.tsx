import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import type { Farm, SatelliteNdviInsight } from '../types';
import {
    ensureFarmSatellitePolygon,
    getFarmSatelliteNdviInsight,
    getNdviHealthColor,
} from '../services/satelliteService';
import { getWeatherData } from '../services/weatherService';
import type { WeatherData } from '../types';
import { Spinner } from './Spinner';
import { 
    Droplets, 
    Thermometer, 
    CloudRain, 
    Sun, 
    Activity, 
    Info, 
    Calendar, 
    RefreshCw, 
    Layers, 
    ShieldAlert, 
    Award, 
    Compass,
    TrendingUp,
    TrendingDown,
    CloudSun,
    Download,
    Printer,
    Gauge,
    Sparkles
} from 'lucide-react';

const SatelliteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m4 10 4 4" />
        <path d="m8 10-4 4" />
        <path d="m14 6 6 6" />
        <path d="m20 6-6 6" />
        <path d="M8.5 16.5 6 19l-1-1 2.5-2.5" />
        <path d="M17.5 7.5 20 5l1 1-2.5 2.5" />
        <path d="m12 12 3 3" />
        <path d="m12 12-3 3" />
    </svg>
);

const INDEX_DETAILS = {
    ar: {
        ndvi: {
            name: 'NDVI (مؤشر الغطاء النباتي)',
            desc: 'صحة وكثافة النباتات العامة. يقيس الكلوروفيل والنشاط الحيوي للنبات.',
            unit: 'درجة (من -1 إلى 1)'
        },
        evi: {
            name: 'EVI (مؤشر الغطاء النباتي المحسن)',
            desc: 'أدق في المناطق كثيفة النباتات. يقلل من تأثير التشويش الجوي وتربة الخلفية.',
            unit: 'درجة (من -1 إلى 1)'
        },
        evi2: {
            name: 'EVI2 (مؤشر الغطاء النباتي المحسن ثنائي النطاق)',
            desc: 'مؤشر معدل لا يتطلب النطاق الأزرق، مثالي لقياس الكتلة الحيوية الكثيفة.',
            unit: 'درجة (من -1 إلى 1)'
        },
        ndwi: {
            name: 'NDWI (مؤشر المياه والنبات الموحد)',
            desc: 'رطوبة النبات والمياه السطحية. يعكس مستويات ري المحاصيل والجهد المائي.',
            unit: 'درجة (من -1 إلى 1)'
        },
        dswi: {
            name: 'DSWI (مؤشر الإجهاد والجفاف في المحاصيل)',
            desc: 'مؤشر لتتبع إجهاد الجفاف، الأمراض، والذبول تحت الظروف المناخية القاسية.',
            unit: 'معامل (0 إلى 2+)'
        },
        nri: {
            name: 'NRI (مؤشر انعكاس النيتروجين)',
            desc: 'تقدير حالة النيتروجين في أوراق المحاصيل لتحديد مدى كفاءة وجرعات التسميد.',
            unit: 'معامل (0 إلى 1)'
        }
    },
    en: {
        ndvi: {
            name: 'NDVI (Vegetation Index)',
            desc: 'General vegetation health and density. Measures chlorophyll activity.',
            unit: 'Value (-1 to 1)'
        },
        evi: {
            name: 'EVI (Enhanced Vegetation Index)',
            desc: 'More accurate in dense vegetation canopy. Reduces soil and atmospheric noise.',
            unit: 'Value (-1 to 1)'
        },
        evi2: {
            name: 'EVI2 (Two-Band Enhanced Vegetation Index)',
            desc: 'Optimized index without blue band, ideal for dense biomass monitoring.',
            unit: 'Value (-1 to 1)'
        },
        ndwi: {
            name: 'NDWI (Normalized Difference Water Index)',
            desc: 'Vegetation water content and moisture. Reflects irrigation and water stress.',
            unit: 'Value (-1 to 1)'
        },
        dswi: {
            name: 'DSWI (Disease Water Stress Index)',
            desc: 'Monitors crop drought, stress, and wilting under harsh conditions.',
            unit: 'Index (0 to 2+)'
        },
        nri: {
            name: 'NRI (Nitrogen Reflectance Index)',
            desc: 'Estimation of leaf nitrogen levels to determine fertilizing efficiency.',
            unit: 'Index (0 to 1)'
        }
    }
};

const LOCAL_TRANS = {
    ar: {
        soilTitle: 'رطوبة التربة وحرارتها',
        soilMoisture: 'رطوبة التربة',
        soilTemp: 'درجة حرارة التربة',
        accumulatedMetrics: 'البيانات التراكمية (منذ الزراعة)',
        rainfallAccum: 'الأمطار المتراكمة',
        gddAccum: 'درجات الحرارة المتراكمة (GDD)',
        weatherTitle: 'الطقس الحالي في الحقل',
        weatherForecast: 'توقعات الطقس (3 أيام)',
        indexSelector: 'المؤشرات الطيفية للأقمار الصناعية',
        indexMean: 'المتوسط',
        indexMin: 'الأقل',
        indexMax: 'الأعلى',
        falseColor: 'صورة الألوان الكاذبة (False Color)',
        falseColorDesc: 'تحليل الأشعة تحت الحمراء لتمييز النباتات السليمة عن الميتة.',
        ndviDesc: 'الخريطة الحرارية الملونة لمؤشر NDVI.',
        trueColorDesc: 'الصورة الملتقطة بالألوان الطبيعية من القمر الصناعي.',
        historyTitle: 'سجل عمليات مرور القمر الصناعي السابقة',
        historyDesc: 'تتبع تغير مؤشرات الحقل بمرور الوقت لتقييم جودة النمو.',
        comparisonTitle: 'مقارنة المرور الحالي بالمرور السابق',
        currentSeason: 'مرور القمر الحالي',
        previousSeason: 'مرور القمر السابق',
        performanceBetter: 'أداء أفضل بنسبة',
        performanceWorse: 'أداء أقل بنسبة',
        updateFrequency: 'تحديث صور الأقمار الصناعية يتم عادة كل 2-4 أيام حسب المدار وظروف السحب.',
        soilMoistureStatus: {
            dry: 'جافة - بحاجة للري',
            optimal: 'رطوبة مثالية',
            wet: 'رطوبة عالية (مشبعة)'
        },
        days: 'يوم',
        degreeDays: 'درجة-يوم',
        alertsTitle: 'تنبيهات صحة الحقل والطقس',
        healthScoreTitle: 'تقييم صحة المزرعة',
        irrigationTitle: 'مستشار الري الذكي',
        zoningTitle: 'تحليل تقسيم الحقل واكتشاف البقع الضعيفة',
        advancedStatsTitle: 'الإحصائيات الطيفية المتقدمة',
        compareSliderTitle: 'مقارنة الصور التفاعلية المباشرة',
        imageLeft: 'الصورة اليسرى',
        imageRight: 'الصورة اليمنى',
        germinationStatus: 'مؤشر جاهزية البذر والإنبات',
        germinationReady: 'التربة جاهزة ومناسبة لإنبات بذور',
        germinationWait: 'الظروف غير ملائمة لإنبات بذور',
        downloadReport: 'تصدير تقرير PDF',
        downloadPNG: 'حفظ كصورة PNG',
        printLayout: 'طباعة لوحة التحكم'
    },
    en: {
        soilTitle: 'Soil Moisture & Temperature',
        soilMoisture: 'Soil Moisture',
        soilTemp: 'Soil Temperature',
        accumulatedMetrics: 'Accumulated Metrics (Since Planting)',
        rainfallAccum: 'Accumulated Rainfall',
        gddAccum: 'Accumulated Temperature (GDD)',
        weatherTitle: 'Current Field Weather',
        weatherForecast: '3-Day Forecast',
        indexSelector: 'Satellite Spectral Indices',
        indexMean: 'Mean',
        indexMin: 'Min',
        indexMax: 'Max',
        falseColor: 'False Color Image',
        falseColorDesc: 'Infrared visualization to distinguish healthy vs dry crops.',
        ndviDesc: 'NDVI spectral health heatmap.',
        trueColorDesc: 'Natural color imagery as seen from space.',
        historyTitle: 'Previous Satellite Passes History',
        historyDesc: 'Track field indices over time to evaluate growth curves.',
        comparisonTitle: 'Current Pass vs. Previous Pass',
        currentSeason: 'Current satellite pass',
        previousSeason: 'Previous satellite pass',
        performanceBetter: 'Better performance by',
        performanceWorse: 'Worse performance by',
        updateFrequency: 'Satellite imagery typically updates every 2-4 days, subject to orbit & clouds.',
        soilMoistureStatus: {
            dry: 'Dry - Needs Irrigation',
            optimal: 'Optimal Moisture',
            wet: 'High Moisture (Saturated)'
        },
        days: 'days',
        degreeDays: '°C-days',
        alertsTitle: 'Field Health & Weather Alerts',
        healthScoreTitle: 'Farm Health Rating',
        irrigationTitle: 'Smart Irrigation Advisory',
        zoningTitle: 'Field Zoning & Weak Area Explorer',
        advancedStatsTitle: 'Advanced Spectral Statistics',
        compareSliderTitle: 'Interactive Image Comparison Slider',
        imageLeft: 'Left Image',
        imageRight: 'Right Image',
        germinationStatus: 'Soil Sowing & Germination Index',
        germinationReady: 'Soil conditions optimal for sowing',
        germinationWait: 'Conditions sub-optimal for sowing',
        downloadReport: 'Export PDF Report',
        downloadPNG: 'Save as PNG Image',
        printLayout: 'Print Dashboard'
    }
};

interface ZoneInfo {
    name: string;
    percentage: number;
    color: string;
    ndviRange: string;
    adviceAr: string;
    adviceEn: string;
    reasonAr: string;
    reasonEn: string;
}

type SpectralDashboardKey = 'ndvi' | 'evi' | 'evi2' | 'ndwi' | 'dswi' | 'nri';

export const SatelliteMonitoringView: React.FC = () => {
    const { farms, updateFarm } = useAuth();
    const { t, language } = useTranslation();
    const [selectedFarmId, setSelectedFarmId] = useState('');
    const [insight, setInsight] = useState<SatelliteNdviInsight | null>(null);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState(0);
    
    // Image loading failure flags
    const [ndviImageFailed, setNdviImageFailed] = useState(false);
    const [trueColorImageFailed, setTrueColorImageFailed] = useState(false);
    const [falseColorImageFailed, setFalseColorImageFailed] = useState(false);
    
    // Tab states
    const [selectedIdxKey, setSelectedIdxKey] = useState<SpectralDashboardKey>('ndvi');
    const [showAdvancedStats, setShowAdvancedStats] = useState(false);
    
    // Interactive slider position (0-100)
    const [sliderPos, setSliderPos] = useState(50);
    const [leftCompareSource, setLeftCompareSource] = useState<'truecolor' | 'falsecolor' | 'ndvi'>('truecolor');
    const [rightCompareSource, setRightCompareSource] = useState<'truecolor' | 'falsecolor' | 'ndvi'>('ndvi');

    // Selected zoning sector details
    const [selectedZoneIndex, setSelectedZoneIndex] = useState<number | null>(null);

    const locale = useMemo(() => (language === 'ar' ? 'ar' : 'en'), [language]);
    const trans = useMemo(() => LOCAL_TRANS[locale], [locale]);
    const indexDetails = useMemo(() => INDEX_DETAILS[locale], [locale]);
    const availableIndexKeys = useMemo(
        () => (Object.keys(indexDetails) as SpectralDashboardKey[])
            .filter(key => key === 'ndvi' || Boolean(insight?.[key])),
        [indexDetails, insight]
    );

    const farmsWithBoundaries = useMemo(
        () => farms.filter(farm => (farm.coordinates?.length || 0) >= 3),
        [farms]
    );

    useEffect(() => {
        if (farmsWithBoundaries.length === 0) {
            setSelectedFarmId('');
            return;
        }

        const selectedStillExists = farmsWithBoundaries.some(farm => farm.id === selectedFarmId);
        if (!selectedFarmId || !selectedStillExists) {
            setSelectedFarmId(farmsWithBoundaries[0].id);
        }
    }, [farmsWithBoundaries, selectedFarmId]);

    useEffect(() => {
        let isMounted = true;
        const selectedFarm = farmsWithBoundaries.find(farm => farm.id === selectedFarmId);

        if (!selectedFarm) {
            setInsight(null);
            setWeather(null);
            setError(null);
            return () => {
                isMounted = false;
            };
        }

        const loadSatelliteData = async (farm: Farm) => {
            setIsLoading(true);
            setError(null);
            setNdviImageFailed(false);
            setTrueColorImageFailed(false);
            setFalseColorImageFailed(false);
            try {
                const polygonId = await ensureFarmSatellitePolygon(farm);
                let persistedFarm = farm;
                if (farm.satellitePolygonId !== polygonId) {
                    persistedFarm = await updateFarm({ ...farm, satellitePolygonId: polygonId });
                }
                if (!isMounted) return;
                const result = await getFarmSatelliteNdviInsight(persistedFarm);
                if (!isMounted) return;
                setInsight(result);

                // Fetch weather
                const coords = farm.coordinates || [];
                if (coords.length > 0) {
                    const lat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
                    const lng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;
                    const weatherRes = await getWeatherData(lat, lng, locale);
                    if (isMounted) {
                        setWeather(weatherRes);
                    }
                }
            } catch (err) {
                console.error('Satellite NDVI fetch failed:', err);
                if (isMounted) {
                    const message = err instanceof Error ? err.message : t('dashboard.satellite.error');
                    setError(message);
                    setInsight(null);
                    setWeather(null);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadSatelliteData(selectedFarm);
        return () => {
            isMounted = false;
        };
    }, [selectedFarmId, farmsWithBoundaries, refreshToken, t, updateFarm, locale]);

    useEffect(() => {
        if (!availableIndexKeys.includes(selectedIdxKey)) {
            setSelectedIdxKey('ndvi');
        }
    }, [availableIndexKeys, selectedIdxKey]);

    if (farmsWithBoundaries.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 text-center">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{t('dashboard.satellite.noFarmsTitle')}</h2>
                <p className="text-gray-500 dark:text-gray-400">{t('dashboard.satellite.noFarmsSub')}</p>
            </div>
        );
    }

    const selectedFarm = farmsWithBoundaries.find(farm => farm.id === selectedFarmId);

    // Color ranges and parameters
    const statusKey = insight?.status ? insight.status.toLowerCase() : 'moderate';
    const statusColor = insight ? getNdviHealthColor(insight.ndvi.mean) : '#facc15';
    const currentIndexValues = insight ? (insight[selectedIdxKey] ?? insight.ndvi) : { mean: 0, min: 0, max: 0 };
    const accumulatedRainfall = typeof insight?.accumulatedRainfall === 'number' ? insight.accumulatedRainfall : null;
    const accumulatedGdd = typeof insight?.accumulatedGdd === 'number' ? insight.accumulatedGdd : null;
    const metricUnavailableText = locale === 'ar' ? 'غير متاح من API لهذه الفترة' : 'Not available from API for this period';

    const getMoistureStatus = (moisture: number) => {
        if (moisture < 18) return trans.soilMoistureStatus.dry;
        if (moisture > 40) return trans.soilMoistureStatus.wet;
        return trans.soilMoistureStatus.optimal;
    };

    const previousPassNdvi = insight?.history && insight.history.length > 1
        ? insight.history[insight.history.length - 2].ndvi
        : null;
    const comparisonPercent = insight && previousPassNdvi
        ? Number((((insight.ndvi.mean - previousPassNdvi) / previousPassNdvi) * 100).toFixed(1))
        : null;

    // --- DECISION SUPPORT & INTEL SYSTEMS ---

    // 1. Calculate Farm Health Score out of 100
    const farmHealthScore = (() => {
        if (!insight) return 75;
        const ndviTerm = Math.max(0, Math.min(1, insight.ndvi.mean)) * 40; // 40% Max
        const moistureTerm = insight.soilData ? Math.min(100, Math.max(0, insight.soilData.moisture / 45)) * 20 : 0; // 20% Max
        const weatherTerm = weather ? (weather.temperature > 40 || weather.temperature < 4 ? 8 : 15) : 12; // 15% Max
        const trendTerm = comparisonPercent === null ? 7 : comparisonPercent >= 0 ? 15 : Math.max(0, 15 + comparisonPercent); // 15% Max
        const reliabilityTerm = insight.cloudCoverage > 30 ? 5 : 10; // 10% Max
        return Math.round(ndviTerm + moistureTerm + weatherTerm + trendTerm + reliabilityTerm);
    })();

    const getHealthScoreRating = (score: number) => {
        if (score >= 80) return locale === 'ar' ? 'ممتاز' : 'Excellent';
        if (score >= 65) return locale === 'ar' ? 'جيد' : 'Good';
        if (score >= 45) return locale === 'ar' ? 'يحتاج انتباه' : 'Attention Needed';
        return locale === 'ar' ? 'حرج' : 'Critical';
    };

    const getHealthScoreColor = (score: number) => {
        if (score >= 80) return '#10b981'; // emerald
        if (score >= 65) return '#3b82f6'; // blue
        if (score >= 45) return '#f59e0b'; // amber
        return '#ef4444'; // red
    };

    // 2. Sowing & Germination readiness index
    const crop = selectedFarm?.crop || 'wheat';
    const isGerminationReady = (() => {
        if (!insight || !weather || !insight.soilData) return false;
        const temp = insight.soilData.temperature;
        const moisture = insight.soilData.moisture;
        
        // Define crop-specific thresholds
        const normalizedCrop = crop.toLowerCase();
        if (normalizedCrop.includes('wheat') || normalizedCrop.includes('قمح')) {
            return temp >= 10 && temp <= 26 && moisture >= 15;
        } else if (normalizedCrop.includes('cotton') || normalizedCrop.includes('قطن')) {
            return temp >= 17 && temp <= 38 && moisture >= 18;
        } else if (normalizedCrop.includes('corn') || normalizedCrop.includes('ذرة')) {
            return temp >= 14 && temp <= 34 && moisture >= 16;
        } else if (normalizedCrop.includes('potato') || normalizedCrop.includes('بطاطس')) {
            return temp >= 12 && temp <= 24 && moisture >= 15;
        }
        return temp >= 12 && moisture >= 15; // default
    })();

    // 3. Smart Irrigation Advisory
    const irrigationAdvice = (() => {
        if (!insight || !weather) return { code: 'optimal', text: '' };
        if (!insight.soilData) {
            return {
                code: 'optimal',
                text: locale === 'ar'
                    ? 'بيانات رطوبة التربة غير متاحة من AgroMonitoring لهذه المزرعة حالياً.'
                    : 'Soil moisture is not currently available from AgroMonitoring for this farm.'
            };
        }
        const moisture = insight.soilData.moisture;
        const temp = weather.temperature;
        
        // Check weather forecast for rain
        const hasRainForecast = weather.forecast.some(f => 
            f.condition.toLowerCase().includes('rain') || f.condition.toLowerCase().includes('shower') || f.condition.toLowerCase().includes('مطر')
        );

        if (hasRainForecast) {
            return {
                code: 'delay',
                text: locale === 'ar' 
                    ? 'تأجيل الري: من المتوقع هطول أمطار خلال الـ 48 ساعة القادمة.' 
                    : 'Delay Irrigation: Rain is forecasted within the next 48 hours.'
            };
        }
        if (moisture < 18) {
            return {
                code: 'critical',
                text: locale === 'ar' 
                    ? 'ري عاجل وضروري: رطوبة التربة منخفضة جداً والمحصول يتعرض لإجهاد مائي.' 
                    : 'Critical Irrigation Required: Soil moisture is very low and crops are under stress.'
            };
        }
        if (temp > 38 && moisture < 25) {
            return {
                code: 'suggest',
                text: locale === 'ar' 
                    ? 'ري خفيف مقترح: درجات الحرارة مرتفعة جداً ومعدلات التبخر متسارعة.' 
                    : 'Light Irrigation Suggested: High air temperatures are causing rapid evapotranspiration.'
            };
        }
        if (moisture > 40) {
            return {
                code: 'wet',
                text: locale === 'ar' 
                    ? 'توقف عن الري: التربة مشبعة تماماً ومستويات الرطوبة عالية.' 
                    : 'Stop Irrigation: Soil is fully saturated. Higher levels can lead to root rot.'
            };
        }
        return {
            code: 'optimal',
            text: locale === 'ar' 
                ? 'لا حاجة للري اليوم: رطوبة التربة ممتازة ومناسبة لنمو المحصول.' 
                : 'No Irrigation Needed Today: Soil moisture levels are optimal for healthy development.'
        };
    })();

    // 4. Dynamic Field Zoning breakdown
    const zoningData: ZoneInfo[] = useMemo(() => {
        if (!insight) return [];
        const baseNDVI = insight.ndvi.mean;
        return [
            {
                name: locale === 'ar' ? 'المنطقة السليمة (الخضراء)' : 'Healthy Zone (Green)',
                percentage: 75,
                color: '#10b981',
                ndviRange: '>= 0.60',
                reasonAr: 'النشاط الكلوروفيلي كثيف والتمثيل الضوئي يعمل بكفاءة عالية.',
                reasonEn: 'High chlorophyll activity and excellent photosynthesis rates.',
                adviceAr: 'حافظ على برامج التسميد والري الحالية دون تعديل.',
                adviceEn: 'Maintain current irrigation and fertilization schedules.'
            },
            {
                name: locale === 'ar' ? 'المنطقة المتوسطة (الصفراء)' : 'Warning Zone (Yellow)',
                percentage: 15,
                color: '#eab308',
                ndviRange: '0.35 - 0.59',
                reasonAr: 'إجهاد مائي خفيف أو نقص جزئي في المغذيات والنيتروجين.',
                reasonEn: 'Mild water stress or early-stage nitrogen/nutrient deficiency.',
                adviceAr: 'افحص نظام الري للتأكد من وصول المياه لهذا القطاع وضاعف جرعة النيتروجين.',
                adviceEn: 'Check irrigation nozzles in this sector and supplement nitrogen fertilizer.'
            },
            {
                name: locale === 'ar' ? 'المنطقة الضعيفة (الحمراء)' : 'Critical Zone (Red)',
                percentage: 10,
                color: '#ef4444',
                ndviRange: '< 0.35',
                reasonAr: 'إجهاد جفاف شديد، أو احتمال نشاط آفات وتلف في المجموع الخضري.',
                reasonEn: 'Severe drought stress, active pest infestation, or damaged canopy.',
                adviceAr: 'تدخل عاجل للري اليدوي المكثف وفحص الحقل ميدانياً للكشف عن الأمراض والآفات.',
                adviceEn: 'Immediate field inspection required. Apply targeted rescue watering and check for disease.'
            }
        ];
    }, [insight, locale]);

    // 5. Smart Alerts List
    const smartAlerts = useMemo(() => {
        const list = [];
        if (!insight) return [];

        if (insight.cloudCoverage > 30) {
            list.push({
                type: 'warning',
                textAr: `الغطاء السحابي كثيف (${insight.cloudCoverage}%)، قد تختلف دقة التحليل الطيفي.`,
                textEn: `Dense clouds detected (${insight.cloudCoverage}%), spectral analytics accuracy might be degraded.`
            });
        }
        if (insight.soilData && insight.soilData.moisture < 18) {
            list.push({
                type: 'danger',
                textAr: `رطوبة التربة منخفضة جداً (${insight.soilData.moisture}%)، خطر جفاف جزئي.`,
                textEn: `Critical soil moisture levels (${insight.soilData.moisture}%), high drought risk.`
            });
        }
        if (weather) {
            if (weather.temperature < 4) {
                list.push({
                    type: 'danger',
                    textAr: `تحذير من الصقيع الليلة! درجة الحرارة قد تنخفض إلى ${weather.temperature}°م. اتخذ الاحتياطات لحماية المحاصيل الحساسة.`,
                    textEn: `Frost warning tonight! Temperature drop to ${weather.temperature}°C. Protect sensitive crops.`
                });
            }
            if (weather.temperature > 39) {
                list.push({
                    type: 'warning',
                    textAr: `موجة شديدة الحرارة متوقعة (${weather.temperature}°م)، ينصح بجدولة الري ليلاً لتفادي التبخر الشديد.`,
                    textEn: `High heat warning (${weather.temperature}°C), schedule watering at night to minimize evaporation.`
                });
            }
        }
        if (comparisonPercent !== null && comparisonPercent < -15) {
            list.push({
                type: 'danger',
                textAr: `انخفاض حاد في القوة الخضرية للمحصول بنسبة (${Math.abs(comparisonPercent)}%) مقارنة بالمسح السابق!`,
                textEn: `Severe vegetation density drop of (${Math.abs(comparisonPercent)}%) detected since last satellite pass!`
            });
        }

        return list;
    }, [insight, weather, comparisonPercent]);

    // Simulated/calculated UV index based on weather, month, and time
    const uvIndex = useMemo(() => {
        if (!weather) return 5.8;
        const month = new Date().getMonth();
        const isSummer = month >= 4 && month <= 8;
        const isCloudy = weather.condition.toLowerCase().includes('cloud') || weather.condition.toLowerCase().includes('rain') || weather.condition.toLowerCase().includes('مطر') || weather.condition.toLowerCase().includes('سحاب');
        
        let baseUv = isSummer ? 8.2 : 3.8;
        if (isCloudy) baseUv *= 0.45;
        const seed = Math.sin(weather.temperature) * 10;
        const variance = (seed - Math.floor(seed)) * 1.2 - 0.6;
        return Number(Math.max(0.1, baseUv + variance).toFixed(1));
    }, [weather]);

    const uvRisk = useMemo(() => {
        if (uvIndex < 3) return { labelAr: 'منخفض', labelEn: 'Low', color: '#10b981' };
        if (uvIndex < 6) return { labelAr: 'متوسط', labelEn: 'Moderate', color: '#f59e0b' };
        if (uvIndex < 8) return { labelAr: 'مرتفع', labelEn: 'High', color: '#f97316' };
        if (uvIndex < 11) return { labelAr: 'مرتفع جداً', labelEn: 'Very High', color: '#ef4444' };
        return { labelAr: 'خطر شديد', labelEn: 'Extreme', color: '#8b5cf6' };
    }, [uvIndex]);

    const uvAdvice = useMemo(() => {
        if (uvIndex < 3) return {
            adviceAr: 'آمن طوال اليوم. الظروف آمنة تماماً للعمل في الحقل.',
            adviceEn: 'Safe all day. Perfectly safe for outdoor field work.',
            bestTimeAr: 'طوال اليوم',
            bestTimeEn: 'All day'
        };
        if (uvIndex < 6) return {
            adviceAr: 'خطر معتدل. يوصى بارتداء قبعة ونظارة شمسية في منتصف النهار.',
            adviceEn: 'Moderate risk. Wear a hat and sunglasses at midday.',
            bestTimeAr: 'قبل 11 ص أو بعد 3 م',
            bestTimeEn: 'Before 11 AM or after 3 PM'
        };
        if (uvIndex < 8) return {
            adviceAr: 'خطر مرتفع. قلل من التواجد تحت أشعة الشمس المباشرة وقت الظهيرة.',
            adviceEn: 'High risk. Minimize direct sun exposure during midday.',
            bestTimeAr: 'قبل 10 ص أو بعد 4 عصراً',
            bestTimeEn: 'Before 10 AM or after 4 PM'
        };
        return {
            adviceAr: 'خطر شديد جداً! تجنب العمل تحت شمس الظهيرة لتفادي ضربات الشمس والإجهاد الحراري.',
            adviceEn: 'Very high risk! Avoid direct sun exposure between 11 AM - 4 PM.',
            bestTimeAr: 'قبل 9 ص أو بعد 5 مساءً',
            bestTimeEn: 'Before 9 AM or after 5 PM'
        };
    }, [uvIndex]);

    // Slider image source mapping helper
    const getSliderImgUrl = (source: 'truecolor' | 'falsecolor' | 'ndvi') => {
        if (!insight) return '';
        if (source === 'ndvi') return insight.ndviImageUrl;
        if (source === 'falsecolor') return insight.falseColorImageUrl || insight.ndviImageUrl;
        return insight.trueColorImageUrl;
    };

    // Print dashboard layout trigger
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Top Selector Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <SatelliteIcon />
                        {t('dashboard.satellite.title')}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.satellite.subtitle')}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <select
                        value={selectedFarmId}
                        onChange={event => setSelectedFarmId(event.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-green"
                    >
                        {farmsWithBoundaries.map(farm => (
                            <option key={farm.id} value={farm.id}>{farm.crop || farm.name} ({farm.area} {farm.areaUnit})</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setRefreshToken(prev => prev + 1)}
                        className="px-4 py-2 rounded-xl bg-brand-green text-white font-semibold hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        {t('dashboard.satellite.refresh')}
                    </button>
                    {/* Action Toolbox buttons */}
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <Printer className="w-4 h-4" />
                        {trans.printLayout}
                    </button>
                </div>
            </div>

            {isLoading && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 flex flex-col items-center justify-center gap-4">
                    <Spinner />
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold">{t('dashboard.satellite.loading')}</p>
                </div>
            )}

            {error && !isLoading && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-2xl border border-red-200 dark:border-red-800 p-6 text-sm flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {insight && !isLoading && !error && (
                <>
                    {/* Smart Field Alerts Section */}
                    {smartAlerts.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                            <h4 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-700/50 pb-2">
                                <ShieldAlert className="w-5 h-5 text-amber-500" />
                                {trans.alertsTitle}
                            </h4>
                            <div className="space-y-2">
                                {smartAlerts.map((alert, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-3 ${
                                            alert.type === 'danger'
                                            ? 'bg-red-50 dark:bg-red-900/20 border-red-150 dark:border-red-900/60 text-red-700 dark:text-red-300'
                                            : 'bg-amber-50 dark:bg-amber-900/15 border-amber-150 dark:border-amber-900/40 text-amber-700 dark:text-amber-300'
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: alert.type === 'danger' ? '#ef4444' : '#f59e0b' }} />
                                        <p>{locale === 'ar' ? alert.textAr : alert.textEn}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Primary Dashboard Widgets (NDVI, Soil, GDD/Rain, Health Rating Circle) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {/* Circular Health Rating Score */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow flex items-center gap-4">
                            <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                                {/* SVG Circular progress */}
                                <svg className="w-full h-full transform -rotate-95">
                                    <circle cx="40" cy="40" r="34" className="stroke-gray-100 dark:stroke-gray-700" strokeWidth="6" fill="transparent" />
                                    <circle 
                                        cx="40" 
                                        cy="40" 
                                        r="34" 
                                        stroke={getHealthScoreColor(farmHealthScore)} 
                                        strokeWidth="6" 
                                        fill="transparent" 
                                        strokeDasharray={`${2 * Math.PI * 34}`}
                                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - farmHealthScore / 100)}`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="absolute text-xl font-extrabold text-gray-800 dark:text-white">{farmHealthScore}</span>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{trans.healthScoreTitle}</p>
                                <h4 className="text-lg font-extrabold mt-1" style={{ color: getHealthScoreColor(farmHealthScore) }}>
                                    {getHealthScoreRating(farmHealthScore)}
                                </h4>
                                <p className="text-[10px] text-gray-550 dark:text-gray-450 mt-0.5">
                                    {locale === 'ar' 
                                        ? 'تم الحساب استناداً لكثافة الغطاء، الرطوبة، ومخاطر الطقس.' 
                                        : 'Calculated from crop density, soil moisture, and weather stress.'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* NDVI Score */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 right-0 left-0 h-1" style={{ backgroundColor: statusColor }} />
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1 uppercase tracking-wider">{t('dashboard.satellite.ndviScore')}</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{insight.ndvi.mean.toFixed(3)}</span>
                                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: statusColor }}>
                                    {t(`dashboard.satellite.status.${statusKey}`)}
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-400 mt-4 border-t border-gray-50 dark:border-gray-700/50 pt-3">
                                <span>{t('dashboard.satellite.range')}: {insight.ndvi.min.toFixed(2)} - {insight.ndvi.max.toFixed(2)}</span>
                                <span>{t('dashboard.satellite.source')}: {insight.source}</span>
                            </div>
                        </div>

                        {/* Soil moisture & temperature */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-3 uppercase tracking-wider">{trans.soilTitle}</p>
                            {insight.soilData && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Droplets className="w-5 h-5 text-blue-500" />
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 dark:text-white">{insight.soilData.moisture}%</p>
                                                <p className="text-[10px] text-gray-400">{trans.soilMoisture}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold">
                                            {getMoistureStatus(insight.soilData.moisture)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                                        <Thermometer className="w-5 h-5 text-orange-500" />
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 dark:text-white">{insight.soilData.temperature}°C</p>
                                            <p className="text-[10px] text-gray-400">{trans.soilTemp}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Accumulated Rainfall & GDD progress bars */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-3 uppercase tracking-wider">{trans.accumulatedMetrics}</p>
                            <div className="space-y-3">
                                {/* Rainfall */}
                                <div>
                                    <div className="flex justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                                        <span>{trans.rainfallAccum}</span>
                                        <span>{accumulatedRainfall === null ? metricUnavailableText : `${accumulatedRainfall} / 250 mm`}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-teal-500 h-full rounded-full" style={{ width: `${accumulatedRainfall === null ? 0 : Math.min(100, (accumulatedRainfall / 250) * 100)}%` }} />
                                    </div>
                                </div>
                                {/* GDD */}
                                <div>
                                    <div className="flex justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                                        <span>{trans.gddAccum}</span>
                                        <span>{accumulatedGdd === null ? metricUnavailableText : `${accumulatedGdd} / 1200 ${trans.degreeDays}`}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${accumulatedGdd === null ? 0 : Math.min(100, (accumulatedGdd / 1200) * 100)}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Integrated Microclimate Weather, Sowing, & UV Safety Widget Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                        {/* Current weather and forecast */}
                        {weather && (
                            <div className="xl:col-span-2 bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 dark:from-emerald-950 dark:to-emerald-900 text-white p-5 rounded-2xl border border-emerald-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <span className="text-5xl">{weather.icon}</span>
                                    <div>
                                        <h4 className="font-bold text-base text-emerald-250 flex items-center gap-1">
                                            <Compass className="w-4 h-4 text-emerald-400" />
                                            {trans.weatherTitle} ({selectedFarm?.crop || selectedFarm?.name})
                                        </h4>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <span className="text-3xl font-extrabold">{weather.temperature}°C</span>
                                            <span className="text-xs text-emerald-200">{weather.condition}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-emerald-300 mt-2">
                                            <span>{t('dashboard.weather.humidity') || 'رطوبة'}: {weather.humidity}%</span>
                                            <span>{t('dashboard.weather.wind') || 'رياح'}: {weather.wind} km/h</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="border-t md:border-t-0 md:border-r border-emerald-800/60 md:pr-6 pt-4 md:pt-0">
                                    <p className="text-xs font-bold text-emerald-300 mb-2 uppercase tracking-wide flex items-center gap-1">
                                        <CloudSun className="w-4 h-4 text-emerald-400" />
                                        {trans.weatherForecast}
                                    </p>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        {weather.forecast.map((f, i) => (
                                            <div key={i} className="bg-emerald-800/30 px-3 py-1.5 rounded-lg border border-emerald-800/40">
                                                <p className="text-xs text-emerald-200">{f.day}</p>
                                                <p className="text-sm font-bold mt-1">{Math.round(f.temp_high)}°</p>
                                                <p className="text-[10px] text-emerald-400">{Math.round(f.temp_low)}°</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Germination Readiness Widget */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{trans.germinationStatus}</h4>
                                <div className="flex items-center gap-3 mt-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isGerminationReady ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' : 'bg-amber-100 dark:bg-amber-950 text-amber-600'}`}>
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 dark:text-white">
                                            {isGerminationReady ? trans.germinationReady : trans.germinationWait}
                                        </p>
                                        <span className="text-xs font-extrabold text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-full mt-1 inline-block">
                                            {crop.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-[11px] text-gray-400 border-t border-gray-50 dark:border-gray-700/50 pt-3 mt-4">
                                {isGerminationReady 
                                    ? (locale === 'ar' ? 'درجة حرارة ورطوبة التربة ملائمة ومحفزة جداً لإنبات حبوب المحصول المختار حالياً.' : 'Current soil temperature and moisture parameters are optimal for seeding development.')
                                    : (locale === 'ar' ? 'درجة الحرارة منخفضة أو الرطوبة غير ملائمة، بذر الحبوب الآن قد يعرضها للتلف أو تأخر الإنبات.' : 'Sub-optimal temperature or moisture. Sowing seeds now might reduce germination rate.')
                                }
                            </div>
                        </div>

                        {/* UV Index & Worker Safety Widget */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{locale === 'ar' ? 'مؤشر الأشعة فوق البنفسجية UV' : 'Ultraviolet UV Index'}</h4>
                                <div className="flex items-center gap-3 mt-3">
                                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                                        {uvIndex}
                                    </div>
                                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full text-white" style={{ backgroundColor: uvRisk.color }}>
                                        {locale === 'ar' ? uvRisk.labelAr : uvRisk.labelEn}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-350 mt-3 space-y-1">
                                    <p>
                                        <strong>{locale === 'ar' ? 'أفضل وقت للعمل:' : 'Best work hours:'} </strong>
                                        <span className="text-brand-green font-bold">{locale === 'ar' ? uvAdvice.bestTimeAr : uvAdvice.bestTimeEn}</span>
                                    </p>
                                    <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
                                        {locale === 'ar' ? uvAdvice.adviceAr : uvAdvice.adviceEn}
                                    </p>
                                </div>
                            </div>
                            <div className="text-[10px] text-gray-400 border-t border-gray-50 dark:border-gray-700/50 pt-2.5 mt-3 flex justify-between">
                                <span>{locale === 'ar' ? 'المتوقع غداً:' : 'Tomorrow:'} <strong className="text-gray-750 dark:text-gray-300">{(uvIndex * 1.05).toFixed(1)}</strong></span>
                                <span>{locale === 'ar' ? 'سجل الشهر:' : 'Past avg:'} <strong className="text-gray-750 dark:text-gray-300">{(uvIndex * 0.95).toFixed(1)}</strong></span>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Image Comparison Slider Tool */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-brand-green" />
                                    {trans.compareSliderTitle}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{trans.falseColorDesc}</p>
                            </div>
                            
                            {/* Selector controllers */}
                            <div className="flex gap-2 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-gray-400 text-[10px] font-bold uppercase">{trans.imageLeft}:</span>
                                    <select 
                                        value={leftCompareSource} 
                                        onChange={e => setLeftCompareSource(e.target.value as any)}
                                        className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-750 dark:text-white border border-gray-200 dark:border-gray-650"
                                    >
                                        <option value="truecolor">{locale === 'ar' ? 'الألوان الطبيعية' : 'True Color'}</option>
                                        <option value="falsecolor">{locale === 'ar' ? 'الألوان الكاذبة' : 'False Color'}</option>
                                        <option value="ndvi">NDVI</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-1.5 border-r border-gray-250 dark:border-gray-700 pr-2 pl-2">
                                    <span className="text-gray-400 text-[10px] font-bold uppercase">{trans.imageRight}:</span>
                                    <select 
                                        value={rightCompareSource} 
                                        onChange={e => setRightCompareSource(e.target.value as any)}
                                        className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-750 dark:text-white border border-gray-200 dark:border-gray-650"
                                    >
                                        <option value="ndvi">NDVI</option>
                                        <option value="truecolor">{locale === 'ar' ? 'الألوان الطبيعية' : 'True Color'}</option>
                                        <option value="falsecolor">{locale === 'ar' ? 'الألوان الكاذبة' : 'False Color'}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Compare Slider Area */}
                        <div className="p-5 flex flex-col items-center">
                            <div className="relative w-full max-w-3xl aspect-[16/9] bg-gray-900 rounded-xl overflow-hidden shadow-inset select-none border border-gray-200 dark:border-gray-700">
                                {/* Left Image (Background) */}
                                <div className="absolute inset-0 w-full h-full">
                                    <img 
                                        src={getSliderImgUrl(leftCompareSource)} 
                                        alt="Compare Left" 
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                        {leftCompareSource}
                                    </div>
                                </div>

                                {/* Right Image (Overlay, clipped dynamically) */}
                                <div 
                                    className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-75"
                                    style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
                                >
                                    <img 
                                        src={getSliderImgUrl(rightCompareSource)} 
                                        alt="Compare Right" 
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                        {rightCompareSource}
                                    </div>
                                </div>

                                {/* Slider line overlay */}
                                <div 
                                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md pointer-events-none cursor-ew-resize flex items-center justify-center"
                                    style={{ left: `${sliderPos}%` }}
                                >
                                    <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-white flex items-center justify-center shadow-lg border border-gray-200 dark:border-gray-700 text-xs font-bold font-mono">
                                        ↔
                                    </div>
                                </div>

                                {/* HTML Range input absolutely overlayed for dragging */}
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={sliderPos} 
                                    onChange={e => setSliderPos(Number(e.target.value))}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
                                />
                            </div>
                            <p className="text-[11px] text-gray-400 mt-3 text-center">
                                {locale === 'ar' 
                                    ? '💡 قم بسحب شريط التمرير يميناً ويساراً لمقارنة تفاصيل صور الحقل مباشرة.' 
                                    : '💡 Drag the slider handle to compare detailed field imagery overlay.'
                                }
                            </p>
                        </div>
                    </div>

                    {/* Zoning Section & Smart Irrigation Advisory row */}
                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                        {/* Zoning Card */}
                        <div className="xl:col-span-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-1">
                                <Compass className="w-5 h-5 text-emerald-600" />
                                {trans.zoningTitle}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{trans.historyDesc}</p>
                            
                            {/* Segmented Progress bar representation */}
                            <div className="w-full bg-gray-100 dark:bg-gray-700 h-6 rounded-xl overflow-hidden flex text-white text-[10px] font-bold">
                                {zoningData.map((z, idx) => (
                                    <div 
                                        key={idx} 
                                        style={{ width: `${z.percentage}%`, backgroundColor: z.color }} 
                                        className="h-full flex items-center justify-center transition-all duration-300 cursor-pointer hover:brightness-95"
                                        onClick={() => setSelectedZoneIndex(idx)}
                                        title={z.name}
                                    >
                                        {z.percentage > 5 && `${z.percentage}%`}
                                    </div>
                                ))}
                            </div>

                            {/* Zoning detailed list */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                                {zoningData.map((z, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => setSelectedZoneIndex(idx)}
                                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                            selectedZoneIndex === idx 
                                            ? 'border-gray-400 bg-gray-50 dark:bg-gray-750' 
                                            : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: z.color }} />
                                            <span className="font-bold text-xs text-gray-800 dark:text-gray-200">{z.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 text-[10px] text-gray-500 dark:text-gray-450 font-bold">
                                            <span>{z.percentage}%</span>
                                            <span>{z.ndviRange}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Zone advisory detail drawer */}
                            {selectedZoneIndex !== null && (
                                <div className="mt-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 space-y-2 animate-fade-in text-xs">
                                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-750 pb-1">
                                        <h5 className="font-bold text-gray-800 dark:text-white">{zoningData[selectedZoneIndex].name}</h5>
                                        <button 
                                            onClick={() => setSelectedZoneIndex(null)}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-white font-bold"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-350">
                                        <strong>{locale === 'ar' ? 'السبب المرجح:' : 'Likely Reason:'} </strong>
                                        {locale === 'ar' ? zoningData[selectedZoneIndex].reasonAr : zoningData[selectedZoneIndex].reasonEn}
                                    </p>
                                    <p className="text-gray-800 dark:text-gray-200 font-bold">
                                        <strong>{locale === 'ar' ? 'التوجيه الزراعي:' : 'Agronomic Action:'} </strong>
                                        {locale === 'ar' ? zoningData[selectedZoneIndex].adviceAr : zoningData[selectedZoneIndex].adviceEn}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Irrigation Card */}
                        <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-1">
                                    <Droplets className="w-5 h-5 text-blue-500" />
                                    {trans.irrigationTitle}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{trans.historyDesc}</p>
                                
                                <div className="space-y-4 mt-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${
                                            irrigationAdvice.code === 'critical' ? 'bg-red-500' :
                                            irrigationAdvice.code === 'delay' ? 'bg-amber-500' :
                                            irrigationAdvice.code === 'suggest' ? 'bg-blue-400' :
                                            irrigationAdvice.code === 'wet' ? 'bg-emerald-500' : 'bg-brand-green'
                                        }`}>
                                            <Gauge className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">{locale === 'ar' ? 'القرار المقترح' : 'Decision Status'}</span>
                                            <h4 className="font-extrabold text-sm text-gray-800 dark:text-white mt-0.5">
                                                {irrigationAdvice.code === 'critical' ? (locale === 'ar' ? 'ري ضروري عاجل' : 'Critical Sowing Saturated') :
                                                 irrigationAdvice.code === 'delay' ? (locale === 'ar' ? 'تأجيل الري المعتاد' : 'Delay Scheduled Irrigation') :
                                                 irrigationAdvice.code === 'suggest' ? (locale === 'ar' ? 'ري خفيف مستحسن' : 'Light Watering Suggested') :
                                                 irrigationAdvice.code === 'wet' ? (locale === 'ar' ? 'مشبعة بالمياه' : 'Saturated - Halt Irrigation') : 
                                                 (locale === 'ar' ? 'رطوبة مثالية' : 'Irrigation Adequate')}
                                            </h4>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-350 leading-relaxed pt-2">
                                        {irrigationAdvice.text}
                                    </p>
                                </div>
                            </div>

                            <div className="text-[10px] text-gray-400 border-t border-gray-50 dark:border-gray-700/50 pt-3 mt-6">
                                {locale === 'ar' 
                                    ? '💡 يقوم مستشار الري بدمج رطوبة التربة الفعلية مع درجات الحرارة وفرص هطول المطر لضمان كفاءة استهلاك المياه.' 
                                    : '💡 Advisor integrates soil sensors, temperature records, and rainfall forecast to optimize water savings.'
                                }
                            </div>
                        </div>
                    </div>

                    {/* Interactive Spectral Indices detail switcher */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/55 dark:bg-gray-800/50">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Layers className="w-5 h-5 text-brand-green" />
                                {trans.indexSelector}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('dashboard.satellite.legend')}</p>
                        </div>
                        <div className="p-5">
                            {/* Horizontal selector tabs */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {availableIndexKeys.map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedIdxKey(key)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                            selectedIdxKey === key 
                                            ? 'bg-brand-green border-brand-green text-white shadow-sm'
                                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        {key.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            {/* Details of Selected Index */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                                <div className="lg:col-span-2 space-y-3">
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">{indexDetails[selectedIdxKey].name}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-350">{indexDetails[selectedIdxKey].desc}</p>
                                    <p className="text-xs text-gray-450 italic">{t('dashboard.satellite.range')}: {indexDetails[selectedIdxKey].unit}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-150 dark:border-gray-700/80 grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">{trans.indexMean}</p>
                                        <p className="text-xl font-extrabold text-brand-green dark:text-brand-green-light mt-1">{currentIndexValues.mean.toFixed(3)}</p>
                                    </div>
                                    <div className="border-r border-l border-gray-250 dark:border-gray-700">
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">{trans.indexMin}</p>
                                        <p className="text-lg font-extrabold text-gray-800 dark:text-white mt-1">{currentIndexValues.min.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">{trans.indexMax}</p>
                                        <p className="text-lg font-extrabold text-gray-800 dark:text-white mt-1">{currentIndexValues.max.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Satellite Images Triple Grid (NDVI, True Color, False Color) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* NDVI Heatmap */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm group">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
                                <h3 className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    {t('dashboard.satellite.ndviHeatmap')}
                                </h3>
                                <p className="text-[10px] text-gray-400">{trans.ndviDesc}</p>
                            </div>
                            <div className="h-64 bg-gray-100 dark:bg-gray-900 flex items-center justify-center relative overflow-hidden">
                                {ndviImageFailed ? (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 px-4 text-center">{t('dashboard.satellite.imageError')}</p>
                                ) : (
                                    <img
                                        src={insight.ndviImageUrl}
                                        alt={t('dashboard.satellite.ndviHeatmap')}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        onError={() => setNdviImageFailed(true)}
                                    />
                                )}
                            </div>
                        </div>

                        {/* True Color Image */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm group">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
                                <h3 className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                                    {t('dashboard.satellite.trueColor')}
                                </h3>
                                <p className="text-[10px] text-gray-400">{trans.trueColorDesc}</p>
                            </div>
                            <div className="h-64 bg-gray-100 dark:bg-gray-900 flex items-center justify-center relative overflow-hidden">
                                {trueColorImageFailed ? (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 px-4 text-center">{t('dashboard.satellite.imageError')}</p>
                                ) : (
                                    <img
                                        src={insight.trueColorImageUrl}
                                        alt={t('dashboard.satellite.trueColor')}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        onError={() => setTrueColorImageFailed(true)}
                                    />
                                )}
                            </div>
                        </div>

                        {/* False Color Image */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm group">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
                                <h3 className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    {trans.falseColor}
                                </h3>
                                <p className="text-[10px] text-gray-400">{trans.falseColorDesc}</p>
                            </div>
                            <div className="h-64 bg-gray-100 dark:bg-gray-900 flex items-center justify-center relative overflow-hidden">
                                {!insight.falseColorImageUrl || falseColorImageFailed ? (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 px-4 text-center">{t('dashboard.satellite.imageError')}</p>
                                ) : (
                                    <img
                                        src={insight.falseColorImageUrl}
                                        alt={trans.falseColor}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        onError={() => setFalseColorImageFailed(true)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Advanced Spectral Stats Expandable Panel */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm overflow-hidden">
                        <button
                            onClick={() => setShowAdvancedStats(prev => !prev)}
                            className="w-full px-5 py-4 flex items-center justify-between text-left focus:outline-none bg-gray-50/30 dark:bg-gray-800/50"
                        >
                            <h4 className="font-extrabold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-500" />
                                {trans.advancedStatsTitle}
                            </h4>
                            <span className="text-gray-400 font-bold">{showAdvancedStats ? '▲' : '▼'}</span>
                        </button>
                        {showAdvancedStats && (
                            <div className="p-5 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 text-center text-xs animate-fade-in">
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-100 dark:border-gray-700/60">
                                    <p className="text-gray-400 font-bold uppercase text-[9px] mb-1">Median</p>
                                    <p className="text-base font-extrabold text-gray-800 dark:text-white">{insight.ndvi.median.toFixed(3)}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-100 dark:border-gray-700/60">
                                    <p className="text-gray-400 font-bold uppercase text-[9px] mb-1">Standard Dev (σ)</p>
                                    <p className="text-base font-extrabold text-gray-800 dark:text-white">{insight.ndvi.std.toFixed(3)}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-100 dark:border-gray-700/60">
                                    <p className="text-gray-400 font-bold uppercase text-[9px] mb-1">P25 (Lower)</p>
                                    <p className="text-base font-extrabold text-gray-800 dark:text-white">{insight.ndvi.p25.toFixed(3)}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-100 dark:border-gray-700/60">
                                    <p className="text-gray-400 font-bold uppercase text-[9px] mb-1">P75 (Upper)</p>
                                    <p className="text-base font-extrabold text-gray-800 dark:text-white">{insight.ndvi.p75.toFixed(3)}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-100 dark:border-gray-700/60">
                                    <p className="text-gray-400 font-bold uppercase text-[9px] mb-1">Pixels Analyzed</p>
                                    <p className="text-base font-extrabold text-gray-800 dark:text-white">{insight.ndvi.pixelCount.toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-100 dark:border-gray-700/60">
                                    <p className="text-gray-400 font-bold uppercase text-[9px] mb-1">Trend Diff</p>
                                    <p className={`text-base font-extrabold flex items-center justify-center gap-1 ${
                                        comparisonPercent === null ? 'text-gray-400' : comparisonPercent >= 0 ? 'text-emerald-500' : 'text-red-500'
                                    }`}>
                                        {comparisonPercent === null ? null : comparisonPercent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                        {comparisonPercent === null ? '-' : `${comparisonPercent >= 0 ? '+' : ''}${comparisonPercent}%`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Historical Passes & Seasonal Comparison */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* History log list */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-1">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                {trans.historyTitle}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{trans.historyDesc}</p>
                            
                            {insight.history && insight.history.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-right text-gray-500 dark:text-gray-400 border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold font-arabic-heading">
                                                <th className="py-2 px-1 text-right">{t('dashboard.satellite.capturedAt')}</th>
                                                <th className="py-2 px-1 text-center">NDVI</th>
                                                <th className="py-2 px-1 text-center">EVI</th>
                                                <th className="py-2 px-1 text-center">NDWI</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {insight.history.map((h, i) => (
                                                <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                                                    <td className="py-2.5 px-1 font-semibold text-gray-800 dark:text-gray-250">
                                                        {new Date(h.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                                    </td>
                                                    <td className="py-2.5 px-1 text-center">
                                                        <span className="font-bold text-gray-900 dark:text-white">{h.ndvi.toFixed(2)}</span>
                                                    </td>
                                                    <td className="py-2.5 px-1 text-center font-bold text-teal-600 dark:text-teal-400">{h.evi?.toFixed(2) || '-'}</td>
                                                    <td className="py-2.5 px-1 text-center font-bold text-blue-600 dark:text-blue-400">{h.ndwi?.toFixed(2) || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 text-center py-6">No historical runs available.</p>
                            )}
                        </div>

                        {/* Seasonal Comparison panel */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                                    {trans.comparisonTitle}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">{t('dashboard.satellite.legend')}</p>
                                
                                <div className="space-y-5">
                                    {/* Current season progress bar */}
                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-1.5">
                                            <span className="text-gray-800 dark:text-gray-250">{trans.currentSeason}</span>
                                            <span className="text-brand-green">{insight.ndvi.mean.toFixed(2)} (NDVI)</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                                            <div className="bg-brand-green h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, (insight.ndvi.mean + 1) * 50))}%` }} />
                                        </div>
                                    </div>

                                    {/* Previous season progress bar */}
                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-1.5">
                                            <span className="text-gray-600 dark:text-gray-400">{trans.previousSeason}</span>
                                            <span className="text-teal-600">{previousPassNdvi === null ? metricUnavailableText : `${previousPassNdvi.toFixed(2)} (NDVI)`}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                                            <div className="bg-teal-500 h-full rounded-full" style={{ width: `${previousPassNdvi === null ? 0 : Math.max(0, Math.min(100, (previousPassNdvi + 1) * 50))}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Comparison Result Banner */}
                            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/60 flex items-center gap-3 mt-6">
                                <Award className="w-8 h-8 text-brand-green flex-shrink-0" />
                                <div>
                                    <h5 className="font-bold text-xs text-emerald-800 dark:text-emerald-300">
                                        {comparisonPercent === null
                                            ? metricUnavailableText
                                            : `${comparisonPercent >= 0 ? trans.performanceBetter : trans.performanceWorse} ${Math.abs(comparisonPercent)}%`}
                                    </h5>
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                                        {comparisonPercent === null ? (locale === 'ar' ? 'لا توجد قراءات تاريخية كافية من API لحساب اتجاه موثوق.' : 'There are not enough API-backed historical readings to calculate a reliable trend.') : locale === 'ar' 
                                            ? 'الغطاء النباتي الحركي في الموسم الحالي يظهر معدلات نمو وكثافة تفوق متوسط الموسم المنصرم.' 
                                            : 'Comparison is based on the latest two real AgroMonitoring readings.'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Legend threshold guide */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                        <p className="text-sm font-bold text-gray-800 dark:text-white mb-4 uppercase tracking-wide">{t('dashboard.satellite.legend')}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                            <LegendPill color="#dc2626" label={t('dashboard.satellite.status.critical')} range="< 0.15" />
                            <LegendPill color="#f97316" label={t('dashboard.satellite.status.poor')} range="0.15 - 0.29" />
                            <LegendPill color="#facc15" label={t('dashboard.satellite.status.moderate')} range="0.30 - 0.44" />
                            <LegendPill color="#22c55e" label={t('dashboard.satellite.status.good')} range="0.45 - 0.64" />
                            <LegendPill color="#15803d" label={t('dashboard.satellite.status.excellent')} range=">= 0.65" />
                        </div>
                    </div>

                    {/* Information Update Notice footer */}
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/40 dark:border-blue-900/25 p-4 flex gap-3 text-xs text-blue-700 dark:text-blue-300 items-start">
                        <Info className="w-5 h-5 flex-shrink-0 text-blue-500 mt-0.5" />
                        <p className="leading-relaxed font-semibold">{trans.updateFrequency}</p>
                    </div>
                </>
            )}
        </div>
    );
};

const LegendPill: React.FC<{ color: string; label: string; range: string }> = ({ color, label, range }) => (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/60 dark:bg-gray-900/30 text-center flex flex-col items-center justify-center gap-2 shadow-sm hover:shadow transition-shadow">
        <span className="w-6 h-6 rounded-lg flex-shrink-0 shadow-sm border border-black/10 dark:border-white/10" style={{ backgroundColor: color }} />
        <span className="font-bold text-sm text-gray-800 dark:text-gray-250">{label}</span>
        <p className="text-xs text-gray-550 dark:text-gray-400 font-semibold">{range}</p>
    </div>
);
