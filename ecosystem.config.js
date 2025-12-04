// Ladybug Hosting v7 - PM2 Configuration
module.exports = {
  apps: [
    {
      name: 'ladybug-hosting-v7',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      node_args: '--max-old-space-size=1024'
    },
    {
      name: 'ladybug-bot-manager',
      script: 'workers/botManager.js',
      instances: 1,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/bot-manager-error.log',
      out_file: './logs/bot-manager-out.log',
      log_file: './logs/bot-manager-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',
      restart_delay: 5000,
      node_args: '--max-old-space-size=512'
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/ladybug-hosting-v7.git',
      path: '/var/www/ladybug-hosting-v7',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    },
    staging: {
      user: 'deploy',
      host: 'staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/ladybug-hosting-v7.git',
      path: '/var/www/ladybug-hosting-v7-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      'env': {
        NODE_ENV: 'staging',
        PORT: 3001
      }
    }
  }
};