#!/usr/bin/env node

/**
 * ███████╗██╗██╗   ██╗ █████╗ ██╗  ████████╗███████╗ █████╗ ███╗   ███╗
 * ██╔════╝██║██║   ██║██╔══██╗██║  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║
 * ███████╗██║██║   ██║███████║██║     ██║   █████╗  ███████║██╔████╔██║
 * ╚════██║██║╚██╗ ██╔╝██╔══██║██║     ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║
 * ███████║██║ ╚████╔╝ ██║  ██║███████╗██║   ███████╗██║  ██║██║ ╚═╝ ██║
 * ╚══════╝╚═╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝
 * 
 * 🤖 SIVALTEAM PROFESSIONAL BOT v3.0.0
 * =====================================
 * 🔥 Professional Enterprise-Grade Telegram Bot
 * 🇹🇷 Advanced Turkish Character Support
 * ⚡ High-Performance Architecture
 * 🔒 Secure User Management
 * 📊 Real-time Dashboard Integration
 * 🔄 Full Desktop App Synchronization
 * 
 * Built with ❤️ for SivalTeam
 * Copyright 2025 - All Rights Reserved
 */

const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

// 🚀 Application Configuration
const CONFIG = {
    PORT: process.env.PORT || 10000,
    BOT_TOKEN: '8229159175:AAGRFoLpK9ma5ekPiaaCdI8EKJeca14XoOg',
    WEBHOOK_URL: 'https://sivalteam-bot.onrender.com/webhook',
    VERSION: '3.0.0',
    BUILD_DATE: new Date().toISOString(),
    ENVIRONMENT: process.env.NODE_ENV || 'production',
    
    // Performance Settings
    MAX_CONCURRENT_REQUESTS: 100,
    REQUEST_TIMEOUT: 30000,
    CACHE_TTL: 300000, // 5 minutes
    MAX_MESSAGE_LENGTH: 4096,
    MAX_INLINE_BUTTONS: 20,
    
    // Security Settings
    MAX_FAILED_ATTEMPTS: 5,
    RATE_LIMIT_WINDOW: 60000, // 1 minute
    MAX_REQUESTS_PER_WINDOW: 30,
    
    // Data Settings
    AUTO_BACKUP_INTERVAL: 3600000, // 1 hour
    MAX_LOG_ENTRIES: 1000,
    MAX_ACTIVITY_ENTRIES: 500
};

// 📁 Data Files Structure
const DATA_FILES = {
    employees: 'employees.json',
    deletedEmployees: 'deleted_employees.json',
    missingProducts: 'missing_products.json',
    activityLog: 'activity_log.json',
    tasks: 'tasks.json',
    categories: 'categories.json',
    adminSettings: 'admin_settings.json',
    pendingUsers: 'pending_users.json',
    backups: 'backups/',
    systemStats: 'system_stats.json',
    userSessions: 'user_sessions.json'
};

// 🏗️ Express Application Setup
const app = express();

// 🛡️ Security Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Request Logging Middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`📡 ${timestamp} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// 🌟 Startup Banner
console.log(`
███████╗██╗██╗   ██╗ █████╗ ██╗  ████████╗███████╗ █████╗ ███╗   ███╗
██╔════╝██║██║   ██║██╔══██╗██║  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║
███████╗██║██║   ██║███████║██║     ██║   █████╗  ███████║██╔████╔██║
╚════██║██║╚██╗ ██╔╝██╔══██║██║     ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║
███████║██║ ╚████╔╝ ██║  ██║███████╗██║   ███████╗██║  ██║██║ ╚═╝ ██║
╚══════╝╚═╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝

🔥 SIVALTEAM PROFESSIONAL BOT v${CONFIG.VERSION}
===============================================
🌐 Webhook URL: ${CONFIG.WEBHOOK_URL}
🔄 Turkish Character Protection: ACTIVE
✅ Enterprise Security: ENABLED
⚡ High Performance Mode: ON
📊 Dashboard Integration: READY
🔄 Desktop Sync: ACTIVE
💾 Auto Backup: ENABLED
🛡️ Rate Limiting: ACTIVE

🚀 Starting up at ${new Date().toLocaleString('tr-TR')}...
`);

// 🧠 Memory Cache System
class MemoryCache {
    constructor() {
        this.cache = new Map();
        this.ttl = new Map();
        
        // Clean expired entries every 5 minutes
        setInterval(() => this.cleanup(), 300000);
    }
    
    set(key, value, ttl = CONFIG.CACHE_TTL) {
        this.cache.set(key, value);
        this.ttl.set(key, Date.now() + ttl);
    }
    
    get(key) {
        if (this.ttl.get(key) < Date.now()) {
            this.delete(key);
            return undefined;
        }
        return this.cache.get(key);
    }
    
    delete(key) {
        this.cache.delete(key);
        this.ttl.delete(key);
    }
    
    cleanup() {
        const now = Date.now();
        for (const [key, expiry] of this.ttl.entries()) {
            if (expiry < now) {
                this.delete(key);
            }
        }
    }
    
    clear() {
        this.cache.clear();
        this.ttl.clear();
    }
    
    size() {
        return this.cache.size;
    }
}

const cache = new MemoryCache();

// 🔐 Rate Limiting System
class RateLimiter {
    constructor() {
        this.requests = new Map();
    }
    
    isAllowed(userId) {
        const now = Date.now();
        const windowStart = now - CONFIG.RATE_LIMIT_WINDOW;
        
        if (!this.requests.has(userId)) {
            this.requests.set(userId, []);
        }
        
        const userRequests = this.requests.get(userId);
        
        // Remove old requests
        const recentRequests = userRequests.filter(time => time > windowStart);
        this.requests.set(userId, recentRequests);
        
        if (recentRequests.length >= CONFIG.MAX_REQUESTS_PER_WINDOW) {
            return false;
        }
        
        recentRequests.push(now);
        return true;
    }
    
    reset(userId) {
        this.requests.delete(userId);
    }
}

const rateLimiter = new RateLimiter();

// 🇹🇷 Advanced Turkish Character Protection System
class TurkishCharacterHandler {
    constructor() {
        this.charMap = {
            // Broken -> Correct mapping
            'Ã¼': 'ü', 'Ã¼': 'ü', 'ÃŸ': 'ş', 'Ã§': 'ç', 'Ä±': 'ı', 'Ã¶': 'ö', 'Ä°': 'İ',
            'ãŸ': 'ş', 'ã§': 'ç', 'ã¶': 'ö', 'ä±': 'ı', 'Ç': 'Ç', 'Ü': 'Ü', 'Ö': 'Ö',
            'Ş': 'Ş', 'Ğ': 'Ğ', 'I': 'İ', 'ç': 'ç', 'ü': 'ü', 'ö': 'ö', 'ş': 'ş', 'ğ': 'ğ', 'ı': 'ı',
            
            // Clean broken characters
            ' Â ': ' ', 'Â': '', '\\u00A0': ' ', 'Ã': '', 'â€™': "'", 'â€œ': '"', 'â€': '"',
            '    ': ' ', '   ': ' ', '  ': ' ',
            
            // Additional fixes
            'Äž': 'ğ', 'Å': 'ş', 'Ä°': 'İ', 'Å\u009f': 'ş', 'Ä\u0131': 'ı'
        };
    }
    
    protect(text) {
        if (!text || typeof text !== 'string') return text;
        
        let result = text;
        
        // Apply character mappings
        Object.keys(this.charMap).forEach(broken => {
            const regex = new RegExp(this.escapeRegExp(broken), 'g');
            result = result.replace(regex, this.charMap[broken]);
        });
        
        // Remove extra whitespace
        result = result.replace(/\s+/g, ' ').trim();
        
        return result;
    }
    
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    validateTurkish(text) {
        const turkishPattern = /^[a-zA-ZçÇğĞıIİöÖşŞüÜ\s\d\-_.,!?()]+$/;
        return turkishPattern.test(text);
    }
}

const turkishHandler = new TurkishCharacterHandler();

// 💾 Advanced Data Management System
class DataManager {
    constructor() {
        this.initializeFiles();
        this.startAutoBackup();
    }
    
    async initializeFiles() {
        try {
            // Create backup directory
            if (!fsSync.existsSync(DATA_FILES.backups)) {
                await fs.mkdir(DATA_FILES.backups, { recursive: true });
            }
            
            // Initialize all data files
            for (const [key, filename] of Object.entries(DATA_FILES)) {
                if (key === 'backups') continue;
                
                if (!fsSync.existsSync(filename)) {
                    const initialData = this.getInitialData(key);
                    await this.writeFile(filename, initialData);
                    console.log(`✅ Initialized: ${filename}`);
                }
            }
            
            console.log('💾 Data management system initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize data files:', error);
            process.exit(1);
        }
    }
    
    getInitialData(type) {
        switch (type) {
            case 'employees':
                return [];
            case 'deletedEmployees':
                return [];
            case 'missingProducts':
                return [];
            case 'activityLog':
                return [];
            case 'tasks':
                return [];
            case 'categories':
                return [
                    "Tişört", "Gömlek", "Pantolon", "Etek", "Elbise",
                    "Ceket", "Ayakkabı", "Çanta", "Aksesuar", "İç Giyim",
                    "Spor Giyim", "Kış Giyim", "Yaz Giyim", "Çocuk Giyim"
                ];
            case 'adminSettings':
                return {
                    adminUsers: [],
                    approvalRequired: false,
                    maintenanceMode: false,
                    welcomeMessage: "🎉 Hoşgeldin SivalTeam sistemine!",
                    maxTasksPerUser: 50,
                    allowGuestAccess: false
                };
            case 'pendingUsers':
                return [];
            case 'systemStats':
                return {
                    totalUsers: 0,
                    totalTasks: 0,
                    totalProducts: 0,
                    uptime: Date.now(),
                    lastBackup: null,
                    version: CONFIG.VERSION
                };
            case 'userSessions':
                return [];
            default:
                return [];
        }
    }
    
    async readFile(filename) {
        try {
            // Check cache first
            const cached = cache.get(filename);
            if (cached) {
                return cached;
            }
            
            const data = await fs.readFile(filename, 'utf8');
            const parsed = JSON.parse(data);
            
            // Cache the result
            cache.set(filename, parsed);
            
            return parsed;
        } catch (error) {
            console.error(`❌ Error reading ${filename}:`, error.message);
            return this.getInitialData(filename.replace('.json', ''));
        }
    }
    
    async writeFile(filename, data) {
        try {
            // Protect Turkish characters in data
            const protectedData = this.protectDataTurkishChars(data);
            
            await fs.writeFile(filename, JSON.stringify(protectedData, null, 2), 'utf8');
            
            // Update cache
            cache.set(filename, protectedData);
            
            console.log(`💾 Saved: ${filename} (${JSON.stringify(protectedData).length} bytes)`);
            
            // Update system stats
            await this.updateSystemStats();
            
        } catch (error) {
            console.error(`❌ Error writing ${filename}:`, error.message);
            throw error;
        }
    }
    
    protectDataTurkishChars(data) {
        if (typeof data === 'string') {
            return turkishHandler.protect(data);
        }
        
        if (Array.isArray(data)) {
            return data.map(item => this.protectDataTurkishChars(item));
        }
        
        if (data && typeof data === 'object') {
            const protectedData = {};
            for (const [key, value] of Object.entries(data)) {
                protectedData[key] = this.protectDataTurkishChars(value);
            }
            return protectedData;
        }
        
        return data;
    }
    
    async updateSystemStats() {
        try {
            const employees = await this.readFile(DATA_FILES.employees);
            const tasks = await this.readFile(DATA_FILES.tasks);
            const products = await this.readFile(DATA_FILES.missingProducts);
            
            const stats = await this.readFile(DATA_FILES.systemStats);
            
            stats.totalUsers = employees.length;
            stats.totalTasks = tasks.length;
            stats.totalProducts = products.length;
            stats.lastUpdate = new Date().toISOString();
            
            await fs.writeFile(DATA_FILES.systemStats, JSON.stringify(stats, null, 2), 'utf8');
        } catch (error) {
            console.error('❌ Error updating system stats:', error);
        }
    }
    
    async createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(DATA_FILES.backups, `backup_${timestamp}`);
            
            await fs.mkdir(backupDir, { recursive: true });
            
            // Backup all data files
            for (const [key, filename] of Object.entries(DATA_FILES)) {
                if (key === 'backups') continue;
                
                if (fsSync.existsSync(filename)) {
                    const backupPath = path.join(backupDir, filename);
                    await fs.copyFile(filename, backupPath);
                }
            }
            
            console.log(`💾 Backup created: ${backupDir}`);
            
            // Update backup timestamp
            const stats = await this.readFile(DATA_FILES.systemStats);
            stats.lastBackup = new Date().toISOString();
            await this.writeFile(DATA_FILES.systemStats, stats);
            
            return backupDir;
        } catch (error) {
            console.error('❌ Backup failed:', error);
            return null;
        }
    }
    
    startAutoBackup() {
        setInterval(async () => {
            await this.createBackup();
        }, CONFIG.AUTO_BACKUP_INTERVAL);
        
        console.log(`🔄 Auto backup enabled (every ${CONFIG.AUTO_BACKUP_INTERVAL / 60000} minutes)`);
    }
}

const dataManager = new DataManager();

