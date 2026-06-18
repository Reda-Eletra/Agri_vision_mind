const assert = require("node:assert/strict");
const fs = require("fs/promises");
const { after, before, describe, test } = require("node:test");
const request = require("supertest");
const app = require("../app");
const pool = require("../config/database");
const { runMigrations } = require("../config/migrations");

const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const users = {};
let farmId;
let postId;

const register = async (name, email, password = "secret12") => {
  const response = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password });
  assert.equal(response.status, 201);
  return response.body.data;
};

before(async () => {
  await runMigrations(pool);
  users.password = await register("Password User", "password@example.com");
  users.owner = await register("Farm Owner", "owner@example.com");
  users.other = await register("Other User", "other@example.com");
  users.admin = await register("Admin User", "admin@example.com");
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [users.admin.user.id]);
});

after(async () => {
  await pool.end();
  await fs.rm(process.env.UPLOAD_DIR, { recursive: true, force: true });
});

describe("authentication and authorization", () => {
  test("duplicate registration is rejected", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ name: "Duplicate", email: "owner@example.com", password: "secret12" });
    assert.equal(response.status, 409);
  });

  test("login accepts valid credentials and rejects invalid credentials", async () => {
    const valid = await request(app)
      .post("/api/auth/login")
      .send({ email: "owner@example.com", password: "secret12" });
    const invalid = await request(app)
      .post("/api/auth/login")
      .send({ email: "owner@example.com", password: "wrong-password" });
    assert.equal(valid.status, 200);
    assert.equal(invalid.status, 401);
  });

  test("profile requires a valid bearer token", async () => {
    const missing = await request(app).get("/api/users/profile");
    const invalid = await request(app)
      .get("/api/users/profile")
      .set("Authorization", "Bearer invalid");
    const valid = await request(app)
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${users.owner.token}`);
    assert.equal(missing.status, 401);
    assert.equal(invalid.status, 401);
    assert.equal(valid.status, 200);
    assert.equal(valid.body.data.id, users.owner.user.id);
  });

  test("normal user cannot access an admin endpoint", async () => {
    const denied = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${users.owner.token}`);
    const allowed = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${users.admin.token}`);
    assert.equal(denied.status, 403);
    assert.equal(allowed.status, 200);
  });

  test("password validation reports missing, mismatched, weak, and wrong credentials", async () => {
    const endpoint = "/api/users/update-password";
    const auth = { Authorization: `Bearer ${users.password.token}` };
    const missing = await request(app).patch(endpoint).set(auth).send({
      current_password: "secret12",
      new_password: "newsecret12",
    });
    const mismatch = await request(app).patch(endpoint).set(auth).send({
      current_password: "secret12",
      new_password: "newsecret12",
      confirm_password: "different",
    });
    const weak = await request(app).patch(endpoint).set(auth).send({
      current_password: "secret12",
      new_password: "123",
      confirm_password: "123",
    });
    const wrong = await request(app).patch(endpoint).set(auth).send({
      current_password: "wrong-password",
      new_password: "newsecret12",
      confirm_password: "newsecret12",
    });

    assert.equal(missing.status, 400);
    assert.match(missing.body.error, /confirmation/i);
    assert.equal(mismatch.status, 400);
    assert.match(mismatch.body.error, /do not match/i);
    assert.equal(weak.status, 400);
    assert.match(weak.body.error, /at least 6/i);
    assert.equal(wrong.status, 401);
  });

  test("successful password change invalidates the old password", async () => {
    const changed = await request(app)
      .patch("/api/users/update-password")
      .set("Authorization", `Bearer ${users.password.token}`)
      .send({
        current_password: "secret12",
        new_password: "newsecret12",
        confirm_password: "newsecret12",
      });
    const oldLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "password@example.com", password: "secret12" });
    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "password@example.com", password: "newsecret12" });

    assert.equal(changed.status, 200);
    assert.equal(oldLogin.status, 401);
    assert.equal(newLogin.status, 200);
  });
});

describe("farm contracts and ownership", () => {
  test("owner can create, list, get, and update a canonical farm DTO", async () => {
    const created = await request(app)
      .post("/api/farms")
      .set("Authorization", `Bearer ${users.owner.token}`)
      .send({
        name: "North Field",
        location: "Cairo",
        area: 12.5,
        area_unit: "acre",
        soil_type: "Loam",
      });
    farmId = created.body.data.id;
    const listed = await request(app)
      .get("/api/farms")
      .set("Authorization", `Bearer ${users.owner.token}`);
    const found = await request(app)
      .get(`/api/farms/${farmId}`)
      .set("Authorization", `Bearer ${users.owner.token}`);
    const updated = await request(app)
      .patch(`/api/farms/${farmId}`)
      .set("Authorization", `Bearer ${users.owner.token}`)
      .send({ name: "North Field Updated", satellite_polygon_id: "polygon-123" });

    assert.equal(created.status, 201);
    assert.equal(listed.body.data.length, 1);
    assert.equal(found.status, 200);
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.satellitePolygonId, "polygon-123");
    assert.deepEqual(
      Object.keys(updated.body.data).sort(),
      [
        "area", "areaUnit", "coordinates", "createdAt", "id", "imageUrl",
        "location", "name", "satellitePolygonId", "soilType", "updatedAt",
      ].sort()
    );
  });

  test("unsupported legacy fields are rejected while canonical updates remain valid", async () => {
    const rejected = await request(app)
      .patch(`/api/farms/${farmId}`)
      .set("Authorization", `Bearer ${users.owner.token}`)
      .send({ yield_amount: 100, schedule: [] });
    const accepted = await request(app)
      .patch(`/api/farms/${farmId}`)
      .set("Authorization", `Bearer ${users.owner.token}`)
      .send({ location: "Giza" });
    assert.equal(rejected.status, 400);
    assert.equal(accepted.status, 200);
  });

  test("another user cannot read, update, delete, or change polygon ownership", async () => {
    const auth = { Authorization: `Bearer ${users.other.token}` };
    const read = await request(app).get(`/api/farms/${farmId}`).set(auth);
    const update = await request(app)
      .patch(`/api/farms/${farmId}`)
      .set(auth)
      .send({ satellite_polygon_id: "stolen-polygon" });
    const remove = await request(app).delete(`/api/farms/${farmId}`).set(auth);
    assert.equal(read.status, 404);
    assert.equal(update.status, 404);
    assert.equal(remove.status, 404);
  });

  test("coordinate endpoints enforce farm ownership and validation", async () => {
    const ownerAuth = { Authorization: `Bearer ${users.owner.token}` };
    const otherAuth = { Authorization: `Bearer ${users.other.token}` };
    const invalid = await request(app)
      .post(`/api/farms/${farmId}/coordinates`)
      .set(ownerAuth)
      .send({ latitude: 100, longitude: 31, order_index: 0 });
    const denied = await request(app)
      .post(`/api/farms/${farmId}/coordinates`)
      .set(otherAuth)
      .send({ latitude: 30, longitude: 31, order_index: 0 });
    const created = await request(app)
      .post(`/api/farms/${farmId}/coordinates`)
      .set(ownerAuth)
      .send({ latitude: 30, longitude: 31, order_index: 0 });
    const deniedDelete = await request(app)
      .delete(`/api/coordinates/${created.body.data.id}`)
      .set(otherAuth);
    assert.equal(invalid.status, 400);
    assert.equal(denied.status, 404);
    assert.equal(created.status, 201);
    assert.equal(deniedDelete.status, 404);
  });

  test("stored polygon survives a fresh farm request", async () => {
    const response = await request(app)
      .get(`/api/farms/${farmId}`)
      .set("Authorization", `Bearer ${users.owner.token}`);
    assert.equal(response.body.data.satellitePolygonId, "polygon-123");
  });

  test("owner can delete a farm", async () => {
    const created = await request(app)
      .post("/api/farms")
      .set("Authorization", `Bearer ${users.owner.token}`)
      .send({
        name: "Temporary Field",
        area: 1,
        area_unit: "acre",
        soil_type: "Loam",
      });
    const removed = await request(app)
      .delete(`/api/farms/${created.body.data.id}`)
      .set("Authorization", `Bearer ${users.owner.token}`);
    const missing = await request(app)
      .get(`/api/farms/${created.body.data.id}`)
      .set("Authorization", `Bearer ${users.owner.token}`);

    assert.equal(removed.status, 200);
    assert.equal(missing.status, 404);
  });
});

describe("profile avatar uploads", () => {
  test("text-only profile updates remain supported", async () => {
    const updated = await request(app)
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${users.other.token}`)
      .send({ name: "Renamed User", location: "Aswan" });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.name, "Renamed User");
    assert.equal(updated.body.data.location, "Aswan");
  });

  test("avatar-only update persists a safe public URL", async () => {
    const uploaded = await request(app)
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${users.owner.token}`)
      .attach("avatar", png, { filename: "avatar.png", contentType: "image/png" });
    const loaded = await request(app)
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${users.owner.token}`);

    assert.equal(uploaded.status, 200);
    assert.match(uploaded.body.data.avatar_url, /^\/uploads\/[a-f0-9-]+\.png$/);
    assert.equal(loaded.body.data.avatar_url, uploaded.body.data.avatar_url);
    assert.doesNotMatch(uploaded.body.data.avatar_url, /^[A-Za-z]:\\/);
  });

  test("text and avatar can be updated together and persist after login", async () => {
    const updated = await request(app)
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${users.owner.token}`)
      .field("name", "Updated Owner")
      .field("location", "Alexandria")
      .attach("avatar", png, { filename: "owner.webp", contentType: "image/webp" });
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "owner@example.com", password: "secret12" });
    const loaded = await request(app)
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${login.body.data.token}`);

    assert.equal(updated.status, 200);
    assert.equal(loaded.body.data.name, "Updated Owner");
    assert.equal(loaded.body.data.location, "Alexandria");
    assert.equal(loaded.body.data.avatar_url, updated.body.data.avatar_url);
  });

  test("invalid, oversized, and unauthenticated avatar uploads are rejected", async () => {
    const invalid = await request(app)
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${users.owner.token}`)
      .attach("avatar", Buffer.from("not-image"), {
        filename: "avatar.gif",
        contentType: "image/gif",
      });
    const oversized = await request(app)
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${users.owner.token}`)
      .attach("avatar", Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: "large.png",
        contentType: "image/png",
      });
    const unauthenticated = await request(app)
      .patch("/api/users/profile")
      .attach("avatar", png, { filename: "avatar.png", contentType: "image/png" });

    assert.equal(invalid.status, 400);
    assert.equal(oversized.status, 400);
    assert.equal(unauthenticated.status, 401);
  });
});

