import env from './env.js';

const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'rechpays API',
    version: env.app.version,
    description: 'rechpays — Mobile Recharge Reseller Platform (Prepaid & Postpaid).',
    contact: { name: 'rechpays Support', email: 'support@rechpays.com' },
    license: { name: 'MIT' },
  },
  servers: [
    { url: `${env.app.url}/api/v1`, description: 'Current environment' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 100 },
          totalPages: { type: 'integer', example: 5 },
          hasNext: { type: 'boolean' },
          hasPrev: { type: 'boolean' },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          role: { type: 'string', enum: ['super_admin', 'admin', 'retailer'] },
          businessName: { type: 'string' },
          isActive: { type: 'boolean' },
          isBlocked: { type: 'boolean' },
          commissionRate: { type: 'number' },
          wallet: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      WalletObject: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          user: { type: 'string' },
          balance: { type: 'number', example: 5000.00 },
          pendingAmount: { type: 'number' },
          totalCredited: { type: 'number' },
          totalDebited: { type: 'number' },
          totalCommission: { type: 'number' },
          status: { type: 'string', enum: ['ACTIVE', 'FROZEN', 'SUSPENDED', 'CLOSED'] },
          walletLimit: { type: 'number' },
          currency: { type: 'string', example: 'INR' },
          lastTransactionAt: { type: 'string', format: 'date-time' },
        },
      },
      WalletTransaction: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          txnId: { type: 'string' },
          type: { type: 'string', enum: ['CREDIT', 'DEBIT', 'REFUND', 'REVERSAL', 'COMMISSION', 'SETTLEMENT', 'ADJUSTMENT'] },
          amount: { type: 'number' },
          balanceBefore: { type: 'number' },
          balanceAfter: { type: 'number' },
          description: { type: 'string' },
          referenceId: { type: 'string' },
          referenceType: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      RechargeTransaction: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          txnId: { type: 'string', example: 'TXNKX3A9B2F1C' },
          mobileNumber: { type: 'string' },
          amount: { type: 'number' },
          type: { type: 'string' },
          status: { type: 'string', enum: ['INITIATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'REVERSED', 'TIMEOUT'] },
          providerTxnId: { type: 'string' },
          operatorRef: { type: 'string' },
          commission: { type: 'number' },
          retryCount: { type: 'integer' },
          initiatedAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time' },
        },
      },
      OperatorObject: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Airtel' },
          code: { type: 'string', example: 'AIRTEL' },
          type: { type: 'string', example: 'MOBILE_PREPAID' },
          providerCode: { type: 'string' },
          isActive: { type: 'boolean' },
          minAmount: { type: 'number' },
          maxAmount: { type: 'number' },
          commission: { type: 'number' },
        },
      },
      CircleObject: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Maharashtra' },
          code: { type: 'string', example: 'MH' },
          providerCode: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
      PlanObject: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          amount: { type: 'number', example: 199 },
          talktime: { type: 'number' },
          validity: { type: 'string', example: '28 days' },
          description: { type: 'string' },
          dataAmount: { type: 'string', example: '1.5GB/day' },
          planType: { type: 'string' },
          isPopular: { type: 'boolean' },
        },
      },
      NotificationObject: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          type: { type: 'string', enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'ALERT'] },
          isRead: { type: 'boolean' },
          readAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ApiKeyCreated: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          keyPrefix: { type: 'string', example: 'a1b2c3d4' },
          rawKey: { type: 'string', description: 'Shown only once at creation. Store securely.' },
          permissions: { type: 'array', items: { type: 'string' } },
          allowedIps: { type: 'array', items: { type: 'string' } },
          isActive: { type: 'boolean' },
          expiresAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      SettingObject: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: {},
          group: { type: 'string' },
          displayName: { type: 'string' },
          isPublic: { type: 'boolean' },
          isEditable: { type: 'boolean' },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    '/ping': {
      get: { tags: ['Health'], summary: 'Ping the server', security: [], responses: { 200: { description: 'pong' } } },
    },
    '/health': {
      get: { tags: ['Health'], summary: 'Health check with DB status', security: [], responses: { 200: { description: 'Healthy' }, 503: { description: 'Degraded' } } },
    },
    '/version': {
      get: { tags: ['Health'], summary: 'API version info', security: [], responses: { 200: { description: 'Version info' } } },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Login with email/phone + password', security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['identifier', 'password'], properties: { identifier: { type: 'string', example: '9876543210' }, password: { type: 'string', example: 'Secret@123' }, deviceId: { type: 'string' }, deviceName: { type: 'string' } } } } },
        },
        responses: { 200: { description: 'Login successful' }, 401: { description: 'Invalid credentials' }, 429: { description: 'Too many attempts' } },
      },
    },
    '/auth/refresh-token': {
      post: {
        tags: ['Auth'], summary: 'Refresh access token', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } },
        responses: { 200: { description: 'Token refreshed' }, 401: { description: 'Invalid token' } },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'], summary: 'Request password reset email', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } } },
        responses: { 200: { description: 'Reset email sent' } },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'], summary: 'Reset password using token', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token', 'password', 'confirmPassword'], properties: { token: { type: 'string' }, password: { type: 'string' }, confirmPassword: { type: 'string' } } } } } },
        responses: { 200: { description: 'Password reset' }, 400: { description: 'Invalid token' } },
      },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Logout current session', responses: { 200: { description: 'Logged out' } } },
    },
    '/auth/logout-all': {
      post: { tags: ['Auth'], summary: 'Logout all devices', responses: { 200: { description: 'All sessions revoked' } } },
    },
    '/auth/profile': {
      get: { tags: ['Auth'], summary: 'Get current user profile', responses: { 200: { description: 'Profile data' } } },
      put: { tags: ['Auth'], summary: 'Update current user profile', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, businessName: { type: 'string' }, gstNumber: { type: 'string' }, panNumber: { type: 'string' } } } } } }, responses: { 200: { description: 'Profile updated' } } },
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'], summary: 'Change password (authenticated)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['currentPassword', 'newPassword', 'confirmNewPassword'], properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string' }, confirmNewPassword: { type: 'string' } } } } } },
        responses: { 200: { description: 'Password changed' } },
      },
    },
    '/auth/sessions': {
      get: { tags: ['Auth'], summary: 'Get active sessions', responses: { 200: { description: 'Session list' } } },
    },
    '/auth/login-history': {
      get: { tags: ['Auth'], summary: 'Get login history', responses: { 200: { description: 'Login history' } } },
    },
    '/users': {
      get: { tags: ['Users'], summary: 'List all users (Admin)', parameters: [{ in: 'query', name: 'page', schema: { type: 'integer', default: 1 } }, { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } }, { in: 'query', name: 'role', schema: { type: 'string', enum: ['super_admin', 'admin', 'retailer'] } }, { in: 'query', name: 'search', schema: { type: 'string' } }], responses: { 200: { description: 'Users list' } } },
      post: { tags: ['Users'], summary: 'Create a new user (Admin)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'email', 'phone', 'password', 'confirmPassword', 'role'], properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, password: { type: 'string' }, confirmPassword: { type: 'string' }, role: { type: 'string' }, businessName: { type: 'string' } } } } } }, responses: { 201: { description: 'User created' }, 409: { description: 'Duplicate email/phone' } } },
    },
    '/users/{id}': {
      get: { tags: ['Users'], summary: 'Get user by ID', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'User data' }, 404: { description: 'Not found' } } },
      put: { tags: ['Users'], summary: 'Update user (Admin)', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, commissionRate: { type: 'number' }, isActive: { type: 'boolean' } } } } } }, responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Users'], summary: 'Soft-delete user (Super Admin)', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },
    '/users/{id}/block': {
      patch: { tags: ['Users'], summary: 'Block user (Admin)', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string' } } } } } }, responses: { 200: { description: 'Blocked' } } },
    },
    '/users/{id}/unblock': {
      patch: { tags: ['Users'], summary: 'Unblock user (Admin)', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Unblocked' } } },
    },
    '/wallet/me': {
      get: { tags: ['Wallet'], summary: 'Get my wallet', responses: { 200: { description: 'Wallet data' } } },
    },
    '/wallet/me/statement': {
      get: { tags: ['Wallet'], summary: 'Get my wallet statement', parameters: [{ in: 'query', name: 'page', schema: { type: 'integer' } }, { in: 'query', name: 'limit', schema: { type: 'integer' } }, { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date' } }, { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date' } }, { in: 'query', name: 'type', schema: { type: 'string' } }], responses: { 200: { description: 'Statement' } } },
    },
    '/wallet/ledger': {
      get: { tags: ['Wallet'], summary: 'Full wallet ledger (Admin)', responses: { 200: { description: 'Ledger' } } },
    },
    '/wallet/{userId}': {
      get: { tags: ['Wallet'], summary: 'Get wallet by user ID (Admin)', parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Wallet' } } },
    },
    '/wallet/{userId}/credit': {
      post: { tags: ['Wallet'], summary: 'Credit wallet (Admin)', parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amount', 'description'], properties: { amount: { type: 'number', example: 1000 }, description: { type: 'string' }, remarks: { type: 'string' } } } } } }, responses: { 200: { description: 'Credited' } } },
    },
    '/wallet/{userId}/debit': {
      post: { tags: ['Wallet'], summary: 'Debit wallet (Admin)', parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amount', 'description'], properties: { amount: { type: 'number' }, description: { type: 'string' } } } } } }, responses: { 200: { description: 'Debited' } } },
    },
    '/wallet/{userId}/freeze': {
      patch: { tags: ['Wallet'], summary: 'Freeze wallet (Admin)', parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string' } } } } } }, responses: { 200: { description: 'Frozen' } } },
    },
    '/wallet/{userId}/unfreeze': {
      patch: { tags: ['Wallet'], summary: 'Unfreeze wallet (Admin)', parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Unfrozen' } } },
    },
    '/recharge': {
      post: { tags: ['Recharge'], summary: 'Initiate a recharge', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['mobileNumber', 'amount', 'operatorId', 'type'], properties: { mobileNumber: { type: 'string', example: '9876543210' }, amount: { type: 'number', example: 199 }, operatorId: { type: 'string' }, circleId: { type: 'string' }, type: { type: 'string', enum: ['MOBILE_PREPAID', 'MOBILE_POSTPAID'] } } } } } }, responses: { 201: { description: 'Recharge processed' }, 400: { description: 'Validation error' }, 402: { description: 'Insufficient balance' } } },
    },
    '/recharge/my': {
      get: { tags: ['Recharge'], summary: 'Get my recharge transactions', parameters: [{ in: 'query', name: 'page', schema: { type: 'integer' } }, { in: 'query', name: 'limit', schema: { type: 'integer' } }, { in: 'query', name: 'status', schema: { type: 'string' } }, { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date' } }, { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date' } }], responses: { 200: { description: 'Transactions list' } } },
    },
    '/recharge/all': {
      get: { tags: ['Recharge'], summary: 'List all recharge transactions (Admin)', parameters: [{ in: 'query', name: 'page', schema: { type: 'integer' } }, { in: 'query', name: 'status', schema: { type: 'string' } }, { in: 'query', name: 'userId', schema: { type: 'string' } }], responses: { 200: { description: 'All transactions' } } },
    },
    '/recharge/status/{txnId}': {
      get: { tags: ['Recharge'], summary: 'Get recharge status (own txn)', parameters: [{ in: 'path', name: 'txnId', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Status data' }, 404: { description: 'Not found' } } },
    },
    '/recharge/admin/status/{txnId}': {
      get: { tags: ['Recharge'], summary: 'Get any transaction status (Admin)', parameters: [{ in: 'path', name: 'txnId', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Status data' } } },
    },
    '/recharge/{txnId}/retry': {
      post: { tags: ['Recharge'], summary: 'Retry a failed recharge (Admin)', parameters: [{ in: 'path', name: 'txnId', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Retry initiated' }, 400: { description: 'Not retryable' } } },
    },
    '/recharge/{txnId}/refund': {
      post: { tags: ['Recharge'], summary: 'Refund a recharge (Admin)', parameters: [{ in: 'path', name: 'txnId', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string' } } } } } }, responses: { 200: { description: 'Refunded' } } },
    },
    '/operators': {
      get: { tags: ['Operators'], summary: 'List operators', parameters: [{ in: 'query', name: 'type', schema: { type: 'string' } }, { in: 'query', name: 'isActive', schema: { type: 'boolean' } }], responses: { 200: { description: 'Operators list' } } },
      post: { tags: ['Operators'], summary: 'Create operator (Admin)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'code', 'type'], properties: { name: { type: 'string' }, code: { type: 'string' }, type: { type: 'string' }, providerCode: { type: 'string' } } } } } }, responses: { 201: { description: 'Created' } } },
    },
    '/operators/active': {
      get: { tags: ['Operators'], summary: 'List active operators', parameters: [{ in: 'query', name: 'type', schema: { type: 'string' } }], responses: { 200: { description: 'Active operators' } } },
    },
    '/operators/{id}': {
      get: { tags: ['Operators'], summary: 'Get operator by ID', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Operator' } } },
      put: { tags: ['Operators'], summary: 'Update operator (Admin)', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Operators'], summary: 'Deactivate operator (Admin)', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deactivated' } } },
    },
    '/operators/circles/all': {
      get: { tags: ['Operators'], summary: 'List all active circles', responses: { 200: { description: 'Circles' } } },
    },
    '/operators/circles': {
      post: { tags: ['Operators'], summary: 'Create circle (Admin)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'code'], properties: { name: { type: 'string' }, code: { type: 'string' }, providerCode: { type: 'string' } } } } } }, responses: { 201: { description: 'Created' } } },
    },
    '/operators/plans': {
      get: { tags: ['Operators'], summary: 'List plans', parameters: [{ in: 'query', name: 'operator', schema: { type: 'string' } }, { in: 'query', name: 'circle', schema: { type: 'string' } }], responses: { 200: { description: 'Plans' } } },
      post: { tags: ['Operators'], summary: 'Create plan (Admin)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['operator', 'circle', 'amount'], properties: { operator: { type: 'string' }, circle: { type: 'string' }, amount: { type: 'number' }, validity: { type: 'string' }, description: { type: 'string' } } } } } }, responses: { 201: { description: 'Created' } } },
    },
    '/operators/plans/by-operator': {
      get: { tags: ['Operators'], summary: 'Get plans by operator + circle', parameters: [{ in: 'query', name: 'operatorId', required: true, schema: { type: 'string' } }, { in: 'query', name: 'circleId', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Plans' } } },
    },
    '/notifications/my': {
      get: { tags: ['Notifications'], summary: 'Get my notifications', parameters: [{ in: 'query', name: 'page', schema: { type: 'integer' } }, { in: 'query', name: 'isRead', schema: { type: 'boolean' } }], responses: { 200: { description: 'Notifications with unreadCount' } } },
    },
    '/notifications/my/read-all': {
      patch: { tags: ['Notifications'], summary: 'Mark all as read', responses: { 200: { description: 'All marked read' } } },
    },
    '/notifications/my/{id}/read': {
      patch: { tags: ['Notifications'], summary: 'Mark notification as read', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Marked read' } } },
    },
    '/notifications': {
      get: { tags: ['Notifications'], summary: 'List all notifications (Admin)', responses: { 200: { description: 'All notifications' } } },
      post: { tags: ['Notifications'], summary: 'Send notification to user (Admin)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['userId', 'title', 'message'], properties: { userId: { type: 'string' }, title: { type: 'string' }, message: { type: 'string' }, type: { type: 'string' } } } } } }, responses: { 201: { description: 'Sent' } } },
    },
    '/notifications/broadcast': {
      post: { tags: ['Notifications'], summary: 'Broadcast to all users (Admin)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title', 'message'], properties: { title: { type: 'string' }, message: { type: 'string' }, roles: { type: 'array', items: { type: 'string' } } } } } } }, responses: { 200: { description: 'Broadcast sent' } } },
    },
    '/reports/dashboard': {
      get: { tags: ['Reports'], summary: 'Dashboard stats', responses: { 200: { description: 'Stats' } } },
    },
    '/reports/sales': {
      get: { tags: ['Reports'], summary: 'Sales report (Admin)', parameters: [{ in: 'query', name: 'startDate', schema: { type: 'string', format: 'date' } }, { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date' } }], responses: { 200: { description: 'Sales report' } } },
    },
    '/reports/sales/by-day': {
      get: { tags: ['Reports'], summary: 'Sales grouped by day (Admin)', responses: { 200: { description: 'Daily sales' } } },
    },
    '/reports/sales/by-operator': {
      get: { tags: ['Reports'], summary: 'Sales grouped by operator (Admin)', responses: { 200: { description: 'Operator sales' } } },
    },
    '/reports/recharge': {
      get: { tags: ['Reports'], summary: 'Recharge report (Admin)', responses: { 200: { description: 'Recharge report' } } },
    },
    '/reports/recharge/my': {
      get: { tags: ['Reports'], summary: 'My recharge report (Retailer)', responses: { 200: { description: 'My recharge report' } } },
    },
    '/reports/wallet': {
      get: { tags: ['Reports'], summary: 'Wallet report (Admin)', responses: { 200: { description: 'Wallet report' } } },
    },
    '/reports/wallet/my': {
      get: { tags: ['Reports'], summary: 'My wallet report (Retailer)', responses: { 200: { description: 'My wallet report' } } },
    },
    '/reports/commission': {
      get: { tags: ['Reports'], summary: 'Commission report (Admin)', responses: { 200: { description: 'Commission report' } } },
    },
    '/api-keys': {
      get: { tags: ['API Keys'], summary: 'List my API keys', responses: { 200: { description: 'API keys' } } },
      post: { tags: ['API Keys'], summary: 'Create API key', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, permissions: { type: 'array', items: { type: 'string' } }, allowedIps: { type: 'array', items: { type: 'string' } }, expiresAt: { type: 'string', format: 'date-time' } } } } } }, responses: { 201: { description: 'API key created — rawKey shown once' } } },
    },
    '/api-keys/{id}/revoke': {
      patch: { tags: ['API Keys'], summary: 'Revoke API key', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Revoked' } } },
    },
    '/settings/public': {
      get: { tags: ['Settings'], summary: 'Get public settings (no auth)', security: [], responses: { 200: { description: 'Public settings' } } },
    },
    '/settings': {
      get: { tags: ['Settings'], summary: 'List all settings (Admin)', responses: { 200: { description: 'Settings' } } },
    },
    '/settings/{key}': {
      get: { tags: ['Settings'], summary: 'Get setting by key', parameters: [{ in: 'path', name: 'key', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Setting' } } },
      put: { tags: ['Settings'], summary: 'Update setting (Admin)', parameters: [{ in: 'path', name: 'key', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['value'], properties: { value: {} } } } } }, responses: { 200: { description: 'Updated' } } },
    },
    '/provider': {
      get: { tags: ['Provider'], summary: 'List recharge providers (Admin)', responses: { 200: { description: 'Providers' } } },
    },
    '/provider/balance': {
      get: { tags: ['Provider'], summary: 'Get MRobotics provider balance (Admin)', responses: { 200: { description: 'Balance' } } },
    },
    '/logs/activity': {
      get: { tags: ['Logs'], summary: 'Activity logs (Admin)', parameters: [{ in: 'query', name: 'page', schema: { type: 'integer' } }, { in: 'query', name: 'userId', schema: { type: 'string' } }], responses: { 200: { description: 'Activity logs' } } },
    },
    '/logs/audit': {
      get: { tags: ['Logs'], summary: 'Audit logs (Admin)', parameters: [{ in: 'query', name: 'severity', schema: { type: 'string' } }], responses: { 200: { description: 'Audit logs' } } },
    },
    '/logs/webhooks': {
      get: { tags: ['Logs'], summary: 'Webhook logs (Admin)', responses: { 200: { description: 'Webhook logs' } } },
    },
    '/webhooks/mrobotics': {
      post: { tags: ['Webhooks'], summary: 'MRobotics recharge status webhook', security: [], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Webhook acknowledged' }, 401: { description: 'Invalid signature' } } },
    },
  },
  tags: [
    { name: 'Health', description: 'System health & version' },
    { name: 'Auth', description: 'Authentication & session management' },
    { name: 'Users', description: 'User management' },
    { name: 'Wallet', description: 'Wallet operations' },
    { name: 'Recharge', description: 'Mobile Prepaid & Postpaid recharge' },
    { name: 'Operators', description: 'Operator, circle & plan management' },
    { name: 'Notifications', description: 'Notification management' },
    { name: 'Reports', description: 'Business intelligence' },
    { name: 'API Keys', description: 'API key management' },
    { name: 'Settings', description: 'System settings' },
    { name: 'Provider', description: 'MRobotics provider management' },
    { name: 'Logs', description: 'Activity, audit & webhook logs' },
    { name: 'Webhooks', description: 'Incoming webhooks from providers' },
  ],
};

export default swaggerSpec;
