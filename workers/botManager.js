// Ladybug Hosting v7 - Bot Management Worker
const mongoose = require('mongoose');
const cron = require('node-cron');
const axios = require('axios');
const winston = require('winston');
require('dotenv').config();

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/bot-manager-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/bot-manager.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Bot Schema (matching main server)
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

class BotManager {
  constructor() {
    this.isRunning = false;
    this.heartbeatInterval = process.env.BOT_HEARTBEAT_INTERVAL || 30000;
    this.serverHealthCheckInterval = process.env.SERVER_HEALTH_CHECK_INTERVAL || 60000;
    this.botProcesses = new Map();
  }

  async initialize() {
    try {
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ladybug-hosting-v7', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      logger.info('🐞 Bot Manager initialized');
      logger.info(`Heartbeat interval: ${this.heartbeatInterval}ms`);
      logger.info(`Health check interval: ${this.serverHealthCheckInterval}ms`);

      this.isRunning = true;
      this.startPeriodicTasks();
      
    } catch (error) {
      logger.error('Failed to initialize Bot Manager:', error);
      process.exit(1);
    }
  }

  startPeriodicTasks() {
    // Heartbeat check every 30 seconds (configurable)
    cron.schedule('*/30 * * * * *', async () => {
      if (this.isRunning) {
        await this.performHeartbeatCheck();
      }
    });

    // Health check every minute (configurable)
    cron.schedule('0 * * * * *', async () => {
      if (this.isRunning) {
        await this.performHealthCheck();
      }
    });

    // Metrics collection every 5 minutes
    cron.schedule('0 */5 * * * *', async () => {
      if (this.isRunning) {
        await this.collectMetrics();
      }
    });

    // Cleanup orphaned bots every hour
    cron.schedule('0 0 * * * *', async () => {
      if (this.isRunning) {
        await this.cleanupOrphanedBots();
      }
    });

    // Auto-restart failed bots every 10 minutes
    cron.schedule('0 */10 * * * *', async () => {
      if (this.isRunning) {
        await this.restartFailedBots();
      }
    });

    logger.info('🔄 Periodic tasks scheduled');
  }

  async performHeartbeatCheck() {
    try {
      const bots = await Bot.find({ status: 'running' });
      
      for (const bot of bots) {
        const isHealthy = await this.checkBotHealth(bot);
        
        if (!isHealthy) {
          logger.warn(`Bot ${bot.name} (${bot._id}) heartbeat failed`);
          bot.status = 'error';
          bot.metrics.errors += 1;
          await bot.save();
          
          // Attempt to restart
          setTimeout(() => this.restartBot(bot), 5000);
        } else {
          bot.lastActive = new Date();
          bot.metrics.uptime += this.heartbeatInterval / 1000;
          await bot.save();
        }
      }
      
      logger.info(`Heartbeat check completed for ${bots.length} bots`);
    } catch (error) {
      logger.error('Heartbeat check failed:', error);
    }
  }

  async performHealthCheck() {
    try {
      const bots = await Bot.find();
      const stats = {
        total: bots.length,
        running: bots.filter(b => b.status === 'running').length,
        error: bots.filter(b => b.status === 'error').length,
        idle: bots.filter(b => b.status === 'idle').length,
        starting: bots.filter(b => b.status === 'starting').length
      };

      logger.info('📊 Bot Health Statistics:', stats);
      
      // Check for critical issues
      const errorRate = stats.error / stats.total;
      if (errorRate > 0.5) {
        logger.warn('High error rate detected:', `${(errorRate * 100).toFixed(1)}%`);
        await this.sendAlert('High bot error rate detected');
      }

      // Send metrics to monitoring service
      await this.sendMetrics(stats);
      
    } catch (error) {
      logger.error('Health check failed:', error);
    }
  }

  async collectMetrics() {
    try {
      const bots = await Bot.find();
      const serverMetrics = {};
      
      // Aggregate metrics by server
      bots.forEach(bot => {
        if (!serverMetrics[bot.serverId]) {
          serverMetrics[bot.serverId] = {
            totalBots: 0,
            activeBots: 0,
            totalRequests: 0,
            totalErrors: 0,
            averageUptime: 0
          };
        }
        
        const metrics = serverMetrics[bot.serverId];
        metrics.totalBots += 1;
        
        if (bot.status === 'running') {
          metrics.activeBots += 1;
        }
        
        metrics.totalRequests += bot.metrics.requests || 0;
        metrics.totalErrors += bot.metrics.errors || 0;
        metrics.averageUptime += bot.metrics.uptime || 0;
      });

      // Calculate averages
      Object.keys(serverMetrics).forEach(serverId => {
        const metrics = serverMetrics[serverId];
        if (metrics.totalBots > 0) {
          metrics.averageUptime = metrics.averageUptime / metrics.totalBots;
        }
      });

      logger.info('📈 Metrics collected:', serverMetrics);
      
      // Store metrics for analytics
      await this.storeMetrics(serverMetrics);
      
    } catch (error) {
      logger.error('Metrics collection failed:', error);
    }
  }

  async cleanupOrphanedBots() {
    try {
      const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const orphanedBots = await Bot.find({
        lastActive: { $lt: threshold },
        status: { $in: ['error', 'idle'] }
      });

      for (const bot of orphanedBots) {
        logger.info(`Cleaning up orphaned bot: ${bot.name} (${bot._id})`);
        await this.stopBot(bot);
        await Bot.findByIdAndDelete(bot._id);
      }

      if (orphanedBots.length > 0) {
        logger.info(`Cleaned up ${orphanedBots.length} orphaned bots`);
      }
      
    } catch (error) {
      logger.error('Bot cleanup failed:', error);
    }
  }

