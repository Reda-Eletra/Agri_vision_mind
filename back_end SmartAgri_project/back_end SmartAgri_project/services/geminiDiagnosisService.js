const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const geminiModel = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
const maxGeminiAttempts = 3;
const retryableGeminiStatusCodes = new Set([408, 429, 500, 502, 503, 504]);

class GeminiHttpError extends Error {
  constructor(status, body) {
    super(`Gemini API error ${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableGeminiError = (error) =>
  retryableGeminiStatusCodes.has(Number(error?.status)) ||
  /overloaded|unavailable|timeout|temporarily|resource_exhausted/i.test(
    String(error?.message || "")
  );

const formatGeminiError = (error) => {
  const status = Number(error?.status);
  if (status === 503 || status === 429 || isRetryableGeminiError(error)) {
    return new Error(
      "Gemini is temporarily busy. Please retry the Plant Doctor analysis in a minute."
    );
  }
  return error;
};

const stripMarkdownFences = (text) =>
  String(text || "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();

const parseGeminiJson = (responseJson) => {
  const text = responseJson?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(stripMarkdownFences(text));
};

const postGeminiPrompt = async ({
  prompt,
  imageBuffer,
  mimeType = "image/jpeg",
  maxOutputTokens = 1024,
  temperature = 0.2,
}) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in .env");
  }

  let lastError;

  for (let attempt = 1; attempt <= maxGeminiAttempts; attempt += 1) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: imageBuffer.toString("base64"),
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: {
              temperature,
              maxOutputTokens,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new GeminiHttpError(response.status, errorBody);
      }

      const json = await response.json();
      return parseGeminiJson(json);
    } catch (error) {
      lastError = error;
      if (!isRetryableGeminiError(error) || attempt === maxGeminiAttempts) {
        break;
      }

      await sleep(700 * attempt + Math.floor(Math.random() * 250));
    }
  }

  throw formatGeminiError(lastError);
};

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
};

const normalizePercent = (value, fallback = 0) => {
  const parsed = Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed <= 1 ? parsed * 100 : parsed;
};

const normalizeTrackedConfidence = (value, fallback = 0.8) => {
  const parsed = Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed <= 1 ? clamp(parsed, 0, 1) : clamp(parsed / 100, 0, 1);
};

const resolveResponseLanguage = (language) =>
  String(language || "").toLowerCase().startsWith("ar") ? "Arabic" : "English";

const analyzeTrackedPlantImage = async (imageBuffer, mimeType, language = "en") => {
  const responseLanguage = resolveResponseLanguage(language);
  const prompt = `You are an expert plant pathologist. Analyze this plant image and diagnose any diseases, pests, or deficiencies.

Respond ONLY with a valid JSON object — no markdown, no extra text — in exactly this format:
{
  "name": "disease or condition name (use 'Healthy' if the plant looks healthy)",
  "confidence": 0.0,
  "severity": "low | medium | high | critical",
  "recommendations": "one clear sentence of treatment or care advice"
}

Rules:
- confidence must be a number between 0.0 and 1.0
- severity must be exactly one of: low, medium, high, critical
- if the plant is healthy, use severity "low" with confidence 0.95 and name "Healthy" in English or its natural equivalent in ${responseLanguage}
- write the "name" and "recommendations" fields in ${responseLanguage}
- keep the "severity" field in English exactly as one of the allowed enum values`;

  const raw = await postGeminiPrompt({
    prompt,
    imageBuffer,
    mimeType,
    maxOutputTokens: 256,
    temperature: 0.2,
  });

  const validSeverities = new Set(["low", "medium", "high", "critical"]);
  const severity = String(raw?.severity || "low").trim().toLowerCase();

  return {
    name: String(raw?.name || raw?.disease || "Analysis Unavailable").trim(),
    confidence: normalizeTrackedConfidence(raw?.confidence),
    severity: validSeverities.has(severity) ? severity : "low",
    recommendations: String(
      raw?.recommendations ||
        raw?.description ||
        "Review the plant image manually and try another scan."
    ).trim(),
  };
};

const analyzeDoctorImage = async (imageBuffer, mimeType, language = "en") => {
  const responseLanguage = resolveResponseLanguage(language);
  const prompt = `Analyze this plant image and provide a plant health diagnosis.
Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "disease": "disease name or Healthy Plant",
  "confidencePercent": 85,
  "severity": "none|low|medium|high",
  "description": "brief description",
  "isHealthy": false,
  "symptoms": ["symptom1", "symptom2"],
  "treatments": ["treatment1", "treatment2"],
  "preventions": ["prevention1", "prevention2"]
}

Write disease, description, symptoms, treatments, and preventions in ${responseLanguage}.
Keep severity and boolean fields exactly in the schema language.`;

  const raw = await postGeminiPrompt({
    prompt,
    imageBuffer,
    mimeType,
    maxOutputTokens: 1024,
    temperature: 0.1,
  });

  const disease = String(
    raw?.disease || raw?.diseaseName || raw?.disease_name || raw?.name || "Unknown"
  ).trim();
  const normalizedDisease = disease.toLowerCase();
  const inferredHealthyByName =
    normalizedDisease === "healthy" || normalizedDisease === "healthy plant";
  const isHealthy = Boolean(
    raw?.isHealthy ?? raw?.is_healthy ?? inferredHealthyByName
  );

  const validSeverities = new Set(["none", "low", "medium", "high"]);
  const severityCandidate = String(
    raw?.severity || (isHealthy ? "none" : "low")
  ).trim().toLowerCase();

  return {
    disease,
    confidencePercent: clamp(
      normalizePercent(raw?.confidencePercent ?? raw?.confidence, isHealthy ? 95 : 70),
      0,
      100
    ),
    severity: validSeverities.has(severityCandidate)
      ? severityCandidate
      : severityCandidate === "critical"
      ? "high"
      : "low",
    description: String(
      raw?.description ||
        raw?.summary ||
        raw?.recommendations ||
        (isHealthy
          ? "The plant appears healthy in the submitted image."
          : "Visible symptoms suggest a plant health issue.")
    ).trim(),
    isHealthy,
    symptoms: normalizeList(raw?.symptoms),
    treatments: normalizeList(raw?.treatments ?? raw?.treatment ?? raw?.recommendations),
    preventions: normalizeList(raw?.preventions ?? raw?.prevention),
  };
};

module.exports = {
  analyzeTrackedPlantImage,
  analyzeDoctorImage,
};