describe("community identity and visibility", () => {
  test("likes and unlikes are idempotent for two users", async () => {
    const created = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${users.owner.token}`)
      .send({ title: "Visible post", content: "Field note", category: "tips" });
    postId = created.body.data.id;

    const firstLike = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${users.owner.token}`);
    const repeatedLike = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${users.owner.token}`);
    const secondUserLike = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${users.other.token}`);
    const ownerView = await request(app)
      .get(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${users.owner.token}`);
    const unlike = await request(app)
      .delete(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${users.owner.token}`);
    const repeatedUnlike = await request(app)
      .delete(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${users.owner.token}`);
    const otherView = await request(app)
      .get(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${users.other.token}`);

    assert.equal(firstLike.body.data.likesCount, 1);
    assert.equal(repeatedLike.body.data.likesCount, 1);
    assert.equal(secondUserLike.body.data.likesCount, 2);
    assert.equal(ownerView.body.data.likedByMe, true);
    assert.equal(ownerView.body.data.authorEmail, undefined);
    assert.equal(unlike.body.data.likesCount, 1);
    assert.equal(repeatedUnlike.body.data.likesCount, 1);
    assert.equal(otherView.body.data.likedByMe, true);
  });

  test("hidden and deleted posts are excluded from normal operations but visible to admin", async () => {
    await pool.query(
      "UPDATE posts SET is_visible = FALSE WHERE id = $1",
      [postId]
    );
    const list = await request(app)
      .get("/api/posts")
      .set("Authorization", `Bearer ${users.owner.token}`);
    const detail = await request(app)
      .get(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${users.owner.token}`);
    const like = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${users.owner.token}`);
    const comment = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${users.owner.token}`)
      .send({ content: "Hidden comment" });
    const admin = await request(app)
      .get("/api/admin/posts")
      .set("Authorization", `Bearer ${users.admin.token}`);

    assert.equal(list.body.pagination.total, 0);
    assert.equal(detail.status, 404);
    assert.equal(like.status, 404);
    assert.equal(comment.status, 404);
    assert.ok(admin.body.data.some((post) => post.id === postId));

    await pool.query(
      "UPDATE posts SET is_visible = TRUE, deleted_at = NOW() WHERE id = $1",
      [postId]
    );
    const deletedDetail = await request(app)
      .get(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${users.owner.token}`);
    const deletedLike = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${users.owner.token}`);
    assert.equal(deletedDetail.status, 404);
    assert.equal(deletedLike.status, 404);
  });
});

describe("public catalog visibility", () => {
  test("news lists and totals exclude hidden and deleted records", async () => {
    await pool.query(
      `INSERT INTO news (title, summary, content, is_visible, deleted_at)
       VALUES
         ('Visible', 'Summary', 'Body', TRUE, NULL),
         ('Hidden', 'Summary', 'Body', FALSE, NULL),
         ('Deleted', 'Summary', 'Body', TRUE, NOW())`
    );
    const response = await request(app).get("/api/news?limit=10");
    const hidden = await pool.query("SELECT id FROM news WHERE title = 'Hidden'");
    const detail = await request(app).get(`/api/news/${hidden.rows[0].id}`);
    const admin = await request(app)
      .get("/api/admin/news")
      .set("Authorization", `Bearer ${users.admin.token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.pagination.total, 1);
    assert.deepEqual(response.body.data.map((article) => article.title), ["Visible"]);
    assert.equal(detail.status, 404);
    assert.equal(admin.body.pagination.total, 3);
    assert.ok(admin.body.data.some((article) => article.title === "Hidden"));
    assert.ok(admin.body.data.some((article) => article.title === "Deleted"));
  });

  test("disease lists and details exclude hidden and deleted records", async () => {
    await pool.query(
      `INSERT INTO disease_library (
         name, description, language, is_visible, deleted_at
       ) VALUES
         ('Visible Disease', 'Visible', 'en', TRUE, NULL),
         ('Hidden Disease', 'Hidden', 'en', FALSE, NULL),
         ('Deleted Disease', 'Deleted', 'en', TRUE, NOW())`
    );
    const response = await request(app).get("/api/disease-library?lang=en");
    const hidden = await pool.query(
      "SELECT id FROM disease_library WHERE name = 'Hidden Disease'"
    );
    const detail = await request(app).get(`/api/disease-library/${hidden.rows[0].id}`);
    const admin = await request(app)
      .get("/api/admin/disease-library")
      .set("Authorization", `Bearer ${users.admin.token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.pagination.total, 1);
    assert.deepEqual(response.body.data.map((entry) => entry.name), ["Visible Disease"]);
    assert.equal(detail.status, 404);
    assert.equal(admin.body.pagination.total, 3);
    assert.ok(admin.body.data.some((entry) => entry.name === "Hidden Disease"));
    assert.ok(admin.body.data.some((entry) => entry.name === "Deleted Disease"));
  });
});
