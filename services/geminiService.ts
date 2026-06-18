/**
 * geminiService.ts
 * Gemini AI is used ONLY in two product areas:
 *   1. Plant Doctor screen (diagnosePlant, analyzeSoil, analyzeRealTimeFrame, analyzeGrowthFrame)
 *   2. Chat (text streamChat, voice connectToVoiceAssistant)
 *
 * All other analytics, schedules, guides, weather, news, etc. use backend/static services.
 */

import { GoogleGenAI, Type, Modality } from '@google/genai';
import type {
    PlantDiagnosis,
    SoilAnalysis,
    LiveAnalysisResult,
    GrowthAnalysisResult,
} from '../types';
import type { ChatMessage } from '../types';

// ─── API Key ──────────────────────────────────────────────────
const API_KEY_STORAGE_KEY = 'agri_vision_gemini_api_key';
const DEFAULT_TEXT_MODEL  = 'gemini-2.0-flash';
// Loaded from environment — never hardcoded in source
const ENV_GEMINI_API_KEY  = import.meta.env.VITE_GEMINI_API_KEY?.trim() || '';

let aiClient:  GoogleGenAI | null = null;
let lastApiKey = '';
let textModel  = DEFAULT_TEXT_MODEL;

// Whitelist of allowed language values injected into AI prompts.
// Prevents prompt injection via the language parameter.
const ALLOWED_LANGUAGES: Record<string, string> = {
  English: 'English',
  Arabic: 'Arabic',
  en: 'English',
  ar: 'Arabic',
};
const safeLanguage = (lang: string): string =>
  ALLOWED_LANGUAGES[lang] ?? 'English';

const CHAT_NAVIGATION_VIEWS = ['home', 'doctor', 'guide', 'dashboard', 'library', 'community', 'contact', 'news'] as const;
const DATE_TIME_QUERY_PATTERN = /\b(date|day|today|tomorrow|yesterday|time|clock|hour|month|year|what time|what's the time)\b|الوقت|الساع(?:ة|ه)|تاريخ|اليوم|بكرة|غد(?:ا|اً)|امبارح|أمس|شهر|سنة/i;

const getLocaleForLanguage = (language: string): string =>
    safeLanguage(language) === 'Arabic' ? 'ar-EG' : 'en-US';

const buildIsoDatePart = (date: Date, timeZone: string): string => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const year = parts.find(part => part.type === 'year')?.value ?? '0000';
    const month = parts.find(part => part.type === 'month')?.value ?? '01';
    const day = parts.find(part => part.type === 'day')?.value ?? '01';
    return `${year}-${month}-${day}`;
};

const buildIsoTimePart = (date: Date, timeZone: string): string => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const hour = parts.find(part => part.type === 'hour')?.value ?? '00';
    const minute = parts.find(part => part.type === 'minute')?.value ?? '00';
    const second = parts.find(part => part.type === 'second')?.value ?? '00';
    return `${hour}:${minute}:${second}`;
};

