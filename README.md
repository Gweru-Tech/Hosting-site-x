# 🐞 Ladybug Hosting v7 - Advanced Bot Net Server Platform

Ladybug Hosting v7 is a comprehensive bot hosting platform with distributed net server capabilities, designed for seamless deployment on Render.com. This platform provides robust bot management, real-time monitoring, and scalable server orchestration.

## ✨ Features

### 🚀 Core Features
- **Distributed Bot Hosting**: Deploy and manage bots across multiple net servers
- **Real-time Monitoring**: WebSocket-based live status updates and metrics
- **Automatic Failover**: Intelligent server load balancing and bot restart capabilities
- **Version 7 Architecture**: Modern, scalable, and production-ready infrastructure
- **Render.com Ready**: Optimized for seamless deployment and scaling

### 🤖 Bot Management
- **Multiple Bot Types**: Discord, Telegram, Web Scrapers, System Monitors, and Custom bots
- **Lifecycle Management**: Automated deployment, monitoring, and restart policies
- **Configuration Management**: JSON-based bot configuration with validation
- **Health Monitoring**: Continuous health checks with automatic recovery

### 🖥️ Server Infrastructure
- **Multi-Region Support**: Deploy servers across different geographic regions
- **Load Balancing**: Intelligent bot distribution based on server capacity
- **Health Monitoring**: Real-time server status and performance metrics
- **Auto-scaling**: Dynamic resource allocation based on demand

### 📊 Monitoring & Analytics
- **Real-time Dashboard**: Live statistics and performance metrics
- **Historical Data**: Bot performance and server utilization analytics
- **Alert System**: Configurable notifications for critical events
- **Export Capabilities**: Data export for analysis and reporting

### 🛡️ Security & Reliability
- **Secure Authentication**: JWT-based user authentication
- **Rate Limiting**: API protection against abuse
- **Data Encryption**: Secure data transmission and storage
- **Backup & Recovery**: Automated backup and disaster recovery

## 🏗️ Architecture

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Bot Manager   │
│   (React/Vanilla│◄──►│   (Express.js)  │◄──►│   (Worker)      │
│   JS + Socket)  │    │   + Socket.io   │    │   + Cron Jobs   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/Static    │    │   MongoDB       │    │   External APIs │
│   (Render CDN)  │    │   (Atlas)       │    │   (Webhooks)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Net Server Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Ladybug Net Servers                      │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Server Alpha  │   Server Beta   │     Server Gamma        │
│   (US-East)     │   (US-West)     │     (EU-West)           │
│                 │                 │                         │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────────────┐ │
│ │ Bot Node 1  │ │ │ Bot Node 1  │ │ │   Bot Node 1        │ │
│ │ Bot Node 2  │ │ │ Bot Node 2  │ │ │   Bot Node 2        │ │
│ │ Bot Node N  │ │ │ Bot Node N  │ │ │   Bot Node N        │ │
│ └─────────────┘ │ └─────────────┘ │ └─────────────────────┘ │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- MongoDB Atlas account
- Render.com account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/ladybug-hosting-v7.git
   cd ladybug-hosting-v7
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Local development setup**
   ```bash
   npm run dev
   ```

### Environment Variables

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ladybug-hosting-v7

# Security
JWT_SECRET=your-super-secret-jwt-key
BCRYPT_ROUNDS=12

# Bot Net Configuration
MAX_BOTS_PER_USER=10
BOT_HEARTBEAT_INTERVAL=30000
SERVER_HEALTH_CHECK_INTERVAL=60000

# External Services
WEBHOOK_URL=https://your-webhook-url.com
```

## 🐳 Deployment Options

### Option 1: Render.com (Recommended)

1. **Automatic Deployment**
   ```bash
   ./scripts/deploy.sh
   ```

2. **Manual Deployment**
   - Connect your repository to Render.com
   - Configure environment variables in Render dashboard
   - Deploy using `render.yaml` configuration

### Option 2: Docker Deployment

```bash
# Build the image
docker build -t ladybug-hosting-v7 .

# Run with Docker Compose
docker-compose up -d
```

### Option 3: Manual Server Deployment

```bash
# Install dependencies
npm install --production

# Build assets
npm run build

# Start with PM2
pm2 start ecosystem.config.js
```

## 📖 Usage Guide

### Dashboard Overview

The main dashboard provides:
- **System Statistics**: Total bots, active bots, online servers, uptime
- **Recent Activity**: Real-time activity feed
- **Quick Actions**: Deploy new bots, refresh data, export logs
- **Server Load**: Visual representation of server utilization

### Bot Management

1. **Deploy a New Bot**
   - Click "Deploy New Bot" or navigate to Bot Manager
   - Fill in bot configuration:
     - Name: Human-readable bot identifier
     - Type: Select from available bot types
     - Configuration: JSON configuration object

2. **Monitor Bot Status**
   - Real-time status updates via WebSocket
   - Health checks every 30 seconds
   - Automatic restart on failure

3. **Bot Types**
   - **Discord Bot**: Discord automation and moderation
   - **Telegram Bot**: Telegram chatbot functionality
   - **Web Scraper**: Automated web data extraction
   - **System Monitor**: Server and application monitoring
   - **Custom Bot**: Custom bot implementations

### Server Management

1. **View Server Status**
   - Navigate to Servers section
   - Monitor server load and capacity
   - Track regional performance

2. **Server Configuration**
   - Multi-region deployment
   - Capacity planning
   - Load balancing rules

## 🔧 Configuration

### Bot Configuration Examples

#### Discord Bot
```json
{
  "token": "your-discord-bot-token",
  "prefix": "!",
  "adminRole": "Admin",
  "channels": ["general", "bot-commands"]
}
```

#### Web Scraper
```json
{
  "targetUrl": "https://example.com",
  "selectors": {
    "title": "h1",
    "content": ".content",
    "links": "a[href]"
  },
  "interval": 3600000,
  "outputFormat": "json"
}
```

#### System Monitor
```json
{
  "metrics": ["cpu", "memory", "disk", "network"],
  "thresholds": {
    "cpu": 80,
    "memory": 85,
    "disk": 90
  },
  "alertEmail": "admin@example.com"
}
```

### Server Configuration

```yaml
servers:
  - id: server-1
    name: Ladybug Node Alpha
    region: us-east
    capacity: 100
    autoScaling: true
    
  - id: server-2
    name: Ladybug Node Beta
    region: us-west
    capacity: 100
    autoScaling: true
