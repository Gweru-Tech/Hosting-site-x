# 🐞 Ladybug Hosting v7 - Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Render.com (Recommended) - Easiest

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ladybug Hosting v7 Ready for Deployment"
   git push origin main
   ```

2. **Deploy to Render**
   - Go to [Render.com Dashboard](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Use the following settings:
     - **Environment**: Node
     - **Root Directory**: .
     - **Build Command**: `npm install`
     - **Start Command**: `node server.js`
     - **Instance Type**: Free (to start)

3. **Set Environment Variables**
   ```env
   NODE_ENV=production
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/ladybug-hosting-hosting-v7
   JWT_SECRET=your-super-secret-key
   ```

### Option 2: Manual Node.js Deployment

1. **Install Dependencies**
   ```bash
   npm install --production
   ```

2. **Set Environment**
   ```bash
   export NODE_ENV=production
   export PORT=3000
   export MONGODB_URI=mongodb://localhost:27017/ladybug-hosting-v7
   export JWT_SECRET="your-super-secret-key"
   ```

3. **Start Application**
   ```bash
   node server.js
   ```

### Option 3: PM2 Deployment (Production)

1. **Install PM2**
   ```bash
   npm install -g pm2
   ```

2. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js --env=production
   ```

3. **Monitor**
   ```bash:
   pm2 monit
   ```

## 🔧 Fixed Issues

### ✅ Docker Build Issues Resolved
- Removed problematic webpack dependencies
- Simplified dependency installation
- Fixed npm ci compatibility issues

### ✅ Database Connection Issues Fixed
- Updated Mongoose connection syntax
- Removed deprecated options
- Fixed graceful shutdown

### ✅ Package Dependencies Updated
- Removed vulnerable multer dependency
- Updated to latest stable versions
- Removed unnecessary dev dependencies from production

## 📋 Required Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `MONGODB_URI` | MongoDB connection | `mongodb://localhost:27017/ladybug-hosting-v7` |
| `JWT_SECRET` | JWT secret key | Auto-generated on Render |

## 🏥 Health Check

Your application includes a health check endpoint:

```bash
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "version": "7.0.0",
  "timestamp": "2024-01-15T14:30:22.123Z",
  "uptime": 3600
}
```

## 🌐 Access Your Application

Once deployed, your application will be available at:

### Render.com
- URL: `https://your-app-name.onrender.com`
- Health: `https://your-app-name.onrender.com/api/health`

### Local/Direct Server
- URL: `http://localhost:3000`
- Health: `http://localhost:3000/api/health`

## 🛠️ Troubleshooting

### **Error: npm ci failed**
**Solution**: Use `npm install --production` instead
```bash
# In Dockerfile, replace:
# RUN npm ci --only=production
# With:
RUN npm install --production
```

### **Error: Database connection failed**
**Solution**: The application works without MongoDB initially
```bash
# It will start with in-memory storage
# You can add MongoDB later by setting MONGODB_URI
```

### **Error: Port already in use**
**Solution**: Change port or stop existing service
```bash
# Use different port
export PORT=3001
node server.js
```

## 🎉 Success Indicators

Your deployment is successful when you see:
```
🐞 Ladybug Hosting v7 running on port 3000
🌐 Environment: production
```

And when you can access:
- Main dashboard at `http://your-url:3000`
- Health check at `http://your-url:3000/api/health`

## 📊 Monitoring

**Dashboard Features:**
- Real-time bot status
- Server performance metrics
- System health monitoring
- Activity log

**API Endpoints:**
- `GET /api/health` - System health
- `GET /api/servers` - Server status
- `GET /api/bots` - Bot list
- `POST /api/bots` - Create bot
- `DELETE /api/bots/:id` - Delete bot

## 🚨 Support

If you encounter issues:

1. **Check logs**: Look at console output for errors
2. **Verify environment**: Ensure all required variables are set
3. **Test locally**: Run `node server.js` to test before deploying
4. **Check dependencies**: Run `npm install` to ensure all packages are installed

---

🐞 **Ladybug Hosting v7** is now ready for production deployment!