export const getCurrentDateTimeSnapshot = (language: string) => {
    const now = new Date();
    const locale = getLocaleForLanguage(language);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const dateLabel = new Intl.DateTimeFormat(locale, {
        timeZone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(now);

    const timeLabel = new Intl.DateTimeFormat(locale, {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    }).format(now);

    return {
        timeZone,
        isoDate: buildIsoDatePart(now, timeZone),
        isoTime24: buildIsoTimePart(now, timeZone),
        dateLabel,
        timeLabel,
        dateTimeLabel: `${dateLabel} ${timeLabel}`,
    };
};

const injectTemporalContextIntoMessage = (message: string, language: string): string => {
    if (!DATE_TIME_QUERY_PATTERN.test(message)) {
        return message;
    }

    const snapshot = getCurrentDateTimeSnapshot(language);
    return `Use this exact local time reference while answering:
- Time zone: ${snapshot.timeZone}
- Local date: ${snapshot.dateLabel}
- Local time: ${snapshot.timeLabel}
- ISO date: ${snapshot.isoDate}
- 24-hour time: ${snapshot.isoTime24}

User request:
${message}`;
};

const buildAgriculturalAssistantInstruction = (
    language: string,
    options?: { userName?: string; voiceMode?: boolean }
): string => {
    const resolvedLanguage = safeLanguage(language);
    const timeSnapshot = getCurrentDateTimeSnapshot(language);
    const userNameNote = options?.userName
        ? ` You are currently helping ${options.userName}. Address them by name only when it feels natural.`
        : '';
    const voiceNote = options?.voiceMode
        ? ' Speak naturally, keep responses short enough for voice, and ask at most one clarifying question when essential.'
        : ' Keep responses concise, practical, and easy to scan in the chat window.';

    return `You are Agricultural Vision Mind's trusted agricultural assistant.${userNameNote}
Respond in ${resolvedLanguage} unless the user explicitly asks for another language.
Give calm, actionable, safety-aware farming guidance that works for both farmers and agronomists.
If a diagnosis or recommendation is uncertain, say so clearly and avoid pretending certainty.
Current local date/time reference for this conversation:
- Time zone: ${timeSnapshot.timeZone}
- Local date: ${timeSnapshot.dateLabel}
- Local time: ${timeSnapshot.timeLabel}
- ISO date: ${timeSnapshot.isoDate}
- 24-hour time: ${timeSnapshot.isoTime24}
When the user asks about today's date, the current time, yesterday, tomorrow, or other relative time references, use this local reference directly and do not say that you lack access to the date or time.${voiceNote}`;
};

const mapChatHistoryToGeminiHistory = (history: ChatMessage[]) => {
    const normalized: Array<{ role: 'user' | 'model'; content: string }> = [];

    for (const entry of history) {
        const content = entry.content.trim();
        if (!content) continue;

        // The welcome banner is UI copy, not actual conversation history.
        if (normalized.length === 0 && entry.role === 'model') continue;

        const previous = normalized[normalized.length - 1];
        if (previous?.role === entry.role) {
            previous.content = `${previous.content}\n\n${content}`;
            continue;
        }

        normalized.push({ role: entry.role, content });
    }

    return normalized.map(({ role, content }) => ({
        role,
        parts: [{ text: content }],
    }));
};

const getApiKey = (): string => {
    if (typeof window === 'undefined') return ENV_GEMINI_API_KEY;
    return window.sessionStorage.getItem(API_KEY_STORAGE_KEY)?.trim() || ENV_GEMINI_API_KEY;
};

const getAiClient = (): GoogleGenAI => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('Gemini API key is missing.');
    if (!aiClient || lastApiKey !== apiKey) {
        aiClient  = new GoogleGenAI({ apiKey });
        lastApiKey = apiKey;
    }
    return aiClient;
};

export const hasGeminiApiKey = (): boolean => !!getApiKey();

export const setGeminiApiKey = (apiKey: string): boolean => {
    if (typeof window === 'undefined') return false;
    const trimmed = apiKey.trim();
    if (!trimmed) return false;
    window.sessionStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
    aiClient  = null;
    lastApiKey = '';
    return true;
};

export const clearGeminiApiKey = (): void => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(API_KEY_STORAGE_KEY);
    aiClient  = null;
    lastApiKey = '';
};

export const configureAiModel = (modelName: string): void => {
    textModel = modelName.trim() || DEFAULT_TEXT_MODEL;
};

const MAX_GEMINI_ATTEMPTS = 3;
const GEMINI_RETRY_BASE_DELAY_MS = 700;
const GEMINI_CACHE_PREFIX = 'agri_vision_gemini_cache_';
const RETRYABLE_GEMINI_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const getErrorStatus = (error: unknown): number | null => {
    const candidate = error as { status?: unknown; statusCode?: unknown; code?: unknown };
    const rawStatus = candidate?.status ?? candidate?.statusCode ?? candidate?.code;
    const parsed = Number.parseInt(String(rawStatus), 10);
    if (Number.isFinite(parsed)) return parsed;

    const message = error instanceof Error ? error.message : String(error);
    const match = message.match(/\b(408|429|500|502|503|504)\b/);
    return match ? Number.parseInt(match[1], 10) : null;
};

