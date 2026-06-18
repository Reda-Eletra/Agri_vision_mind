const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '🌱 Smart Agriculture Management Platform API',
      version: '2.0.0',
      description: `
## Authentication
Use **POST /auth/login** or **GET /auth/google** to get a JWT token.

Then click **Authorize** 🔓 and enter: \`Bearer <your_token>\`
      `,
    },
    servers: [
      { url: 'http://localhost:4000/api', description: 'Development Server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste your JWT token here (without "Bearer" prefix — it is added automatically)',
        },
      },
      schemas: {
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Ahmed Hassan' },
            email: { type: 'string', format: 'email', example: 'ahmed@farm.com' },
            password: { type: 'string', minLength: 6, example: 'secret123' },
            phone: { type: 'string', example: '+201234567890' },
            location: { type: 'string', example: 'Cairo, Egypt' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'ahmed@farm.com' },
            password: { type: 'string', example: 'secret123' },
          },
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', example: 'ahmed@farm.com' },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['token', 'new_password', 'confirm_password'],
          properties: {
            token: { type: 'string', example: 'abc123tokenFromEmail' },
            new_password: { type: 'string', minLength: 6, example: 'newSecret456' },
            confirm_password: { type: 'string', example: 'newSecret456' },
          },
        },
        UpdatePasswordRequest: {
          type: 'object',
          required: ['current_password', 'new_password', 'confirm_password'],
          properties: {
            current_password: { type: 'string', example: 'oldSecret123' },
            new_password: { type: 'string', minLength: 6, example: 'newSecret456' },
            confirm_password: { type: 'string', example: 'newSecret456' },
          },
        },
        UpdateEmailRequest: {
          type: 'object',
          required: ['new_email', 'password'],
          properties: {
            new_email: { type: 'string', format: 'email', example: 'newemail@farm.com' },
            password: { type: 'string', example: 'secret123' },
          },
        },
        FarmRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Green Valley Farm' },
            location: { type: 'string', example: 'Nile Delta, Egypt' },
            area_hectares: { type: 'number', example: 12.5 },
            soil_type: { type: 'string', example: 'Clay Loam' },
            description: { type: 'string', example: 'Main vegetable farm' },
          },
        },
        CycleRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Summer Season 2025' },
            start_date: { type: 'string', format: 'date', example: '2025-06-01' },
            end_date: { type: 'string', format: 'date', example: '2025-09-30' },
            status: { type: 'string', enum: ['active', 'completed', 'paused'], example: 'active' },
            notes: { type: 'string' },
          },
        },
        CoordinateRequest: {
          type: 'object',
          required: ['latitude', 'longitude', 'order_index'],
          properties: {
            latitude: { type: 'number', example: 30.0444 },
            longitude: { type: 'number', example: 31.2357 },
            order_index: { type: 'integer', example: 0 },
          },
        },
        PlantRequest: {
          type: 'object',
          required: ['species_name'],
          properties: {
            species_name: { type: 'string', example: 'Tomato (Solanum lycopersicum)' },
            planted_at: { type: 'string', format: 'date', example: '2025-06-10' },
            health_status: { type: 'string', enum: ['healthy', 'infected', 'recovering', 'dead'] },
            notes: { type: 'string' },
          },
        },
        TaskRequest: {
          type: 'object',
          required: ['title', 'task_type', 'due_date'],
          properties: {
            title: { type: 'string', example: 'Water the tomatoes' },
            task_type: { type: 'string', enum: ['watering', 'fertilizing', 'harvesting', 'spraying', 'other'] },
            due_date: { type: 'string', format: 'date', example: '2025-06-15' },
            notes: { type: 'string' },
          },
        },
        TransactionRequest: {
          type: 'object',
          required: ['amount', 'type', 'date'],
          properties: {
            amount: { type: 'number', example: 500.00 },
            type: { type: 'string', enum: ['income', 'expense'] },
            category: { type: 'string', example: 'Fertilizers' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date', example: '2025-06-10' },
          },
        },
        PostRequest: {
          type: 'object',
          required: ['title', 'body'],
          properties: {
            title: { type: 'string', example: 'Best irrigation techniques' },
            body: { type: 'string', example: 'Drip irrigation saves water...' },
          },
        },
        CommentRequest: {
          type: 'object',
          required: ['body'],
          properties: {
            body: { type: 'string', example: 'Great tip!' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Resource created successfully' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Validation failed' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: '🔐 Register, Login, Google OAuth' },
      { name: 'Password', description: '🔑 Forgot / Reset / Update Password' },
      { name: 'Profile', description: '👤 User profile & email management' },
      { name: 'Farms', description: '🌾 Farm CRUD' },
      { name: 'Farm Map', description: '🗺️ Farm polygon coordinates' },
      { name: 'Cycles', description: '🔄 Growing cycles' },
      { name: 'Plants', description: '🌱 Plant tracking' },
      { name: 'AI Diagnosis', description: '🤖 AI disease detection' },
      { name: 'Progress', description: '📈 Recovery progress logs' },
      { name: 'Tasks', description: '📋 Scheduled farm tasks' },
      { name: 'Transactions', description: '💰 Financial tracking' },
      { name: 'Community', description: '👥 Posts, comments & likes' },
      { name: 'Dashboard', description: '📊 Analytics & overview' },
    ],
    paths: {
      // ─── AUTH ─────────────────────────────────────────
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
          responses: {
            201: { description: 'Registered successfully — returns user + JWT token' },
            400: { description: 'Validation error' },
            409: { description: 'Email already registered' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with email & password',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
          responses: {
            200: { description: 'Login successful — returns user + JWT token' },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/auth/google': {
        get: {
          tags: ['Auth'],
          summary: 'Login with Google (OAuth 2.0)',
          description: '**Redirects to Google consent screen.** After successful login, Google redirects to `/auth/google/callback` which issues a JWT and redirects to your frontend at `FRONTEND_URL/auth/google/success#token=<jwt>`',
          responses: {
            302: { description: 'Redirects to Google consent page' },
          },
        },
      },
      '/auth/google/callback': {
        get: {
          tags: ['Auth'],
          summary: 'Google OAuth callback (handled automatically)',
          description: 'Google calls this endpoint after user approves. Redirects to frontend with JWT token.',
          responses: {
            302: { description: 'Redirects to frontend with token' },
          },
        },
      },

      // ─── PASSWORD ─────────────────────────────────────
      '/auth/forgot-password': {
        post: {
          tags: ['Password'],
          summary: 'Request a password reset email',
          description: 'Sends an email with a reset link valid for 30 minutes. Always returns 200 to prevent email enumeration.',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ForgotPasswordRequest' } } } },
          responses: {
            200: { description: 'Reset email sent (if email exists)' },
            400: { description: 'Validation error' },
          },
        },
      },
      '/auth/reset-password': {
        post: {
          tags: ['Password'],
          summary: 'Reset password using token from email',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordRequest' } } } },
          responses: {
            200: { description: 'Password reset successfully' },
            400: { description: 'Invalid / expired token or passwords do not match' },
          },
        },
      },
      '/users/update-password': {
        patch: {
          tags: ['Password'],
          summary: 'Update password while logged in',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdatePasswordRequest' } } } },
          responses: {
            200: { description: 'Password updated successfully' },
            401: { description: 'Current password is incorrect' },
            400: { description: 'Validation error or same password' },
          },
        },
      },

      // ─── PROFILE ──────────────────────────────────────
      '/users/profile': {
        get: {
          tags: ['Profile'],
          summary: 'Get current user profile',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'User profile (includes auth_provider, is_email_verified)' },
            401: { description: 'Unauthorized' },
          },
        },
        patch: {
          tags: ['Profile'],
          summary: 'Update profile (name, phone, location, avatar)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    phone: { type: 'string' },
                    location: { type: 'string' },
                    avatar: { type: 'string', format: 'binary', description: 'Profile image (jpg/png/webp, max 5MB)' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Profile updated' },
            400: { description: 'Validation error' },
          },
        },
      },
      '/users/update-email': {
        patch: {
          tags: ['Profile'],
          summary: 'Update account email (requires password confirmation)',
          description: 'Changes the email and notifies the old address. Issues a new JWT with the updated email.',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateEmailRequest' } } } },
          responses: {
            200: { description: 'Email updated — returns new JWT token' },
            400: { description: 'Same email or Google account' },
            401: { description: 'Wrong password' },
            409: { description: 'Email already in use' },
          },
        },
      },

      // ─── FARMS ────────────────────────────────────────
      '/farms': {
        post: {
          tags: ['Farms'],
          summary: 'Create a farm',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/FarmRequest' } } } },
          responses: { 201: { description: 'Farm created' }, 400: { description: 'Validation error' } },
        },
        get: {
          tags: ['Farms'],
          summary: 'Get all farms for current user',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'List of farms' } },
        },
      },
      '/farms/{id}': {
        get: {
          tags: ['Farms'],
          summary: 'Get a specific farm',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Farm details' }, 404: { description: 'Not found' } },
        },
        delete: {
          tags: ['Farms'],
          summary: 'Delete a farm',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found' } },
        },
      },
      '/farms/{id}/coordinates': {
        post: {
          tags: ['Farm Map'],
          summary: 'Add a polygon coordinate point',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CoordinateRequest' } } } },
          responses: { 201: { description: 'Coordinate added' } },
        },
        get: {
          tags: ['Farm Map'],
          summary: 'Get all farm polygon coordinates',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Coordinates ordered by order_index' } },
        },
      },
      '/coordinates/{id}': {
        delete: {
          tags: ['Farm Map'],
          summary: 'Delete a coordinate point',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Deleted' } },
        },
      },
      '/farms/{id}/cycles': {
        post: {
          tags: ['Cycles'],
          summary: 'Create a growing cycle',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CycleRequest' } } } },
          responses: { 201: { description: 'Cycle created' } },
        },
        get: {
          tags: ['Cycles'],
          summary: 'Get all cycles for a farm',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'List of cycles' } },
        },
      },
      '/cycles/{id}': {
        patch: {
          tags: ['Cycles'],
          summary: 'Update a cycle',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CycleRequest' } } } },
          responses: { 200: { description: 'Updated' } },
        },
      },
      '/cycles/{id}/plants': {
        post: {
          tags: ['Plants'],
          summary: 'Add a plant to a cycle',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PlantRequest' } } } },
          responses: { 201: { description: 'Plant tracked' } },
        },
        get: {
          tags: ['Plants'],
          summary: 'Get all plants in a cycle',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'List of plants' } },
        },
      },
      '/plants/{id}': {
        get: {
          tags: ['Plants'],
          summary: 'Get a specific plant',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Plant details' }, 404: { description: 'Not found' } },
        },
      },
      '/plants/{id}/scan': {
        post: {
          tags: ['AI Diagnosis'],
          summary: 'Upload plant image for AI disease scan',
          description: 'Runs AI diagnosis, saves to diagnosis_history, updates plant health & recovery %, logs AI usage. Fires alert if confidence > 0.8.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: { image: { type: 'string', format: 'binary', description: 'jpg/png/webp, max 5MB' } },
                },
              },
            },
          },
          responses: { 201: { description: 'Diagnosis result + alert (if any)' }, 404: { description: 'Plant not found' } },
        },
      },
      '/plants/{id}/progress-log': {
        post: {
          tags: ['Progress'],
          summary: 'Add a recovery progress log',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    note: { type: 'string' },
                    recovery_percent: { type: 'number', minimum: 0, maximum: 100 },
                    image: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Log added (includes alert if recovery decreased)' } },
        },
      },
      '/plants/{id}/progress-logs': {
        get: {
          tags: ['Progress'],
          summary: 'Get all progress logs for a plant',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Progress history' } },
        },
      },
      '/cycles/{id}/tasks': {
        post: {
          tags: ['Tasks'],
          summary: 'Create a scheduled task',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskRequest' } } } },
          responses: { 201: { description: 'Task created' } },
        },
        get: {
          tags: ['Tasks'],
          summary: 'Get tasks in a cycle (auto-marks overdue)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Tasks ordered by due_date' } },
        },
      },
      '/tasks/{id}': {
        patch: {
          tags: ['Tasks'],
          summary: 'Update a task',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskRequest' } } } },
          responses: { 200: { description: 'Updated' } },
        },
        delete: {
          tags: ['Tasks'],
          summary: 'Delete a task',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Deleted' } },
        },
      },
      '/farms/{id}/transactions': {
        post: {
          tags: ['Transactions'],
          summary: 'Record a financial transaction',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TransactionRequest' } } } },
          responses: { 201: { description: 'Recorded' } },
        },
        get: {
          tags: ['Transactions'],
          summary: 'Get transactions + financial summary',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['income', 'expense'] } },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          ],
          responses: { 200: { description: 'Transactions + total_income, total_expenses, net_profit' } },
        },
      },
      '/posts': {
        post: {
          tags: ['Community'],
          summary: 'Create a community post',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['title', 'body'],
                  properties: {
                    title: { type: 'string' },
                    body: { type: 'string' },
                    image: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Post created' } },
        },
        get: {
          tags: ['Community'],
          summary: 'Get posts (paginated)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: { 200: { description: 'Paginated posts' } },
        },
      },
      '/posts/{id}': {
        get: {
          tags: ['Community'],
          summary: 'Get a post (includes liked_by_me)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Post details' }, 404: { description: 'Not found' } },
        },
        delete: {
          tags: ['Community'],
          summary: 'Delete own post',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found or unauthorized' } },
        },
      },
      '/posts/{id}/comments': {
        post: {
          tags: ['Community'],
          summary: 'Add a comment',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CommentRequest' } } } },
          responses: { 201: { description: 'Comment added' } },
        },
        get: {
          tags: ['Community'],
          summary: 'Get comments for a post',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Comments list' } },
        },
      },
      '/comments/{id}': {
        delete: {
          tags: ['Community'],
          summary: 'Delete own comment',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Deleted' } },
        },
      },
      '/posts/{id}/like': {
        post: {
          tags: ['Community'],
          summary: 'Like a post',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 201: { description: 'Liked' } },
        },
        delete: {
          tags: ['Community'],
          summary: 'Unlike a post',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Unliked' } },
        },
      },
      '/dashboard/overview': {
        get: {
          tags: ['Dashboard'],
          summary: 'Overall platform stats',
          description: 'Returns: total_farms, total_plants, infected/healthy/recovering counts, avg_recovery_percent, overdue_tasks',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Overview statistics' } },
        },
      },
      '/dashboard/recent-scans': {
        get: {
          tags: ['Dashboard'],
          summary: 'Last 10 AI diagnosis scans',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Recent scans with plant and farm names' } },
        },
      },
      '/dashboard/upcoming-tasks': {
        get: {
          tags: ['Dashboard'],
          summary: 'Next 10 upcoming tasks',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Tasks ordered by due_date' } },
        },
      },
      '/dashboard/disease-distribution': {
        get: {
          tags: ['Dashboard'],
          summary: 'Disease distribution chart data',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Disease name, count, avg confidence, species' } },
        },
      },
      '/dashboard/farm-expenses': {
        get: {
          tags: ['Dashboard'],
          summary: 'Financial summary by farm and category',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'income / expenses / net_profit per farm' } },
        },
      },
      '/dashboard/plant-health': {
        get: {
          tags: ['Dashboard'],
          summary: 'Plant health trend + most affected species',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Weekly recovery trend (last 3 months) + top 5 infected species' } },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
