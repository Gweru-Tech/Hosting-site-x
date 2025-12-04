// Ladybug Hosting v7 - Server Tests
const request = require('supertest');
const { app, server, botNetServer } = require('../server');
const mongoose = require('mongoose');

describe('Ladybug Hosting v7 - Server Tests', () => {
  let testBotId;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/ladybug-hosting-v7-test';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    // Clean up test database
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
    server.close();
  });

  describe('Health Check Endpoint', () => {
    test('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('version', '7.0.0');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Servers Endpoint', () => {
    test('should return server status', async () => {
      const response = await request(app)
        .get('/api/servers')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const server = response.body[0];
      expect(server).toHaveProperty('id');
      expect(server).toHaveProperty('name');
      expect(server).toHaveProperty('region');
      expect(server).toHaveProperty('capacity');
      expect(server).toHaveProperty('activeBots');
      expect(server).toHaveProperty('status');
    });
  });

  describe('Bot Management Endpoints', () => {
    test('should create a new bot', async () => {
      const botData = {
        name: 'Test Bot',
        type: 'discord',
        config: {
          token: 'test-token',
          prefix: '!'
        }
      };

      const response = await request(app)
        .post('/api/bots')
        .send(botData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('name', botData.name);
      expect(response.body).toHaveProperty('type', botData.type);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('serverId');
      expect(response.body).toHaveProperty('createdAt');
      
      testBotId = response.body._id;
    });

    test('should get list of bots', async () => {
      const response = await request(app)
        .get('/api/bots')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const bot = response.body.find(b => b._id === testBotId);
      expect(bot).toBeTruthy();
      expect(bot.name).toBe('Test Bot');
    });

    test('should validate bot creation data', async () => {
      const invalidBotData = {
        name: '', // Empty name should fail
        type: 'invalid-type'
      };

      await request(app)
        .post('/api/bots')
        .send(invalidBotData)
        .expect(500);
    });

    test('should delete a bot', async () => {
      await request(app)
        .delete(`/api/bots/${testBotId}`)
        .expect(200);

      // Verify bot is deleted
      await request(app)
        .get(`/api/bots/${testBotId}`)
        .expect(404);
    });
  });

  describe('Bot Net Server Management', () => {
    test('should initialize with default servers', () => {
      const servers = botNetServer.getServerStatus();
      expect(Array.isArray(servers)).toBe(true);
      expect(servers.length).toBe(3);
      
      servers.forEach(server => {
        expect(server).toHaveProperty('id');
        expect(server).toHaveProperty('name');
        expect(server).toHaveProperty('region');
        expect(server).toHaveProperty('capacity', 100);
        expect(server).toHaveProperty('activeBots', 0);
        expect(server).toHaveProperty('status', 'online');
      });
    });

    test('should assign bot to server', () => {
      const serverId = botNetServer.assignBot();
      expect(serverId).toBeTruthy();
      
      const servers = botNetServer.getServerStatus();
      const assignedServer = servers.find(s => s.id === serverId);
      expect(assignedServer.activeBots).toBe(1);
    });

    test('should release bot from server', () => {
      const servers = botNetServer.getServerStatus();
      const serverWithBot = servers.find(s => s.activeBots > 0);
      
      if (serverWithBot) {
        botNetServer.releaseBot(serverWithBot.id);
        const updatedServers = botNetServer.getServerStatus();
        const updatedServer = updatedServers.find(s => s.id === serverWithBot.id);
        expect(updatedServer.activeBots).toBe(0);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for unknown routes', async () => {
      await request(app)
        .get('/api/unknown')
        .expect(404);
    });

    test('should handle invalid bot ID for deletion', async () => {
      const invalidId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
      await request(app)
        .delete(`/api/bots/${invalidId}`)
        .expect(404);
    });

    test('should handle malformed bot ID', async () => {
      const malformedId = 'invalid-id-format';
      await request(app)
        .delete(`/api/bots/${malformedId}`)
        .expect(500);
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within limit', async () => {
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/health')
          .expect(200);
      }
    });

    test('should handle rate limit exceeded (simulated)', async () => {
      // This test would need to be adjusted based on actual rate limiting configuration
      // For now, just verify the endpoint still works
      await request(app)
        .get('/api/health')
        .expect(200);
    });
  });

  describe('Static File Serving', () => {
    test('should serve main index page', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('Ladybug Hosting v7');
      expect(response.text).toContain('Bot Net Server Management');
    });

    test('should serve CSS files', async () => {
      await request(app)
        .get('/css/ladybug-theme.css')
        .expect(200);
    });

    test('should serve JavaScript files', async () => {
      await request(app)
        .get('/js/app.js')
        .expect(200);
    });
  });
});