const isRetryableGeminiError = (error: unknown): boolean => {
    const status = getErrorStatus(error);
    if (status && RETRYABLE_GEMINI_STATUS_CODES.has(status)) return true;

    const message = error instanceof Error ? error.message : String(error);
    return /overloaded|unavailable|try again|resource_exhausted|deadline|timeout|temporarily/i.test(message);
};

const buildGeminiErrorMessage = (feature: string, error: unknown): string => {
    const status = getErrorStatus(error);
    const message = error instanceof Error ? error.message : String(error);
    const temporary =
        status === 503 ||
        status === 429 ||
        /overloaded|unavailable|resource_exhausted|temporarily/i.test(message);

    if (temporary) {
        return `${feature}: Gemini is temporarily busy. Please retry in a minute.`;
    }

    return `${feature}: ${message || 'Gemini request failed'}`;
};

const withGeminiRetry = async <T>(
    feature: string,
    run: () => Promise<T>,
    fallback?: () => T | null
): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt += 1) {
        try {
            return await run();
        } catch (error) {
            lastError = error;
            if (!isRetryableGeminiError(error) || attempt === MAX_GEMINI_ATTEMPTS) {
                break;
            }

            const jitter = Math.floor(Math.random() * 250);
            await sleep(GEMINI_RETRY_BASE_DELAY_MS * attempt + jitter);
        }
    }

    if (lastError && isRetryableGeminiError(lastError) && fallback) {
        const cached = fallback();
        if (cached) return cached;
    }

    throw new Error(buildGeminiErrorMessage(feature, lastError));
};

const hashText = (value: string): string => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
};

const buildImageCacheKey = (
    feature: string,
    language: string,
    images: { base64: string; mimeType: string }[]
): string => {
    const fingerprint = images
        .map(({ base64, mimeType }) => `${mimeType}:${base64.length}:${base64.slice(0, 80)}:${base64.slice(-80)}`)
        .join('|');
    return `${feature}_${safeLanguage(language)}_${hashText(fingerprint)}`;
};

const readGeminiCache = <T,>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.sessionStorage.getItem(GEMINI_CACHE_PREFIX + key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        return null;
    }
};

const writeGeminiCache = <T,>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(GEMINI_CACHE_PREFIX + key, JSON.stringify(value));
    } catch {
        // Cache is best effort only.
    }
};

// ─── 1. PLANT DOCTOR ─────────────────────────────────────────

export const diagnosePlant = async (
    images: { base64: string; mimeType: string }[],
    language: string
): Promise<PlantDiagnosis> => {
    const cacheKey = buildImageCacheKey('plant_diagnosis', language, images);
    const result = await withGeminiRetry(
        'Plant Doctor',
        async () => {
        const parts = images.map(img => ({
            inlineData: { mimeType: img.mimeType, data: img.base64 },
        }));

        const response = await getAiClient().models.generateContent({
            model: textModel,
            contents: {
                parts: [
                    ...parts,
                    { text: `Analyze this plant image for diseases or health issues. Provide a diagnosis in ${safeLanguage(language)}. Return JSON matching the schema.` },
                ],
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        plantName:         { type: Type.STRING },
                        isHealthy:         { type: Type.BOOLEAN },
                        healthPercentage:  { type: Type.NUMBER },
                        diseaseName:       { type: Type.STRING },
                        cause:             { type: Type.STRING },
                        symptoms:          { type: Type.ARRAY, items: { type: Type.STRING } },
                        treatment:         { type: Type.ARRAY, items: { type: Type.STRING } },
                        recommendedProducts: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    productName:  { type: Type.STRING },
                                    description:  { type: Type.STRING },
                                    type:         { type: Type.STRING },
                                },
                            },
                        },
                        prevention:        { type: Type.ARRAY, items: { type: Type.STRING } },
                        confidenceScore:   { type: Type.NUMBER },
                        visualCues:        { type: Type.STRING },
                        growthStage:       { type: Type.STRING },
                        growthStageReasoning: { type: Type.STRING },
                        humanConsumptionAdvisory: {
                            type: Type.OBJECT,
                            properties: {
                                isEdible:      { type: Type.BOOLEAN },
                                safetyStatus:  { type: Type.STRING, enum: ['safe', 'caution', 'toxic', 'unknown'] },
                                title:         { type: Type.STRING },
                                summary:       { type: Type.STRING },
                                symptoms:      { type: Type.ARRAY, items: { type: Type.STRING } },
                                severity:      { type: Type.STRING },
                                whatToDo:      { type: Type.STRING },
                            },
                        },
                        secondaryDiagnosis: {
                            type: Type.OBJECT,
                            properties: {
                                diseaseName:    { type: Type.STRING },
                                confidenceScore: { type: Type.NUMBER },
                                reasoning:      { type: Type.STRING },
                            },
                            nullable: true,
                        },
                    },
                },
            },
        });

        if (!response.text) throw new Error('No response from AI');
        return JSON.parse(response.text) as PlantDiagnosis;
        },
        () => readGeminiCache<PlantDiagnosis>(cacheKey)
    );
    writeGeminiCache(cacheKey, result);
    return result;
};

