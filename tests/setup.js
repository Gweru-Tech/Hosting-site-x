// Ladybug Hosting v7 - Test Setup
const mongoose = require('mongoose');

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.BOT_HEARTBEAT_INTERVAL = '1000';
process.env.SERVER_HEALTH_CHECK_INTERVAL = '2000';

// Global test timeout
jest.setTimeout(10000);

// Database setup
beforeAll(async () => {
  // Connect to test database
  const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/ladybug-hosting-v7-test';
  
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Test database connected');
  } catch (error) {
    console.error('Test database connection failed:', error);
    process.exit(1);
  }
});

afterAll(async () => {
  // Clean up database connection
  try {
    await mongoose.connection.close();
    console.log('Test database disconnected');
  } catch (error) {
    console.error('Test database disconnection failed:', error);
  }
});

// Clean up database before each test
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Mock WebSocket for testing
global.mockWebSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  to: jest.fn(() => global.mockWebSocket),
};

// Mock external dependencies
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Mock cron jobs
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn(),
  },
}));

// Test utilities
global.testUtils = {
  // Create a test bot object
  createTestBot: (overrides = {}) => ({
    name: 'Test Bot',
    type: 'discord',
    status: 'idle',
    serverId: 'server-1',
    config: { token: 'test-token' },
    createdAt: new Date(),
    lastActive: new Date(),
    metrics: {
      uptime: 0,
      requests: 0,
      errors: 0
    },
    ...overrides
  }),

  // Create a test server object
  createTestServer: (overrides = {}) => ({
    id: 'test-server-1',
    name: 'Test Server',
    region: 'us-east',
    capacity: 100,
    activeBots: 0,
    status: 'online',
    lastPing: Date.now(),
    ...overrides
  }),

  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate random string
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Generate random ObjectId
  randomObjectId: () => {
    return new mongoose.Types.ObjectId();
  }
};

// Error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});