// 🤖 Telegram API Handler
class TelegramAPI {
    constructor() {
        this.baseURL = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}`;
        this.messageQueue = [];
        this.processing = false;
        
        this.startMessageProcessor();
    }
    
    async sendMessage(chatId, text, options = {}) {
        return new Promise((resolve, reject) => {
            this.messageQueue.push({
                method: 'sendMessage',
                chatId,
                text: turkishHandler.protect(text),
                options,
                resolve,
                reject
            });
            
            this.processQueue();
        });
    }
    
    async answerCallbackQuery(callbackQueryId, text = "İşlem alındı...") {
        return new Promise((resolve, reject) => {
            this.messageQueue.push({
                method: 'answerCallbackQuery',
                callbackQueryId,
                text: turkishHandler.protect(text),
                resolve,
                reject
            });
            
            this.processQueue();
        });
    }
    
    async editMessageText(chatId, messageId, text, options = {}) {
        return new Promise((resolve, reject) => {
            this.messageQueue.push({
                method: 'editMessageText',
                chatId,
                messageId,
                text: turkishHandler.protect(text),
                options,
                resolve,
                reject
            });
            
            this.processQueue();
        });
    }
    
    async processQueue() {
        if (this.processing || this.messageQueue.length === 0) return;
        
        this.processing = true;
        
        while (this.messageQueue.length > 0) {
            const task = this.messageQueue.shift();
            
            try {
                const result = await this.executeTask(task);
                task.resolve(result);
            } catch (error) {
                console.error(`❌ Telegram API Error (${task.method}):`, error.message);
                task.reject(error);
            }
            
            // Rate limiting - wait between requests
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        this.processing = false;
    }
    
    async executeTask(task) {
        const { method, chatId, text, options, callbackQueryId, messageId } = task;
        
        let payload = {};
        let endpoint = method;
        
        switch (method) {
            case 'sendMessage':
                // Validate message length
                if (text && text.length > CONFIG.MAX_MESSAGE_LENGTH) {
                    const truncatedText = text.substring(0, CONFIG.MAX_MESSAGE_LENGTH - 50) + '\n\n... (mesaj kısaltıldı)';
                    payload = { chat_id: chatId, text: truncatedText, parse_mode: 'HTML' };
                } else {
                    payload = { chat_id: chatId, text, parse_mode: 'HTML' };
                }
                
                // Add keyboard if provided
                if (options.keyboard) {
                    payload.reply_markup = {
                        keyboard: options.keyboard,
                        resize_keyboard: options.resize_keyboard || true,
                        one_time_keyboard: options.one_time_keyboard || false
                    };
                }
                
                // Add inline keyboard if provided
                if (options.inline_keyboard) {
                    payload.reply_markup = {
                        inline_keyboard: options.inline_keyboard
                    };
                }
                break;
                
            case 'answerCallbackQuery':
                payload = { callback_query_id: callbackQueryId, text };
                break;
                
            case 'editMessageText':
                payload = {
                    chat_id: chatId,
                    message_id: messageId,
                    text,
                    parse_mode: 'HTML'
                };
                
                if (options.inline_keyboard) {
                    payload.reply_markup = {
                        inline_keyboard: options.inline_keyboard
                    };
                }
                break;
        }
        
        const response = await axios.post(`${this.baseURL}/${endpoint}`, payload, {
            timeout: CONFIG.REQUEST_TIMEOUT,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    }
    
    startMessageProcessor() {
        // Process queue every 100ms
        setInterval(() => {
            this.processQueue();
        }, 100);
    }
}

const telegramAPI = new TelegramAPI();

// 📝 Activity Logger System
class ActivityLogger {
    constructor() {
        this.logQueue = [];
        this.processing = false;
        
        this.startProcessor();
    }
    
    async log(message, userId = null, userName = null, level = 'info') {
        this.logQueue.push({
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            message: turkishHandler.protect(message),
            userId,
            userName: userName ? turkishHandler.protect(userName) : null,
            level,
            ip: null, // Will be set if available
            userAgent: null // Will be set if available
        });
        
        this.processQueue();
    }
    
    async processQueue() {
        if (this.processing || this.logQueue.length === 0) return;
        
        this.processing = true;
        
        try {
            const activities = await dataManager.readFile(DATA_FILES.activityLog);
            
            // Add all queued logs
            while (this.logQueue.length > 0) {
                activities.push(this.logQueue.shift());
            }
            
            // Keep only last N entries
            if (activities.length > CONFIG.MAX_ACTIVITY_ENTRIES) {
                activities.splice(0, activities.length - CONFIG.MAX_ACTIVITY_ENTRIES);
            }
            
            await dataManager.writeFile(DATA_FILES.activityLog, activities);
        } catch (error) {
            console.error('❌ Activity logging failed:', error);
        }
        
        this.processing = false;
    }
    
    startProcessor() {
        // Process logs every 5 seconds
        setInterval(() => {
            this.processQueue();
        }, 5000);
    }
}

const activityLogger = new ActivityLogger();

// 👤 User Management System
class UserManager {
    constructor() {
        this.activeSessions = new Map();
        this.userStates = new Map();
    }
    
    async findUser(chatId) {
        const employees = await dataManager.readFile(DATA_FILES.employees);
        return employees.find(emp => Number(emp.chatId) === Number(chatId));
    }
    
    async isAdmin(chatId) {
        const adminSettings = await dataManager.readFile(DATA_FILES.adminSettings);
        return adminSettings.adminUsers.includes(Number(chatId));
    }
    
    async addUser(userData) {
        const employees = await dataManager.readFile(DATA_FILES.employees);
        
        const newUser = {
            chatId: Number(userData.chatId),
            name: turkishHandler.protect(userData.name),
            username: userData.username || 'kullanici_' + Date.now(),
            department: userData.department || 'Yeni Çalışan',
            role: userData.role || 'employee',
            addedAt: new Date().toISOString(),
            addedBy: userData.addedBy || null,
            status: 'active',
            lastActivity: new Date().toISOString(),
            totalTasks: 0,
            completedTasks: 0,
            permissions: userData.permissions || ['basic_access']
        };
        
        employees.push(newUser);
        await dataManager.writeFile(DATA_FILES.employees, employees);
        
        await activityLogger.log(`Yeni kullanıcı eklendi: ${newUser.name}`, userData.addedBy, null, 'info');
        
        return newUser;
    }
    
    async updateUserActivity(chatId) {
        const employees = await dataManager.readFile(DATA_FILES.employees);
        const userIndex = employees.findIndex(emp => Number(emp.chatId) === Number(chatId));
        
        if (userIndex !== -1) {
            employees[userIndex].lastActivity = new Date().toISOString();
            await dataManager.writeFile(DATA_FILES.employees, employees);
        }
    }
    
    async deleteUser(chatId, deletedBy) {
        const employees = await dataManager.readFile(DATA_FILES.employees);
        const userIndex = employees.findIndex(emp => Number(emp.chatId) === Number(chatId));
        
        if (userIndex === -1) {
            throw new Error('Kullanıcı bulunamadı');
        }
        
        const deletedUser = employees[userIndex];
        employees.splice(userIndex, 1);
        
        // Move to deleted employees
        const deletedEmployees = await dataManager.readFile(DATA_FILES.deletedEmployees);
        deletedEmployees.push({
            ...deletedUser,
            deletedAt: new Date().toISOString(),
            deletedBy
        });
        
        await dataManager.writeFile(DATA_FILES.employees, employees);
        await dataManager.writeFile(DATA_FILES.deletedEmployees, deletedEmployees);
        
        await activityLogger.log(`Kullanıcı silindi: ${deletedUser.name}`, deletedBy, null, 'warning');
        
        return deletedUser;
    }
    
    async setPendingApproval(userData) {
        const pendingUsers = await dataManager.readFile(DATA_FILES.pendingUsers);
        
        const existingPending = pendingUsers.find(u => Number(u.chatId) === Number(userData.chatId));
        if (existingPending) {
            throw new Error('Bu kullanıcı zaten onay bekliyor');
        }
        
        const pendingUser = {
            chatId: Number(userData.chatId),
            firstName: turkishHandler.protect(userData.firstName),
            lastName: turkishHandler.protect(userData.lastName || ''),
            username: userData.username || 'kullanici_' + Date.now(),
            timestamp: new Date().toISOString(),
            status: 'pending',
            requestIP: userData.ip || null
        };
        
        pendingUsers.push(pendingUser);
        await dataManager.writeFile(DATA_FILES.pendingUsers, pendingUsers);
        
        await activityLogger.log(`Yeni kullanıcı onay bekliyor: ${pendingUser.firstName}`, userData.chatId, pendingUser.firstName, 'info');
        
        return pendingUser;
    }
    
    async approveUser(chatId, approvedBy) {
        const pendingUsers = await dataManager.readFile(DATA_FILES.pendingUsers);
        const userIndex = pendingUsers.findIndex(u => Number(u.chatId) === Number(chatId));
        
        if (userIndex === -1) {
            throw new Error('Bekleyen kullanıcı bulunamadı');
        }
        
        const pendingUser = pendingUsers[userIndex];
        pendingUsers.splice(userIndex, 1);
        
        // Create new employee
        const newUser = await this.addUser({
            chatId: pendingUser.chatId,
            name: `${pendingUser.firstName} ${pendingUser.lastName}`.trim(),
            username: pendingUser.username,
            department: 'Yeni Çalışan',
            role: 'employee',
            addedBy: approvedBy
        });
        
        await dataManager.writeFile(DATA_FILES.pendingUsers, pendingUsers);
        
        await activityLogger.log(`Kullanıcı onaylandı: ${newUser.name}`, approvedBy, null, 'success');
        
        return newUser;
    }
    
    async rejectUser(chatId, rejectedBy, reason = null) {
        const pendingUsers = await dataManager.readFile(DATA_FILES.pendingUsers);
        const userIndex = pendingUsers.findIndex(u => Number(u.chatId) === Number(chatId));
        
        if (userIndex === -1) {
            throw new Error('Bekleyen kullanıcı bulunamadı');
        }
        
        const rejectedUser = pendingUsers[userIndex];
        pendingUsers.splice(userIndex, 1);
        
        await dataManager.writeFile(DATA_FILES.pendingUsers, pendingUsers);
        
        await activityLogger.log(`Kullanıcı reddedildi: ${rejectedUser.firstName}${reason ? ` (Sebep: ${reason})` : ''}`, rejectedBy, null, 'warning');
        
        return rejectedUser;
    }
    
    getUserState(chatId) {
        return this.userStates.get(Number(chatId)) || {};
    }
    
    setUserState(chatId, state) {
        this.userStates.set(Number(chatId), { ...this.getUserState(chatId), ...state });
    }
    
    clearUserState(chatId) {
        this.userStates.delete(Number(chatId));
    }
}

const userManager = new UserManager();

// 📋 Task Management System
class TaskManager {
    constructor() {
        this.taskQueue = [];
        this.processing = false;
    }
    
    async createTask(taskData) {
        const tasks = await dataManager.readFile(DATA_FILES.tasks);
        
        const newTask = {
            id: Date.now() + Math.random(),
            title: turkishHandler.protect(taskData.title),
            description: turkishHandler.protect(taskData.description),
            assignedTo: Number(taskData.assignedTo),
            assignedToName: turkishHandler.protect(taskData.assignedToName),
            assignedBy: Number(taskData.assignedBy),
            assignedByName: turkishHandler.protect(taskData.assignedByName),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'pending',
            priority: taskData.priority || 'normal',
            type: taskData.type || 'individual',
            bulkId: taskData.bulkId || null,
            dueDate: taskData.dueDate || null,
            category: taskData.category || 'general',
            tags: taskData.tags || [],
            completedAt: null,
            completedBy: null,
            estimatedTime: taskData.estimatedTime || null,
            actualTime: null
        };
        
        tasks.push(newTask);
        await dataManager.writeFile(DATA_FILES.tasks, tasks);
        
        // Update user task count
        await this.updateUserTaskStats(newTask.assignedTo);
        
        await activityLogger.log(
            `Yeni görev atandı: "${newTask.title}" → ${newTask.assignedToName}`,
            taskData.assignedBy,
            taskData.assignedByName,
            'info'
        );
        
        return newTask;
    }
    
    async createBulkTasks(taskData, targetUsers) {
        const tasks = await dataManager.readFile(DATA_FILES.tasks);
        const bulkId = Date.now();
        const createdTasks = [];
        
        for (const user of targetUsers) {
            const newTask = {
                id: Date.now() + Math.random() + Math.random(),
                title: turkishHandler.protect(taskData.title),
                description: turkishHandler.protect(taskData.description),
                assignedTo: Number(user.chatId),
                assignedToName: turkishHandler.protect(user.name),
                assignedBy: Number(taskData.assignedBy),
                assignedByName: turkishHandler.protect(taskData.assignedByName),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'pending',
                priority: taskData.priority || 'normal',
                type: 'bulk',
                bulkId: bulkId,
                dueDate: taskData.dueDate || null,
                category: taskData.category || 'general',
                tags: taskData.tags || [],
                completedAt: null,
                completedBy: null,
                estimatedTime: taskData.estimatedTime || null,
                actualTime: null
            };
            
            tasks.push(newTask);
            createdTasks.push(newTask);
            
            // Update user task count
            await this.updateUserTaskStats(newTask.assignedTo);
        }
        
        await dataManager.writeFile(DATA_FILES.tasks, tasks);
        
        await activityLogger.log(
            `Toplu görev atandı: "${taskData.title}" → ${targetUsers.length} kişi`,
            taskData.assignedBy,
            taskData.assignedByName,
            'info'
        );
        
        return createdTasks;
    }
    
    async completeTask(taskId, completedBy, completionNotes = null) {
        const tasks = await dataManager.readFile(DATA_FILES.tasks);
        const taskIndex = tasks.findIndex(t => t.id == taskId);
        
        if (taskIndex === -1) {
            throw new Error('Görev bulunamadı');
        }
        
        const task = tasks[taskIndex];
        
        if (Number(task.assignedTo) !== Number(completedBy)) {
            throw new Error('Bu görev size ait değil');
        }
        
        if (task.status === 'completed') {
            throw new Error('Bu görev zaten tamamlanmış');
        }
        
        const completionTime = new Date().toISOString();
        const startTime = new Date(task.createdAt);
        const endTime = new Date(completionTime);
        const actualTime = Math.round((endTime - startTime) / (1000 * 60)); // minutes
        
        tasks[taskIndex] = {
            ...task,
            status: 'completed',
            completedAt: completionTime,
            completedBy: Number(completedBy),
            actualTime: actualTime,
            completionNotes: completionNotes ? turkishHandler.protect(completionNotes) : null,
            updatedAt: completionTime
        };
        
        await dataManager.writeFile(DATA_FILES.tasks, tasks);
        
        // Update user task stats
        await this.updateUserTaskStats(task.assignedTo);
        
        const user = await userManager.findUser(completedBy);
        const userName = user ? user.name : 'Bilinmeyen Kullanıcı';
        
        await activityLogger.log(
            `Görev tamamlandı: "${task.title}" - ${userName}`,
            completedBy,
            userName,
            'success'
        );
        
        return tasks[taskIndex];
    }
    
    async getUserTasks(chatId, status = null) {
        const tasks = await dataManager.readFile(DATA_FILES.tasks);
        let userTasks = tasks.filter(task => Number(task.assignedTo) === Number(chatId));
        
        if (status) {
            userTasks = userTasks.filter(task => task.status === status);
        }
        
        // Sort by creation date (newest first)
        userTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return userTasks;
    }
    
    async getAllTasks(status = null, limit = null) {
        const tasks = await dataManager.readFile(DATA_FILES.tasks);
        let filteredTasks = status ? tasks.filter(task => task.status === status) : tasks;
        
        // Sort by creation date (newest first)
        filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        if (limit) {
            filteredTasks = filteredTasks.slice(0, limit);
        }
        
        return filteredTasks;
    }
    
    async updateUserTaskStats(chatId) {
        try {
            const employees = await dataManager.readFile(DATA_FILES.employees);
            const userIndex = employees.findIndex(emp => Number(emp.chatId) === Number(chatId));
            
            if (userIndex !== -1) {
                const userTasks = await this.getUserTasks(chatId);
                const completedTasks = userTasks.filter(task => task.status === 'completed');
                
                employees[userIndex].totalTasks = userTasks.length;
                employees[userIndex].completedTasks = completedTasks.length;
                employees[userIndex].taskCompletionRate = userTasks.length > 0 
                    ? Math.round((completedTasks.length / userTasks.length) * 100) 
                    : 0;
                
                await dataManager.writeFile(DATA_FILES.employees, employees);
            }
        } catch (error) {
            console.error('❌ Error updating user task stats:', error);
        }
    }
    
    async deleteTask(taskId, deletedBy) {
        const tasks = await dataManager.readFile(DATA_FILES.tasks);
        const taskIndex = tasks.findIndex(t => t.id == taskId);
        
        if (taskIndex === -1) {
            throw new Error('Görev bulunamadı');
        }
        
        const deletedTask = tasks[taskIndex];
        tasks.splice(taskIndex, 1);
        
        await dataManager.writeFile(DATA_FILES.tasks, tasks);
        
        // Update user task stats
        await this.updateUserTaskStats(deletedTask.assignedTo);
        
        await activityLogger.log(
            `Görev silindi: "${deletedTask.title}"`,
            deletedBy,
            null,
            'warning'
        );
        
        return deletedTask;
    }
}

const taskManager = new TaskManager();

// 📦 Product Management System
class ProductManager {
    constructor() {
        this.productQueue = [];
        this.processing = false;
    }
    
    async reportMissingProduct(productData) {
        const products = await dataManager.readFile(DATA_FILES.missingProducts);
        
        const newProduct = {
            id: Date.now() + Math.random(),
            product: turkishHandler.protect(productData.product),
            category: turkishHandler.protect(productData.category),
            reportedBy: turkishHandler.protect(productData.reportedBy),
            reportedByChatId: Number(productData.reportedByChatId),
            reportedAt: new Date().toISOString(),
            status: 'pending',
            priority: productData.priority || 'normal',
            description: productData.description ? turkishHandler.protect(productData.description) : null,
            quantity: productData.quantity || 1,
            urgency: productData.urgency || 'normal',
            location: productData.location ? turkishHandler.protect(productData.location) : null,
            supplier: productData.supplier ? turkishHandler.protect(productData.supplier) : null,
            estimatedCost: productData.estimatedCost || null,
            notes: productData.notes ? turkishHandler.protect(productData.notes) : null,
            completedAt: null,
            completedBy: null
        };
        
        products.push(newProduct);
        await dataManager.writeFile(DATA_FILES.missingProducts, products);
        
        await activityLogger.log(
            `Eksik ürün bildirildi: "${newProduct.product}" (${newProduct.category}) - ${newProduct.reportedBy}`,
            productData.reportedByChatId,
            productData.reportedBy,
            'info'
        );
        
        return newProduct;
    }
    
    async completeProduct(productId, completedBy) {
        const products = await dataManager.readFile(DATA_FILES.missingProducts);
        const productIndex = products.findIndex(p => p.id == productId);
        
        if (productIndex === -1) {
            throw new Error('Ürün bulunamadı');
        }
        
        const completedProduct = products[productIndex];
        products.splice(productIndex, 1);
        
        await dataManager.writeFile(DATA_FILES.missingProducts, products);
        
        const user = await userManager.findUser(completedBy);
        const userName = user ? user.name : 'Bilinmeyen Kullanıcı';
        
        await activityLogger.log(
            `Eksik ürün tamamlandı: "${completedProduct.product}" - ${userName}`,
            completedBy,
            userName,
            'success'
        );
        
        return completedProduct;
    }
    
    async deleteProduct(productId, deletedBy) {
        const products = await dataManager.readFile(DATA_FILES.missingProducts);
        const productIndex = products.findIndex(p => p.id == productId);
        
        if (productIndex === -1) {
            throw new Error('Ürün bulunamadı');
        }
        
        const deletedProduct = products[productIndex];
        products.splice(productIndex, 1);
        
        await dataManager.writeFile(DATA_FILES.missingProducts, products);
        
        const user = await userManager.findUser(deletedBy);
        const userName = user ? user.name : 'Bilinmeyen Kullanıcı';
        
        await activityLogger.log(
            `Eksik ürün silindi: "${deletedProduct.product}" - ${userName}`,
            deletedBy,
            userName,
            'warning'
        );
        
        return deletedProduct;
    }
    
    async clearAllProducts(clearedBy) {
        const products = await dataManager.readFile(DATA_FILES.missingProducts);
        const productCount = products.length;
        
        await dataManager.writeFile(DATA_FILES.missingProducts, []);
        
        const user = await userManager.findUser(clearedBy);
        const userName = user ? user.name : 'Bilinmeyen Kullanıcı';
        
        await activityLogger.log(
            `Tüm eksik ürün listesi temizlendi (${productCount} ürün) - ${userName}`,
            clearedBy,
            userName,
            'warning'
        );
        
        return productCount;
    }
    
    async getAllProducts(status = null) {
        const products = await dataManager.readFile(DATA_FILES.missingProducts);
        let filteredProducts = status ? products.filter(product => product.status === status) : products;
        
        // Sort by report date (newest first)
        filteredProducts.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
        
        return filteredProducts;
    }
    
    async getProductsByCategory(category) {
        const products = await dataManager.readFile(DATA_FILES.missingProducts);
        return products.filter(product => product.category === category);
    }
    
    async getProductsByUser(chatId) {
        const products = await dataManager.readFile(DATA_FILES.missingProducts);
        return products.filter(product => Number(product.reportedByChatId) === Number(chatId));
    }
}

const productManager = new ProductManager();

// 🎮 Command Handler System
class CommandHandler {
    constructor() {
        this.commands = new Map();
        this.keyboards = new Map();
        
        this.initializeCommands();
        this.initializeKeyboards();
    }
    
    initializeCommands() {
        // System Commands
        this.commands.set('/start', this.handleStart.bind(this));
        this.commands.set('/help', this.handleHelp.bind(this));
        this.commands.set('/debug', this.handleDebug.bind(this));
        this.commands.set('/durum', this.handleDebug.bind(this));
        
        // Task Commands
        this.commands.set('/task', this.handleTaskCommand.bind(this));
        this.commands.set('/taskall', this.handleTaskAllCommand.bind(this));
        this.commands.set('/gorevata', this.handleTaskCommand.bind(this));
        this.commands.set('/addtask', this.handleTaskCommand.bind(this));
        
        // User Management Commands
        this.commands.set('/calisanekle', this.handleAddUserCommand.bind(this));
        this.commands.set('/adduser', this.handleAddUserCommand.bind(this));
        this.commands.set('/calisansil', this.handleRemoveUserCommand.bind(this));
        this.commands.set('/removeuser', this.handleRemoveUserCommand.bind(this));
        this.commands.set('/listusers', this.handleListUsers.bind(this));
        
        // Product Commands
        this.commands.set('/products', this.handleProductList.bind(this));
        this.commands.set('/eksiklist', this.handleProductList.bind(this));
        
        // Statistics Commands
        this.commands.set('/stats', this.handleStats.bind(this));
        this.commands.set('/istatistik', this.handleStats.bind(this));
        this.commands.set('/activity', this.handleActivity.bind(this));
        this.commands.set('/aktivite', this.handleActivity.bind(this));
        
        // Admin Commands
        this.commands.set('/pending', this.handlePendingUsers.bind(this));
        this.commands.set('/bekleyenler', this.handlePendingUsers.bind(this));
        this.commands.set('/broadcast', this.handleBroadcast.bind(this));
        this.commands.set('/duyuru', this.handleBroadcast.bind(this));
        this.commands.set('/backup', this.handleBackup.bind(this));
    }
    
    initializeKeyboards() {
        // Main Menu Keyboards
        this.keyboards.set('admin_main', [
            [{ text: "📦 Eksik Ürün Bildir" }, { text: "👑 Admin Panel" }],
            [{ text: "📊 İstatistikler" }, { text: "ℹ️ Yardım" }]
        ]);
        
        this.keyboards.set('employee_main', [
            [{ text: "📦 Eksik Ürün Bildir" }, { text: "📋 Görevlerim" }],
            [{ text: "📊 İstatistikler" }, { text: "ℹ️ Yardım" }]
        ]);
        
        this.keyboards.set('admin_panel', [
            [{ text: "👥 Çalışanları Listele" }, { text: "📦 Eksik Ürünler" }],
            [{ text: "📋 Görev Yönetimi" }, { text: "⏳ Bekleyen Onaylar" }],
            [{ text: "📊 Detaylı Raporlar" }, { text: "📢 Duyuru Gönder" }],
            [{ text: "🗑️ Listeyi Temizle" }, { text: "🔙 Ana Menü" }]
        ]);
        
        this.keyboards.set('back_menu', [
            [{ text: "🔙 Ana Menü" }]
        ]);
    }
    
    getKeyboard(type, isAdmin = false) {
        if (type === 'main') {
            return isAdmin ? this.keyboards.get('admin_main') : this.keyboards.get('employee_main');
        }
        return this.keyboards.get(type) || this.keyboards.get('back_menu');
    }
    
    // 🛡️ Advanced Spam/Ad Detection System
    isSpamOrAd(text) {
        if (!text || typeof text !== 'string') return false;
        
        const lowerText = text.toLowerCase();
        
        // Spam keywords (Turkish & English)
        const spamKeywords = [
            // Advertisement words
            'reklam', 'ilan', 'tanıtım', 'pazarlama', 'satış', 'indirim', 'kampanya',
            'promosyon', 'teklif', 'fırsat', 'bedava', 'ücretsiz', 'kazan', 'para',
            'advertisement', 'promo', 'sale', 'discount', 'free', 'earn', 'money',
            'win', 'prize', 'offer', 'deal', 'marketing', 'buy', 'cheap',
            
            // Spam phrases
            'hemen tıkla', 'şimdi al', 'sınırlı süre', 'kaçırma', 'acele et',
            'click now', 'buy now', 'limited time', 'hurry up', 'act fast',
            'visit our', 'check out', 'amazing offer', 'best deal',
            
            // Crypto/MLM/Scam
            'kripto', 'bitcoin', 'forex', 'yatırım', 'borsa', 'trading',
            'mlm', 'network', 'piramit', 'referans', 'kazanç', 'gelir',
            'crypto', 'invest', 'profit', 'passive income', 'make money',
            
            // Dating/Adult content
            'flört', 'arkadaş', 'buluş', 'tanış', 'dating', 'meet',
            'hot', 'sexy', 'adult', 'xxx',
            
            // Channel/Group promotion
            'kanala katıl', 'gruba gel', 'takip et', 'abone ol',
            'join channel', 'follow us', 'subscribe', '@', 'http', 'www',
            't.me/', 'telegram.me', 'bit.ly', 'tinyurl'
        ];
        
        // Check for spam keywords
        for (const keyword of spamKeywords) {
            if (lowerText.includes(keyword)) {
                return true;
            }
        }
        
        // Check for suspicious patterns
        
        // Too many emojis (more than 5)
        const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
        if (emojiCount > 5) return true;
        
        // Too many capital letters (more than 70% of text)
        const capitalCount = (text.match(/[A-Z]/g) || []).length;
        const totalLetters = (text.match(/[a-zA-Z]/g) || []).length;
        if (totalLetters > 10 && (capitalCount / totalLetters) > 0.7) return true;
        
        // Repeated characters (like "harikaaaa", "woooow")
        if (/(.)\1{4,}/.test(text)) return true;
        
        // Contains links
        if (/https?:\/\/|www\.|\.com|\.org|\.net|\.tr|t\.me/.test(lowerText)) return true;
        
        // Contains phone numbers
        if (/(\+90|0)[0-9]{10}/.test(text.replace(/\s/g, ''))) return true;
        
        // Contains @ mentions for external promotion
        if (/@\w+/.test(text) && !lowerText.includes('sival')) return true;
        
        // All caps words longer than 4 characters
        if (/\b[A-Z]{4,}\b/.test(text)) return true;
        
        return false;
    }
    
    // 🔍 Suspicious Name Detection
    isSuspiciousName(name) {
        if (!name || typeof name !== 'string') return true;
        
        const lowerName = name.toLowerCase();
        
        // Suspicious patterns
        const suspiciousPatterns = [
            // Bot-like names
            /^bot\d*/i,
            /user\d+/i,
            /admin\d+/i,
            /test\d*/i,
            /fake/i,
            /spam/i,
            
            // Too many numbers (more than 30% of name)
            /\d{3,}/, // 3+ consecutive digits
            
            // Special characters that might indicate fake accounts
            /[^a-zA-ZçğıöşüÇĞIİÖŞÜ\s]/,
            
            // Very short or very long names
            /^.{1}$|^.{25,}$/,
            
            // Repeated characters
            /(.)\1{3,}/,
            
            // Common fake name patterns
            /^(xxx|aaa|bbb|ccc|zzz)/i,
            /delete/i,
            /removed/i,
            /account/i
        ];
        
        // Check patterns
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(name)) {
                return true;
            }
        }
        
        // Check if name is mostly numbers
        const digitCount = (name.match(/\d/g) || []).length;
        const totalLength = name.length;
        if (totalLength > 0 && (digitCount / totalLength) > 0.3) {
            return true;
        }
        
        return false;
    }
    
    async handleMessage(chatId, text, from) {
        try {
            // Rate limiting check
            if (!rateLimiter.isAllowed(chatId)) {
                await telegramAPI.sendMessage(chatId, 
                    "⚠️ <b>Çok fazla istek!</b>\n\nLütfen biraz bekleyip tekrar deneyin."
                );
                return;
            }
            
            // 🔒 STRICT ACCESS CONTROL - Only registered users allowed
            const user = await userManager.findUser(chatId);
            const isAdmin = await userManager.isAdmin(chatId);
            
            // Block unauthorized users immediately
            if (!user) {
                // Only allow /start command for registration
                if (text === '/start') {
                    await this.handleStart(chatId, text, from, null, false);
                    return;
                } else {
                    // Block everything else for unauthorized users
                    await telegramAPI.sendMessage(chatId,
                        "🔒 <b>Erişim Reddedildi</b>\n\n" +
                        "❌ Bu bot sadece kayıtlı SivalTeam çalışanları içindir.\n\n" +
                        "🚪 Kayıt olmak için: /start"
                    );
                    return;
                }
            }
            
            // 🛡️ SPAM/AD FILTER - Block promotional content
            if (this.isSpamOrAd(text)) {
                await telegramAPI.sendMessage(chatId,
                    "⚠️ <b>İçerik Engellendi</b>\n\n" +
                    "❌ Reklam, spam veya uygunsuz içerik tespit edildi.\n" +
                    "🔄 Lütfen sadece iş ile ilgili mesajlar gönderin."
                );
                
                // Log spam attempt
                await activityLogger.log(
                    `🛡️ Spam/reklam engellendi: ${user.name} - "${text.substring(0, 50)}..."`,
                    chatId,
                    user.name,
                    'warning'
                );
                return;
            }
            
            // Update user activity for authorized users
            await userManager.updateUserActivity(chatId);
            
            // Handle commands
            if (text.startsWith('/')) {
                const command = text.split(' ')[0];
                if (this.commands.has(command)) {
                    await this.commands.get(command)(chatId, text, from, user, isAdmin);
                    return;
                }
            }
            
            // Handle button clicks
            await this.handleButtonClick(chatId, text, from, user, isAdmin);
            
        } catch (error) {
            console.error(`❌ Command handling error for ${chatId}:`, error);
            await telegramAPI.sendMessage(chatId, 
                "❌ <b>Bir hata oluştu!</b>\n\nLütfen daha sonra tekrar deneyin veya /help komutu ile yardım alın."
            );
        }
    }
    
    async handleStart(chatId, text, from, user, isAdmin) {
        console.log(`🔍 User registration attempt: ${from.first_name} (${chatId}) - ${from.username || 'No username'}`);
        
        // 🔒 Enhanced Security Check for Registration
        const securityIssues = [];
        
        // Check if user has a proper name
        if (!from.first_name || from.first_name.length < 2) {
            securityIssues.push("Geçerli bir isim gerekli");
        }
        
        // Check if user has a username (recommended)
        if (!from.username) {
            securityIssues.push("Telegram kullanıcı adı önerilir (@username)");
        }
        
        // Check for suspicious names
        if (from.first_name && this.isSuspiciousName(from.first_name)) {
            securityIssues.push("İsim doğrulama gerekli");
        }
        
        // Log registration attempt with security details
        await activityLogger.log(
            `🔍 Kayıt denemesi: ${from.first_name} (@${from.username || 'none'}) - ID: ${chatId}` +
            (securityIssues.length > 0 ? ` - Güvenlik: ${securityIssues.join(', ')}` : ''),
            chatId,
            from.first_name || 'Unknown',
            'info'
        );
        
        // Check if this is the first user (becomes admin automatically)
        const employees = await dataManager.readFile(DATA_FILES.employees);
        const adminSettings = await dataManager.readFile(DATA_FILES.adminSettings);
        
        if (employees.length === 0 && adminSettings.adminUsers.length === 0) {
            // First user becomes admin
            const firstAdmin = await userManager.addUser({
                chatId,
                name: turkishHandler.protect(from.first_name || 'Admin'),
                username: from.username,
                department: 'Yönetim',
                role: 'admin',
                permissions: ['all_access']
            });
            
            // Add to admin list
            adminSettings.adminUsers.push(Number(chatId));
            await dataManager.writeFile(DATA_FILES.adminSettings, adminSettings);
            
            await telegramAPI.sendMessage(chatId,
                `👑 <b>Hoşgeldin İlk Admin!</b>\n\n` +
                `🎉 Sen bu sistemin ilk kullanıcısısın ve otomatik olarak <b>Admin</b> oldun!\n\n` +
                `👑 <b>Admin Yetkilerin:</b>\n` +
                `• Yeni kullanıcıları onaylama\n` +
                `• Çalışan bilgilerini düzenleme\n` +
                `• Görev atama ve yönetimi\n` +
                `• Sistem istatistikleri\n` +
                `• Toplu duyuru gönderme\n\n` +
                `✅ Artık sistemi tam yetkilerle kullanabilirsin!`,
                {
                    keyboard: this.getKeyboard('main', true),
                    resize_keyboard: true
                }
            );
            
            await activityLogger.log(`İlk admin otomatik olarak eklendi: ${firstAdmin.name}`, chatId, firstAdmin.name);
            return;
        }
        
        // Existing user login
        if (user) {
            const welcomeText = `🎉 <b>Tekrar Hoşgeldin ${user.name}!</b>\n\n` +
                               `🏢 Departman: ${user.department}\n` +
                               `${isAdmin ? '👑 Yetki: Admin\n' : ''}` +
                               `⏰ Son Aktivite: ${new Date(user.lastActivity).toLocaleString('tr-TR')}\n\n` +
                               `✅ Giriş başarılı - Sistemi kullanmaya devam edebilirsin.`;
            
            await telegramAPI.sendMessage(chatId, welcomeText, {
                keyboard: this.getKeyboard('main', isAdmin),
                resize_keyboard: true
            });
            
            await activityLogger.log(`${user.name} sisteme tekrar giriş yaptı`, chatId, user.name);
            return;
        }
        
        // New user - check if already pending
        const pendingUsers = await dataManager.readFile(DATA_FILES.pendingUsers);
        const existingPending = pendingUsers.find(u => Number(u.chatId) === Number(chatId));
        
        if (existingPending) {
            await telegramAPI.sendMessage(chatId,
                `⏳ <b>Onay Bekleniyor</b>\n\n` +
                `Kayıt talebiniz daha önce admin onayına gönderildi.\n` +
                `📅 İstek tarihi: ${new Date(existingPending.timestamp).toLocaleString('tr-TR')}\n\n` +
                `⌛ Lütfen admin onayını bekleyiniz.\n` +
                `🔔 Onaylandığınızda otomatik bildirim alacaksınız.`
            );
            return;
        }
        
        // Create new pending user
        try {
            const pendingUser = await userManager.setPendingApproval({
                chatId,
                firstName: from.first_name,
                lastName: from.last_name,
                username: from.username
            });
            
            // Notify user
            await telegramAPI.sendMessage(chatId,
                `👋 <b>Hoşgeldin ${pendingUser.firstName}!</b>\n\n` +
                `📝 SivalTeam sistemine kayıt talebiniz alındı.\n` +
                `🔄 Kayıt talebiniz admin onayına gönderildi.\n` +
                `⏳ Admin onayı sonrası sistemi kullanabileceksiniz.\n\n` +
                `🔔 Onaylandığınızda otomatik bildirim alacaksınız.\n` +
                `⌛ Lütfen sabırla bekleyiniz...`
            );
            
            // Notify all admins with security assessment
            for (const adminChatId of adminSettings.adminUsers) {
                let securityWarning = '';
                let warningEmoji = '🟢';
                
                if (securityIssues.length > 0) {
                    warningEmoji = securityIssues.length > 2 ? '🔴' : '🟡';
                    securityWarning = `\n⚠️ <b>Güvenlik Uyarıları:</b>\n${securityIssues.map(issue => `• ${issue}`).join('\n')}\n`;
                }
                
                await telegramAPI.sendMessage(adminChatId,
                    `🆕 <b>Yeni Kullanıcı Kayıt Talebi</b> ${warningEmoji}\n\n` +
                    `👤 <b>Ad:</b> ${pendingUser.firstName} ${pendingUser.lastName}\n` +
                    `🆔 <b>Username:</b> @${pendingUser.username || 'yok'}\n` +
                    `💬 <b>Chat ID:</b> <code>${pendingUser.chatId}</code>\n` +
                    `📅 <b>Tarih:</b> ${new Date().toLocaleString('tr-TR')}` +
                    securityWarning +
                    `\n⬇️ Bu kullanıcıyı onaylamak için butonları kullanın:` +
                    (securityIssues.length > 2 ? `\n🔴 <b>DİKKAT:</b> Yüksek risk, dikkatli onaylayın!` : ''),
                    {
                        inline_keyboard: [[
                            { text: "✅ Onayla", callback_data: `approve_${pendingUser.chatId}` },
                            { text: "❌ Reddet", callback_data: `reject_${pendingUser.chatId}` }
                        ]]
                    }
                );
            }
            
        } catch (error) {
            console.error('❌ Error creating pending user:', error);
            await telegramAPI.sendMessage(chatId,
                `❌ <b>Kayıt Hatası</b>\n\n` +
                `Kayıt sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.\n\n` +
                `Sorun devam ederse sistem yöneticisi ile iletişime geçin.`
            );
        }
    }
    
    async handleButtonClick(chatId, text, from, user, isAdmin) {
        if (!user) {
            await telegramAPI.sendMessage(chatId, 
                "❌ <b>Yetki Hatası</b>\n\nBu özelliği kullanmak için önce sisteme kayıt olmalısınız.\n\n/start komutu ile başlayın."
            );
            return;
        }
        
        // Clear user state for fresh start
        userManager.clearUserState(chatId);
        
        switch (text) {
            case "📦 Eksik Ürün Bildir":
                await this.handleMissingProductReport(chatId, user);
                break;
                
            case "📋 Görevlerim":
                await this.handleMyTasks(chatId, user);
                break;
                
            case "📊 İstatistikler":
                await this.handleStats(chatId, text, from, user, isAdmin);
                break;
                
            case "👑 Admin Panel":
                if (!isAdmin) {
                    await telegramAPI.sendMessage(chatId, "❌ Bu özellik sadece adminler tarafından kullanılabilir.");
                    return;
                }
                await this.handleAdminPanel(chatId, user);
                break;
                
            case "ℹ️ Yardım":
                await this.handleHelp(chatId, text, from, user, isAdmin);
                break;
                
            case "🔙 Ana Menü":
                await this.handleMainMenu(chatId, user, isAdmin);
                break;
                
            case "👥 Çalışanları Listele":
                if (!isAdmin) return;
                await this.handleListUsers(chatId, text, from, user, isAdmin);
                break;
                
            case "📦 Eksik Ürünler":
                if (!isAdmin) return;
                await this.handleProductList(chatId, text, from, user, isAdmin);
                break;
                
            case "📋 Görev Yönetimi":
                if (!isAdmin) return;
                await this.handleTaskManagement(chatId, user);
                break;
                
            case "⏳ Bekleyen Onaylar":
                if (!isAdmin) return;
                await this.handlePendingUsers(chatId, text, from, user, isAdmin);
                break;
                
            case "🗑️ Listeyi Temizle":
                if (!isAdmin) return;
                await this.handleClearProducts(chatId, user);
                break;
                
            case "📢 Duyuru Gönder":
                if (!isAdmin) return;
                await this.handleBroadcastStart(chatId, user);
                break;
                
            case "📊 Detaylı Raporlar":
                if (!isAdmin) return;
                await this.handleDetailedReports(chatId, user);
                break;
                
            default:
                // Check if this is part of a workflow (category selection, product input, etc.)
                const userState = userManager.getUserState(chatId);
                if (userState.action) {
                    await this.handleWorkflowInput(chatId, text, user);
                } else {
                    // Handle unknown button
                    await telegramAPI.sendMessage(chatId, 
                        `❓ <b>Bilinmeyen işlem:</b> "${text}"\n\n` +
                        `Ana menüye dönmek için "🔙 Ana Menü" butonunu kullanın.`,
                        {
                            keyboard: this.getKeyboard('main', isAdmin),
                            resize_keyboard: true
                        }
                    );
                }
                break;
        }
    }
    
    async handleMissingProductReport(chatId, user) {
        const categories = await dataManager.readFile(DATA_FILES.categories);
        
        // Create category keyboard
        const categoryKeyboard = [];
        for (let i = 0; i < categories.length; i += 2) {
            const row = [{ text: categories[i] }];
            if (categories[i + 1]) {
                row.push({ text: categories[i + 1] });
            }
            categoryKeyboard.push(row);
        }
        categoryKeyboard.push([{ text: "🔙 Ana Menü" }]);
        
        await telegramAPI.sendMessage(chatId,
            `📦 <b>Eksik Ürün Bildirimi</b>\n\n` +
            `Hangi kategoride eksik ürün bildirmek istiyorsun?\n\n` +
            `⬇️ Aşağıdaki kategorilerden birini seç:`,
            {
                keyboard: categoryKeyboard,
                resize_keyboard: true
            }
        );
        
        // Set user state
        userManager.setUserState(chatId, { 
            action: 'selecting_category',
            step: 1
        });
    }
    
    async handleMyTasks(chatId, user) {
        const userTasks = await taskManager.getUserTasks(chatId);
        const pendingTasks = userTasks.filter(task => task.status === 'pending');
        const completedTasks = userTasks.filter(task => task.status === 'completed');
        
        if (userTasks.length === 0) {
            await telegramAPI.sendMessage(chatId,
                `📋 <b>Görevleriniz</b>\n\n` +
                `📝 Şu anda size atanmış görev bulunmuyor.\n\n` +
                `✅ Yeni görevler atandığında size bildirim gelecektir.`,
                {
                    keyboard: this.getKeyboard('main', await userManager.isAdmin(chatId)),
                    resize_keyboard: true
                }
            );
            return;
        }
        
        // Create task summary
        let taskText = `📋 <b>${user.name} - Görevleriniz</b>\n\n`;
        taskText += `📊 <b>Özet:</b>\n`;
        taskText += `⏳ Bekleyen: ${pendingTasks.length}\n`;
        taskText += `✅ Tamamlanan: ${completedTasks.length}\n`;
        taskText += `📈 Toplam: ${userTasks.length}\n`;
        taskText += `🎯 Başarı Oranı: ${user.taskCompletionRate || 0}%\n\n`;
        
        if (pendingTasks.length > 0) {
            taskText += `⏳ <b>Bekleyen Görevler:</b>\n\n`;
            
            pendingTasks.slice(0, 10).forEach((task, index) => {
                const daysPassed = Math.floor((Date.now() - new Date(task.createdAt)) / (1000 * 60 * 60 * 24));
                taskText += `${index + 1}. 🎯 <b>${task.title}</b>\n`;
                taskText += `   📝 ${task.description}\n`;
                taskText += `   👤 Atayan: ${task.assignedByName}\n`;
                taskText += `   📅 ${daysPassed} gün önce\n`;
                taskText += `   ${task.type === 'bulk' ? '📢 Toplu Görev' : '👤 Kişisel Görev'}\n\n`;
            });
            
            if (pendingTasks.length > 10) {
                taskText += `... ve ${pendingTasks.length - 10} görev daha\n\n`;
            }
        }
        
        // Create inline keyboard for task completion
        const inlineKeyboard = [];
        pendingTasks.slice(0, 5).forEach(task => {
            inlineKeyboard.push([{
                text: `✅ "${task.title.substring(0, 30)}${task.title.length > 30 ? '...' : ''}" Tamamla`,
                callback_data: `complete_task_${task.id}`
            }]);
        });
        
        if (pendingTasks.length === 0) {
            inlineKeyboard.push([{
                text: "🔄 Görevleri Yenile",
                callback_data: "refresh_my_tasks"
            }]);
        } else if (pendingTasks.length > 5) {
            inlineKeyboard.push([{
                text: `📋 Tüm ${pendingTasks.length} Görevi Göster`,
                callback_data: "show_all_tasks"
            }]);
        }
        
        await telegramAPI.sendMessage(chatId, taskText, {
            inline_keyboard: inlineKeyboard
        });
    }
    
    // Remaining command handlers will be continued...
    async handleWorkflowInput(chatId, text, user) {
        const userState = userManager.getUserState(chatId);
        
        if (userState.action === 'selecting_category') {
            // User selected a category
            const categories = await dataManager.readFile(DATA_FILES.categories);
            
            if (categories.includes(text)) {
                userManager.setUserState(chatId, {
                    action: 'entering_product_name',
                    selectedCategory: text,
                    step: 2
                });
                
                await telegramAPI.sendMessage(chatId,
                    `📦 <b>Eksik Ürün Bildirimi</b>\n\n` +
                    `✅ Kategori: <b>${text}</b>\n\n` +
                    `📝 Şimdi eksik olan ürünün adını yazın:\n\n` +
                    `💡 <i>Örnek: Beyaz Polo Tişört</i>`,
                    {
                        keyboard: [[{ text: "🔙 Ana Menü" }]],
                        resize_keyboard: true
                    }
                );
            }
        } else if (userState.action === 'entering_product_name') {
            // User entered product name
            if (text.length < 2) {
                await telegramAPI.sendMessage(chatId,
                    "❌ Ürün adı çok kısa! En az 2 karakter olmalı."
                );
                return;
            }
            
            // Create missing product report
            const productData = {
                product: text,
                category: userState.selectedCategory,
                reportedBy: user.name,
                reportedByChatId: chatId
            };
            
            try {
                const newProduct = await productManager.reportMissingProduct(productData);
                
                await telegramAPI.sendMessage(chatId,
                    `✅ <b>Eksik Ürün Kaydedildi!</b>\n\n` +
                    `📦 <b>Ürün:</b> ${newProduct.product}\n` +
                    `🏷️ <b>Kategori:</b> ${newProduct.category}\n` +
                    `📅 <b>Tarih:</b> ${new Date().toLocaleString('tr-TR')}\n\n` +
                    `🔔 Ürün bildirimi adminlere iletildi.\n` +
                    `📊 Bu ürün eksik ürünler listesine eklendi.`,
                    {
                        keyboard: this.getKeyboard('main', await userManager.isAdmin(chatId)),
                        resize_keyboard: true
                    }
                );
                
                // Notify admins
                const adminSettings = await dataManager.readFile(DATA_FILES.adminSettings);
                for (const adminChatId of adminSettings.adminUsers) {
                    if (Number(adminChatId) !== Number(chatId)) { // Don't notify if reporter is admin
                        await telegramAPI.sendMessage(adminChatId,
                            `📦 <b>Yeni Eksik Ürün Bildirimi</b>\n\n` +
                            `🏷️ <b>Kategori:</b> ${newProduct.category}\n` +
                            `📦 <b>Ürün:</b> ${newProduct.product}\n` +
                            `👤 <b>Bildiren:</b> ${newProduct.reportedBy}\n` +
                            `📅 <b>Tarih:</b> ${new Date().toLocaleString('tr-TR')}`,
                            {
                                inline_keyboard: [[
                                    { text: "✅ Tamamlandı", callback_data: `complete_product_${newProduct.id}` },
                                    { text: "🗑️ Sil", callback_data: `delete_product_${newProduct.id}` }
                                ]]
                            }
                        );
                    }
                }
                
            } catch (error) {
                console.error('❌ Error reporting product:', error);
                await telegramAPI.sendMessage(chatId,
                    "❌ <b>Hata!</b>\n\nÜrün bildirimi sırasında bir hata oluştu. Lütfen tekrar deneyin."
                );
            }
            
            // Clear user state
            userManager.clearUserState(chatId);
        }
    }
    
    // Add other missing handler methods as stubs for now
    async handleHelp(chatId, text, from, user, isAdmin) {
        const helpText = `ℹ️ <b>SivalTeam Bot Yardım</b>\n\n` +
            `🤖 <b>Mevcut Özellikler:</b>\n\n` +
            `📦 <b>Eksik Ürün Bildirimi</b>\n` +
            `• Kategoriler halinde ürün bildirimi\n` +
            `• Otomatik admin bildirimi\n\n` +
            `📋 <b>Görev Yönetimi</b>\n` +
            `• Kişisel görev takibi\n` +
            `• Görev tamamlama\n` +
            `• İlerleme raporları\n\n` +
            `📊 <b>İstatistikler</b>\n` +
            `• Sistem geneli raporlar\n` +
            `• Kişisel performans\n\n` +
            (isAdmin ? `👑 <b>Admin Özellikleri</b>\n` +
            `• Kullanıcı yönetimi\n` +
            `• Görev atama\n` +
            `• Toplu duyurular\n` +
            `• Sistem raporları\n\n` : '') +
            `🔧 <b>Komutlar:</b>\n` +
            `/start - Sisteme giriş\n` +
            `/help - Bu yardım menüsü\n` +
            `/stats - İstatistikler\n` +
            (isAdmin ? `/admin - Admin komutları\n` : '') +
            `\n💡 Butonları kullanarak kolay erişim sağlayabilirsin!`;
        
        await telegramAPI.sendMessage(chatId, helpText, {
            keyboard: this.getKeyboard('main', isAdmin),
            resize_keyboard: true
        });
    }
    
    async handleStats(chatId, text, from, user, isAdmin) {
        const employees = await dataManager.readFile(DATA_FILES.employees);
        const tasks = await dataManager.readFile(DATA_FILES.tasks);
        const products = await dataManager.readFile(DATA_FILES.missingProducts);
        const activities = await dataManager.readFile(DATA_FILES.activityLog);
        
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const pendingTasks = tasks.filter(t => t.status === 'pending').length;
        
        let statsText = `📊 <b>Sistem İstatistikleri</b>\n\n`;
        statsText += `👥 <b>Kullanıcılar:</b> ${employees.length}\n`;
        statsText += `📋 <b>Toplam Görev:</b> ${totalTasks}\n`;
        statsText += `✅ <b>Tamamlanan:</b> ${completedTasks}\n`;
        statsText += `⏳ <b>Bekleyen:</b> ${pendingTasks}\n`;
        statsText += `📦 <b>Eksik Ürün:</b> ${products.length}\n`;
        statsText += `📝 <b>Aktivite:</b> ${activities.length}\n\n`;
        
        if (totalTasks > 0) {
            const completionRate = Math.round((completedTasks / totalTasks) * 100);
            statsText += `🎯 <b>Başarı Oranı:</b> ${completionRate}%\n\n`;
        }
        
        if (user) {
            const userTasks = await taskManager.getUserTasks(chatId);
            const userCompleted = userTasks.filter(t => t.status === 'completed').length;
            
            statsText += `👤 <b>Kişisel İstatistikleriniz:</b>\n`;
            statsText += `📋 Toplam Görevim: ${userTasks.length}\n`;
            statsText += `✅ Tamamladığım: ${userCompleted}\n`;
            
            if (userTasks.length > 0) {
                const personalRate = Math.round((userCompleted / userTasks.length) * 100);
                statsText += `🏆 Başarı Oranım: ${personalRate}%\n`;
            }
        }
        
        await telegramAPI.sendMessage(chatId, statsText, {
            keyboard: this.getKeyboard('main', isAdmin),
            resize_keyboard: true
        });
    }
    
    async handleDebug(chatId, text, from, user, isAdmin) {
        const debugText = `🔍 <b>Debug Bilgileri</b>\n\n` +
            `👤 <b>Kullanıcı:</b> ${from.first_name || 'Bilinmeyen'}\n` +
            `💬 <b>Chat ID:</b> <code>${chatId}</code>\n` +
            `👑 <b>Admin:</b> ${isAdmin ? 'Evet' : 'Hayır'}\n` +
            `📝 <b>Kayıtlı:</b> ${user ? 'Evet' : 'Hayır'}\n` +
            `🏢 <b>Departman:</b> ${user?.department || 'Yok'}\n` +
            `⏰ <b>Son Aktivite:</b> ${user?.lastActivity ? new Date(user.lastActivity).toLocaleString('tr-TR') : 'Yok'}\n\n` +
            `🔧 <b>Sistem:</b>\n` +
            `📱 Bot Version: ${CONFIG.VERSION}\n` +
            `🖥️ Environment: ${CONFIG.ENVIRONMENT}\n` +
            `💾 Cache Size: ${cache.size()}\n` +
            `📊 Uptime: ${Math.round((Date.now() - CONFIG.BUILD_DATE) / 1000)}s`;
        
        await telegramAPI.sendMessage(chatId, debugText);
    }
    
    async handleMainMenu(chatId, user, isAdmin) {
        await telegramAPI.sendMessage(chatId,
            `🏠 <b>Ana Menü</b>\n\n` +
            `Hoşgeldin ${user.name}!\n` +
            `Aşağıdaki seçeneklerden birini seçebilirsin:`,
            {
                keyboard: this.getKeyboard('main', isAdmin),
                resize_keyboard: true
            }
        );
    }
    
    async handleAdminPanel(chatId, user) {
        await telegramAPI.sendMessage(chatId,
            `👑 <b>Admin Panel</b>\n\n` +
            `Merhaba ${user.name}!\n` +
            `Admin yetkilerinle şunları yapabilirsin:`,
            {
                keyboard: this.getKeyboard('admin_panel'),
                resize_keyboard: true
            }
        );
    }
    
    // Task Command Handler - Individual Task Assignment
    async handleTaskCommand(chatId, text, from, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu komut sadece adminler tarafından kullanılabilir.");
            return;
        }
        
        // Parse: /task @username veya chatId Görev başlığı | Açıklama
        const taskText = text.replace('/task ', '').trim();
        const parts = taskText.split(' ');
        
        if (parts.length < 2 || !taskText.includes('|')) {
            await telegramAPI.sendMessage(chatId, 
                `❌ <b>Kullanım:</b>\n` +
                `/task @username Görev başlığı | Açıklama\n` +
                `veya\n` +
                `/task <chatId> Görev başlığı | Açıklama\n\n` +
                `💡 <b>Örnek:</b>\n` +
                `/task @john Stok Sayımı | Mağaza stoklarını kontrol et`
            );
            return;
        }
        
        let targetIdentifier = parts[0];
        let taskContent = parts.slice(1).join(' ');
        let [title, description] = taskContent.split('|').map(s => s.trim());
        
        if (!title || !description) {
            await telegramAPI.sendMessage(chatId, "❌ Görev başlığı ve açıklaması gereklidir.");
            return;
        }
        
        const employees = await dataManager.readFile(DATA_FILES.employees);
        let targetEmployee = null;
        
        // Find employee by username or chatId
        if (targetIdentifier.startsWith('@')) {
            const username = targetIdentifier.replace('@', '');
            targetEmployee = employees.find(e => e.username === username);
        } else if (!isNaN(Number(targetIdentifier))) {
            const targetChatId = Number(targetIdentifier);
            targetEmployee = employees.find(e => Number(e.chatId) === targetChatId);
        }
        
        if (!targetEmployee) {
            await telegramAPI.sendMessage(chatId, "❌ Çalışan bulunamadı. @username veya chat ID kontrolünü yapın.");
            return;
        }
        
        try {
            const newTask = await taskManager.createTask({
                title,
                description,
                assignedTo: targetEmployee.chatId,
                assignedToName: targetEmployee.name,
                assignedBy: chatId,
                assignedByName: user.name,
                type: 'individual'
            });
            
            // Notify admin
            await telegramAPI.sendMessage(chatId, 
                `✅ <b>Görev Atandı</b>\n\n` +
                `📋 <b>${title}</b>\n` +
                `📄 ${description}\n\n` +
                `👤 Atanan: ${targetEmployee.name}\n` +
                `💬 Chat ID: ${targetEmployee.chatId}\n` +
                `📅 Tarih: ${new Date().toLocaleDateString('tr-TR')}`
            );
            
            // Notify employee
            await telegramAPI.sendMessage(targetEmployee.chatId,
                `📋 <b>Yeni Görev Atandı!</b>\n\n` +
                `🎯 <b>${title}</b>\n` +
                `📝 ${description}\n\n` +
                `👤 Atayan: ${user.name}\n` +
                `📅 Tarih: ${new Date().toLocaleDateString('tr-TR')}\n\n` +
                `📋 Görevlerinizi görmek için: "📋 Görevlerim" butonunu kullanın.`,
                {
                    keyboard: commandHandler.getKeyboard('main', false),
                    resize_keyboard: true
                }
            );
            
        } catch (error) {
            console.error('❌ Task assignment error:', error);
            await telegramAPI.sendMessage(chatId, "❌ Görev atama sırasında hata oluştu.");
        }
    }
    
    async handleTaskAllCommand(chatId, text, from, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu komut sadece adminler tarafından kullanılabilir.");
            return;
        }
        
        // Parse: /taskall Görev başlığı | Açıklama
        const taskText = text.replace('/taskall ', '').trim();
        
        if (!taskText.includes('|')) {
            await telegramAPI.sendMessage(chatId, 
                `❌ <b>Kullanım:</b>\n` +
                `/taskall Görev başlığı | Açıklama\n\n` +
                `💡 <b>Örnek:</b>\n` +
                `/taskall Haftalık Toplantı | Bu hafta Pazartesi 14:00'da toplantı var`
            );
            return;
        }
        
        let [title, description] = taskText.split('|').map(s => s.trim());
        
        if (!title || !description) {
            await telegramAPI.sendMessage(chatId, "❌ Görev başlığı ve açıklaması gereklidir.");
            return;
        }
        
        try {
            const employees = await dataManager.readFile(DATA_FILES.employees);
            const activeEmployees = employees.filter(emp => emp.status === 'active' && Number(emp.chatId) !== Number(chatId));
            
            if (activeEmployees.length === 0) {
                await telegramAPI.sendMessage(chatId, "❌ Görev atanacak aktif çalışan bulunamadı.");
                return;
            }
            
            const createdTasks = await taskManager.createBulkTasks({
                title,
                description,
                assignedBy: chatId,
                assignedByName: user.name,
                type: 'bulk'
            }, activeEmployees);
            
            // Notify admin
            await telegramAPI.sendMessage(chatId,
                `✅ <b>Toplu Görev Atandı</b>\n\n` +
                `📋 <b>${title}</b>\n` +
                `📄 ${description}\n\n` +
                `👥 Atanan Çalışan Sayısı: ${createdTasks.length}\n` +
                `📅 Tarih: ${new Date().toLocaleDateString('tr-TR')}\n\n` +
                `📊 Tüm aktif çalışanlara başarıyla gönderildi.`
            );
            
            // Notify all employees
            for (const employee of activeEmployees) {
                await telegramAPI.sendMessage(employee.chatId,
                    `📢 <b>Toplu Görev Atandı!</b>\n\n` +
                    `🎯 <b>${title}</b>\n` +
                    `📝 ${description}\n\n` +
                    `👤 Atayan: ${user.name}\n` +
                    `📅 Tarih: ${new Date().toLocaleDateString('tr-TR')}\n\n` +
                    `📋 Görevlerinizi görmek için: "📋 Görevlerim" butonunu kullanın.`,
                    {
                        keyboard: [{
                            text: "📋 Görevlerim"
                        }, {
                            text: "📦 Eksik Ürün Bildir"
                        }],
                        resize_keyboard: true
                    }
                );
            }
            
        } catch (error) {
            console.error('❌ Bulk task assignment error:', error);
            await telegramAPI.sendMessage(chatId, "❌ Toplu görev atama sırasında hata oluştu.");
        }
    }
    
    async handleAddUserCommand(chatId, text, from, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu komut sadece adminler tarafından kullanılabilir.");
            return;
        }
        
        await telegramAPI.sendMessage(chatId, 
            "🚧 Bu özellik geliştiriliyor...\n\n" +
            "Şimdilik admin panelini kullanabilirsin.");
    }
    
    async handleRemoveUserCommand(chatId, text, from, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu komut sadece adminler tarafından kullanılabilir.");
            return;
        }
        
        await telegramAPI.sendMessage(chatId, 
            "🚧 Bu özellik geliştiriliyor...\n\n" +
            "Şimdilik admin panelini kullanabilirsin.");
    }
    
    async handleListUsers(chatId, text, from, user, isAdmin) {
        if (!isAdmin) return;
        
        const employees = await dataManager.readFile(DATA_FILES.employees);
        
        if (employees.length === 0) {
            await telegramAPI.sendMessage(chatId, "👥 Henüz kayıtlı kullanıcı bulunmuyor.");
            return;
        }
        
        let userList = `👥 <b>Kayıtlı Kullanıcılar (${employees.length})</b>\n\n`;
        
        employees.forEach((emp, index) => {
            const daysSince = Math.floor((Date.now() - new Date(emp.addedAt)) / (1000 * 60 * 60 * 24));
            userList += `${index + 1}. ${emp.role === 'admin' ? '👑' : '👤'} <b>${emp.name}</b>\n`;
            userList += `   🏢 ${emp.department}\n`;
            userList += `   📅 ${daysSince} gün önce katıldı\n`;
            userList += `   📋 ${emp.totalTasks || 0} görev (${emp.completedTasks || 0} tamamlandı)\n\n`;
        });
        
        await telegramAPI.sendMessage(chatId, userList, {
            keyboard: this.getKeyboard('admin_panel'),
            resize_keyboard: true
        });
    }
    
    async handleProductList(chatId, text, from, user, isAdmin) {
        const products = await dataManager.readFile(DATA_FILES.missingProducts);
        
        if (products.length === 0) {
            await telegramAPI.sendMessage(chatId,
                "📦 <b>Eksik Ürün Listesi</b>\n\n" +
                "✅ Şu anda eksik ürün bildirimi bulunmuyor.",
                {
                    keyboard: isAdmin ? this.getKeyboard('admin_panel') : this.getKeyboard('main', isAdmin),
                    resize_keyboard: true
                }
            );
            return;
        }

        // Admin için - her ürünü ayrı ayrı butonlarla gönder
        if (isAdmin) {
            await telegramAPI.sendMessage(chatId,
                `📦 <b>Eksik Ürün Listesi (${products.length})</b>\n\n` +
                `Aşağıdaki ürünleri tek tek tamamlayabilir veya silebilirsiniz:`,
                {
                    keyboard: this.getKeyboard('admin_panel'),
                    resize_keyboard: true
                }
            );

            // Her ürün için ayrı mesaj ve butonlar
            for (let i = 0; i < Math.min(products.length, 10); i++) {
                const product = products[i];
                const daysSince = Math.floor((Date.now() - new Date(product.reportedAt)) / (1000 * 60 * 60 * 24));
                
                await telegramAPI.sendMessage(chatId,
                    `${i + 1}. 📦 <b>${product.product}</b>\n` +
                    `🏷️ Kategori: ${product.category}\n` +
                    `👤 Bildiren: ${product.reportedBy}\n` +
                    `📅 ${daysSince} gün önce bildirildi`,
                    {
                        inline_keyboard: [[
                            { text: "✅ Tamamlandı", callback_data: `complete_product_${product.id}` },
                            { text: "🗑️ Sil", callback_data: `delete_product_${product.id}` }
                        ]]
                    }
                );
            }

            if (products.length > 10) {
                await telegramAPI.sendMessage(chatId, 
                    `... ve ${products.length - 10} ürün daha var. \n\n` +
                    `Tüm listeyi yönetmek için aşağıdaki butonları kullanın:`,
                    {
                        inline_keyboard: [[
                            { text: "🗑️ Tümünü Temizle", callback_data: "clear_all_products" },
                            { text: "🔄 Listeyi Yenile", callback_data: "refresh_products" }
                        ]]
                    }
                );
            } else {
                await telegramAPI.sendMessage(chatId, 
                    `📋 Tüm ürünleri gördünüz. Liste yönetimi:`,
                    {
                        inline_keyboard: [[
                            { text: "🗑️ Tümünü Temizle", callback_data: "clear_all_products" },
                            { text: "🔄 Listeyi Yenile", callback_data: "refresh_products" }
                        ]]
                    }
                );
            }
        } else {
            // Çalışan için - sadece liste görüntüleme
            let productText = `📦 <b>Eksik Ürün Listesi (${products.length})</b>\n\n`;
            
            products.slice(0, 20).forEach((product, index) => {
                const daysSince = Math.floor((Date.now() - new Date(product.reportedAt)) / (1000 * 60 * 60 * 24));
                productText += `${index + 1}. 📦 <b>${product.product}</b>\n`;
                productText += `   🏷️ ${product.category}\n`;
                productText += `   👤 ${product.reportedBy}\n`;
                productText += `   📅 ${daysSince} gün önce\n\n`;
            });
            
            if (products.length > 20) {
                productText += `... ve ${products.length - 20} ürün daha`;
            }
            
            await telegramAPI.sendMessage(chatId, productText, {
                keyboard: this.getKeyboard('main', isAdmin),
                resize_keyboard: true
            });
        }
    }
    
    async handlePendingUsers(chatId, text, from, user, isAdmin) {
        if (!isAdmin) return;
        
        const pendingUsers = await dataManager.readFile(DATA_FILES.pendingUsers);
        
        if (pendingUsers.length === 0) {
            await telegramAPI.sendMessage(chatId,
                "⏳ <b>Bekleyen Onaylar</b>\n\n" +
                "✅ Şu anda onay bekleyen kullanıcı bulunmuyor.",
                {
                    keyboard: this.getKeyboard('admin_panel'),
                    resize_keyboard: true
                }
            );
            return;
        }
        
        let pendingText = `⏳ <b>Bekleyen Onaylar (${pendingUsers.length})</b>\n\n`;
        
        pendingUsers.forEach((pending, index) => {
            const daysSince = Math.floor((Date.now() - new Date(pending.timestamp)) / (1000 * 60 * 60 * 24));
            pendingText += `${index + 1}. 👤 <b>${pending.firstName} ${pending.lastName}</b>\n`;
            pendingText += `   @${pending.username || 'username_yok'}\n`;
            pendingText += `   💬 <code>${pending.chatId}</code>\n`;
            pendingText += `   📅 ${daysSince} gün önce başvurdu\n\n`;
        });
        
        await telegramAPI.sendMessage(chatId, pendingText, {
            keyboard: this.getKeyboard('admin_panel'),
            resize_keyboard: true
        });
    }
    
    // Add remaining placeholder methods
    async handleActivity(chatId, text, from, user, isAdmin) {
        const activities = await dataManager.readFile(DATA_FILES.activityLog);
        const recentActivities = activities.slice(-10).reverse();
        
        let activityText = `📝 <b>Son Aktiviteler</b>\n\n`;
        
        if (recentActivities.length === 0) {
            activityText += "Henüz aktivite kaydı bulunmuyor.";
        } else {
            recentActivities.forEach((activity, index) => {
                const timeAgo = Math.floor((Date.now() - new Date(activity.timestamp)) / (1000 * 60));
                activityText += `${index + 1}. ${activity.message}\n`;
                activityText += `   ⏰ ${timeAgo < 60 ? timeAgo + ' dakika' : Math.floor(timeAgo / 60) + ' saat'} önce\n\n`;
            });
        }
        
        await telegramAPI.sendMessage(chatId, activityText, {
            keyboard: this.getKeyboard('main', isAdmin),
            resize_keyboard: true
        });
    }
    
    async handleBroadcast(chatId, text, from, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu komut sadece adminler tarafından kullanılabilir.");
            return;
        }
        
        // Parse: /broadcast mesaj içeriği veya /duyuru mesaj içeriği
        const broadcastText = text.replace(/\/(broadcast|duyuru) /, '').trim();
        
        if (!broadcastText || broadcastText.length < 5) {
            await telegramAPI.sendMessage(chatId, 
                `❌ <b>Kullanım:</b>\n` +
                `/broadcast mesaj içeriği\n` +
                `veya\n` +
                `/duyuru mesaj içeriği\n\n` +
                `💡 <b>Örnek:</b>\n` +
                `/duyuru Yarın saat 14:00'da genel toplantı var. Lütfen katılım sağlayın.`
            );
            return;
        }
        
        try {
            const employees = await dataManager.readFile(DATA_FILES.employees);
            const activeEmployees = employees.filter(emp => emp.status === 'active' && Number(emp.chatId) !== Number(chatId));
            
            if (activeEmployees.length === 0) {
                await telegramAPI.sendMessage(chatId, "❌ Duyuru gönderilecek aktif çalışan bulunamadı.");
                return;
            }
            
            // Notify admin first
            await telegramAPI.sendMessage(chatId,
                `📢 <b>Toplu Duyuru Gönderiliyor...</b>\n\n` +
                `👥 Hedef: ${activeEmployees.length} aktif çalışan\n` +
                `📝 Mesaj: "${broadcastText}"\n\n` +
                `⏳ Gönderim başlatılıyor...`
            );
            
            let successCount = 0;
            let failCount = 0;
            
            // Send to all employees
            for (const employee of activeEmployees) {
                try {
                    await telegramAPI.sendMessage(employee.chatId,
                        `📢 <b>YÖNETİCİDEN DUYURU</b>\n\n` +
                        `${broadcastText}\n\n` +
                        `👤 Gönderen: ${user.name}\n` +
                        `📅 Tarih: ${new Date().toLocaleString('tr-TR')}`,
                        {
                            keyboard: commandHandler.getKeyboard('main', false),
                            resize_keyboard: true
                        }
                    );
                    successCount++;
                    
                    // Small delay between messages
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error(`❌ Failed to send broadcast to ${employee.name}:`, error);
                    failCount++;
                }
            }
            
            // Final report to admin
            await telegramAPI.sendMessage(chatId,
                `✅ <b>Toplu Duyuru Tamamlandı!</b>\n\n` +
                `📊 <b>Sonuçlar:</b>\n` +
                `✅ Başarılı: ${successCount}\n` +
                `❌ Başarısız: ${failCount}\n` +
                `👥 Toplam: ${activeEmployees.length}\n\n` +
                `📅 Gönderim: ${new Date().toLocaleString('tr-TR')}`
            );
            
            // Log the broadcast
            await activityLogger.log(
                `Toplu duyuru gönderildi: "${broadcastText.substring(0, 50)}${broadcastText.length > 50 ? '...' : ''}" → ${successCount} kişi`,
                chatId,
                user.name,
                'info'
            );
            
        } catch (error) {
            console.error('❌ Broadcast error:', error);
            await telegramAPI.sendMessage(chatId, "❌ Toplu duyuru gönderim sırasında hata oluştu.");
        }
    }
    
    async handleBackup(chatId, text, from, user, isAdmin) {
        if (!isAdmin) return;
        
        try {
            const backupPath = await dataManager.createBackup();
            await telegramAPI.sendMessage(chatId, 
                `💾 <b>Yedekleme Tamamlandı!</b>\n\n` +
                `📁 Yedek konumu: ${backupPath}\n` +
                `📅 Tarih: ${new Date().toLocaleString('tr-TR')}`
            );
        } catch (error) {
            await telegramAPI.sendMessage(chatId, "❌ Yedekleme sırasında hata oluştu.");
        }
    }
    
    async handleClearProducts(chatId, user) {
        await telegramAPI.sendMessage(chatId,
            "🗑️ <b>Listeyi Temizle</b>\n\n" +
            "Tüm eksik ürün listesini temizlemek istediğinize emin misiniz?",
            {
                inline_keyboard: [[
                    { text: "✅ Evet, Temizle", callback_data: "confirm_clear_products" },
                    { text: "❌ İptal", callback_data: "cancel_clear_products" }
                ]]
            }
        );
    }
    
    async handleBroadcastStart(chatId, user) {
        await telegramAPI.sendMessage(chatId,
            `📢 <b>Toplu Duyuru Gönder</b>\n\n` +
            `Tüm aktif çalışanlara mesaj göndermek için komutu kullanın:\n\n` +
            `💡 <b>Kullanım:</b>\n` +
            `/duyuru mesajınız\n\n` +
            `📝 <b>Örnek:</b>\n` +
            `/duyuru Yarın saat 14:00'da genel toplantı var.\n\n` +
            `⚠️ Bu mesaj tüm aktif çalışanlara gönderilecektir.`,
            {
                keyboard: commandHandler.getKeyboard('admin_panel'),
                resize_keyboard: true
            }
        );
    }
    
    async handleTaskManagement(chatId, user) {
        try {
            const tasks = await dataManager.readFile(DATA_FILES.tasks);
            const employees = await dataManager.readFile(DATA_FILES.employees);
            
            const allTasks = tasks.length;
            const pendingTasks = tasks.filter(task => task.status === 'pending').length;
            const completedTasks = tasks.filter(task => task.status === 'completed').length;
            const activeTasks = tasks.filter(task => task.status === 'pending');
            
            let taskText = `📋 <b>Görev Yönetim Paneli</b>\n\n`;
            taskText += `📊 <b>Özet İstatistikler:</b>\n`;
            taskText += `├ 📋 Toplam: ${allTasks} görev\n`;
            taskText += `├ ⏳ Bekleyen: ${pendingTasks} görev\n`;
            taskText += `└ ✅ Tamamlanan: ${completedTasks} görev\n\n`;
            
            if (activeTasks.length > 0) {
                taskText += `⏳ <b>Aktif Görevler:</b>\n\n`;
                activeTasks.slice(0, 5).forEach((task, index) => {
                    const daysSince = Math.floor((Date.now() - new Date(task.assignedAt)) / (1000 * 60 * 60 * 24));
                    taskText += `${index + 1}. 📋 <b>${task.title}</b>\n`;
                    taskText += `   👤 ${task.assignedToName}\n`;
                    taskText += `   📅 ${daysSince} gün önce atandı\n\n`;
                });
                
                if (activeTasks.length > 5) {
                    taskText += `... ve ${activeTasks.length - 5} görev daha\n\n`;
                }
            } else {
                taskText += `✅ Şu anda bekleyen görev bulunmuyor.\n\n`;
            }
            
            taskText += `💡 <b>Yeni Görev Atamak İçin:</b>\n`;
            taskText += `• Tek kişiye: /task @kullanıcı Görev başlığı | Açıklama\n`;
            taskText += `• Toplu: /taskall Görev başlığı | Açıklama\n\n`;
            taskText += `📋 <b>Örnek:</b> /task @ahmet Rapor hazırla | Haftalık satış raporu`;
            
            await telegramAPI.sendMessage(chatId, taskText, {
                keyboard: this.getKeyboard('admin_panel'),
                resize_keyboard: true
            });
            
        } catch (error) {
            console.error('❌ Task management error:', error);
            await telegramAPI.sendMessage(chatId, "❌ Görev yönetimi yüklenirken hata oluştu.");
        }
    }

    async handleDetailedReports(chatId, user) {
        try {
            const employees = await dataManager.readFile(DATA_FILES.employees);
            const tasks = await dataManager.readFile(DATA_FILES.tasks);
            const products = await dataManager.readFile(DATA_FILES.missingProducts);
            const activities = await dataManager.readFile(DATA_FILES.activityLog);
            const systemStats = await dataManager.readFile(DATA_FILES.systemStats);
            
            // Calculate advanced statistics
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter(t => t.status === 'completed').length;
            const pendingTasks = tasks.filter(t => t.status === 'pending').length;
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            // User performance analysis
            const userPerformance = employees.map(emp => {
                const userTasks = tasks.filter(t => Number(t.assignedTo) === Number(emp.chatId));
                const userCompleted = userTasks.filter(t => t.status === 'completed').length;
                const userRate = userTasks.length > 0 ? Math.round((userCompleted / userTasks.length) * 100) : 0;
                
                return {
                    name: emp.name,
                    totalTasks: userTasks.length,
                    completed: userCompleted,
                    rate: userRate
                };
            }).sort((a, b) => b.rate - a.rate);
            
            // Recent activity analysis
            const recentActivities = activities.slice(-50);
            const activityTypes = {};
            recentActivities.forEach(act => {
                const type = act.level || 'info';
                activityTypes[type] = (activityTypes[type] || 0) + 1;
            });
            
            // Product categories analysis
            const productCategories = {};
            products.forEach(prod => {
                productCategories[prod.category] = (productCategories[prod.category] || 0) + 1;
            });
            
            let reportText = `📊 <b>Detaylı Sistem Raporları</b>\n\n`;
            
            // System Overview
            reportText += `🏢 <b>Sistem Genel Durumu:</b>\n`;
            reportText += `👥 Toplam Çalışan: ${employees.length}\n`;
            reportText += `📋 Toplam Görev: ${totalTasks}\n`;
            reportText += `✅ Tamamlanan: ${completedTasks} (%${completionRate})\n`;
            reportText += `⏳ Bekleyen: ${pendingTasks}\n`;
            reportText += `📦 Eksik Ürün: ${products.length}\n`;
            reportText += `📝 Toplam Aktivite: ${activities.length}\n\n`;
            
            // Top Performers
            reportText += `🏆 <b>En Başarılı Çalışanlar:</b>\n`;
            userPerformance.slice(0, 5).forEach((user, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
                reportText += `${medal} ${user.name}: ${user.completed}/${user.totalTasks} (%${user.rate})\n`;
            });
            reportText += `\n`;
            
            // Product Categories
            if (Object.keys(productCategories).length > 0) {
                reportText += `📦 <b>Eksik Ürün Kategorileri:</b>\n`;
                Object.entries(productCategories)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .forEach(([category, count]) => {
                        reportText += `• ${category}: ${count} ürün\n`;
                    });
                reportText += `\n`;
            }
            
            // Activity Summary
            reportText += `📈 <b>Aktivite Analizi (Son 50):</b>\n`;
            Object.entries(activityTypes).forEach(([type, count]) => {
                const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
                reportText += `${emoji} ${type}: ${count}\n`;
            });
            reportText += `\n`;
            
            // System Health
            const uptime = systemStats.uptime || Date.now();
            const uptimeHours = Math.floor((Date.now() - uptime) / (1000 * 60 * 60));
            reportText += `🔧 <b>Sistem Sağlık Durumu:</b>\n`;
            reportText += `⏱️ Uptime: ${uptimeHours} saat\n`;
            reportText += `💾 Versiyon: ${systemStats.version || CONFIG.VERSION}\n`;
            reportText += `📅 Son Güncelleme: ${systemStats.lastUpdate ? new Date(systemStats.lastUpdate).toLocaleString('tr-TR') : 'Bilinmiyor'}\n`;
            reportText += `🔄 Son Yedekleme: ${systemStats.lastBackup ? new Date(systemStats.lastBackup).toLocaleString('tr-TR') : 'Henüz yok'}\n\n`;
            
            reportText += `📅 <b>Rapor Tarihi:</b> ${new Date().toLocaleString('tr-TR')}`;
            
            await telegramAPI.sendMessage(chatId, reportText, {
                keyboard: commandHandler.getKeyboard('admin_panel'),
                resize_keyboard: true
            });
            
        } catch (error) {
            console.error('❌ Detailed reports error:', error);
            await telegramAPI.sendMessage(chatId, "❌ Detaylı rapor oluşturma sırasında hata oluştu.");
        }
    }
}

