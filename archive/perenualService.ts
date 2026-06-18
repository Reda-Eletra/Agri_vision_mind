import type { GrowthGuideData, ScientificClassification } from '../types';

const PERENUAL_API_BASE = (import.meta.env.VITE_PERENUAL_API_BASE?.trim() || 'https://perenual.com/api').replace(/\/+$/, '');
const PERENUAL_API_KEY = import.meta.env.VITE_PERENUAL_API_KEY?.trim() || '';

interface PerenualSpecies {
    id: number;
    common_name?: string | null;
    scientific_name?: string[] | null;
    family?: string | null;
    genus?: string | null;
}

interface PerenualSpeciesListResponse {
    data?: PerenualSpecies[];
    message?: string;
}

interface PerenualSpeciesDetails extends PerenualSpecies {
    origin?: string[] | null;
    description?: string | null;
    cycle?: string | null;
    watering?: string | null;
    watering_general_benchmark?: {
        value?: string | number | null;
        unit?: string | null;
    } | null;
    sunlight?: string[] | null;
    soil?: string[] | null;
    pruning_month?: string[] | null;
    pruning_count?: {
        amount?: number | null;
        interval?: string | null;
    } | null;
    propagation?: string[] | null;
    hardiness?: {
        min?: string | number | null;
        max?: string | number | null;
    } | null;
    flowering_season?: string | null;
    pest_susceptibility?: string[] | string | null;
    growth_rate?: string | null;
    maintenance?: string | null;
    care_level?: string | null;
    medicinal?: boolean | number | null;
    edible_fruit?: boolean | number | null;
    edible_leaf?: boolean | number | null;
    cuisine?: boolean | number | null;
    poisonous_to_humans?: boolean | number | null;
    poisonous_to_pets?: boolean | number | null;
    attracts?: string[] | null;
    drought_tolerant?: boolean | number | null;
}

interface PerenualDiseaseResponse {
    data?: Array<{
        common_name?: string | null;
    }>;
}

const normalize = (value: string): string => value.trim().toLowerCase();

const toStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
    }
    return [];
};

const toBoolean = (value: unknown): boolean | null => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === '1' || normalized === 'true' || normalized === 'yes') return true;
        if (normalized === '0' || normalized === 'false' || normalized === 'no') return false;
    }
    return null;
};

const buildNotFoundGuide = (plantName: string): GrowthGuideData => ({
    found: false,
    plantName,
    scientificName: '',
    scientificClassification: {
        kingdom: '',
        order: '',
        family: '',
        genus: '',
        species: ''
    },
    origin: '',
    description: '',
    plantingInstructions: [],
    careDetails: {
        watering: '',
        sunlight: '',
        soil: '',
        fertilizer: '',
        pruning: '',
        pestsAndDiseases: ''
    },
    healthBenefits: [],
    culinaryUses: [],
    culturalSignificance: '',
    toxicity: '',
    funFacts: []
});

