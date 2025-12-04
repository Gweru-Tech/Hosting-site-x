// Ladybug Hosting v7 - Frontend Application
class LadybugHosting {
    constructor() {
        this.socket = io();
        this.currentSection = 'dashboard';
        this.bots = [];
        this.servers = [];
        this.stats = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSocketListeners();
        this.loadInitialData();
        this.startRealTimeUpdates();
    }

    setupEventListeners() {
        // Bot form submission
        document.getElementById('bot-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createBot();
        });

        // Settings form submission
        document.getElementById('settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        // Modal close on outside click
        document.getElementById('bot-modal').addEventListener('click', (e) => {
            if (e.target.id === 'bot-modal') {
                this.closeBotModal();
            }
        });
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to Ladybug Hosting server');
            this.addActivityItem('Connected to server', 'online');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.addActivityItem('Disconnected from server', 'offline');
        });

        this.socket.on('botStatus', (data) => {
            this.updateBotStatus(data.botId, data.status);
        });

        this.socket.on('botDeleted', (data) => {
            this.removeBotFromList(data.botId);
            this.addActivityItem(`Bot ${data.botId} deleted`, 'idle');
        });

        this.socket.on('serverUpdate', (data) => {
            this.updateServerStatus(data);
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadBots(),
                this.loadServers(),
                this.loadStats()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load initial data');
        }
    }

    async loadBots() {
        try {
            const response = await fetch('/api/bots');
            if (response.ok) {
                this.bots = await response.json();
                this.updateBotList();
                this.updateDashboardStats();
            }
        } catch (error) {
            console.error('Error loading bots:', error);
        }
    }

    async loadServers() {
        try {
            const response = await fetch('/api/servers');
            if (response.ok) {
                this.servers = await response.json();
                this.updateServerList();
                this.updateServerLoadChart();
            }
        } catch (error) {
            console.error('Error loading servers:', error);
        }
    }

    async loadStats() {
        try {
            const health = await fetch('/api/health');
            if (health.ok) {
                const healthData = await health.json();
                this.updateSystemStats(healthData);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async createBot() {
        const name = document.getElementById('bot-name').value;
        const type = document.getElementById('bot-type').value;
        const configText = document.getElementById('bot-config').value;

        let config = {};
        if (configText) {
            try {
                config = JSON.parse(configText);
            } catch (error) {
                this.showError('Invalid JSON configuration');
                return;
            }
        }

        try {
            const response = await fetch('/api/bots', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, type, config })
            });

            if (response.ok) {
                const bot = await response.json();
                this.addActivityItem(`Bot "${name}" deployed successfully`, 'online');
                this.closeBotModal();
                await this.loadBots();
                document.getElementById('bot-form').reset();
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to create bot');
            }
        } catch (error) {
            console.error('Error creating bot:', error);
            this.showError('Failed to create bot');
        }
    }

    async deleteBot(botId) {
        if (!confirm('Are you sure you want to delete this bot?')) {
            return;
        }

        try {
            const response = await fetch(`/api/bots/${botId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.addActivityItem(`Bot deletion initiated`, 'idle');
                await this.loadBots();
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to delete bot');
            }
        } catch (error) {
            console.error('Error deleting bot:', error);
            this.showError('Failed to delete bot');
        }
    }

    updateBotList() {
        const botList = document.getElementById('bot-list');
        if (!botList) return;

        if (this.bots.length === 0) {
            botList.innerHTML = `
                <li class="ladybug-list-item">
                    <span>No bots deployed yet</span>
                    <span class="ladybug-status idle">Empty</span>
                </li>
            `;
            return;
        }

        botList.innerHTML = this.bots.map(bot => `
            <li class="ladybug-list-item" data-bot-id="${bot._id}">
                <div>
                    <strong>${bot.name}</strong><br>
                    <small style="color: var(--ladybug-dark-gray);">${bot.type} • ${bot.serverId}</small>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="ladybug-status ${bot.status}">${bot.status}</span>
                    <button class="ladybug-btn" style="padding: 5px 10px; font-size: 0.8rem;" 
                            onclick="ladybugApp.deleteBot('${bot._id}')">Delete</button>
                </div>
            </li>
        `).join('');
    }

    updateServerList() {
        const serversList = document.getElementById('servers-list');
        if (!serversList) return;

        serversList.innerHTML = this.servers.map(server => `
            <li class="ladybug-list-item">
                <div>
                    <strong>${server.name}</strong><br>
                    <small style="color: var(--ladybug-dark-gray);">${server.region} • Capacity: ${server.activeBots}/${server.capacity}</small>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                    <span class="ladybug-status ${server.status}">${server.status}</span>
                    <small style="color: var(--ladybug-dark-gray);">${((server.activeBots / server.capacity) * 100).toFixed(1)}% used</small>
                </div>
            </li>
        `).join('');
    }

    updateServerLoadChart() {
        const chartContainer = document.getElementById('server-load-chart');
        if (!chartContainer) return;

        const html = this.servers.map(server => {
            const loadPercentage = (server.activeBots / server.capacity) * 100;
            const color = loadPercentage > 80 ? 'var(--ladybug-red)' : 
                         loadPercentage > 60 ? 'var(--ladybug-yellow)' : 'var(--ladybug-green)';

            return `
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong>${server.name}</strong>
                        <span>${server.activeBots}/${server.capacity}</span>
                    </div>
                    <div style="background: var(--ladybug-gray); height: 20px; border-radius: 10px; overflow: hidden;">
                        <div style="background: ${color}; height: 100%; width: ${loadPercentage}%; transition: width 0.3s ease;"></div>
                    </div>
                </div>
            `;
        }).join('');

        chartContainer.innerHTML = html || '<p style="text-align: center; color: var(--ladybug-dark-gray);">No server data available</p>';
    }

    updateDashboardStats() {
        const totalBots = this.bots.length;
        const activeBots = this.bots.filter(bot => bot.status === 'running').length;
        
        document.getElementById('total-bots').textContent = totalBots;
        document.getElementById('active-bots').textContent = activeBots;
        document.getElementById('online-servers').textContent = this.servers.filter(s => s.status === 'online').length;
    }

    updateSystemStats(healthData) {
        const uptime = healthData.uptime;
        const uptimeElement = document.getElementById('uptime');
        if (uptimeElement) {
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            
            if (hours > 0) {
                uptimeElement.textContent = `${hours}h ${minutes}m`;
            } else if (minutes > 0) {
                uptimeElement.textContent = `${minutes}m ${seconds}s`;
            } else {
                uptimeElement.textContent = `${seconds}s`;
            }
        }
    }

    addActivityItem(message, status) {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;

        const item = document.createElement('li');
        item.className = 'ladybug-list-item';
        item.innerHTML = `
            <span>${new Date().toLocaleTimeString()}: ${message}</span>
            <span class="ladybug-status ${status}">${status}</span>
        `;

        activityList.insertBefore(item, activityList.firstChild);

        // Keep only last 10 items
        while (activityList.children.length > 10) {
            activityList.removeChild(activityList.lastChild);
        }
    }

    updateBotStatus(botId, status) {
        const botElement = document.querySelector(`[data-bot-id="${botId}"]`);
        if (botElement) {
            const statusElement = botElement.querySelector('.ladybug-status');
            if (statusElement) {
                statusElement.className = `ladybug-status ${status}`;
                statusElement.textContent = status;
            }
        }

        // Update bot in our local array
        const bot = this.bots.find(b => b._id === botId);
        if (bot) {
            bot.status = status;
            this.updateDashboardStats();
        }

        this.addActivityItem(`Bot ${botId} status: ${status}`, status);
    }

    removeBotFromList(botId) {
        const botElement = document.querySelector(`[data-bot-id="${botId}"]`);
        if (botElement) {
            botElement.remove();
        }

        // Remove from local array
        this.bots = this.bots.filter(b => b._id !== botId);
        this.updateDashboardStats();
    }

    startRealTimeUpdates() {
        // Update uptime every second
        setInterval(() => {
            this.loadStats();
        }, 1000);

        // Refresh data every 30 seconds
        setInterval(() => {
            this.loadInitialData();
        }, 30000);
    }

    saveSettings() {
        const settings = {
            maxBots: document.getElementById('max-bots').value,
            heartbeatInterval: document.getElementById('heartbeat-interval').value,
            logLevel: document.getElementById('log-level').value,
            notifications: document.getElementById('notifications').value
        };

        // In a real app, this would save to backend
        console.log('Saving settings:', settings);
        this.addActivityItem('Settings updated', 'online');
        this.showSuccess('Settings saved successfully');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? 'var(--ladybug-red)' : 'var(--ladybug-green)'};
            color: white;
            padding: 15px 20px;
            border-radius: var(--ladybug-radius);
            box-shadow: var(--ladybug-shadow);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Global functions for inline event handlers
function showDashboard() {
    document.querySelectorAll('main > section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById('dashboard').style.display = 'grid';
}

function showBotManager() {
    document.querySelectorAll('main > section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById('bot-manager').style.display = 'block';
}

function showServers() {
    document.querySelectorAll('main > section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById('servers').style.display = 'block';
}

function showSettings() {
    document.querySelectorAll('main > section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById('settings').style.display = 'block';
}

function openBotModal() {
    document.getElementById('bot-modal').style.display = 'flex';
}

function closeBotModal() {
    document.getElementById('bot-modal').style.display = 'none';
}

async function refreshData() {
    await ladybugApp.loadInitialData();
    ladybugApp.showSuccess('Data refreshed successfully');
}

function exportData() {
    const data = {
        bots: ladybugApp.bots,
        servers: ladybugApp.servers,
        timestamp: new Date().toISOString(),
        version: '7.0.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ladybug-hosting-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    ladybugApp.showSuccess('Data exported successfully');
}

// Add slide out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// Initialize the application
const ladybugApp = new LadybugHosting();

// Make bot deletion available globally
window.ladybugApp = ladybugApp;