export const analyzeSoil = async (
    image: { base64: string; mimeType: string },
    language: string
): Promise<SoilAnalysis> => {
    const cacheKey = buildImageCacheKey('soil_analysis', language, [image]);
    const result = await withGeminiRetry(
        'Soil Analysis',
        async () => {
        const response = await getAiClient().models.generateContent({
            model: textModel,
            contents: {
                parts: [
                    { inlineData: { mimeType: image.mimeType, data: image.base64 } },
                    { text: `Analyze this soil sample image. Provide details in ${safeLanguage(language)}. Return JSON.` },
                ],
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        soilType:       { type: Type.STRING },
                        drynessLevel:   { type: Type.STRING },
                        composition:    { type: Type.STRING },
                        potentialIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
                        initialAdvice:  { type: Type.ARRAY, items: { type: Type.STRING } },
                        suitableCrops:  { type: Type.ARRAY, items: { type: Type.STRING } },
                        confidenceScore: { type: Type.NUMBER },
                    },
                },
            },
        });

        if (!response.text) throw new Error('No response from AI');
        return JSON.parse(response.text) as SoilAnalysis;
        },
        () => readGeminiCache<SoilAnalysis>(cacheKey)
    );
    writeGeminiCache(cacheKey, result);
    return result;
};

export const analyzeRecoveryProgress = async (
    oldImage: string,
    newImage: string,
    diagnosis: { diseaseName: string },
    language: string
): Promise<{ newHealthPercentage: number; analysisNotes: string }> => {
    const oldBase64 = oldImage.includes(',') ? oldImage.split(',')[1] : oldImage;
    const newBase64 = newImage.includes(',') ? newImage.split(',')[1] : newImage;
    if (!oldBase64 || !newBase64) throw new Error('Invalid image data provided');

    return withGeminiRetry('Recovery Analysis', async () => {
        const response = await getAiClient().models.generateContent({
            model: textModel,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: oldBase64 } },
                    { inlineData: { mimeType: 'image/jpeg', data: newBase64 } },
                    { text: `Compare these two plant images (old then new). The plant had ${diagnosis.diseaseName}. Assess recovery progress. Language: ${safeLanguage(language)}. Return JSON.` },
                ],
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        newHealthPercentage: { type: Type.NUMBER },
                        analysisNotes: { type: Type.STRING },
                    },
                },
            },
        });

        if (!response.text) throw new Error('No analysis returned');
        return JSON.parse(response.text) as { newHealthPercentage: number; analysisNotes: string };
    });
};

export const analyzeRealTimeFrame = async (base64Image: string): Promise<LiveAnalysisResult> => {
    const imageData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    if (!imageData) throw new Error('Invalid frame data');

    return withGeminiRetry('Plant Doctor Live Monitor', async () => {
        const response = await getAiClient().models.generateContent({
            model: textModel,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: imageData } },
                    { text: `Analyze this video frame for plant diseases. Return JSON {detected: boolean, issues: string[], confidence: number, action: string}.` },
                ],
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        detected:   { type: Type.BOOLEAN },
                        issues:     { type: Type.ARRAY, items: { type: Type.STRING } },
                        confidence: { type: Type.NUMBER },
                        action:     { type: Type.STRING },
                    },
                },
            },
        });

        if (!response.text) throw new Error('Frame analysis failed');
        return JSON.parse(response.text) as LiveAnalysisResult;
    });
};

