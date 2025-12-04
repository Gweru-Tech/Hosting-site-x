const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ladybug-hosting-v7', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Bot Management Schema
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

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bot' }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// Bot Net Server Management
class BotNetServer {
  constructor() {
    this.servers = new Map();
    this.initializeServers();
  }

  initializeServers() {
    // Initialize default server pool
    const defaultServers = [
      { id: 'server-1', name: 'Ladybug Node Alpha', region: 'us-east', capacity: 100 },
      { id: 'server-2', name: 'Ladybug Node Beta', region: 'us-west', capacity: 100 },
      { id: 'server-3', name: 'Ladybug Node Gamma', region: 'eu-west', capacity: 100 }
    ];

    defaultServers.forEach(server => {
      this.servers.set(server.id, {
        ...server,
        activeBots: 0,
        status: 'online',
        lastPing: Date.now()
      });
    });
  }

  assignBot(botId) {
    // Find best server based on capacity
    let bestServer = null;
    let minLoad = Infinity;

    for (const [serverId, server] of this.servers) {
      const loadRatio = server.activeBots / server.capacity;
      if (loadRatio < minLoad && server.status === 'online') {
        minLoad = loadRatio;
        bestServer = serverId;
      }
    }

    if (bestServer) {
      this.servers.get(bestServer).activeBots++;
      return bestServer;
    }
    return null;
  }

  releaseBot(serverId) {
    if (this.servers.has(serverId)) {
      this.servers.get(serverId).activeBots--;
    }
  }

  getServerStatus() {
    return Array.from(this.servers.values());
  }
}

const botNetServer = new BotNetServer();

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    version: '7.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/servers', (req, res) => {
  res.json(botNetServer.getServerStatus());
});

app.get('/api/bots', async (req, res) => {
  try {
    const bots = await Bot.find().sort({ createdAt: -1 });
    res.json(bots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bots', async (req, res) => {
  try {
    const { name, type, config } = req.body;
    const serverId = botNetServer.assignBot();
    
    if (!serverId) {
      return res.status(503).json({ error: 'No available servers' });
    }

    const bot = new Bot({
      name,
      type,
      serverId,
      config: config || {},
      status: 'starting'
    });

    await bot.save();
    
    // Simulate bot startup
    setTimeout(async () => {
      bot.status = 'running';
      await bot.save();
      io.emit('botStatus', { botId: bot._id, status: 'running' });
    }, 2000);

    res.status(201).json(bot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/bots/:id', async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    botNetServer.releaseBot(bot.serverId);
    await Bot.findByIdAndDelete(req.params.id);
    io.emit('botDeleted', { botId: req.params.id });
    
    res.json({ message: 'Bot deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('subscribeBots', () => {
    socket.join('bots');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Ladybug-themed main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🐞 Ladybug Hosting v7 running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Export for testing
module.exports = { app, server, botNetServer };