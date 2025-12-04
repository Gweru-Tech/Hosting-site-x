// Ladybug Hosting v7 - Bot Manager Tests
const BotManager = require('../workers/botManager');
const mongoose = require('mongoose');

// Mock MongoDB connection for testing
const mockMongoUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/ladybug-hosting-v7-test';

// Bot Schema for testing
const BotSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  status: { type: String, default: 'idle' },
  serverId: { type: String, required: true },
  config: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  metrics: {
    uptime: { type: Number, default: 0 },
    requests: { type: Number, default: 0 },
    errors: { type: Number, default: 0 }
  }
});

const Bot = mongoose.model('Bot', BotSchema);

describe('Ladybug Hosting v7 - Bot Manager Tests', () => {
  let botManager;
  let testBot;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(mockMongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Create Bot Manager instance
    botManager = new BotManager();
  });

  afterAll(async () => {
    // Clean up test database
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await Bot.deleteMany({});
    
    // Create test bot
    testBot = new Bot({
      name: 'Test Bot',
      type: 'discord',
      status: 'running',
      serverId: 'server-1',
      config: { token: 'test-token' }
    });
    await testBot.save();
  });

  describe('Bot Health Checks', () => {
    test('should check Discord bot health correctly', async () => {
      const health = await botManager.checkDiscordBot(testBot);
      expect(typeof health).toBe('boolean');
    });

    test('should check Telegram bot health correctly', async () => {
      testBot.type = 'telegram';
      await testBot.save();
      
      const health = await botManager.checkTelegramBot(testBot);
      expect(typeof health).toBe('boolean');
    });

    test('should check Web bot health correctly', async () => {
      testBot.type = 'web';
      testBot.config = { targetUrl: 'https://httpbin.org/status/200' };
      await testBot.save();
      
      const health = await botManager.checkWebBot(testBot);
      expect(health).toBe(true);
    });

    test('should check Monitor bot health correctly', async () => {
      testBot.type = 'monitor';
      await testBot.save();
      
      const health = await botManager.checkMonitorBot(testBot);
      expect(health).toBe(true);
    });

    test('should check Custom bot health correctly', async () => {
      testBot.type = 'custom';
      await testBot.save();
      
      const health = await botManager.checkCustomBot(testBot);
      expect(typeof health).toBe('boolean');
    });

    test('should handle bot health check errors', async () => {
      // Mock a bot that will cause an error
      const errorBot = {
        type: 'web',
        config: { targetUrl: 'invalid-url' }
      };
      
      const health = await botManager.checkWebBot(errorBot);
      expect(health).toBe(false);
    });
  });

  describe('Bot Lifecycle Management', () => {
    test('should restart a failed bot', async () => {
      testBot.status = 'error';
      await testBot.save();
      
      await botManager.restartBot(testBot);
      
      const updatedBot = await Bot.findById(testBot._id);
      expect(updatedBot.status).toBe('starting');
    });

    test('should stop a running bot', async () => {
      await botManager.stopBot(testBot);
      
      const updatedBot = await Bot.findById(testBot._id);
      expect(updatedBot.status).toBe('stopped');
    });

    test('should handle bot restart with errors', async () => {
      // Mock a bot that will fail to restart
      const failingBot = testBot;
      failingBot.name = null; // This will cause validation error
      
      // Should not throw an error
      await expect(botManager.restartBot(failingBot)).resolves.not.toThrow();
    });
  });

  describe('Heartbeat Check', () => {
    test('should perform heartbeat check on running bots', async () => {
      // Create multiple running bots
      const bot2 = new Bot({
        name: 'Test Bot 2',
        type: 'discord',
        status: 'running',
        serverId: 'server-2',
        config: { token: 'test-token-2' }
      });
      await bot2.save();

      await botManager.performHeartbeatCheck();
      
      // Check that bots were processed (lastActive should be updated for healthy bots)
      const updatedBot = await Bot.findById(testBot._id);
      expect(updatedBot.lastActive).toBeInstanceOf(Date);
    });

    test('should mark unhealthy bots as error', async () => {
      // Create a bot with old lastActive time
      const oldBot = new Bot({
        name: 'Old Bot',
        type: 'discord',
        status: 'running',
        serverId: 'server-1',
        config: { token: 'test-token' },
        lastActive: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      });
      await oldBot.save();

      await botManager.performHeartbeatCheck();
      
      const updatedBot = await Bot.findById(oldBot._id);
      expect(updatedBot.status).toBe('error');
    });
  });

  describe('Health Check Statistics', () => {
    test('should collect and report health statistics', async () => {
      // Create bots with different statuses
      const idleBot = new Bot({
        name: 'Idle Bot',
        type: 'discord',
        status: 'idle',
        serverId: 'server-1',
        config: { token: 'test-token' }
      });
      await idleBot.save();

      const errorBot = new Bot({
        name: 'Error Bot',
        type: 'discord',
        status: 'error',
        serverId: 'server-1',
        config: { token: 'test-token' }
      });
      await errorBot.save();

      // This should not throw an error
      await expect(botManager.performHealthCheck()).resolves.not.toThrow();
    });

    test('should handle health check with no bots', async () => {
      await Bot.deleteMany({});
      
      await expect(botManager.performHealthCheck()).resolves.not.toThrow();
    });
  });

  describe('Metrics Collection', () => {
    test('should collect metrics from bots', async () => {
      // Create bots with different servers
      const bot2 = new Bot({
        name: 'Test Bot 2',
        type: 'discord',
        status: 'running',
        serverId: 'server-2',
        config: { token: 'test-token-2' },
        metrics: { uptime: 100, requests: 50, errors: 2 }
      });
      await bot2.save();

      await expect(botManager.collectMetrics()).resolves.not.toThrow();
    });

    test('should handle metrics collection with no bots', async () => {
      await Bot.deleteMany({});
      
      await expect(botManager.collectMetrics()).resolves.not.toThrow();
    });
  });

  describe('Cleanup Operations', () => {
    test('should cleanup orphaned bots', async () => {
      // Create an old orphaned bot
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const orphanedBot = new Bot({
        name: 'Orphaned Bot',
        type: 'discord',
        status: 'error',
        serverId: 'server-1',
        config: { token: 'test-token' },
        lastActive: oldDate
      });
      await orphanedBot.save();

      await botManager.cleanupOrphanedBots();
      
      const deletedBot = await Bot.findById(orphanedBot._id);
      expect(deletedBot).toBeNull();
    });

    test('should not cleanup recent bots', async () => {
      const recentBot = new Bot({
        name: 'Recent Bot',
        type: 'discord',
        status: 'idle',
        serverId: 'server-1',
        config: { token: 'test-token' }
      });
      await recentBot.save();

      await botManager.cleanupOrphanedBots();
      
      const existingBot = await Bot.findById(recentBot._id);
      expect(existingBot).toBeTruthy();
    });
  });

  describe('Failed Bot Restart', () => {
    test('should restart failed bots with low error count', async () => {
      const failedBot = new Bot({
        name: 'Failed Bot',
        type: 'discord',
        status: 'error',
        serverId: 'server-1',
        config: { token: 'test-token' },
        metrics: { errors: 2 }
      });
      await failedBot.save();

      await botManager.restartFailedBots();
      
      // Should attempt to restart (status should change)
      const updatedBot = await Bot.findById(failedBot._id);
      expect(updatedBot.status).toBe('starting');
    });

    test('should not restart bots with high error count', async () => {
      const failedBot = new Bot({
        name: 'High Error Bot',
        type: 'discord',
        status: 'error',
        serverId: 'server-1',
        config: { token: 'test-token' },
        metrics: { errors: 10 }
      });
      await failedBot.save();

      await botManager.restartFailedBots();
      
      // Should not restart (status should remain error)
      const updatedBot = await Bot.findById(failedBot._id);
      expect(updatedBot.status).toBe('error');
    });
  });

  describe('Alert System', () => {
    test('should send alerts without webhook URL', async () => {
      // Should not throw an error even without webhook URL
      await expect(botManager.sendAlert('Test alert')).resolves.not.toThrow();
    });

    test('should handle metrics sending without webhook', async () => {
      const mockStats = {
        total: 5,
        running: 3,
        error: 1,
        idle: 1
      };

      // Should not throw an error even without webhook URL
      await expect(botManager.sendMetrics(mockStats)).resolves.not.toThrow();
    });
  });

  describe('Initialization', () => {
    test('should initialize without errors', async () => {
      const newManager = new BotManager();
      
      // Should not throw an error during initialization
      await expect(newManager.initialize()).resolves.not.toThrow();
      
      // Clean up
      await newManager.shutdown();
    });

    test('should handle database connection errors', async () => {
      // Test with invalid URI
      const invalidManager = new BotManager();
      const originalUri = process.env.MONGODB_URI;
      process.env.MONGODB_URI = 'mongodb://invalid:27017/test';
      
      // Should handle connection errors gracefully
      await expect(invalidManager.initialize()).rejects.toThrow();
      
      process.env.MONGODB_URI = originalUri;
    });
  });

  describe('Shutdown', () => {
    test('should shutdown gracefully', async () => {
      const shutdownManager = new BotManager();
      await shutdownManager.initialize();
      
      await expect(shutdownManager.shutdown()).resolves.not.toThrow();
    });

    test('should stop all running bots during shutdown', async () => {
      const shutdownManager = new BotManager();
      await shutdownManager.initialize();
      
      // Create running bots
      const runningBot = new Bot({
        name: 'Running Bot',
        type: 'discord',
        status: 'running',
        serverId: 'server-1',
        config: { token: 'test-token' }
      });
      await runningBot.save();

      await shutdownManager.shutdown();
      
      const updatedBot = await Bot.findById(runningBot._id);
      expect(updatedBot.status).toBe('stopped');
    });
  });
});