const commandHandler = new CommandHandler();

// 📞 Callback Query Handler System
class CallbackQueryHandler {
    constructor() {
        this.handlers = new Map();
        this.initializeHandlers();
    }
    
    initializeHandlers() {
        // User approval/rejection handlers
        this.handlers.set('approve_', this.handleUserApproval.bind(this));
        this.handlers.set('reject_', this.handleUserRejection.bind(this));
        
        // Task handlers
        this.handlers.set('complete_task_', this.handleTaskCompletion.bind(this));
        this.handlers.set('refresh_my_tasks', this.handleTaskRefresh.bind(this));
        this.handlers.set('show_all_tasks', this.handleShowAllTasks.bind(this));
        
        // Product handlers
        this.handlers.set('complete_product_', this.handleProductCompletion.bind(this));
        this.handlers.set('delete_product_', this.handleProductDeletion.bind(this));
        this.handlers.set('clear_all_products', this.handleClearAllProducts.bind(this));
        this.handlers.set('confirm_clear_products', this.handleConfirmClearProducts.bind(this));
        this.handlers.set('cancel_clear_products', this.handleCancelClearProducts.bind(this));
        this.handlers.set('refresh_products', this.handleRefreshProducts.bind(this));
        
        // Admin handlers
        this.handlers.set('admin_', this.handleAdminAction.bind(this));
        this.handlers.set('user_', this.handleUserAction.bind(this));
    }
    