export const analyzeGrowthFrame = async (base64Image: string): Promise<GrowthAnalysisResult> => {
    const imageData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    if (!imageData) throw new Error('Invalid frame data');

    return withGeminiRetry('Plant Doctor Growth Monitor', async () => {
        const response = await getAiClient().models.generateContent({
            model: textModel,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: imageData } },
                    { text: `Estimate plant growth from this frame. Return JSON {estimatedHeight: string, growthStage: string, healthStatus: string, recommendation: string}.` },
                ],
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        estimatedHeight: { type: Type.STRING },
                        growthStage:     { type: Type.STRING },
                        healthStatus:    { type: Type.STRING },
                        recommendation:  { type: Type.STRING },
                    },
                },
            },
        });

        if (!response.text) throw new Error('Growth analysis failed');
        return JSON.parse(response.text) as GrowthAnalysisResult;
    });
};

// ─── 2. SMART CHAT ────────────────────────────────────────────

export const streamChat = async function* (
    message: string,
    history: ChatMessage[] = [],
    language = 'English'
) {
    const cacheKey = `chat_${safeLanguage(language)}_${hashText(JSON.stringify({ message, history }))}`;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt += 1) {
        let yieldedAnyChunk = false;
        let fullText = '';

        try {
            const chat = getAiClient().chats.create({
                model: textModel,
                history: mapChatHistoryToGeminiHistory(history),
                config: {
                    systemInstruction: {
                        parts: [{ text: buildAgriculturalAssistantInstruction(language) }],
                    },
                },
            });
            const result = await chat.sendMessageStream({
                message: injectTemporalContextIntoMessage(message, language),
            });

            for await (const chunk of result) {
                const text = chunk.text;
                yieldedAnyChunk = yieldedAnyChunk || Boolean(text);
                fullText += text;
                yield { text };
            }

            if (fullText.trim()) {
                writeGeminiCache(cacheKey, fullText);
            }
            return;
        } catch (error) {
            lastError = error;
            if (yieldedAnyChunk || !isRetryableGeminiError(error) || attempt === MAX_GEMINI_ATTEMPTS) {
                break;
            }

            const jitter = Math.floor(Math.random() * 250);
            await sleep(GEMINI_RETRY_BASE_DELAY_MS * attempt + jitter);
        }
    }

    if (lastError && isRetryableGeminiError(lastError)) {
        const cached = readGeminiCache<string>(cacheKey);
        if (cached) {
            yield { text: cached };
            return;
        }
    }

    throw new Error(buildGeminiErrorMessage('Smart Chat', lastError));
};

// ─── 3. VOICE ASSISTANT ──────────────────────────────────────

export const connectToVoiceAssistant = async (
    language: string,
    callbacks: { onopen: () => void; onmessage: (msg: unknown) => void; onerror: (e: unknown) => void; onclose: () => void },
    userName?: string
) => {
    return withGeminiRetry('Voice Chat', async () => getAiClient().live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            inputAudioTranscription:  {},
            outputAudioTranscription: {},
            systemInstruction: {
                parts: [{
                    text: `${buildAgriculturalAssistantInstruction(language, { userName, voiceMode: true })}
If the user asks for the date, time, today, tomorrow, yesterday, or "what time is it", call the getCurrentDateTime tool to fetch a fresh local timestamp.
If the user explicitly asks to open a section of the app, call the changeView tool with the best matching view.
Only navigate when the user clearly asks to open, go to, or show a screen.`,
                }],
            },
            tools: [{
                functionDeclarations: [{
                    name: 'getCurrentDateTime',
                    description: 'Get the current local date and time for the user.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {},
                    },
                }, {
                    name: 'changeView',
                    description: 'Navigate to a specific application view when the user explicitly asks to open or switch screens.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            view: {
                                type: Type.STRING,
                                enum: [...CHAT_NAVIGATION_VIEWS],
                                description: 'The destination app view to open.',
                            },
                        },
                        required: ['view'],
                    },
                }],
            }],
        },
    }));
};
