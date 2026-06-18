const pool = require("../config/database");
const {
  createFarmSchema,
  updateFarmSchema,
  coordinateSchema,
  cycleSchema,
  updateCycleSchema,
} = require("../validators/farmValidator");

// ─── Helper: map a DB row → Frontend-compatible Farm object ──
const mapFarmRow = (row) => ({
  id: row.id,
  name: row.name,
  area: row.area !== null ? parseFloat(row.area) : null,
  areaUnit: row.area_unit || "hectare",
  soilType: row.soil_type,
  imageUrl: row.image_url,
  location: row.location,
  satellitePolygonId: row.satellite_polygon_id || undefined,
  // coordinates – included when query uses LEFT JOIN farm_coordinates
  coordinates: Array.isArray(row.coordinates) ? row.coordinates : [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const attachCoordinates = (farms, coordinates) => {
  const byFarmId = new Map();
  for (const coordinate of coordinates) {
    const points = byFarmId.get(coordinate.farm_id) || [];
    points.push({
      id: coordinate.id,
      lat: Number(coordinate.latitude),
      lng: Number(coordinate.longitude),
    });
    byFarmId.set(coordinate.farm_id, points);
  }
  return farms.map((farm) => ({ ...farm, coordinates: byFarmId.get(farm.id) || [] }));
};

// ─── POST /farms ──────────────────────────────────────────────
const createFarm = async (req, res) => {
  const { error } = createFarmSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const {
      name, area, area_unit, soil_type, image_url, location, satellite_polygon_id,
    } = req.body;

    if (!name) return res.status(400).json({ error: "Farm name is required" });
    if (!area || area <= 0)
      return res.status(400).json({ error: "Area must be positive" });

    const result = await pool.query(
      `INSERT INTO farms (
         user_id, name, location, area, area_unit, soil_type, image_url, satellite_polygon_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.user.id,
        name,
        location || null,
        area,
        area_unit || "hectare",
        soil_type || null,
        image_url || null,
        satellite_polygon_id || null,
      ]
    );

    res.status(201).json({
      message: "Farm created successfully",
      data: mapFarmRow(result.rows[0]),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /farms ───────────────────────────────────────────────
const getFarms = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM farms
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.json({ message: "Success", data: [] });
    }

    const placeholders = result.rows.map((_, index) => `$${index + 1}`).join(", ");
    const coordinateResult = await pool.query(
      `SELECT * FROM farm_coordinates
       WHERE farm_id IN (${placeholders})
       ORDER BY farm_id, order_index`,
      result.rows.map((farm) => farm.id)
    );
    const farms = attachCoordinates(result.rows, coordinateResult.rows);
    res.json({ message: "Success", data: farms.map(mapFarmRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /farms/:id ───────────────────────────────────────────
const getFarmById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM farms
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Farm not found" });
    const coordinates = await pool.query(
      `SELECT * FROM farm_coordinates
       WHERE farm_id = $1
       ORDER BY order_index`,
      [req.params.id]
    );
    res.json({
      message: "Success",
      data: mapFarmRow({ ...result.rows[0], coordinates: attachCoordinates(result.rows, coordinates.rows)[0].coordinates }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PATCH /farms/:id ─────────────────────────────────────────
const updateFarm = async (req, res) => {
  const { error } = updateFarmSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const existing = await pool.query(
      "SELECT id FROM farms WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (existing.rows.length === 0)
      return res.status(404).json({ error: "Farm not found" });

    const fields = [];
    const values = [];
    let i = 1;

    // Only allow farm-level fields (NOT crop/season/dates - those are cycle-level)
    const fieldMap = {
      name: "name",
      area: "area",
      area_unit: "area_unit",
      soil_type: "soil_type",
      image_url: "image_url",
      location: "location",
      satellite_polygon_id: "satellite_polygon_id",
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (req.body[key] !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(req.body[key]);
      }
    }

    if (fields.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    fields.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE farms SET ${fields.join(", ")}
       WHERE id = $${i} AND user_id = $${i + 1}
       RETURNING *`,
      [...values, req.user.id]
    );
    res.json({ message: "Farm updated", data: mapFarmRow(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE /farms/:id ────────────────────────────────────────
const deleteFarm = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM farms WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Farm not found" });
    res.json({ message: "Farm deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /farms/:id/coordinates ─────────────────────────────
const addCoordinate = async (req, res) => {
  const { error } = coordinateSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const farm = await pool.query(
      "SELECT id FROM farms WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (farm.rows.length === 0)
      return res.status(404).json({ error: "Farm not found" });

    const { latitude, longitude, order_index } = req.body;
    const result = await pool.query(
      "INSERT INTO farm_coordinates (farm_id, latitude, longitude, order_index) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.params.id, latitude, longitude, order_index]
    );
    res.status(201).json({ message: "Coordinate added", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /farms/:id/coordinates ──────────────────────────────
const getCoordinates = async (req, res) => {
  try {
    const farm = await pool.query(
      "SELECT id FROM farms WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (farm.rows.length === 0)
      return res.status(404).json({ error: "Farm not found" });

    const result = await pool.query(
      "SELECT * FROM farm_coordinates WHERE farm_id = $1 ORDER BY order_index ASC",
      [req.params.id]
    );
    res.json({ message: "Success", data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE /coordinates/:id ──────────────────────────────────
const deleteCoordinate = async (req, res) => {
  try {
    const ownedCoordinate = await pool.query(
      `SELECT fc.id
       FROM farm_coordinates fc
       JOIN farms f ON fc.farm_id = f.id
       WHERE fc.id = $1 AND f.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (ownedCoordinate.rows.length === 0)
      return res.status(404).json({ error: "Coordinate not found" });
    await pool.query("DELETE FROM farm_coordinates WHERE id = $1", [req.params.id]);
    res.json({ message: "Coordinate deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /farms/:id/cycles ───────────────────────────────────
const createCycle = async (req, res) => {
  const { error } = cycleSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const farm = await pool.query(
      "SELECT id FROM farms WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (farm.rows.length === 0)
      return res.status(404).json({ error: "Farm not found" });

    const { crop, season, planting_date, harvest_date, status } = req.body;

    if (!crop) return res.status(400).json({ error: "Crop is required" });
    if (!season) return res.status(400).json({ error: "Season is required" });
    if (!planting_date)
      return res.status(400).json({ error: "Planting date is required" });

    const result = await pool.query(
      `INSERT INTO farm_cycles (farm_id, crop, season, planting_date, harvest_date, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.params.id,
        crop,
        season,
        planting_date,
        harvest_date || null,
        status || "active",
      ]
    );
    res
      .status(201)
      .json({ message: "Cycle created successfully", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /farms/:id/cycles ────────────────────────────────────
const getCycles = async (req, res) => {
  try {
    const farm = await pool.query(
      "SELECT id FROM farms WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (farm.rows.length === 0)
      return res.status(404).json({ error: "Farm not found" });

    const result = await pool.query(
      "SELECT * FROM farm_cycles WHERE farm_id = $1 ORDER BY created_at DESC",
      [req.params.id]
    );
    res.json({ message: "Success", data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PATCH /cycles/:id ────────────────────────────────────────
const updateCycle = async (req, res) => {
  const { error } = updateCycleSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const cycle = await pool.query(
      `SELECT fc.id FROM farm_cycles fc JOIN farms f ON fc.farm_id = f.id
       WHERE fc.id = $1 AND f.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (cycle.rows.length === 0)
      return res.status(404).json({ error: "Cycle not found" });

    const { crop, season, planting_date, harvest_date, status } = req.body;
    const fields = [];
    const values = [];
    let i = 1;

    if (crop) {
      fields.push(`crop = $${i++}`);
      values.push(crop);
    }
    if (season) {
      fields.push(`season = $${i++}`);
      values.push(season);
    }
    if (planting_date) {
      fields.push(`planting_date = $${i++}`);
      values.push(planting_date);
    }
    if (harvest_date !== undefined) {
      fields.push(`harvest_date = $${i++}`);
      values.push(harvest_date);
    }
    if (status) {
      fields.push(`status = $${i++}`);
      values.push(status);
    }

    if (fields.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    fields.push("updated_at = NOW()");
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE farm_cycles SET ${fields.join(
        ", "
      )} WHERE id = $${i} RETURNING *`,
      values
    );
    res.json({ message: "Cycle updated", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /cycles/:id
const deleteCycle = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cycle = await client.query(
      `SELECT fc.id FROM farm_cycles fc JOIN farms f ON fc.farm_id = f.id
       WHERE fc.id = $1 AND f.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (cycle.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Cycle not found" });
    }

    const progressLogs = await client.query(
      `DELETE FROM progress_logs
       WHERE plant_id IN (SELECT id FROM tracked_plants WHERE farm_cycle_id = $1)
       RETURNING id`,
      [req.params.id]
    );
    const diagnoses = await client.query(
      `DELETE FROM diagnosis_history
       WHERE plant_id IN (SELECT id FROM tracked_plants WHERE farm_cycle_id = $1)
       RETURNING id`,
      [req.params.id]
    );
    const plants = await client.query(
      "DELETE FROM tracked_plants WHERE farm_cycle_id = $1 RETURNING id",
      [req.params.id]
    );
    const tasks = await client.query(
      "DELETE FROM schedule_tasks WHERE farm_cycle_id = $1 RETURNING id",
      [req.params.id]
    );
    const deletedCycle = await client.query(
      "DELETE FROM farm_cycles WHERE id = $1 RETURNING id",
      [req.params.id]
    );

    await client.query("COMMIT");
    res.json({
      message: "Cycle deleted",
      data: {
        id: deletedCycle.rows[0].id,
        deleted: {
          progressLogs: progressLogs.rowCount,
          diagnoses: diagnoses.rowCount,
          plants: plants.rowCount,
          tasks: tasks.rowCount,
        },
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

module.exports = {
  createFarm,
  getFarms,
  getFarmById,
  updateFarm,
  deleteFarm,
  addCoordinate,
  getCoordinates,
  deleteCoordinate,
  createCycle,
  getCycles,
  updateCycle,
  deleteCycle,
};