    async handleCallback(callbackQuery) {
        const { id, data, from, message } = callbackQuery;
        const chatId = from.id;
        
        try {
            // Answer callback query immediately
            await telegramAPI.answerCallbackQuery(id, "İşlem alındı...");
            
            // Rate limiting check
            if (!rateLimiter.isAllowed(chatId)) {
                await telegramAPI.sendMessage(chatId, 
                    "⚠️ <b>Çok fazla istek!</b>\n\nLütfen biraz bekleyip tekrar deneyin."
                );
                return;
            }
            
            // 🔒 STRICT ACCESS CONTROL - Only registered users allowed
            const user = await userManager.findUser(chatId);
            const isAdmin = await userManager.isAdmin(chatId);
            
            // Block unauthorized users immediately
            if (!user) {
                await telegramAPI.sendMessage(chatId,
                    "🔒 <b>Erişim Reddedildi</b>\n\n" +
                    "❌ Bu bot sadece kayıtlı SivalTeam çalışanları içindir.\n\n" +
                    "🚪 Kayıt olmak için: /start"
                );
                return;
            }
            
            // Find appropriate handler
            let handled = false;
            for (const [prefix, handler] of this.handlers.entries()) {
                if (data.startsWith(prefix) || data === prefix) {
                    await handler(data, chatId, from, message, user, isAdmin);
                    handled = true;
                    break;
                }
            }
            
            if (!handled) {
                console.warn(`⚠️ Unhandled callback query: ${data}`);
                await telegramAPI.sendMessage(chatId, 
                    "❌ <b>Bilinmeyen işlem!</b>\n\nBu işlem tanınmıyor. Lütfen tekrar deneyin."
                );
            }
            
        } catch (error) {
            console.error(`❌ Callback query error for ${chatId}:`, error);
            await telegramAPI.sendMessage(chatId, 
                "❌ <b>İşlem hatası!</b>\n\nBir hata oluştu. Lütfen daha sonra tekrar deneyin."
            );
        }
    }
    
