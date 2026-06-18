const pool = require("../config/database");
const fs = require("fs");
const path = require("path");
const {
  createPlantSchema,
  progressLogSchema,
} = require("../validators/appValidator");
const { analyzeTrackedPlantImage } = require("../services/geminiDiagnosisService");

const loadStoredPlantImage = async (imageUrl) => {
  if (!imageUrl) return null;

  if (imageUrl.startsWith("data:")) {
    const [meta, encoded] = imageUrl.split(",", 2);
    if (!meta || !encoded) return null;
    const mimeType = meta.match(/^data:(.*?);base64$/)?.[1] || "image/jpeg";
    return {
      buffer: Buffer.from(encoded, "base64"),
      mimeType,
      imageUrl,
    };
  }

  if (imageUrl.startsWith("/uploads/")) {
    const fileName = path.basename(imageUrl);
    const filePath = path.join(__dirname, "..", "uploads", fileName);
    const mimeType = {
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
    }[path.extname(fileName).toLowerCase()] || "image/jpeg";

    return {
      buffer: await fs.promises.readFile(filePath),
      mimeType,
      imageUrl,
    };
  }

  return null;
};

const isArabicRequest = (req) =>
  String(req.query.language || req.headers["accept-language"] || "")
    .toLowerCase()
    .startsWith("ar");

const isHealthyDiagnosis = (name) => /healthy|سليم|صحي|معاف/i.test(String(name || ""));