```

## 🔍 Monitoring

### Health Checks

- **Bot Heartbeat**: Every 30 seconds
- **Server Health**: Every minute
- **Metrics Collection**: Every 5 minutes
- **Cleanup Process**: Every hour

### Metrics Tracked

- Bot uptime and availability
- Server resource utilization
- API response times
- Error rates and patterns
- User activity and bot deployments

### Alerts

- High error rates (>50%)
- Server capacity thresholds (>80%)
- Bot failures and restarts
- System maintenance notifications

## 🛠️ Development

### Project Structure
```
ladybug-hosting-v7/
├── public/                 # Static assets
│   ├── css/               # Stylesheets
│   ├── js/                # Frontend JavaScript
│   └── images/            # Images and icons
├── workers/               # Background workers
│   └── botManager.js      # Bot lifecycle management
├── scripts/               # Deployment and utility scripts
│   └── deploy.sh          # Render.com deployment script
├── server.js              # Main application server
├── package.json           # Dependencies and scripts
├── render.yaml            # Render.com configuration
└── README.md              # Documentation
```

### API Endpoints

#### Health and Status
- `GET /api/health` - System health check
- `GET /api/stats` - System statistics

#### Bot Management
- `GET /api/bots` - List all bots
- `POST /api/bots` - Create new bot
- `DELETE /api/bots/:id` - Delete bot

#### Server Management
- `GET /api/servers` - List server status
- `GET /api/servers/:id/metrics` - Server metrics

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run linting
npm run lint
```

## 🔐 Security

### Authentication
- JWT-based authentication
- Secure password hashing (bcrypt)
- Session management
- API rate limiting

### Data Protection
- HTTPS enforcement
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Network Security
- CORS configuration
- Helmet.js security headers
- Request size limits
- IP-based restrictions

## 📈 Scaling

### Horizontal Scaling
- Multi-server deployment
- Load balancing configuration
- Database sharding support
- CDN integration

### Vertical Scaling
- Resource monitoring
- Auto-scaling rules
- Performance optimization
- Capacity planning

## 🆘 Troubleshooting

### Common Issues

1. **Bot Not Starting**
   - Check configuration JSON validity
   - Verify server capacity
   - Review error logs

2. **High Error Rates**
   - Monitor bot health status
   - Check resource utilization
   - Review recent deployments

3. **Server Connection Issues**
   - Verify MongoDB connection
   - Check network connectivity
   - Review firewall settings

### Debug Mode

```bash
# Enable debug logging
DEBUG=ladybug:* npm run dev

# View bot manager logs
tail -f logs/bot-manager.log

# View error logs
tail -f logs/bot-manager-error.log
```

## 📚 API Documentation

### WebSocket Events

#### Client to Server
- `subscribeBots` - Subscribe to bot status updates
- `subscribeServers` - Subscribe to server updates

#### Server to Client
- `botStatus` - Bot status update
- `botDeleted` - Bot deletion notification
- `serverUpdate` - Server status update

### REST API

#### Authentication
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

#### Bot Operations
```http
# Create bot
POST /api/bots
Content-Type: application/json

{
  "name": "My Bot",
  "type": "discord",
  "config": {"token": "bot-token"}
}

# List bots
GET /api/bots

# Delete bot
DELETE /api/bots/:id
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development Guidelines
- Follow ESLint rules
- Write comprehensive tests
- Update documentation
- Use semantic versioning

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [https://docs.ladybug-hosting.com](https://docs.ladybug-hosting.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/ladybug-hosting-v7/issues)
- **Community**: [Discord Server](https://discord.gg/ladybug-hosting)
- **Email**: support@ladybug-hosting.com

## 🎉 Roadmap

### Version 7.1 (Q1 2024)
- [ ] Advanced analytics dashboard
- [ ] Custom bot templates
- [ ] Enhanced security features
- [ ] Mobile app support

### Version 7.2 (Q2 2024)
- [ ] Kubernetes integration
- [ ] GraphQL API
- [ ] Advanced monitoring
- [ ] Multi-tenant support

### Version 8.0 (Q3 2024)
- [ ] AI-powered bot optimization
- [ ] Advanced auto-scaling
- [ ] Enterprise features
- [ ] Global CDN integration

---

**🐞 Ladybug Hosting v7** - Advanced Bot Net Server Platform

*Built with ❤️ and Ladybugs for the bot hosting community*