const buildApiUrl = (path: string, params: Record<string, string | number | undefined> = {}): string => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${PERENUAL_API_BASE}${normalizedPath}`);
    url.searchParams.set('key', PERENUAL_API_KEY);

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        const stringValue = String(value).trim();
        if (!stringValue) return;
        url.searchParams.set(key, stringValue);
    });

    return url.toString();
};

const requestPerenual = async <T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> => {
    const response = await fetch(buildApiUrl(path, params));

    if (!response.ok) {
        let details = '';
        try {
            const payload = await response.json() as { message?: string };
            details = payload.message || '';
        } catch {
            details = '';
        }
        throw new Error(`Perenual API request failed (${response.status})${details ? `: ${details}` : ''}`);
    }

    return response.json() as Promise<T>;
};

const pickBestMatch = (query: string, species: PerenualSpecies[]): PerenualSpecies | null => {
    if (!species.length) return null;
    const normalizedQuery = normalize(query);

    const scored = species.map((item) => {
        const commonName = item.common_name?.trim() || '';
        const scientific = toStringArray(item.scientific_name);
        const names = [commonName, ...scientific].filter(Boolean);
        const normalizedNames = names.map(normalize);

        let score = 100;
        if (normalizedNames.includes(normalizedQuery)) score = 0;
        else if (normalizedNames.some((name) => name.startsWith(normalizedQuery))) score = 1;
        else if (normalizedNames.some((name) => name.includes(normalizedQuery))) score = 2;

        return { item, score };
    });

    scored.sort((a, b) => a.score - b.score || a.item.id - b.item.id);
    return scored[0]?.item || null;
};

const buildClassification = (details: PerenualSpeciesDetails): ScientificClassification => {
    const scientificName = toStringArray(details.scientific_name)[0] || '';
    const parts = scientificName.split(/\s+/).filter(Boolean);
    const genus = details.genus?.trim() || parts[0] || '';
    const species = parts.length > 1 ? parts.slice(1).join(' ') : '';

    return {
        kingdom: 'Plantae',
        order: '',
        family: details.family?.trim() || '',
        genus,
        species
    };
};

const buildWateringText = (details: PerenualSpeciesDetails): string => {
    const level = details.watering?.trim();
    const benchmarkValue = details.watering_general_benchmark?.value;
    const benchmarkUnit = details.watering_general_benchmark?.unit?.trim();

    const parts: string[] = [];
    if (level) parts.push(`Watering level: ${level}.`);
    if (benchmarkValue !== undefined && benchmarkValue !== null) {
        const schedule = benchmarkUnit ? `${benchmarkValue} ${benchmarkUnit}` : String(benchmarkValue);
        parts.push(`General benchmark: every ${schedule}.`);
    }
    if (toBoolean(details.drought_tolerant)) {
        parts.push('This plant is drought tolerant once established.');
    }

    return parts.join(' ').trim() || 'Keep soil evenly moist and avoid overwatering.';
};

const buildSunlightText = (details: PerenualSpeciesDetails): string => {
    const sunlight = toStringArray(details.sunlight);
    if (!sunlight.length) return 'Provide bright indirect to direct light based on local climate.';
    return `Best sunlight conditions: ${sunlight.join(', ')}.`;
};

const buildSoilText = (details: PerenualSpeciesDetails): string => {
    const soil = toStringArray(details.soil);
    if (!soil.length) return 'Use well-drained, nutrient-rich soil.';
    return `Preferred soil: ${soil.join(', ')}.`;
};

const buildFertilizerText = (details: PerenualSpeciesDetails): string => {
    const growthRate = details.growth_rate?.trim();
    const careLevel = details.care_level?.trim() || details.maintenance?.trim();

    if (growthRate && growthRate.toLowerCase().includes('high')) {
        return 'Use a balanced fertilizer every 2-4 weeks during active growth.';
    }
    if (careLevel && careLevel.toLowerCase().includes('low')) {
        return 'Feed lightly once per month during the growing season.';
    }
    return 'Apply a balanced fertilizer every 3-4 weeks in spring and summer.';
};

const buildPruningText = (details: PerenualSpeciesDetails): string => {
    const pruningMonths = toStringArray(details.pruning_month);
    const pruningAmount = details.pruning_count?.amount;
    const pruningInterval = details.pruning_count?.interval?.trim();

    const parts: string[] = [];
    if (pruningMonths.length) parts.push(`Best pruning months: ${pruningMonths.join(', ')}.`);
    if (pruningAmount !== undefined && pruningAmount !== null && pruningInterval) {
        parts.push(`Recommended frequency: ${pruningAmount} time(s) ${pruningInterval}.`);
    }

    return parts.join(' ').trim() || 'Prune dead or weak growth to improve airflow and shape.';
};

const buildPestsText = (details: PerenualSpeciesDetails, diseaseNames: string[]): string => {
    const pests = toStringArray(details.pest_susceptibility);
    const combined = [...pests, ...diseaseNames].filter(Boolean);
    const deduplicated = Array.from(new Set(combined.map((item) => item.trim())));

    if (!deduplicated.length) {
        return 'Monitor regularly for leaf spots, root rot, aphids, and fungal issues.';
    }

    return `Common issues to watch: ${deduplicated.slice(0, 6).join(', ')}.`;
};

const buildPlantingInstructions = (details: PerenualSpeciesDetails): string[] => {
    const sunlight = toStringArray(details.sunlight);
    const soil = toStringArray(details.soil);
    const propagation = toStringArray(details.propagation);
    const hardinessMin = details.hardiness?.min;
    const hardinessMax = details.hardiness?.max;

    const instructions: string[] = [];
    instructions.push(`Choose a planting location${sunlight.length ? ` with ${sunlight.join(', ')} exposure` : ''}.`);
    instructions.push(`Prepare${soil.length ? ` ${soil.join(', ')} ` : ' '}soil and ensure good drainage before planting.`);
    if (hardinessMin !== undefined && hardinessMin !== null && hardinessMax !== undefined && hardinessMax !== null) {
        instructions.push(`Plant in suitable hardiness zones ${hardinessMin}-${hardinessMax} for best establishment.`);
    } else {
        instructions.push('Plant during mild weather and avoid extreme heat or frost periods.');
    }
    if (propagation.length) {
        instructions.push(`Typical propagation methods: ${propagation.join(', ')}.`);
    } else {
        instructions.push('Water deeply after planting and keep moisture stable until roots establish.');
    }

    return instructions.slice(0, 5);
};

const buildHealthBenefits = (details: PerenualSpeciesDetails): string[] => {
    const benefits: string[] = [];

    if (toBoolean(details.medicinal)) {
        benefits.push('Traditionally noted for medicinal value in some regions.');
    }

    const attracts = toStringArray(details.attracts);
    if (attracts.length) {
        benefits.push(`Supports biodiversity by attracting ${attracts.join(', ')}.`);
    }

    if (toBoolean(details.drought_tolerant)) {
        benefits.push('Suitable for water-wise and low-irrigation landscapes.');
    }

    if (!benefits.length) {
        benefits.push('Adds greenery and improves microclimate in gardens and farms.');
    }

    return benefits;
};

const buildCulinaryUses = (details: PerenualSpeciesDetails): string[] => {
    const uses: string[] = [];

    if (toBoolean(details.edible_fruit)) uses.push('Fruit may be edible when mature.');
    if (toBoolean(details.edible_leaf)) uses.push('Leaves may have culinary use in specific traditions.');
    if (toBoolean(details.cuisine)) uses.push('Recognized for culinary applications.');

    if (!uses.length) {
        uses.push('Primarily grown for botanical or ornamental value rather than food use.');
    }

    return uses;
};

const buildCulturalSignificance = (details: PerenualSpeciesDetails): string => {
    const cycle = details.cycle?.trim();
    const flowering = details.flowering_season?.trim();
    const growthRate = details.growth_rate?.trim();
    const parts: string[] = [];

    if (cycle) parts.push(`Life cycle: ${cycle}.`);
    if (flowering) parts.push(`Typical flowering season: ${flowering}.`);
    if (growthRate) parts.push(`Growth rate: ${growthRate}.`);

    return parts.join(' ').trim() || 'This species is commonly appreciated for its role in landscaping and plant collections.';
};

const buildToxicity = (details: PerenualSpeciesDetails): string => {
    const toxicToHumans = toBoolean(details.poisonous_to_humans);
    const toxicToPets = toBoolean(details.poisonous_to_pets);

    if (toxicToHumans || toxicToPets) {
        if (toxicToHumans && toxicToPets) return 'Potentially toxic to both humans and pets if ingested.';
        if (toxicToHumans) return 'Potentially toxic to humans if ingested.';
        return 'Potentially toxic to pets if ingested.';
    }

    return 'No major toxicity flags reported in the available dataset.';
};

const buildFunFacts = (details: PerenualSpeciesDetails): string[] => {
    const facts: string[] = [];

    if (details.cycle?.trim()) facts.push(`Cycle: ${details.cycle?.trim()}.`);
    if (details.growth_rate?.trim()) facts.push(`Growth rate: ${details.growth_rate?.trim()}.`);
    if (details.maintenance?.trim()) facts.push(`Maintenance level: ${details.maintenance?.trim()}.`);
    if (details.flowering_season?.trim()) facts.push(`Flowering season: ${details.flowering_season?.trim()}.`);

    const hardinessMin = details.hardiness?.min;
    const hardinessMax = details.hardiness?.max;
    if (hardinessMin !== undefined && hardinessMin !== null && hardinessMax !== undefined && hardinessMax !== null) {
        facts.push(`Hardiness zone range: ${hardinessMin}-${hardinessMax}.`);
    }

    if (!facts.length) {
        facts.push('This species has multiple cultivation traits documented in Perenual.');
    }

    return facts.slice(0, 6);
};

const getDiseaseHighlights = async (query: string): Promise<string[]> => {
    try {
        const response = await requestPerenual<PerenualDiseaseResponse>('/pest-disease-list', {
            q: query,
            page: 1
        });
        const names = (response.data || [])
            .map((item) => item.common_name?.trim() || '')
            .filter(Boolean);
        return Array.from(new Set(names)).slice(0, 4);
    } catch {
        return [];
    }
};

const mapDetailsToGrowthGuide = async (details: PerenualSpeciesDetails, fallbackPlantName: string): Promise<GrowthGuideData> => {
    const scientificName = toStringArray(details.scientific_name)[0] || '';
    const resolvedPlantName = details.common_name?.trim() || scientificName || fallbackPlantName;
    const diseaseHighlights = await getDiseaseHighlights(resolvedPlantName);

    return {
        found: true,
        plantName: resolvedPlantName,
        scientificName,
        scientificClassification: buildClassification(details),
        origin: toStringArray(details.origin).join(', ') || 'Unknown origin',
        description: details.description?.trim() || `${resolvedPlantName} is a documented species in the Perenual database.`,
        plantingInstructions: buildPlantingInstructions(details),
        careDetails: {
            watering: buildWateringText(details),
            sunlight: buildSunlightText(details),
            soil: buildSoilText(details),
            fertilizer: buildFertilizerText(details),
            pruning: buildPruningText(details),
            pestsAndDiseases: buildPestsText(details, diseaseHighlights)
        },
        healthBenefits: buildHealthBenefits(details),
        culinaryUses: buildCulinaryUses(details),
        culturalSignificance: buildCulturalSignificance(details),
        toxicity: buildToxicity(details),
        funFacts: buildFunFacts(details)
    };
};

export const hasPerenualApiKey = (): boolean => !!PERENUAL_API_KEY;

export const getGrowthGuideFromPerenual = async (plantName: string): Promise<GrowthGuideData | null> => {
    const trimmed = plantName.trim();
    if (!trimmed) return buildNotFoundGuide(plantName);
    if (!hasPerenualApiKey()) return null;

    const listResponse = await requestPerenual<PerenualSpeciesListResponse>('/v2/species-list', {
        q: trimmed,
        order: 'asc',
        page: 1
    });

    const speciesList = listResponse.data || [];
    const bestMatch = pickBestMatch(trimmed, speciesList);
    if (!bestMatch) return buildNotFoundGuide(trimmed);

    const details = await requestPerenual<PerenualSpeciesDetails>(`/v2/species/details/${bestMatch.id}`);
    return mapDetailsToGrowthGuide(details, trimmed);
};

export const getPlantNameSuggestionsFromPerenual = async (query: string): Promise<string[] | null> => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    if (!hasPerenualApiKey()) return null;

    const listResponse = await requestPerenual<PerenualSpeciesListResponse>('/v2/species-list', {
        q: trimmed,
        order: 'asc',
        page: 1
    });

    const names: string[] = [];
    (listResponse.data || []).forEach((item) => {
        const commonName = item.common_name?.trim();
        if (commonName) names.push(commonName);
        const scientificName = toStringArray(item.scientific_name)[0];
        if (scientificName) names.push(scientificName);
    });

    const deduped = Array.from(
        new Map(names.filter(Boolean).map((name) => [normalize(name), name])).values()
    );

    return deduped.slice(0, 5);
};