    async handleUserApproval(data, chatId, from, message, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu işlem sadece adminler tarafından yapılabilir.");
            return;
        }
        
        const targetChatId = data.replace('approve_', '');
        
        try {
            const approvedUser = await userManager.approveUser(Number(targetChatId), chatId);
            
            // Notify admin
            await telegramAPI.sendMessage(chatId,
                `✅ <b>Kullanıcı Onaylandı!</b>\n\n` +
                `👤 ${approvedUser.name} başarıyla sisteme eklendi.\n` +
                `🏢 Departman: ${approvedUser.department}\n` +
                `📅 Tarih: ${new Date().toLocaleString('tr-TR')}`
            );
            
            // Notify approved user
            await telegramAPI.sendMessage(Number(targetChatId),
                `🎉 <b>Hoşgeldin SivalTeam'e!</b>\n\n` +
                `✅ Kaydınız onaylandı ve sisteme eklendiniz.\n` +
                `👤 <b>Adınız:</b> ${approvedUser.name}\n` +
                `🏢 <b>Departman:</b> ${approvedUser.department}\n\n` +
                `🚀 Artık sistemi kullanabilirsiniz!\n` +
                `💡 /start komutu ile başlayın.`,
                {
                    keyboard: commandHandler.getKeyboard('main', false),
                    resize_keyboard: true
                }
            );
            
        } catch (error) {
            console.error('❌ User approval error:', error);
            await telegramAPI.sendMessage(chatId,
                `❌ <b>Onaylama Hatası!</b>\n\n${error.message}`
            );
        }
    }
    
    async handleUserRejection(data, chatId, from, message, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu işlem sadece adminler tarafından yapılabilir.");
            return;
        }
        
        const targetChatId = data.replace('reject_', '');
        
        try {
            const rejectedUser = await userManager.rejectUser(Number(targetChatId), chatId, 'Admin tarafından reddedildi');
            
            // Notify admin
            await telegramAPI.sendMessage(chatId,
                `❌ <b>Kullanıcı Reddedildi!</b>\n\n` +
                `👤 ${rejectedUser.firstName} ${rejectedUser.lastName} kayıt talebi reddedildi.\n` +
                `📅 Tarih: ${new Date().toLocaleString('tr-TR')}`
            );
            
            // Notify rejected user
            await telegramAPI.sendMessage(Number(targetChatId),
                `❌ <b>Kayıt Talebi Reddedildi</b>\n\n` +
                `Üzgünüz, SivalTeam sistemine kayıt talebiniz reddedildi.\n\n` +
                `📞 Daha fazla bilgi için sistem yöneticisiyle iletişime geçebilirsiniz.\n` +
                `🔄 İsterseniz daha sonra tekrar başvuru yapabilirsiniz.`
            );
            
        } catch (error) {
            console.error('❌ User rejection error:', error);
            await telegramAPI.sendMessage(chatId,
                `❌ <b>Reddetme Hatası!</b>\n\n${error.message}`
            );
        }
    }
    
    async handleTaskCompletion(data, chatId, from, message, user, isAdmin) {
        if (!user) {
            await telegramAPI.sendMessage(chatId, "❌ Bu özelliği kullanmak için kayıt olmalısınız.");
            return;
        }
        
        const taskId = data.replace('complete_task_', '');
        
        try {
            const completedTask = await taskManager.completeTask(taskId, chatId);
            
            // Calculate completion time
            const startTime = new Date(completedTask.createdAt);
            const endTime = new Date(completedTask.completedAt);
            const timeTaken = Math.round((endTime - startTime) / (1000 * 60 * 60)); // hours
            
            // Notify user
            await telegramAPI.sendMessage(chatId,
                `✅ <b>Görev Tamamlandı!</b>\n\n` +
                `🎯 <b>${completedTask.title}</b>\n` +
                `📝 ${completedTask.description}\n\n` +
                `⏱️ <b>Tamamlanma Süresi:</b> ${timeTaken < 1 ? 'Aynı gün' : timeTaken + ' saat'}\n` +
                `📅 <b>Tamamlanma:</b> ${new Date(completedTask.completedAt).toLocaleString('tr-TR')}\n\n` +
                `🎉 Tebrikler! Göreviniz başarıyla tamamlandı ve listeden kaldırıldı.`,
                {
                    keyboard: commandHandler.getKeyboard('main', isAdmin),
                    resize_keyboard: true
                }
            );
            
            // Notify admin who assigned the task
            const adminSettings = await dataManager.readFile(DATA_FILES.adminSettings);
            if (adminSettings.adminUsers.includes(completedTask.assignedBy)) {
                await telegramAPI.sendMessage(completedTask.assignedBy,
                    `✅ <b>Görev Tamamlandı!</b>\n\n` +
                    `🎯 <b>${completedTask.title}</b>\n` +
                    `👤 <b>Tamamlayan:</b> ${user.name}\n` +
                    `⏱️ <b>Süre:</b> ${timeTaken < 1 ? 'Aynı gün' : timeTaken + ' saat'}\n` +
                    `📅 <b>Tamamlanma:</b> ${new Date(completedTask.completedAt).toLocaleString('tr-TR')}\n\n` +
                    `🎉 ${completedTask.type === 'bulk' ? 'Toplu görev' : 'Kişisel görev'} başarıyla tamamlandı!`
                );
            }
            
        } catch (error) {
            console.error('❌ Task completion error:', error);
            await telegramAPI.sendMessage(chatId,
                `❌ <b>Görev Tamamlama Hatası!</b>\n\n${error.message}`
            );
        }
    }
    
    async handleTaskRefresh(data, chatId, from, message, user, isAdmin) {
        if (!user) return;
        
        // Trigger task list refresh
        await commandHandler.handleMyTasks(chatId, user);
    }
    
    async handleShowAllTasks(data, chatId, from, message, user, isAdmin) {
        if (!user) return;
        
        const userTasks = await taskManager.getUserTasks(chatId);
        const pendingTasks = userTasks.filter(task => task.status === 'pending');
        
        if (pendingTasks.length === 0) {
            await telegramAPI.sendMessage(chatId, "✅ Bekleyen göreviniz bulunmuyor!");
            return;
        }
        
        let taskText = `📋 <b>Tüm Bekleyen Görevleriniz (${pendingTasks.length})</b>\n\n`;
        
        pendingTasks.forEach((task, index) => {
            const daysPassed = Math.floor((Date.now() - new Date(task.createdAt)) / (1000 * 60 * 60 * 24));
            taskText += `${index + 1}. 🎯 <b>${task.title}</b>\n`;
            taskText += `   📝 ${task.description}\n`;
            taskText += `   👤 Atayan: ${task.assignedByName}\n`;
            taskText += `   📅 ${daysPassed} gün önce\n`;
            taskText += `   ${task.priority !== 'normal' ? `⚡ ${task.priority.toUpperCase()}\n` : ''}`;
            taskText += `   ${task.type === 'bulk' ? '📢 Toplu Görev' : '👤 Kişisel Görev'}\n\n`;
        });
        
        // Create completion buttons for tasks
        const inlineKeyboard = [];
        pendingTasks.slice(0, 10).forEach(task => {
            inlineKeyboard.push([{
                text: `✅ "${task.title.substring(0, 25)}${task.title.length > 25 ? '...' : ''}" Tamamla`,
                callback_data: `complete_task_${task.id}`
            }]);
        });
        
        await telegramAPI.sendMessage(chatId, taskText, {
            inline_keyboard: inlineKeyboard
        });
    }
    
    async handleProductCompletion(data, chatId, from, message, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu işlem sadece adminler tarafından yapılabilir.");
            return;
        }
        
        const productId = data.replace('complete_product_', '');
        
        try {
            const completedProduct = await productManager.completeProduct(productId, chatId);
            
            await telegramAPI.sendMessage(chatId,
                `✅ <b>Ürün Tamamlandı!</b>\n\n` +
                `📦 <b>${completedProduct.product}</b>\n` +
                `🏷️ Kategori: ${completedProduct.category}\n` +
                `👤 Bildiren: ${completedProduct.reportedBy}\n\n` +
                `🗑️ Ürün eksik ürün listesinden kaldırıldı.\n` +
                `📅 Tamamlanma: ${new Date().toLocaleString('tr-TR')}`
            );
            
            // Notify the person who reported the product
            if (Number(completedProduct.reportedByChatId) !== Number(chatId)) {
                await telegramAPI.sendMessage(completedProduct.reportedByChatId,
                    `✅ <b>Bildirdiğiniz Ürün Tamamlandı!</b>\n\n` +
                    `📦 <b>${completedProduct.product}</b>\n` +
                    `🏷️ Kategori: ${completedProduct.category}\n\n` +
                    `🎉 Temin edildi ve eksik ürün listesinden kaldırıldı.\n` +
                    `📅 Tamamlanma: ${new Date().toLocaleString('tr-TR')}`
                );
            }
            
        } catch (error) {
            console.error('❌ Product completion error:', error);
            await telegramAPI.sendMessage(chatId,
                `❌ <b>Ürün Tamamlama Hatası!</b>\n\n${error.message}`
            );
        }
    }
    
    async handleProductDeletion(data, chatId, from, message, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu işlem sadece adminler tarafından yapılabilir.");
            return;
        }
        
        const productId = data.replace('delete_product_', '');
        
        try {
            const deletedProduct = await productManager.deleteProduct(productId, chatId);
            
            await telegramAPI.sendMessage(chatId,
                `🗑️ <b>Ürün Silindi!</b>\n\n` +
                `📦 <b>${deletedProduct.product}</b>\n` +
                `🏷️ Kategori: ${deletedProduct.category}\n` +
                `👤 Bildiren: ${deletedProduct.reportedBy}\n\n` +
                `Ürün listeden kaldırıldı.`
            );
            
        } catch (error) {
            console.error('❌ Product deletion error:', error);
            await telegramAPI.sendMessage(chatId,
                `❌ <b>Ürün Silme Hatası!</b>\n\n${error.message}`
            );
        }
    }
    
    async handleConfirmClearProducts(data, chatId, from, message, user, isAdmin) {
        if (!isAdmin) return;
        
        try {
            const clearedCount = await productManager.clearAllProducts(chatId);
            
            await telegramAPI.sendMessage(chatId,
                `🗑️ <b>Tüm Liste Temizlendi!</b>\n\n` +
                `📊 ${clearedCount} ürün bildirimi silindi.\n` +
                `✅ Eksik ürün listesi baştan başlıyor.\n` +
                `📅 Temizlenme: ${new Date().toLocaleString('tr-TR')}`,
                {
                    keyboard: commandHandler.getKeyboard('admin_panel'),
                    resize_keyboard: true
                }
            );
            
        } catch (error) {
            await telegramAPI.sendMessage(chatId, "❌ Liste temizleme sırasında hata oluştu.");
        }
    }
    
    async handleCancelClearProducts(data, chatId, from, message, user, isAdmin) {
        await telegramAPI.sendMessage(chatId,
            "❌ <b>İşlem İptal Edildi</b>\n\n" +
            "Eksik ürün listesi temizlenmedi.",
            {
                keyboard: commandHandler.getKeyboard('admin_panel'),
                resize_keyboard: true
            }
        );
    }
    
    async handleRefreshProducts(data, chatId, from, message, user, isAdmin) {
        if (!isAdmin) return;
        
        await telegramAPI.sendMessage(chatId, "🔄 Eksik ürün listesi yenileniyor...");
        
        setTimeout(async () => {
            await commandHandler.handleProductList(chatId, '', from, user, isAdmin);
        }, 1000);
    }
    
    async handleClearAllProducts(data, chatId, from, message, user, isAdmin) {
        if (!isAdmin) return;
        
        await commandHandler.handleClearProducts(chatId, user);
    }
    
    async handleAdminAction(data, chatId, from, message, user, isAdmin) {
        if (!isAdmin) return;
        
        await telegramAPI.sendMessage(chatId, "🚧 Admin işlemleri geliştiriliyor...");
    }
    
    async handleUserAction(data, chatId, from, message, user, isAdmin) {
        await telegramAPI.sendMessage(chatId, "🚧 Kullanıcı işlemleri geliştiriliyor...");
    }
}