// POST /cycles/:id/plants
const createPlant = async (req, res) => {
  const { error } = createPlantSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const cycle = await pool.query(
      `SELECT fc.id FROM farm_cycles fc JOIN farms f ON fc.farm_id = f.id
       WHERE fc.id = $1 AND f.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (cycle.rows.length === 0)
      return res.status(404).json({ error: "Cycle not found" });

    const { user_defined_name, species_name, image_url, recovery_progress_percent } = req.body;

    if (!user_defined_name)
      return res.status(400).json({ error: "Plant name is required" });
    if (!species_name)
      return res.status(400).json({ error: "Species name is required" });

    const recovery = Number.isFinite(Number(recovery_progress_percent))
      ? Math.max(0, Math.min(100, Number(recovery_progress_percent)))
      : 0;

    const result = await pool.query(
      `INSERT INTO tracked_plants (farm_cycle_id, user_defined_name, species_name, image_url, recovery_progress_percent, last_check_date)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [req.params.id, user_defined_name, species_name, image_url || null, recovery]
    );
    res
      .status(201)
      .json({ message: "Plant tracked successfully", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /cycles/:id/plants/from-diagnosis
const createPlantFromDiagnosis = async (req, res) => {
  try {
    const cycle = await pool.query(
      `SELECT fc.id FROM farm_cycles fc JOIN farms f ON fc.farm_id = f.id
       WHERE fc.id = $1 AND f.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (cycle.rows.length === 0)
      return res.status(404).json({ error: "Cycle not found" });

    const {
      user_defined_name,
      species_name,
      image_url,
      diagnosis,
      recovery_progress_percent,
    } = req.body;

    if (!user_defined_name)
      return res.status(400).json({ error: "Plant name is required" });
    if (!species_name)
      return res.status(400).json({ error: "Species name is required" });
    if (!diagnosis || typeof diagnosis !== "object")
      return res.status(400).json({ error: "Diagnosis result is required" });

    const recovery = Number.isFinite(Number(recovery_progress_percent))
      ? Math.max(0, Math.min(100, Number(recovery_progress_percent)))
      : Math.max(0, Math.min(100, Number(diagnosis.healthPercentage ?? 0)));
    const isHealthy = Boolean(diagnosis.isHealthy);
    const diseaseName = isHealthy
      ? (isArabicRequest(req) ? "نبات سليم" : "Healthy")
      : String(diagnosis.diseaseName || "Unknown Disease");
    const severity = isHealthy
      ? "low"
      : recovery < 35
      ? "critical"
      : recovery < 55
      ? "high"
      : recovery < 75
      ? "medium"
      : "low";
    const recommendations = Array.isArray(diagnosis.treatment)
      ? diagnosis.treatment.filter(Boolean).join(" ")
      : String(diagnosis.treatment || diagnosis.prevention || "");

    const plant = await pool.query(
      `INSERT INTO tracked_plants
         (farm_cycle_id, user_defined_name, species_name, image_url, recovery_progress_percent, last_check_date)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [req.params.id, user_defined_name, species_name, image_url || null, recovery]
    );

    const diagnosisRecord = await pool.query(
      `INSERT INTO diagnosis_history
         (plant_id, user_id, image_url, disease_name, confidence, severity, recommendations, raw_ai_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        plant.rows[0].id,
        req.user.id,
        image_url || null,
        diseaseName,
        Number(diagnosis.confidenceScore ?? 0),
        severity,
        recommendations || null,
        JSON.stringify(diagnosis),
      ]
    );

    res.status(201).json({
      message: "Plant tracked from diagnosis",
      data: {
        plant: plant.rows[0],
        diagnosis: diagnosisRecord.rows[0],
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /cycles/:id/plants
const getPlants = async (req, res) => {
  try {
    const cycle = await pool.query(
      `SELECT fc.id FROM farm_cycles fc JOIN farms f ON fc.farm_id = f.id
       WHERE fc.id = $1 AND f.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (cycle.rows.length === 0)
      return res.status(404).json({ error: "Cycle not found" });

    const result = await pool.query(
      "SELECT * FROM tracked_plants WHERE farm_cycle_id = $1 ORDER BY user_defined_name ASC",
      [req.params.id]
    );
    res.json({ message: "Success", data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /plants/:id
const getPlantById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tp.* FROM tracked_plants tp
       JOIN farm_cycles fc ON tp.farm_cycle_id = fc.id
       JOIN farms f ON fc.farm_id = f.id
       WHERE tp.id = $1 AND f.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Plant not found" });
    res.json({ message: "Success", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /plants/:id/scan  â€” AI Diagnosis
const scanPlant = async (req, res) => {
  const start = Date.now();

  try {
    const plant = await pool.query(
      `SELECT tp.* FROM tracked_plants tp
       JOIN farm_cycles fc ON tp.farm_cycle_id = fc.id
       JOIN farms f ON fc.farm_id = f.id
       WHERE tp.id = $1 AND f.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (plant.rows.length === 0)
      return res.status(404).json({ error: "Plant not found" });

    const uploadedImageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const storedImage = req.file
      ? null
      : await loadStoredPlantImage(plant.rows[0].image_url);
    const imageUrl = uploadedImageUrl || storedImage?.imageUrl || null;

    // ── Real Gemini AI Diagnosis ────────────────────────────
    let aiResult;
    let provider = "gemini";

    if (req.file || storedImage) {
      try {
        const imageBuffer = req.file
          ? await fs.promises.readFile(
              path.join(__dirname, "..", "uploads", req.file.filename)
            )
          : storedImage.buffer;
        const mimeType = req.file?.mimetype || storedImage.mimeType || "image/jpeg";
        const language = req.query.language || req.headers["accept-language"] || "en";
        aiResult = await analyzeTrackedPlantImage(imageBuffer, mimeType, language);
      } catch (aiErr) {
        console.error(
          "[Gemini] diagnosis failed, using static fallback:",
          aiErr.message
        );
        const arabic = isArabicRequest(req);
        aiResult = {
          name: arabic ? "التحليل غير متاح" : "Analysis Unavailable",
          confidence: 0.0,
          severity: "low",
          recommendations: arabic
            ? "تعذر تحليل الصورة. حاول مرة أخرى بصورة أوضح أو استشر مهندسا زراعيا."
            : "Could not analyse the image. Please try again or consult an agronomist.",
        };
        provider = "fallback";
      }
    } else {
      // No image available on the request or the plant record — return a neutral result
      const arabic = isArabicRequest(req);
      aiResult = {
        name: arabic ? "لا توجد صورة" : "No Image Provided",
        confidence: 0.0,
        severity: "low",
        recommendations: arabic
          ? "ارفع صورة واضحة للنبات حتى تحصل على تشخيص بالذكاء الاصطناعي."
          : "Upload a clear photo of the plant to receive an AI diagnosis.",
      };
      provider = "no-image";
    }
    const isHealthy = isHealthyDiagnosis(aiResult.name);
    const latencyMs = Date.now() - start;

    // Calculate recovery progress
    const currentProgress = parseFloat(
      plant.rows[0].recovery_progress_percent || 0
    );
    let newProgress = isHealthy
      ? Math.min(currentProgress + 10, 100)
      : Math.max(currentProgress - 5, 0);

    // Save to diagnosis_history
    const diagnosis = await pool.query(
      `INSERT INTO diagnosis_history
         (plant_id, user_id, image_url, disease_name, confidence, severity, recommendations, raw_ai_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        req.params.id,
        req.user.id,
        imageUrl,
        aiResult.name,
        aiResult.confidence,
        aiResult.severity,
        aiResult.recommendations,
        JSON.stringify(aiResult),
      ]
    );

    // Update plant last_check_date and recovery_progress only
    await pool.query(
      `UPDATE tracked_plants SET
         last_check_date = NOW(),
         recovery_progress_percent = $1,
         updated_at = NOW()
       WHERE id = $2`,
      [newProgress, req.params.id]
    );

    // Log AI usage
    await pool.query(
      `INSERT INTO ai_usage (user_id, endpoint, provider, tokens_used, latency_ms, cost_estimate, success)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.user.id,
        `/plants/${req.params.id}/scan`,
        provider,
        0,
        latencyMs,
        0,
        true,
      ]
    );

    // Generate alert if confidence > 0.8 and diseased
    let alert = null;
    if (!isHealthy && aiResult.confidence > 0.8) {
      alert = isArabicRequest(req)
        ? `تم اكتشاف مشكلة في النبات بثقة عالية: ${aiResult.name} (${(
            aiResult.confidence * 100
          ).toFixed(0)}%). يفضل اتخاذ إجراء سريع.`
        : `High-confidence disease detected: ${aiResult.name} (${(
            aiResult.confidence * 100
          ).toFixed(0)}%). Immediate action recommended.`;
    }

    res.status(201).json({
      message: "Diagnosis complete",
      data: {
        diagnosis: diagnosis.rows[0],
        plantUpdated: {
          recovery_progress_percent: newProgress,
          last_check_date: new Date().toISOString().split("T")[0],
        },
        alert,
      },
    });
  } catch (err) {
    console.error(err);
    // Log failed AI usage
    await pool
      .query(
        `INSERT INTO ai_usage (user_id, endpoint, provider, latency_ms, success)
       VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          `/plants/${req.params.id}/scan`,
          "gemini",
          Date.now() - start,
          false,
        ]
      )
      .catch(() => {});
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /plants/:id
const deletePlant = async (req, res) => {
  try {
    const plant = await pool.query(
      `SELECT tp.id FROM tracked_plants tp
       JOIN farm_cycles fc ON tp.farm_cycle_id = fc.id
       JOIN farms f ON fc.farm_id = f.id
       WHERE tp.id = $1 AND f.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (plant.rows.length === 0)
      return res.status(404).json({ error: "Plant not found" });

    await pool.query("DELETE FROM progress_logs WHERE plant_id = $1", [req.params.id]);
    await pool.query("DELETE FROM diagnosis_history WHERE plant_id = $1", [req.params.id]);
    await pool.query("DELETE FROM tracked_plants WHERE id = $1", [req.params.id]);
    res.json({ message: "Plant deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /plants/:id/progress-log
const addProgressLog = async (req, res) => {
  const { error } = progressLogSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const plant = await pool.query(
      `SELECT tp.id, tp.recovery_progress_percent FROM tracked_plants tp
       JOIN farm_cycles fc ON tp.farm_cycle_id = fc.id
       JOIN farms f ON fc.farm_id = f.id
       WHERE tp.id = $1 AND f.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (plant.rows.length === 0)
      return res.status(404).json({ error: "Plant not found" });

    const { note, recovery_percent } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO progress_logs (plant_id, user_id, note, image_url, recovery_percent)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, req.user.id, note, imageUrl, recovery_percent]
    );

    // Update plant recovery if provided
    if (recovery_percent !== undefined) {
      const prev = parseFloat(plant.rows[0].recovery_progress_percent || 0);
      await pool.query(
        "UPDATE tracked_plants SET recovery_progress_percent = $1, updated_at = NOW() WHERE id = $2",
        [recovery_percent, req.params.id]
      );

      // Alert if recovery decreased
      if (recovery_percent < prev) {
        result.rows[0].alert = isArabicRequest(req)
          ? `انخفضت نسبة التعافي من ${prev}% إلى ${recovery_percent}%. راجع خطة العلاج.`
          : `Recovery decreased from ${prev}% to ${recovery_percent}%. Review treatment plan.`;
      }
    }

    res
      .status(201)
      .json({ message: "Progress log added", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /plants/:id/progress-logs
const getProgressLogs = async (req, res) => {
  try {
    const plant = await pool.query(
      `SELECT tp.id FROM tracked_plants tp
       JOIN farm_cycles fc ON tp.farm_cycle_id = fc.id
       JOIN farms f ON fc.farm_id = f.id
       WHERE tp.id = $1 AND f.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (plant.rows.length === 0)
      return res.status(404).json({ error: "Plant not found" });

    const result = await pool.query(
      "SELECT * FROM progress_logs WHERE plant_id = $1 ORDER BY logged_at DESC",
      [req.params.id]
    );
    res.json({ message: "Success", data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createPlant,
  createPlantFromDiagnosis,
  getPlants,
  getPlantById,
  scanPlant,
  deletePlant,
  addProgressLog,
  getProgressLogs,
};
