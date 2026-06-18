# 🌱 Smart Agriculture Management Platform — Backend API

A production-ready Node.js/Express REST API for managing farms, plant health monitoring, AI diagnosis, financial tracking, and farmer community features.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL (UUID primary keys)
- **Validation:** Joi
- **File Uploads:** Multer
- **Authentication:** JWT (Bearer token)

---

## Project Structure

```
smart-agriculture/
├── server.js               # Entry point
├── config/
│   ├── database.js         # PostgreSQL pool
│   ├── multer.js           # File upload config
│   └── schema.sql          # Full DB schema
├── controllers/
│   ├── authController.js
│   ├── farmController.js
│   ├── plantController.js
│   ├── taskController.js
│   ├── communityController.js
│   ├── transactionController.js
│   └── dashboardController.js
├── routes/
│   ├── authRoutes.js
│   ├── farmRoutes.js
│   ├── plantRoutes.js
│   ├── communityRoutes.js
│   └── dashboardRoutes.js
├── validators/
│   ├── authValidator.js
│   ├── farmValidator.js
│   └── appValidator.js
├── middlewares/
│   ├── auth.js             # JWT middleware
│   └── errorHandler.js
└── uploads/                # Uploaded images
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# DB_MODE options:
#   auto     -> PostgreSQL first, fallback to pg-mem when local DB is unavailable
#   postgres -> force PostgreSQL (recommended for production)
#   memory   -> force pg-mem (development/testing only)
# DB_FALLBACK_TO_MEMORY controls fallback behavior in auto mode.
```

### 3. Migrate Database
```bash
npm run db:migrate
npm run db:migrate:status
```

The migration runner:

- applies files from `migrations/` in version order;
- records checksums and applied versions in `schema_migrations`;
- wraps each migration in a transaction;
- uses a PostgreSQL advisory lock to serialize concurrent startup;
- adopts the baseline only when the legacy core schema is present;
- can be run repeatedly without reapplying completed work.

`config/schema.sql` describes the current final schema, but upgrades must use migrations. `config/alter-schema.sql` and `seed-db.js` are deprecated compatibility entry points.

For a fresh database, create the database itself and run `npm run db:migrate`. For an existing installation, take a backup and run the same command. If a migration fails, its transaction is rolled back and the server will not listen; fix the reported database/configuration issue and rerun the command without editing an already-applied migration.

### 4. Run the Server
```bash
npm run dev    # development (nodemon)
npm start      # production
```

The server runs migrations before binding its HTTP port.

### 5. Run Tests

```bash
npm test
```

The integration suite uses `pg-mem`, temporary upload storage, Supertest, and disabled background jobs. It never uses the configured developer PostgreSQL database.

---

## API Endpoints

All endpoints are prefixed with `/api`. Protected routes require:
```
Authorization: Bearer <jwt_token>
```

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/register | ❌ | Register new user |
| POST | /auth/login | ❌ | Login & get token |
| GET | /users/profile | ✅ | Get own profile |
| PATCH | /users/profile | ✅ | Update profile (supports avatar upload) |

### Farm Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /farms | ✅ | Create a farm |
| GET | /farms | ✅ | List all farms |
| GET | /farms/:id | ✅ | Get farm details |
| DELETE | /farms/:id | ✅ | Delete a farm |

### Farm Map
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /farms/:id/coordinates | ✅ | Add polygon point |
| GET | /farms/:id/coordinates | ✅ | Get polygon points |
| DELETE | /coordinates/:id | ✅ | Remove a point |

### Farm Cycles
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /farms/:id/cycles | ✅ | Create cycle |
| GET | /farms/:id/cycles | ✅ | List cycles |
| PATCH | /cycles/:id | ✅ | Update cycle |

### Plant Tracking
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /cycles/:id/plants | ✅ | Add plant to cycle |
| GET | /cycles/:id/plants | ✅ | List plants |
| GET | /plants/:id | ✅ | Get plant details |

### AI Diagnosis
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /plants/:id/scan | ✅ | Upload image & run AI scan |

**Returns:** disease name, confidence, severity, recommendations, alert if confidence > 0.8

### Progress Monitoring
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /plants/:id/progress-log | ✅ | Log recovery update |
| GET | /plants/:id/progress-logs | ✅ | Get progress history |

### Task Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /cycles/:id/tasks | ✅ | Create task |
| GET | /cycles/:id/tasks | ✅ | List tasks (auto-marks overdue) |
| PATCH | /tasks/:id | ✅ | Update task |
| DELETE | /tasks/:id | ✅ | Delete task |

**Task types:** watering, fertilizing, harvesting, spraying, other

### Financial Tracking
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /farms/:id/transactions | ✅ | Record transaction |
| GET | /farms/:id/transactions | ✅ | List with summary (supports ?type=, ?from=, ?to=) |

### Farmer Community
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /posts | ✅ | Create post (supports image) |
| GET | /posts | ✅ | List posts (supports ?page=&limit=) |
| GET | /posts/:id | ✅ | Get post |
| DELETE | /posts/:id | ✅ | Delete own post |
| POST | /posts/:id/comments | ✅ | Add comment |
| GET | /posts/:id/comments | ✅ | List comments |
| DELETE | /comments/:id | ✅ | Delete own comment |
| POST | /posts/:id/like | ✅ | Like a post |
| DELETE | /posts/:id/like | ✅ | Unlike a post |

### Dashboard Analytics
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /dashboard/overview | ✅ | Totals: farms, plants, infected, avg recovery |
| GET | /dashboard/recent-scans | ✅ | Last 10 AI diagnoses |
| GET | /dashboard/upcoming-tasks | ✅ | Next pending tasks |
| GET | /dashboard/disease-distribution | ✅ | Disease chart data |
| GET | /dashboard/farm-expenses | ✅ | Financial summary by farm |
| GET | /dashboard/plant-health | ✅ | Recovery trend + most affected species |

---

## Response Format

**Success:**
```json
{ "message": "Resource created successfully", "data": {} }
```

**Error:**
```json
{ "error": "Validation failed" }
```

---

## Alert System

Alerts are automatically generated and returned in API responses when:
- AI confidence > 0.8 on a diseased plant
- Plant recovery percentage decreases
- Tasks are overdue (auto-detected on list fetch)

---

## AI Usage Logging

Every `/plants/:id/scan` request logs to `ai_usage`:
- user_id, endpoint, provider, tokens_used, latency_ms, cost_estimate, success