const callbackQueryHandler = new CallbackQueryHandler();

// 🌐 Webhook Handler
app.post('/webhook', async (req, res) => {
    try {
        // Respond immediately to Telegram
        res.status(200).json({ status: 'ok' });
        
        const { message, callback_query } = req.body;
        
        if (callback_query) {
            // Handle callback query (inline button clicks)
            await callbackQueryHandler.handleCallback(callback_query);
        } else if (message) {
            // Handle regular text messages
            const { chat, from, text } = message;
            
            if (text && from) {
                await commandHandler.handleMessage(chat.id, text, from);
            }
        }
        
    } catch (error) {
        console.error('❌ Webhook Error:', error);
        // Don't send error response, already responded with 200
    }
});

// 📊 API Routes for Dashboard Integration
app.get('/api/employees', (req, res) => {
    dataManager.readFile(DATA_FILES.employees)
        .then(employees => res.json(employees))
        .catch(error => {
            console.error('❌ API Error - employees:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
});

app.get('/api/missing-products', (req, res) => {
    dataManager.readFile(DATA_FILES.missingProducts)
        .then(products => res.json(products))
        .catch(error => {
            console.error('❌ API Error - missing-products:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
});

app.get('/api/activity-log', (req, res) => {
    dataManager.readFile(DATA_FILES.activityLog)
        .then(activities => {
            // Return last 100 activities
            const recentActivities = activities.slice(-100).reverse();
            res.json(recentActivities);
        })
        .catch(error => {
            console.error('❌ API Error - activity-log:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
});

app.get('/api/tasks', (req, res) => {
    dataManager.readFile(DATA_FILES.tasks)
        .then(tasks => res.json(tasks))
        .catch(error => {
            console.error('❌ API Error - tasks:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
});

app.get('/api/pending-users', (req, res) => {
    dataManager.readFile(DATA_FILES.pendingUsers)
        .then(pendingUsers => res.json(pendingUsers))
        .catch(error => {
            console.error('❌ API Error - pending-users:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
});

app.get('/api/categories', (req, res) => {
    dataManager.readFile(DATA_FILES.categories)
        .then(categories => res.json(categories))
        .catch(error => {
            console.error('❌ API Error - categories:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
});

app.get('/api/admin-settings', (req, res) => {
    dataManager.readFile(DATA_FILES.adminSettings)
        .then(settings => {
            // Remove sensitive data
            const publicSettings = {
                approvalRequired: settings.approvalRequired,
                maintenanceMode: settings.maintenanceMode,
                welcomeMessage: settings.welcomeMessage,
                maxTasksPerUser: settings.maxTasksPerUser,
                allowGuestAccess: settings.allowGuestAccess,
                adminCount: settings.adminUsers.length
            };
            res.json(publicSettings);
        })
        .catch(error => {
            console.error('❌ API Error - admin-settings:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
});

app.get('/api/system-stats', (req, res) => {
    dataManager.readFile(DATA_FILES.systemStats)
        .then(stats => res.json(stats))
        .catch(error => {
            console.error('❌ API Error - system-stats:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
});

// 🏠 Health Check Routes
app.get('/', (req, res) => {
    res.json({
        status: 'SivalTeam Professional Bot v' + CONFIG.VERSION + ' Running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: CONFIG.VERSION,
        build: CONFIG.BUILD_DATE,
        environment: CONFIG.ENVIRONMENT,
        features: {
            'Turkish Character Protection': 'ACTIVE',
            'Enterprise Security': 'ENABLED',
            'High Performance Mode': 'ON',
            'Dashboard Integration': 'READY',
            'Desktop Sync': 'ACTIVE',
            'Auto Backup': 'ENABLED',
            'Rate Limiting': 'ACTIVE'
        },
        endpoints: {
            webhook: '/webhook',
            api: {
                employees: '/api/employees',
                products: '/api/missing-products',
                activities: '/api/activity-log',
                tasks: '/api/tasks',
                pending: '/api/pending-users',
                categories: '/api/categories',
                settings: '/api/admin-settings',
                stats: '/api/system-stats'
            }
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: CONFIG.VERSION
    });
});

// 🚫 404 Handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist',
        availableEndpoints: [
            '/',
            '/health',
            '/webhook',
            '/api/employees',
            '/api/missing-products',
            '/api/activity-log',
            '/api/tasks',
            '/api/pending-users',
            '/api/categories',
            '/api/admin-settings',
            '/api/system-stats'
        ]
    });
});

// 🚀 Server Initialization
async function initializeServer() {
    try {
        // Set webhook
        console.log('🔗 Setting up Telegram webhook...');
        
        const webhookResponse = await axios.post(
            `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/setWebhook`,
            {
                url: CONFIG.WEBHOOK_URL,
                max_connections: CONFIG.MAX_CONCURRENT_REQUESTS,
                allowed_updates: ['message', 'callback_query']
            }
        );
        
        if (webhookResponse.data.ok) {
            console.log('✅ Webhook set successfully');
        } else {
            console.error('❌ Failed to set webhook:', webhookResponse.data);
        }
        
        // Start server
        app.listen(CONFIG.PORT, () => {
            console.log(`
🚀 SivalTeam Professional Bot v${CONFIG.VERSION} is LIVE!
===============================================
🌐 Server URL: ${CONFIG.WEBHOOK_URL}
🔌 Port: ${CONFIG.PORT}
🔧 Environment: ${CONFIG.ENVIRONMENT}
📅 Started: ${new Date().toLocaleString('tr-TR')}

🔗 Webhook URL: ${CONFIG.WEBHOOK_URL}/webhook
📊 Dashboard API: ${CONFIG.WEBHOOK_URL}/api/*
💾 Health Check: ${CONFIG.WEBHOOK_URL}/health

🎯 All systems operational and ready for production!
===============================================
`);
        });
        
    } catch (error) {
        console.error('❌ Server initialization failed:', error);
        process.exit(1);
    }
}

// 🛡️ Error Handlers
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    // Don't exit in production, log and continue
    if (CONFIG.ENVIRONMENT !== 'production') {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit in production, log and continue
    if (CONFIG.ENVIRONMENT !== 'production') {
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    
    // Create final backup
    try {
        await dataManager.createBackup();
        console.log('💾 Final backup created successfully');
    } catch (error) {
        console.error('❌ Final backup failed:', error);
    }
    
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    
    // Create final backup
    try {
        await dataManager.createBackup();
        console.log('💾 Final backup created successfully');
    } catch (error) {
        console.error('❌ Final backup failed:', error);
    }
    
    process.exit(0);
});

// 🏁 Initialize and start the server
initializeServer();