  async restartFailedBots() {
    try {
      const failedBots = await Bot.find({
        status: 'error',
        'metrics.errors': { $lt: 5 } // Don't restart bots with too many errors
      });

      for (const bot of failedBots) {
        logger.info(`Attempting to restart failed bot: ${bot.name} (${bot._id})`);
        await this.restartBot(bot);
      }

      if (failedBots.length > 0) {
        logger.info(`Restarted ${failedBots.length} failed bots`);
      }
      
    } catch (error) {
      logger.error('Bot restart failed:', error);
    }
  }

  async checkBotHealth(bot) {
    try {
      // Simulate health check based on bot type
      switch (bot.type) {
        case 'discord':
          return await this.checkDiscordBot(bot);
        case 'telegram':
          return await this.checkTelegramBot(bot);
        case 'web':
          return await this.checkWebBot(bot);
        case 'monitor':
          return await this.checkMonitorBot(bot);
        default:
          return await this.checkCustomBot(bot);
      }
    } catch (error) {
      logger.error(`Health check failed for bot ${bot.name}:`, error);
      return false;
    }
  }

  async checkDiscordBot(bot) {
    // Simulate Discord bot health check
    const lastActiveTime = new Date(bot.lastActive).getTime();
    const currentTime = Date.now();
    const timeDiff = currentTime - lastActiveTime;
    
    // Consider healthy if active within last 2 minutes
    return timeDiff < 2 * 60 * 1000;
  }

  async checkTelegramBot(bot) {
    // Simulate Telegram bot health check
    const lastActiveTime = new Date(bot.lastActive).getTime();
    const currentTime = Date.now();
    const timeDiff = currentTime - lastActiveTime;
    
    // Consider healthy if active within last 2 minutes
    return timeDiff < 2 * 60 * 1000;
  }

  async checkWebBot(bot) {
    // Simulate web scraper bot health check
    if (bot.config && bot.config.targetUrl) {
      try {
        const response = await axios.get(bot.config.targetUrl, { 
          timeout: 5000,
          validateStatus: () => true 
        });
        return response.status < 500;
      } catch (error) {
        return false;
      }
    }
    return true;
  }

  async checkMonitorBot(bot) {
    // System monitor bots are always considered healthy unless they have errors
    return bot.metrics.errors < 3;
  }

  async checkCustomBot(bot) {
    // Default health check for custom bots
    const lastActiveTime = new Date(bot.lastActive).getTime();
    const currentTime = Date.now();
    const timeDiff = currentTime - lastActiveTime;
    
    // Consider healthy if active within last 5 minutes
    return timeDiff < 5 * 60 * 1000;
  }

  async restartBot(bot) {
    try {
      logger.info(`Restarting bot: ${bot.name} (${bot._id})`);
      
      bot.status = 'starting';
      await bot.save();
      
      // Simulate bot restart process
      setTimeout(async () => {
        bot.status = 'running';
        bot.lastActive = new Date();
        await bot.save();
        
        logger.info(`Bot ${bot.name} restarted successfully`);
      }, 3000);
      
    } catch (error) {
      logger.error(`Failed to restart bot ${bot.name}:`, error);
      bot.status = 'error';
      bot.metrics.errors += 1;
      await bot.save();
    }
  }

  async stopBot(bot) {
    try {
      logger.info(`Stopping bot: ${bot.name} (${bot._id})`);
      
      // Simulate bot cleanup process
      if (this.botProcesses.has(bot._id.toString())) {
        const process = this.botProcesses.get(bot._id.toString());
        // Terminate process if it exists
        this.botProcesses.delete(bot._id.toString());
      }
      
      bot.status = 'stopped';
      await bot.save();
      
    } catch (error) {
      logger.error(`Failed to stop bot ${bot.name}:`, error);
    }
  }

  async sendMetrics(stats) {
    try {
      // In a real implementation, send to monitoring service
      if (process.env.WEBHOOK_URL) {
        await axios.post(process.env.WEBHOOK_URL, {
          type: 'metrics',
          data: stats,
          timestamp: new Date().toISOString(),
          service: 'ladybug-bot-manager'
        });
      }
    } catch (error) {
      logger.error('Failed to send metrics:', error);
    }
  }

  async storeMetrics(serverMetrics) {
    try {
      // In a real implementation, store in time-series database
      logger.info('Storing metrics for analytics:', Object.keys(serverMetrics).length, 'servers');
    } catch (error) {
      logger.error('Failed to store metrics:', error);
    }
  }

  async sendAlert(message) {
    try {
      logger.warn('🚨 ALERT:', message);
      
      // Send notification webhook
      if (process.env.WEBHOOK_URL) {
        await axios.post(process.env.WEBHOOK_URL, {
          type: 'alert',
          message: message,
          timestamp: new Date().toISOString(),
          service: 'ladybug-bot-manager'
        });
      }
    } catch (error) {
      logger.error('Failed to send alert:', error);
    }
  }

  async shutdown() {
    logger.info('🛑 Shutting down Bot Manager...');
    
    this.isRunning = false;
    
    // Stop all running bots
    const runningBots = await Bot.find({ status: 'running' });
    for (const bot of runningBots) {
      await this.stopBot(bot);
    }
    
    // Close database connection
    await mongoose.connection.close();
    
    logger.info('✅ Bot Manager shutdown complete');
  }
}

// Initialize and start the Bot Manager
const botManager = new BotManager();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  await botManager.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received');
  await botManager.shutdown();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the Bot Manager
botManager.initialize().catch(error => {
  logger.error('Failed to start Bot Manager:', error);
  process.exit(1);
});

// Create logs directory
const fs = require('fs');
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

module.exports = BotManager;