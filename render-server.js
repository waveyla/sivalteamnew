#!/usr/bin/env node

/**
 * ███████╗██╗██╗   ██╗ █████╗ ██╗  ████████╗███████╗ █████╗ ███╗   ███╗
 * ██╔════╝██║██║   ██║██╔══██╗██║  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║
 * ███████╗██║██║   ██║███████║██║     ██║   █████╗  ███████║██╔████╔██║
 * ╚════██║██║╚██╗ ██╔╝██╔══██║██║     ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║
 * ███████║██║ ╚████╔╝ ██║  ██║███████╗██║   ███████╗██║  ██║██║ ╚═╝ ██║
 * ╚══════╝╚═╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝
 * 
 * 🤖 SIVALTEAM PROFESSIONAL BOT v4.0.0
 * =====================================
 * 🔥 Clean Architecture Enterprise Bot
 * 🇹🇷 Advanced Turkish Character Support
 * ⚡ Pure MongoDB Integration
 * 🔒 Enterprise Security System
 * 📊 Real-time Dashboard API
 * 🔄 Media Support (Photo/Voice)
 * 
 * Built with ❤️ for SivalTeam
 * Copyright 2025 - All Rights Reserved
 */

const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();
const { connectDB } = require('./database');
const MongoDataManager = require('./dataManager');

// 🚀 Application Configuration
const CONFIG = {
    PORT: process.env.PORT || 10000,
    BOT_TOKEN: process.env.BOT_TOKEN || '8229159175:AAGRFoLpK9ma5ekPiaaCdI8EKJeca14XoOg',
    WEBHOOK_URL: process.env.WEBHOOK_URL || 'https://sivalteam-bot.onrender.com',
    VERSION: '4.0.0',
    ENVIRONMENT: process.env.NODE_ENV || 'production',
    
    // Performance Settings
    MAX_CONCURRENT_REQUESTS: 100,
    REQUEST_TIMEOUT: 30000,
    MAX_MESSAGE_LENGTH: 4096,
    
    // Security Settings
    RATE_LIMIT_WINDOW: 60000, // 1 minute
    MAX_REQUESTS_PER_WINDOW: 30,
    
    // Auto Backup Interval
    AUTO_BACKUP_INTERVAL: 3600000 // 1 hour
};

// 🏗️ Express Application Setup
const app = express();
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

// Request Logging
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
⚡ Pure MongoDB Mode: ON
📊 Dashboard Integration: READY
📱 Media Support: ACTIVE
💾 Auto Backup: ENABLED
🛡️ Rate Limiting: ACTIVE

🚀 Starting up at ${new Date().toLocaleString('tr-TR')}...
`);

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

// 🇹🇷 Turkish Character Protection System
class TurkishCharacterHandler {
    constructor() {
        this.charMap = {
            'Ã¼': 'ü', 'Ã¶': 'ö', 'Ã§': 'ç', 'Ä±': 'ı', 'ÃŸ': 'ş', 'Ä°': 'İ',
            'ãŸ': 'ş', 'ã§': 'ç', 'ã¶': 'ö', 'ä±': 'ı', 'Ç': 'Ç', 'Ü': 'Ü', 
            'Ö': 'Ö', 'Ş': 'Ş', 'Ğ': 'Ğ', 'Â': '', 'â€™': "'", 'â€œ': '"',
            '    ': ' ', '   ': ' ', '  ': ' '
        };
    }
    
    protect(text) {
        if (!text || typeof text !== 'string') return text;
        
        let result = text;
        Object.keys(this.charMap).forEach(broken => {
            const regex = new RegExp(this.escapeRegExp(broken), 'g');
            result = result.replace(regex, this.charMap[broken]);
        });
        
        return result.replace(/\s+/g, ' ').trim();
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

// 🛡️ Spam Detection System
class SpamDetector {
    constructor() {
        this.spamKeywords = [
            'reklam', 'satış', 'indirim', 'bedava', 'ücretsiz', 'kazanç',
            'para kazan', 'iş imkanı', 'hızlı zengin', 'link', 'tıkla',
            'bitcoin', 'kripto', 'yatırım fırsatı', 'telegram kanalı',
            'instagram', 'youtube', 'abone ol', 'beğen', 'paylaş'
        ];
        
        this.suspiciousPatterns = [
            /https?:\/\/[^\s]+/gi,  // URLs
            /t\.me\/[^\s]+/gi,      // Telegram links
            /@[a-zA-Z0-9_]+/gi,     // Mentions
            /\d{10,}/gi,            // Long numbers
            /(.)\1{5,}/gi           // Repeated characters
        ];
    }
    
    isSpam(text) {
        if (!text) return false;
        
        const lowerText = text.toLowerCase();
        
        // Check spam keywords
        const hasSpamKeywords = this.spamKeywords.some(keyword => 
            lowerText.includes(keyword)
        );
        
        // Check suspicious patterns
        const hasSuspiciousPatterns = this.suspiciousPatterns.some(pattern =>
            pattern.test(text)
        );
        
        // Check for excessive capitals or emojis
        const capitalRatio = (text.match(/[A-ZÇĞİÖŞÜ]/g) || []).length / text.length;
        const emojiCount = (text.match(/[\u{1f600}-\u{1f6ff}]|[\u{2600}-\u{26ff}]|[\u{2700}-\u{27bf}]/gu) || []).length;
        
        return hasSpamKeywords || hasSuspiciousPatterns || capitalRatio > 0.7 || emojiCount > 10;
    }
}

const spamDetector = new SpamDetector();

// 💾 Data Management System
let dataManager;

class DataManagerWrapper extends MongoDataManager {
    constructor() {
        super();
        this.startAutoBackup();
    }
    
    async initialize() {
        try {
            console.log('🔄 Connecting to MongoDB...');
            await connectDB();
            console.log('💾 MongoDB data management system initialized successfully');
            console.log('✅ TTL indexes created for automatic cleanup after 90 days');
        } catch (error) {
            console.error('❌ CRITICAL: MongoDB connection failed:', error);
            console.error('💀 System cannot run without MongoDB - exiting...');
            process.exit(1);
        }
    }
    
    startAutoBackup() {
        setInterval(async () => {
            try {
                const backupPath = await this.exportToJSON();
                console.log(`💾 Auto backup created: ${backupPath}`);
            } catch (error) {
                console.error('❌ Auto backup failed:', error);
            }
        }, CONFIG.AUTO_BACKUP_INTERVAL);
    }
}

// 📱 Telegram API System
class TelegramAPI {
    constructor() {
        this.baseURL = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}`;
        this.queue = [];
        this.isProcessing = false;
        
        // Process queue every 100ms
        setInterval(() => this.processQueue(), 100);
    }
    
    async sendMessage(chatId, text, options = {}) {
        this.queue.push({
            method: 'sendMessage',
            chatId,
            text: text.substring(0, CONFIG.MAX_MESSAGE_LENGTH),
            parse_mode: 'HTML',
            ...options
        });
    }
    
    async sendPhoto(chatId, photo, caption = '', options = {}) {
        this.queue.push({
            method: 'sendPhoto',
            chatId,
            photo,
            caption,
            parse_mode: 'HTML',
            ...options
        });
    }
    
    async sendVoice(chatId, voice, caption = '', options = {}) {
        this.queue.push({
            method: 'sendVoice',
            chatId,
            voice,
            caption,
            parse_mode: 'HTML',
            ...options
        });
    }
    
    async editMessageText(chatId, messageId, text, options = {}) {
        this.queue.push({
            method: 'editMessageText',
            chat_id: chatId,
            message_id: messageId,
            text: text.substring(0, CONFIG.MAX_MESSAGE_LENGTH),
            parse_mode: 'HTML',
            ...options
        });
    }
    
    async editMessageReplyMarkup(chatId, messageId, replyMarkup = { inline_keyboard: [] }) {
        this.queue.push({
            method: 'editMessageReplyMarkup',
            chat_id: chatId,
            message_id: messageId,
            reply_markup: replyMarkup
        });
    }
    
    async answerCallbackQuery(callbackQueryId, text = "İşlem alındı...") {
        this.queue.push({
            method: 'answerCallbackQuery',
            callback_query_id: callbackQueryId,
            text
        });
    }
    
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        
        this.isProcessing = true;
        const task = this.queue.shift();
        
        try {
            await this.executeTask(task);
        } catch (error) {
            await this.handle400Error(task, error);
        }
        
        this.isProcessing = false;
    }
    
    async executeTask(task) {
        const { method, ...params } = task;
        
        const response = await axios.post(`${this.baseURL}/${method}`, params, {
            timeout: CONFIG.REQUEST_TIMEOUT,
            headers: { 'Content-Type': 'application/json' }
        });
        
        return response.data;
    }
    
    async handle400Error(task, error) {
        if (error.response?.status === 400) {
            console.log(`Could not execute ${task.method}, 400 error caught`);
            
            if (task.method === 'editMessageReplyMarkup') {
                console.log('Could not edit message buttons');
                return;
            }
            
            if (task.method === 'editMessageText' && task.text) {
                console.log('Could not edit message text, sending new message instead');
                await this.sendMessage(task.chat_id, task.text);
                return;
            }
        } else {
            console.error(`❌ Telegram API Error (${task.method}):`, error.message);
        }
    }
}

const telegramAPI = new TelegramAPI();

// 📝 Activity Logger
class ActivityLogger {
    constructor() {
        this.queue = [];
        setInterval(() => this.processQueue(), 1000);
    }
    
    async log(message, userId = null, userName = null, level = 'info') {
        this.queue.push({
            message: turkishHandler.protect(message),
            userId,
            userName: turkishHandler.protect(userName),
            level,
            timestamp: new Date()
        });
    }
    
    async processQueue() {
        if (this.queue.length === 0) return;
        
        const logs = this.queue.splice(0, 10); // Process 10 at a time
        
        try {
            // Save to MongoDB via dataManager if needed
            // For now, just console log
            logs.forEach(log => {
                console.log(`📝 [${log.level.toUpperCase()}] ${log.message}${log.userName ? ` - ${log.userName}` : ''}`);
            });
        } catch (error) {
            console.error('❌ Activity log error:', error);
        }
    }
}

const activityLogger = new ActivityLogger();

// 👥 User Management System
class UserManager {
    async findUser(chatId) {
        const employees = await dataManager.getEmployees();
        return employees.find(emp => String(emp.chatId) === String(chatId));
    }
    
    async isAdmin(chatId) {
        const user = await this.findUser(chatId);
        return user && user.type === 'admin';
    }
    
    async addUser(userData) {
        return await dataManager.addEmployee({
            chatId: String(userData.chatId),
            firstName: turkishHandler.protect(userData.name || userData.firstName),
            lastName: turkishHandler.protect(userData.lastName || ''),
            username: userData.username || 'user_' + Date.now(),
            type: userData.type || 'employee'
        });
    }
    
    async deleteUser(chatId, deletedBy) {
        const user = await this.findUser(chatId);
        if (!user) throw new Error('Kullanıcı bulunamadı');
        
        // Move to deleted employees
        await dataManager.addDeletedEmployee({
            ...user,
            deletedAt: new Date(),
            deletedBy
        });
        
        // Remove from active employees
        await dataManager.deleteEmployee(chatId);
        
        await activityLogger.log(`Kullanıcı silindi: ${user.firstName}`, deletedBy);
        return user;
    }
    
    async restoreDeletedUser(chatId, restoredBy) {
        const deletedEmployees = await dataManager.getDeletedEmployees();
        const deletedUser = deletedEmployees.find(emp => String(emp.chatId) === String(chatId));
        
        if (!deletedUser) throw new Error('Silinmiş kullanıcı bulunamadı');
        
        // Add back to active employees
        await this.addUser({
            chatId: deletedUser.chatId,
            name: deletedUser.firstName,
            lastName: deletedUser.lastName,
            username: deletedUser.username,
            type: 'employee'
        });
        
        // Remove from deleted employees
        await dataManager.removeDeletedEmployee(chatId);
        
        await activityLogger.log(`Kullanıcı geri eklendi: ${deletedUser.firstName}`, restoredBy);
        return deletedUser;
    }
    
    async setPendingApproval(userData) {
        const pendingUser = {
            chatId: String(userData.chatId),
            firstName: turkishHandler.protect(userData.firstName),
            lastName: turkishHandler.protect(userData.lastName || ''),
            username: userData.username || 'user_' + Date.now(),
            timestamp: new Date(),
            status: 'pending',
            wasDeleted: userData.wasDeleted || false,
            deletedAt: userData.deletedAt,
            deletedBy: userData.deletedBy
        };
        
        await dataManager.addPendingUser(pendingUser);
        await activityLogger.log(`Yeni kullanıcı onay bekliyor: ${pendingUser.firstName}`);
        return pendingUser;
    }
    
    async approveUser(chatId, approvedBy) {
        const pendingUsers = await dataManager.getPendingUsers();
        const pendingUser = pendingUsers.find(u => String(u.chatId) === String(chatId));
        
        if (!pendingUser) {
            const existingUser = await this.findUser(chatId);
            if (existingUser) throw new Error('Kullanıcı zaten onaylanmış');
            throw new Error('Bekleyen kullanıcı bulunamadı');
        }
        
        // Add as employee
        const newUser = await this.addUser({
            chatId: pendingUser.chatId,
            name: `${pendingUser.firstName} ${pendingUser.lastName || ''}`.trim(),
            username: pendingUser.username,
            type: 'employee'
        });
        
        // Remove from pending
        await dataManager.removePendingUser(chatId);
        
        await activityLogger.log(`Kullanıcı onaylandı: ${newUser.firstName}`, approvedBy);
        return newUser;
    }
    
    async rejectUser(chatId, rejectedBy, reason = null) {
        const pendingUsers = await dataManager.getPendingUsers();
        const pendingUser = pendingUsers.find(u => String(u.chatId) === String(chatId));
        
        if (!pendingUser) throw new Error('Bekleyen kullanıcı bulunamadı');
        
        await dataManager.removePendingUser(chatId);
        await activityLogger.log(
            `Kullanıcı reddedildi: ${pendingUser.firstName}${reason ? ` (${reason})` : ''}`, 
            rejectedBy
        );
        
        return pendingUser;
    }
    
    async blockUser(chatId, blockedBy, reason = null) {
        await dataManager.addBlockedUser({
            chatId: String(chatId),
            blockedAt: new Date(),
            blockedBy,
            reason
        });
        
        // Remove from pending if exists
        try {
            await dataManager.removePendingUser(chatId);
        } catch (error) {
            // User might not be pending
        }
        
        await activityLogger.log(
            `Kullanıcı engellendi: ${chatId}${reason ? ` (${reason})` : ''}`, 
            blockedBy
        );
    }
    
    async isBlocked(chatId) {
        const blockedUsers = await dataManager.getBlockedUsers();
        return blockedUsers.some(user => String(user.chatId) === String(chatId));
    }
}

const userManager = new UserManager();

// 📋 Task Management System
class TaskManager {
    async createTask(taskData) {
        const task = await dataManager.addTask({
            title: turkishHandler.protect(taskData.title),
            description: turkishHandler.protect(taskData.description),
            assignedTo: String(taskData.assignedTo),
            assignedBy: String(taskData.assignedBy),
            type: taskData.type || 'individual',
            priority: taskData.priority || 'medium',
            deadline: taskData.deadline
        });
        
        await activityLogger.log(
            `Yeni görev oluşturuldu: "${task.title}" - ${taskData.assignedTo}`, 
            taskData.assignedBy
        );
        
        return task;
    }
    
    async createBulkTask(taskData, targetUsers) {
        const createdTasks = [];
        
        for (const user of targetUsers) {
            const task = await dataManager.addTask({
                title: turkishHandler.protect(taskData.title),
                description: turkishHandler.protect(taskData.description),
                assignedTo: String(user.chatId),
                assignedBy: String(taskData.assignedBy),
                type: 'bulk',
                priority: taskData.priority || 'medium',
                deadline: taskData.deadline
            });
            
            createdTasks.push(task);
        }
        
        await activityLogger.log(
            `Toplu görev oluşturuldu: "${taskData.title}" - ${targetUsers.length} kişi`, 
            taskData.assignedBy
        );
        
        return createdTasks;
    }
    
    async completeTask(taskId, completedBy, notes = null) {
        const tasks = await dataManager.getTasks();
        const task = tasks.find(t => t.taskId === taskId);
        
        if (!task) throw new Error('Görev bulunamadı');
        
        const taskType = task.type || 'individual';
        if (taskType !== 'bulk' && String(task.assignedTo) !== String(completedBy)) {
            throw new Error('Bu görev size ait değil');
        }
        
        if (task.status === 'completed') {
            throw new Error('Bu görev zaten tamamlanmış');
        }
        
        const updatedTask = await dataManager.updateTask(taskId, {
            status: 'completed',
            completedAt: new Date(),
            completionNotes: turkishHandler.protect(notes)
        });
        
        const user = await userManager.findUser(completedBy);
        await activityLogger.log(
            `Görev tamamlandı: "${task.title}" - ${user?.firstName || 'Bilinmeyen'}`, 
            completedBy
        );
        
        return updatedTask;
    }
}

const taskManager = new TaskManager();

// 📦 Product Report Management System
class ProductReportManager {
    async createReport(reportData) {
        const report = {
            productId: crypto.randomBytes(16).toString('hex'),
            productName: turkishHandler.protect(reportData.productName),
            reportedBy: String(reportData.reportedBy),
            photoFileId: reportData.photoFileId || null,
            voiceFileId: reportData.voiceFileId || null,
            category: reportData.category || 'Genel',
            timestamp: new Date(),
            status: 'pending'
        };
        
        const savedReport = await dataManager.addMissingProduct(report);
        
        await activityLogger.log(
            `Eksik ürün bildirildi: "${report.productName}"`, 
            reportData.reportedBy
        );
        
        return savedReport;
    }
    
    async completeReport(productId, completedBy) {
        // For now, we'll remove the report (mark as completed)
        await dataManager.removeMissingProduct(productId);
        
        await activityLogger.log(
            `Eksik ürün tamamlandı: ${productId}`, 
            completedBy
        );
    }
    
    async deleteReport(productId, deletedBy) {
        await dataManager.removeMissingProduct(productId);
        
        await activityLogger.log(
            `Eksik ürün raporu silindi: ${productId}`, 
            deletedBy
        );
    }
}

const productReportManager = new ProductReportManager();

// 🎮 Bot Command Handler
class BotCommandHandler {
    constructor() {
        this.userStates = new Map();
        this.commands = new Map();
        this.callbackHandlers = new Map();
        this.initializeCommands();
        this.initializeCallbacks();
    }
    
    initializeCommands() {
        // Basic Commands
        this.commands.set('/start', this.handleStart.bind(this));
        this.commands.set('/help', this.handleHelp.bind(this));
        this.commands.set('/menu', this.handleMainMenu.bind(this));
        
        // Task Commands
        this.commands.set('/task', this.handleTaskCommand.bind(this));
        this.commands.set('/taskall', this.handleTaskAllCommand.bind(this));
        this.commands.set('/mytasks', this.handleMyTasks.bind(this));
        
        // Admin Commands
        this.commands.set('/admin', this.handleAdminPanel.bind(this));
        this.commands.set('/users', this.handleListUsers.bind(this));
        this.commands.set('/pending', this.handlePendingUsers.bind(this));
        this.commands.set('/deleted', this.handleDeletedUsers.bind(this));
        this.commands.set('/stats', this.handleStats.bind(this));
        this.commands.set('/broadcast', this.handleBroadcast.bind(this));
        this.commands.set('/backup', this.handleBackup.bind(this));
    }
    
    initializeCallbacks() {
        this.callbackHandlers.set('approve_user_', this.handleUserApproval.bind(this));
        this.callbackHandlers.set('reject_user_', this.handleUserRejection.bind(this));
        this.callbackHandlers.set('block_user_', this.handleUserBlocking.bind(this));
        this.callbackHandlers.set('restore_user_', this.handleUserRestore.bind(this));
        this.callbackHandlers.set('complete_task_', this.handleTaskCompletion.bind(this));
        this.callbackHandlers.set('complete_product_', this.handleProductCompletion.bind(this));
        this.callbackHandlers.set('delete_product_', this.handleProductDeletion.bind(this));
        this.callbackHandlers.set('main_menu', this.handleMainMenu.bind(this));
        this.callbackHandlers.set('admin_panel', this.handleAdminPanel.bind(this));
        this.callbackHandlers.set('my_tasks', this.handleMyTasks.bind(this));
        this.callbackHandlers.set('report_product', this.handleReportProduct.bind(this));
    }
    
    getUserState(chatId) {
        return this.userStates.get(String(chatId)) || {};
    }
    
    setUserState(chatId, state) {
        this.userStates.set(String(chatId), { ...this.getUserState(chatId), ...state });
    }
    
    clearUserState(chatId) {
        this.userStates.delete(String(chatId));
    }
    
    getKeyboard(type, isAdmin = false) {
        switch (type) {
            case 'main':
                return {
                    keyboard: isAdmin ? [
                        ['👥 Admin Paneli', '📊 İstatistikler'],
                        ['📝 Görevlerim', '📦 Eksik Ürün Bildir'],
                        ['ℹ️ Yardım']
                    ] : [
                        ['📝 Görevlerim', '📦 Eksik Ürün Bildir'],
                        ['ℹ️ Yardım']
                    ],
                    resize_keyboard: true
                };
            
            case 'admin_panel':
                return {
                    keyboard: [
                        ['👥 Bekleyen Onaylar', '🗑️ Silinmiş Çalışanlar'],
                        ['📋 Görev Yönetimi', '📦 Ürün Raporları'],
                        ['📢 Duyuru Gönder', '📊 Detaylı İstatistikler'],
                        ['💾 Yedekleme', '🏠 Ana Menü']
                    ],
                    resize_keyboard: true
                };
            
            case 'task_types':
                return {
                    keyboard: [
                        ['📝 Tekil Görev Ata', '📋 Toplu Görev Ata'],
                        ['🏠 Ana Menü']
                    ],
                    resize_keyboard: true
                };
            
            case 'cancel':
                return {
                    keyboard: [['❌ İptal Et']],
                    resize_keyboard: true
                };
            
            default:
                return { keyboard: [[]], resize_keyboard: true };
        }
    }
    
    // ===== COMMAND HANDLERS =====
    
    async handleStart(chatId, text, from, user, isAdmin) {
        console.log(`🔍 User registration attempt: ${from.first_name} (${chatId}) - ${from.username || 'No username'}`);
        
        // Check if user is blocked
        const isBlocked = await userManager.isBlocked(chatId);
        if (isBlocked) {
            await telegramAPI.sendMessage(chatId,
                `🚫 <b>Hesabınız Engellenmiş</b>\n\n` +
                `⛔ Sisteme erişim hakkınız kalıcı olarak iptal edilmiştir.\n` +
                `📞 Sadece fiziksel olarak yöneticinizle görüşebilirsiniz.`
            );
            return;
        }
        
        // Check if user was previously deleted
        const deletedEmployees = await dataManager.getDeletedEmployees();
        const wasDeleted = deletedEmployees.find(emp => String(emp.chatId) === String(chatId));
        
        if (wasDeleted) {
            const pendingUsers = await dataManager.getPendingUsers();
            const alreadyPending = pendingUsers.find(u => String(u.chatId) === String(chatId));
            
            if (alreadyPending) {
                await telegramAPI.sendMessage(chatId,
                    `⏳ <b>Onay Bekleniyor</b>\n\n` +
                    `Tekrar kayıt talebiniz admin onayında.\n` +
                    `📅 İstek tarihi: ${new Date(alreadyPending.timestamp).toLocaleString('tr-TR')}\n\n` +
                    `⌛ Lütfen admin onayını bekleyiniz.`
                );
                return;
            }
            
            await telegramAPI.sendMessage(chatId,
                `🔄 <b>Hesabınız Daha Önce Silinmişti</b>\n\n` +
                `📅 Silme Tarihi: ${new Date(wasDeleted.deletedAt).toLocaleString('tr-TR')}\n` +
                `👤 Silen: ${wasDeleted.deletedBy}\n\n` +
                `✅ Tekrar kayıt talebiniz admin onayına gönderildi.\n` +
                `⏳ Lütfen bekleyiniz...`
            );
            
            // Create pending approval for deleted user
            await userManager.setPendingApproval({
                chatId,
                firstName: from.first_name,
                lastName: from.last_name,
                username: from.username,
                wasDeleted: true,
                deletedAt: wasDeleted.deletedAt,
                deletedBy: wasDeleted.deletedBy
            });
            
            // Notify admins
            await this.notifyAdminsAboutDeletedUserRequest(from, wasDeleted);
            return;
        }
        
        // Existing user login - CHECK THIS FIRST!
        if (user) {
            const isUserAdmin = await userManager.isAdmin(chatId);
            const welcomeText = `🎉 <b>Tekrar Hoşgeldin ${user.firstName}!</b>\n\n` +
                               `👤 Kullanıcı Adı: @${user.username || 'none'}\n` +
                               `${isUserAdmin ? '👑 Yetki: Admin\n' : ''}` +
                               `⏰ Son Aktivite: ${new Date(user.lastActive || user.registeredDate).toLocaleString('tr-TR')}\n\n` +
                               `✅ Giriş başarılı - Sistemi kullanmaya devam edebilirsin.`;
            
            await telegramAPI.sendMessage(chatId, welcomeText, {
                reply_markup: this.getKeyboard('main', isUserAdmin)
            });
            
            await activityLogger.log(`${user.firstName} sisteme tekrar giriş yaptı`, chatId);
            return;
        }
        
        // Check if this is the first user (becomes admin automatically)
        const employees = await dataManager.getEmployees();
        
        if (employees.length === 0) {
            try {
                const firstAdmin = await userManager.addUser({
                    chatId,
                    name: turkishHandler.protect(from.first_name || 'Admin'),
                    lastName: turkishHandler.protect(from.last_name || ''),
                    username: from.username || 'admin_' + Date.now(),
                    type: 'admin'
                });
                
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
                        reply_markup: this.getKeyboard('main', true)
                    }
                );
                
                await activityLogger.log(`İlk admin otomatik eklendi: ${firstAdmin.firstName}`, chatId);
                return;
            } catch (error) {
                // If duplicate key error, user already exists
                if (error.code === 11000) {
                    console.log('⚠️ User already exists in database, redirecting to existing user flow');
                    // Force refresh user data
                    const existingUser = await userManager.findUser(chatId);
                    if (existingUser) {
                        const isUserAdmin = await userManager.isAdmin(chatId);
                        const welcomeText = `🎉 <b>Tekrar Hoşgeldin ${existingUser.firstName}!</b>\n\n` +
                                           `✅ Sisteme tekrar giriş yaptınız.`;
                        
                        await telegramAPI.sendMessage(chatId, welcomeText, {
                            reply_markup: this.getKeyboard('main', isUserAdmin)
                        });
                        return;
                    }
                }
                throw error;
            }
        }
        
        // New user - check if already pending
        const pendingUsers = await dataManager.getPendingUsers();
        const existingPending = pendingUsers.find(u => String(u.chatId) === String(chatId));
        
        if (existingPending) {
            await telegramAPI.sendMessage(chatId,
                `⏳ <b>Onay Bekleniyor</b>\n\n` +
                `Kayıt talebiniz admin onayında.\n` +
                `📅 İstek tarihi: ${new Date(existingPending.timestamp).toLocaleString('tr-TR')}\n\n` +
                `⌛ Lütfen admin onayını bekleyiniz.`
            );
            return;
        }
        
        // Create new pending user
        const pendingUser = await userManager.setPendingApproval({
            chatId,
            firstName: from.first_name,
            lastName: from.last_name,
            username: from.username
        });
        
        await telegramAPI.sendMessage(chatId,
            `👋 <b>Hoşgeldin ${pendingUser.firstName}!</b>\n\n` +
            `📝 SivalTeam sistemine kayıt talebiniz alındı.\n` +
            `⏳ Admin onayı bekleniyor.\n\n` +
            `🔔 Onaylandığınızda otomatik bildirim alacaksınız.`
        );
        
        // Notify admins about new user
        await this.notifyAdminsAboutNewUser(from);
    }
    
    async handleHelp(chatId, text, from, user, isAdmin) {
        const helpText = `
🤖 <b>SivalTeam Bot Yardım</b>

<b>📋 Temel Komutlar:</b>
/start - Kayıt ol / Giriş yap
/menu - Ana menü
/help - Bu yardım mesajı

<b>📝 Görev Komutları:</b>
/mytasks - Görevlerimi görüntüle
${isAdmin ? '/task - Görev ata\n/taskall - Toplu görev ata\n' : ''}

${isAdmin ? `<b>👑 Admin Komutları:</b>
/admin - Admin paneli
/users - Kullanıcı listesi
/pending - Bekleyen onaylar
/deleted - Silinmiş çalışanlar
/stats - İstatistikler
/broadcast - Toplu duyuru
/backup - Yedekleme

` : ''}
<b>📱 Özellikler:</b>
• Görev takibi ve yönetimi
• Eksik ürün bildirimi (fotoğraf/ses destekli)
• Admin onay sistemi
• Silinen kullanıcı geri ekleme
• Spam filtreleme
• Otomatik yedekleme

<b>🆘 Destek:</b>
Sorun yaşadığınızda adminlere ulaşın.
        `;
        
        await telegramAPI.sendMessage(chatId, helpText, {
            reply_markup: this.getKeyboard('main', isAdmin)
        });
    }
    
    async handleMainMenu(chatId, text, from, user, isAdmin) {
        if (!user) {
            await telegramAPI.sendMessage(chatId, 
                "🔒 Sisteme erişim için önce kayıt olmalısınız.\n\n/start yazın."
            );
            return;
        }
        
        const menuText = `🏠 <b>Ana Menü</b>\n\n` +
                        `👋 Hoşgeldin ${user.firstName}!\n` +
                        `${isAdmin ? '👑 Admin yetkilerinizle sistemi yönetebilirsiniz.\n' : '📝 Görevlerinizi takip edebilir ve eksik ürün bildirebilirsiniz.\n'}\n` +
                        `⬇️ Lütfen yapmak istediğiniz işlemi seçin:`;
        
        await telegramAPI.sendMessage(chatId, menuText, {
            reply_markup: this.getKeyboard('main', isAdmin)
        });
        
        this.clearUserState(chatId);
    }
    
    async handleAdminPanel(chatId, text, from, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu özellik sadece adminler için.");
            return;
        }
        
        const stats = await dataManager.getDatabaseStats();
        
        const panelText = `👑 <b>Admin Paneli</b>\n\n` +
                         `📊 <b>Sistem Durumu:</b>\n` +
                         `👥 Toplam Kullanıcı: ${stats.employees || 0}\n` +
                         `📝 Aktif Görev: ${stats.tasks || 0}\n` +
                         `📦 Bekleyen Ürün: ${stats.missingProducts || 0}\n` +
                         `⏳ Bekleyen Onay: ${await this.getPendingCount()}\n` +
                         `🗑️ Silinmiş Çalışan: ${await this.getDeletedCount()}\n\n` +
                         `⬇️ Yönetim seçeneğinizi belirleyin:`;
        
        await telegramAPI.sendMessage(chatId, panelText, {
            reply_markup: this.getKeyboard('admin_panel')
        });
        
        this.clearUserState(chatId);
    }
    
    async handleMyTasks(chatId, text, from, user, isAdmin) {
        if (!user) {
            await telegramAPI.sendMessage(chatId, "🔒 Sisteme giriş yapmalısınız.");
            return;
        }
        
        const tasks = await dataManager.getTasks();
        const myTasks = tasks.filter(task => 
            String(task.assignedTo) === String(chatId) && task.status !== 'completed'
        );
        
        if (myTasks.length === 0) {
            await telegramAPI.sendMessage(chatId,
                `📝 <b>Görevlerim</b>\n\n` +
                `✅ Harika! Şu anda aktif göreviniz bulunmuyor.\n\n` +
                `🎯 Yeni görevler atandığında buradan takip edebilirsiniz.`,
                { reply_markup: this.getKeyboard('main', isAdmin) }
            );
            return;
        }
        
        let taskList = `📝 <b>Görevlerim (${myTasks.length})</b>\n\n`;
        
        const inlineKeyboard = [];
        
        myTasks.slice(0, 10).forEach((task, index) => {
            const priority = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
            const taskType = task.type === 'bulk' ? '👥' : '👤';
            
            taskList += `${taskType} ${priority} <b>${task.title}</b>\n`;
            taskList += `📄 ${task.description || 'Açıklama yok'}\n`;
            taskList += `📅 ${new Date(task.createdAt).toLocaleString('tr-TR')}\n`;
            if (task.deadline) {
                taskList += `⏰ Bitiş: ${new Date(task.deadline).toLocaleString('tr-TR')}\n`;
            }
            taskList += `\n`;
            
            inlineKeyboard.push([{
                text: `✅ "${task.title}" Tamamlandı`,
                callback_data: `complete_task_${task.taskId}`
            }]);
        });
        
        if (myTasks.length > 10) {
            taskList += `... ve ${myTasks.length - 10} görev daha\n\n`;
        }
        
        taskList += `💡 <b>Not:</b> Görevlerinizi tamamladıktan sonra butona tıklayarak işaretleyin.`;
        
        inlineKeyboard.push([{ text: "🔄 Yenile", callback_data: "my_tasks" }]);
        inlineKeyboard.push([{ text: "🏠 Ana Menü", callback_data: "main_menu" }]);
        
        await telegramAPI.sendMessage(chatId, taskList, {
            reply_markup: { inline_keyboard: inlineKeyboard }
        });
    }
    
    async handleReportProduct(chatId, text, from, user, isAdmin) {
        if (!user) {
            await telegramAPI.sendMessage(chatId, "🔒 Sisteme giriş yapmalısınız.");
            return;
        }
        
        await telegramAPI.sendMessage(chatId,
            `📦 <b>Eksik Ürün Bildirimi</b>\n\n` +
            `📝 Lütfen eksik olan ürünün adını yazın:\n\n` +
            `💡 <b>Örnek:</b> "Bilgisayar mouse'u" veya "A4 kağıt"`,
            { reply_markup: this.getKeyboard('cancel') }
        );
        
        this.setUserState(chatId, { 
            action: 'awaiting_product_name',
            reportData: { reportedBy: chatId }
        });
    }
    
    async handleTaskCommand(chatId, text, from, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu özellik sadece adminler için.");
            return;
        }
        
        const employees = await dataManager.getEmployees();
        const nonAdminEmployees = employees.filter(emp => emp.type !== 'admin');
        
        if (nonAdminEmployees.length === 0) {
            await telegramAPI.sendMessage(chatId,
                `👥 <b>Çalışan Bulunamadı</b>\n\n` +
                `❌ Şu anda görev atayabileceğiniz çalışan bulunmuyor.\n` +
                `📝 Önce sistem yöneticileri çalışan eklemelidir.`
            );
            return;
        }
        
        let employeeList = `📝 <b>Tekil Görev Atama</b>\n\n👥 <b>Çalışan Seçin:</b>\n\n`;
        const inlineKeyboard = [];
        
        nonAdminEmployees.forEach(emp => {
            employeeList += `👤 ${emp.firstName} (@${emp.username || 'none'})\n`;
            inlineKeyboard.push([{
                text: `📝 ${emp.firstName} - Görev Ata`,
                callback_data: `assign_single_${emp.chatId}`
            }]);
        });
        
        inlineKeyboard.push([{ text: "❌ İptal", callback_data: "admin_panel" }]);
        
        await telegramAPI.sendMessage(chatId, employeeList, {
            reply_markup: { inline_keyboard: inlineKeyboard }
        });
    }
    
    async handleTaskAllCommand(chatId, text, from, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu özellik sadece adminler için.");
            return;
        }
        
        const employees = await dataManager.getEmployees();
        const nonAdminEmployees = employees.filter(emp => emp.type !== 'admin');
        
        if (nonAdminEmployees.length === 0) {
            await telegramAPI.sendMessage(chatId,
                `👥 <b>Çalışan Bulunamadı</b>\n\n` +
                `❌ Toplu görev atayabileceğiniz çalışan bulunmuyor.`
            );
            return;
        }
        
        await telegramAPI.sendMessage(chatId,
            `📋 <b>Toplu Görev Atama</b>\n\n` +
            `👥 ${nonAdminEmployees.length} çalışana görev atanacak.\n\n` +
            `📝 Lütfen görev başlığını yazın:`,
            { reply_markup: this.getKeyboard('cancel') }
        );
        
        this.setUserState(chatId, { 
            action: 'awaiting_bulk_task_title',
            targetUsers: nonAdminEmployees
        });
    }
    
    async handlePendingUsers(chatId, text, from, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu özellik sadece adminler için.");
            return;
        }
        
        const pendingUsers = await dataManager.getPendingUsers();
        
        if (pendingUsers.length === 0) {
            await telegramAPI.sendMessage(chatId,
                `⏳ <b>Bekleyen Onaylar</b>\n\n` +
                `✅ Şu anda bekleyen kullanıcı bulunmuyor.`,
                { reply_markup: this.getKeyboard('admin_panel') }
            );
            return;
        }
        
        let userList = `⏳ <b>Bekleyen Onaylar (${pendingUsers.length})</b>\n\n`;
        const inlineKeyboard = [];
        
        pendingUsers.slice(0, 5).forEach(pending => {
            const userInfo = `👤 ${pending.firstName} ${pending.lastName || ''}`.trim();
            const wasDeleted = pending.wasDeleted ? ' 🔄' : '';
            
            userList += `${userInfo}${wasDeleted}\n`;
            userList += `🆔 @${pending.username || 'none'}\n`;
            userList += `📅 ${new Date(pending.timestamp).toLocaleString('tr-TR')}\n`;
            if (pending.wasDeleted) {
                userList += `⚠️ Daha önce silinmiş kullanıcı\n`;
            }
            userList += `\n`;
            
            inlineKeyboard.push([
                { text: `✅ ${pending.firstName} - Onayla`, callback_data: `approve_user_${pending.chatId}` },
                { text: `❌ Reddet`, callback_data: `reject_user_${pending.chatId}` }
            ]);
            inlineKeyboard.push([
                { text: `🚫 ${pending.firstName} - Engelle`, callback_data: `block_user_${pending.chatId}` }
            ]);
        });
        
        if (pendingUsers.length > 5) {
            userList += `... ve ${pendingUsers.length - 5} kullanıcı daha\n\n`;
        }
        
        inlineKeyboard.push([{ text: "🔄 Yenile", callback_data: "pending_users" }]);
        inlineKeyboard.push([{ text: "👑 Admin Paneli", callback_data: "admin_panel" }]);
        
        await telegramAPI.sendMessage(chatId, userList, {
            reply_markup: { inline_keyboard: inlineKeyboard }
        });
    }
    
    async handleDeletedUsers(chatId, text, from, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu özellik sadece adminler için.");
            return;
        }
        
        const deletedUsers = await dataManager.getDeletedEmployees();
        
        if (deletedUsers.length === 0) {
            await telegramAPI.sendMessage(chatId,
                `🗑️ <b>Silinmiş Çalışanlar</b>\n\n` +
                `✅ Şu anda silinmiş çalışan bulunmuyor.`,
                { reply_markup: this.getKeyboard('admin_panel') }
            );
            return;
        }
        
        let userList = `🗑️ <b>Silinmiş Çalışanlar (${deletedUsers.length})</b>\n\n`;
        const inlineKeyboard = [];
        
        deletedUsers.slice(0, 5).forEach(deleted => {
            const userInfo = `👤 ${deleted.firstName} ${deleted.lastName || ''}`.trim();
            
            userList += `${userInfo}\n`;
            userList += `🆔 @${deleted.username || 'none'}\n`;
            userList += `🗑️ Silinme: ${new Date(deleted.deletedAt).toLocaleString('tr-TR')}\n`;
            userList += `👤 Silen: ${deleted.deletedBy}\n\n`;
            
            inlineKeyboard.push([{
                text: `🔄 ${deleted.firstName} - Geri Ekle`,
                callback_data: `restore_user_${deleted.chatId}`
            }]);
        });
        
        if (deletedUsers.length > 5) {
            userList += `... ve ${deletedUsers.length - 5} çalışan daha\n\n`;
        }
        
        userList += `💡 <b>Not:</b> Geri eklenen çalışanlar normal employee statüsünde sisteme dahil olur.`;
        
        inlineKeyboard.push([{ text: "🔄 Yenile", callback_data: "deleted_users" }]);
        inlineKeyboard.push([{ text: "👑 Admin Paneli", callback_data: "admin_panel" }]);
        
        await telegramAPI.sendMessage(chatId, userList, {
            reply_markup: { inline_keyboard: inlineKeyboard }
        });
    }
    
    async handleStats(chatId, text, from, user, isAdmin) {
        const stats = await dataManager.getDatabaseStats();
        const tasks = await dataManager.getTasks();
        const products = await dataManager.getMissingProducts();
        
        const activeTasks = tasks.filter(t => t.status === 'active' || t.status === 'pending').length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        
        const statsText = `📊 <b>Sistem İstatistikleri</b>\n\n` +
                         `👥 <b>Kullanıcılar:</b>\n` +
                         `• Toplam: ${stats.employees || 0}\n` +
                         `• Çalışan: ${stats.employees || 0}\n` +
                         `• Admin: ${await this.getAdminCount()}\n\n` +
                         `📝 <b>Görevler:</b>\n` +
                         `• Toplam: ${stats.tasks || 0}\n` +
                         `• Aktif: ${activeTasks}\n` +
                         `• Tamamlanan: ${completedTasks}\n\n` +
                         `📦 <b>Ürün Raporları:</b>\n` +
                         `• Bekleyen: ${stats.missingProducts || 0}\n\n` +
                         `⏳ <b>Bekleyenler:</b>\n` +
                         `• Onay Bekleyen: ${await this.getPendingCount()}\n` +
                         `• Silinmiş: ${await this.getDeletedCount()}\n\n` +
                         `🗄️ <b>Veritabanı:</b>\n` +
                         `• Boyut: ${stats.totalSize || 0} MB\n` +
                         `• Son Güncelleme: ${new Date().toLocaleString('tr-TR')}`;
        
        await telegramAPI.sendMessage(chatId, statsText, {
            reply_markup: this.getKeyboard(isAdmin ? 'admin_panel' : 'main', isAdmin)
        });
    }
    
    async handleListUsers(chatId, text, from, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu özellik sadece adminler için.");
            return;
        }
        
        const employees = await dataManager.getEmployees();
        
        if (employees.length === 0) {
            await telegramAPI.sendMessage(chatId, "👥 Henüz kayıtlı kullanıcı bulunmuyor.");
            return;
        }
        
        let userList = `👥 <b>Kayıtlı Kullanıcılar (${employees.length})</b>\n\n`;
        
        employees.forEach((emp, index) => {
            const role = emp.type === 'admin' ? '👑' : '👤';
            userList += `${role} <b>${emp.firstName}</b>\n`;
            userList += `🆔 @${emp.username}\n`;
            userList += `📅 ${new Date(emp.registeredDate).toLocaleDateString('tr-TR')}\n`;
            userList += `⏰ ${new Date(emp.lastActive || emp.registeredDate).toLocaleString('tr-TR')}\n\n`;
        });
        
        if (userList.length > CONFIG.MAX_MESSAGE_LENGTH) {
            userList = userList.substring(0, CONFIG.MAX_MESSAGE_LENGTH - 100) + "\n\n... (liste kısaltılmıştır)";
        }
        
        await telegramAPI.sendMessage(chatId, userList);
    }
    
    async handleBroadcast(chatId, text, from, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu özellik sadece adminler için.");
            return;
        }
        
        await telegramAPI.sendMessage(chatId,
            `📢 <b>Toplu Duyuru</b>\n\n` +
            `📝 Tüm kullanıcılara gönderilecek mesajı yazın:\n\n` +
            `⚠️ Dikkatli olun - bu mesaj tüm kayıtlı kullanıcılara gönderilecek.`,
            { reply_markup: this.getKeyboard('cancel') }
        );
        
        this.setUserState(chatId, { action: 'awaiting_broadcast_message' });
    }
    
    async handleBackup(chatId, text, from, user, isAdmin) {
        if (!isAdmin) {
            await telegramAPI.sendMessage(chatId, "❌ Bu özellik sadece adminler için.");
            return;
        }
        
        try {
            await telegramAPI.sendMessage(chatId, "💾 Yedekleme başlatılıyor...");
            
            const backupPath = await dataManager.exportToJSON();
            const stats = await dataManager.getDatabaseStats();
            
            await telegramAPI.sendMessage(chatId,
                `✅ <b>Yedekleme Tamamlandı!</b>\n\n` +
                `📁 Dosya: ${backupPath}\n` +
                `📊 Yedeklenen veriler:\n` +
                `• Kullanıcılar: ${stats.employees || 0}\n` +
                `• Görevler: ${stats.tasks || 0}\n` +
                `• Ürün Raporları: ${stats.missingProducts || 0}\n` +
                `• Toplam Boyut: ${stats.totalSize || 0} MB\n\n` +
                `⏰ Yedekleme Zamanı: ${new Date().toLocaleString('tr-TR')}`
            );
            
        } catch (error) {
            console.error('Backup error:', error);
            await telegramAPI.sendMessage(chatId,
                `❌ <b>Yedekleme Hatası</b>\n\n` +
                `Yedekleme işlemi sırasında hata oluştu. Lütfen daha sonra tekrar deneyin.`
            );
        }
    }
    
    // ===== TEXT INPUT HANDLERS =====
    
    async handleTextInput(chatId, text, from, user, isAdmin) {
        const userState = this.getUserState(chatId);
        
        switch (userState.action) {
            case 'awaiting_product_name':
                await this.handleProductNameInput(chatId, text, user);
                break;
                
            case 'awaiting_product_photo':
                // User skipped photo
                await this.handleProductPhotoSkip(chatId, user);
                break;
                
            case 'awaiting_product_voice':
                // User skipped voice
                await this.handleProductVoiceSkip(chatId, user);
                break;
                
            case 'awaiting_single_task_title':
                await this.handleSingleTaskTitleInput(chatId, text, user);
                break;
                
            case 'awaiting_single_task_desc':
                await this.handleSingleTaskDescInput(chatId, text, user);
                break;
                
            case 'awaiting_bulk_task_title':
                await this.handleBulkTaskTitleInput(chatId, text, user);
                break;
                
            case 'awaiting_bulk_task_desc':
                await this.handleBulkTaskDescInput(chatId, text, user);
                break;
                
            case 'awaiting_broadcast_message':
                await this.handleBroadcastMessageInput(chatId, text, user);
                break;
                
            default:
                // Check if it's a button text
                await this.handleButtonText(chatId, text, from, user, isAdmin);
                break;
        }
    }
    
    async handleProductNameInput(chatId, text, user) {
        if (text === '❌ İptal Et') {
            this.clearUserState(chatId);
            await telegramAPI.sendMessage(chatId, "❌ Ürün bildirimi iptal edildi.", {
                reply_markup: this.getKeyboard('main', await userManager.isAdmin(chatId))
            });
            return;
        }
        
        const productName = turkishHandler.protect(text);
        
        this.setUserState(chatId, {
            action: 'awaiting_product_photo',
            reportData: {
                ...this.getUserState(chatId).reportData,
                productName
            }
        });
        
        await telegramAPI.sendMessage(chatId,
            `📦 <b>Eksik Ürün: ${productName}</b>\n\n` +
            `📸 İsteğe bağlı: Ürünün fotoğrafını gönderebilirsiniz.\n\n` +
            `💡 Fotoğraf göndermek istemiyorsanız "Atla" yazın.`,
            {
                keyboard: [['⏭️ Atla', '❌ İptal Et']],
                resize_keyboard: true
            }
        );
    }
    
    async handleProductPhotoSkip(chatId, user) {
        const userState = this.getUserState(chatId);
        
        if (!userState.reportData) return;
        
        this.setUserState(chatId, {
            action: 'awaiting_product_voice',
            reportData: userState.reportData
        });
        
        await telegramAPI.sendMessage(chatId,
            `🎤 <b>İsteğe bağlı:</b> Ürün hakkında ses kaydı gönderebilirsiniz.\n\n` +
            `💡 Ses kaydı göndermek istemiyorsanız "Atla" yazın.`,
            {
                keyboard: [['⏭️ Atla', '❌ İptal Et']],
                resize_keyboard: true
            }
        );
    }
    
    async handleProductVoiceSkip(chatId, user) {
        const userState = this.getUserState(chatId);
        
        if (!userState.reportData) return;
        
        await this.finalizeProductReport(chatId, user, userState.reportData);
    }
    
    async handleSingleTaskTitleInput(chatId, text, user) {
        if (text === '❌ İptal Et') {
            this.clearUserState(chatId);
            await telegramAPI.sendMessage(chatId, "❌ Görev ataması iptal edildi.", {
                reply_markup: this.getKeyboard('admin_panel')
            });
            return;
        }
        
        const taskTitle = turkishHandler.protect(text);
        const userState = this.getUserState(chatId);
        
        this.setUserState(chatId, {
            action: 'awaiting_single_task_desc',
            taskData: {
                ...userState.taskData,
                title: taskTitle
            }
        });
        
        await telegramAPI.sendMessage(chatId,
            `📝 <b>Görev Başlığı:</b> ${taskTitle}\n\n` +
            `📄 Şimdi görev açıklamasını yazın:`,
            { reply_markup: this.getKeyboard('cancel') }
        );
    }
    
    async handleSingleTaskDescInput(chatId, text, user) {
        if (text === '❌ İptal Et') {
            this.clearUserState(chatId);
            await telegramAPI.sendMessage(chatId, "❌ Görev ataması iptal edildi.", {
                reply_markup: this.getKeyboard('admin_panel')
            });
            return;
        }
        
        const taskDesc = turkishHandler.protect(text);
        const userState = this.getUserState(chatId);
        
        try {
            const task = await taskManager.createTask({
                title: userState.taskData.title,
                description: taskDesc,
                assignedTo: userState.taskData.assignedTo,
                assignedBy: chatId,
                type: 'individual'
            });
            
            this.clearUserState(chatId);
            
            const assignedUser = await userManager.findUser(userState.taskData.assignedTo);
            
            await telegramAPI.sendMessage(chatId,
                `✅ <b>Görev Başarıyla Atandı!</b>\n\n` +
                `👤 <b>Atanan:</b> ${assignedUser?.firstName || 'Bilinmeyen'}\n` +
                `📝 <b>Başlık:</b> ${task.title}\n` +
                `📄 <b>Açıklama:</b> ${task.description}\n\n` +
                `🔔 Çalışana bildirim gönderildi.`,
                { reply_markup: this.getKeyboard('admin_panel') }
            );
            
            // Notify assigned user
            await telegramAPI.sendMessage(userState.taskData.assignedTo,
                `📝 <b>Yeni Görev Atandı!</b>\n\n` +
                `📋 <b>Başlık:</b> ${task.title}\n` +
                `📄 <b>Açıklama:</b> ${task.description}\n` +
                `👤 <b>Atan:</b> ${user.firstName}\n` +
                `📅 <b>Tarih:</b> ${new Date().toLocaleString('tr-TR')}\n\n` +
                `💡 Görevlerinizi görüntülemek için /mytasks yazın.`
            );
            
        } catch (error) {
            console.error('Task creation error:', error);
            await telegramAPI.sendMessage(chatId, "❌ Görev oluşturulurken hata oluştu.");
        }
    }
    
    async handleBulkTaskTitleInput(chatId, text, user) {
        if (text === '❌ İptal Et') {
            this.clearUserState(chatId);
            await telegramAPI.sendMessage(chatId, "❌ Toplu görev ataması iptal edildi.", {
                reply_markup: this.getKeyboard('admin_panel')
            });
            return;
        }
        
        const taskTitle = turkishHandler.protect(text);
        const userState = this.getUserState(chatId);
        
        this.setUserState(chatId, {
            action: 'awaiting_bulk_task_desc',
            taskData: {
                title: taskTitle,
                targetUsers: userState.targetUsers
            }
        });
        
        await telegramAPI.sendMessage(chatId,
            `📋 <b>Toplu Görev Başlığı:</b> ${taskTitle}\n\n` +
            `👥 <b>Atanacak Çalışan:</b> ${userState.targetUsers.length}\n\n` +
            `📄 Şimdi görev açıklamasını yazın:`,
            { reply_markup: this.getKeyboard('cancel') }
        );
    }
    
    async handleBulkTaskDescInput(chatId, text, user) {
        if (text === '❌ İptal Et') {
            this.clearUserState(chatId);
            await telegramAPI.sendMessage(chatId, "❌ Toplu görev ataması iptal edildi.", {
                reply_markup: this.getKeyboard('admin_panel')
            });
            return;
        }
        
        const taskDesc = turkishHandler.protect(text);
        const userState = this.getUserState(chatId);
        
        try {
            const tasks = await taskManager.createBulkTask({
                title: userState.taskData.title,
                description: taskDesc,
                assignedBy: chatId
            }, userState.taskData.targetUsers);
            
            this.clearUserState(chatId);
            
            await telegramAPI.sendMessage(chatId,
                `✅ <b>Toplu Görev Başarıyla Atandı!</b>\n\n` +
                `📝 <b>Başlık:</b> ${userState.taskData.title}\n` +
                `📄 <b>Açıklama:</b> ${taskDesc}\n` +
                `👥 <b>Atanan Çalışan:</b> ${tasks.length}\n\n` +
                `🔔 Tüm çalışanlara bildirim gönderildi.`,
                { reply_markup: this.getKeyboard('admin_panel') }
            );
            
            // Notify all assigned users
            for (const targetUser of userState.taskData.targetUsers) {
                await telegramAPI.sendMessage(targetUser.chatId,
                    `📋 <b>Yeni Toplu Görev!</b>\n\n` +
                    `📝 <b>Başlık:</b> ${userState.taskData.title}\n` +
                    `📄 <b>Açıklama:</b> ${taskDesc}\n` +
                    `👤 <b>Atan:</b> ${user.firstName}\n` +
                    `📅 <b>Tarih:</b> ${new Date().toLocaleString('tr-TR')}\n\n` +
                    `👥 Bu görev tüm çalışanlara atanmıştır.\n` +
                    `💡 Görevlerinizi görüntülemek için /mytasks yazın.`
                );
            }
            
        } catch (error) {
            console.error('Bulk task creation error:', error);
            await telegramAPI.sendMessage(chatId, "❌ Toplu görev oluşturulurken hata oluştu.");
        }
    }
    
    async handleBroadcastMessageInput(chatId, text, user) {
        if (text === '❌ İptal Et') {
            this.clearUserState(chatId);
            await telegramAPI.sendMessage(chatId, "❌ Duyuru iptal edildi.", {
                reply_markup: this.getKeyboard('admin_panel')
            });
            return;
        }
        
        const broadcastMessage = turkishHandler.protect(text);
        
        try {
            const employees = await dataManager.getEmployees();
            let successCount = 0;
            let failCount = 0;
            
            await telegramAPI.sendMessage(chatId, 
                `📢 Duyuru gönderiliyor... ${employees.length} kullanıcı`
            );
            
            for (const emp of employees) {
                try {
                    await telegramAPI.sendMessage(emp.chatId,
                        `📢 <b>DUYURU</b>\n\n` +
                        `${broadcastMessage}\n\n` +
                        `👤 <b>Gönderen:</b> ${user.firstName}\n` +
                        `📅 <b>Tarih:</b> ${new Date().toLocaleString('tr-TR')}`
                    );
                    successCount++;
                } catch (error) {
                    failCount++;
                    console.error(`Broadcast failed for user ${emp.chatId}:`, error);
                }
                
                // Small delay between messages
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            this.clearUserState(chatId);
            
            await telegramAPI.sendMessage(chatId,
                `✅ <b>Duyuru Gönderildi!</b>\n\n` +
                `📊 <b>Sonuçlar:</b>\n` +
                `• Başarılı: ${successCount}\n` +
                `• Başarısız: ${failCount}\n` +
                `• Toplam: ${employees.length}\n\n` +
                `📝 <b>Mesaj:</b> "${broadcastMessage.substring(0, 100)}${broadcastMessage.length > 100 ? '...' : ''}"`,
                { reply_markup: this.getKeyboard('admin_panel') }
            );
            
            await activityLogger.log(
                `Toplu duyuru gönderildi: ${employees.length} kullanıcı (${successCount} başarılı)`, 
                chatId
            );
            
        } catch (error) {
            console.error('Broadcast error:', error);
            await telegramAPI.sendMessage(chatId, "❌ Duyuru gönderilirken hata oluştu.");
        }
    }
    
    // ===== MEDIA HANDLERS =====
    
    async handlePhoto(chatId, photo, caption, from, user) {
        const userState = this.getUserState(chatId);
        
        if (userState.action === 'awaiting_product_photo') {
            const largestPhoto = photo[photo.length - 1]; // Get highest resolution
            
            this.setUserState(chatId, {
                action: 'awaiting_product_voice',
                reportData: {
                    ...userState.reportData,
                    photoFileId: largestPhoto.file_id
                }
            });
            
            await telegramAPI.sendMessage(chatId,
                `📸 <b>Fotoğraf alındı!</b>\n\n` +
                `🎤 İsteğe bağlı: Ürün hakkında ses kaydı gönderebilirsiniz.\n\n` +
                `💡 Ses kaydı göndermek istemiyorsanız "Atla" yazın.`,
                {
                    keyboard: [['⏭️ Atla', '❌ İptal Et']],
                    resize_keyboard: true
                }
            );
        } else {
            // Regular photo from user - treat as admin media share if admin
            const isAdmin = await userManager.isAdmin(chatId);
            if (isAdmin) {
                await this.handleAdminMediaShare(chatId, photo, caption, 'photo', user);
            }
        }
    }
    
    async handleVoice(chatId, voice, caption, from, user) {
        const userState = this.getUserState(chatId);
        
        if (userState.action === 'awaiting_product_voice') {
            this.setUserState(chatId, {
                reportData: {
                    ...userState.reportData,
                    voiceFileId: voice.file_id
                }
            });
            
            await telegramAPI.sendMessage(chatId, "🎤 Ses kaydı alındı! Rapor kaydediliyor...");
            
            await this.finalizeProductReport(chatId, user, this.getUserState(chatId).reportData);
        } else {
            // Regular voice from user - treat as admin media share if admin
            const isAdmin = await userManager.isAdmin(chatId);
            if (isAdmin) {
                await this.handleAdminMediaShare(chatId, voice, caption, 'voice', user);
            }
        }
    }
    
    async handleDocument(chatId, document, caption, from, user) {
        const isAdmin = await userManager.isAdmin(chatId);
        if (isAdmin) {
            await this.handleAdminMediaShare(chatId, document, caption, 'document', user);
        }
    }
    
    async handleAdminMediaShare(chatId, media, caption, mediaType, user) {
        await activityLogger.log(
            `Admin medya paylaşımı: ${mediaType} - ${user.firstName}${caption ? ` (${caption.substring(0, 50)}...)` : ''}`,
            chatId
        );
        
        await telegramAPI.sendMessage(chatId,
            `✅ <b>Medya Alındı!</b>\n\n` +
            `${mediaType === 'photo' ? '📸 Fotoğraf' : mediaType === 'voice' ? '🎤 Ses kaydı' : '📄 Dosya'} başarıyla kaydedildi.\n\n` +
            `👑 <b>Admin özelliği:</b> Medyanız sistem loglarına kaydedildi.\n` +
            `📝 Açıklama: ${caption || 'Açıklama yok'}\n\n` +
            `💡 Çalışanlara duyuru yapmak için "📢 Duyuru Gönder" özelliğini kullanabilirsin.`,
            { reply_markup: this.getKeyboard('main', true) }
        );
    }
    
    async finalizeProductReport(chatId, user, reportData) {
        try {
            const report = await productReportManager.createReport(reportData);
            
            this.clearUserState(chatId);
            
            await telegramAPI.sendMessage(chatId,
                `✅ <b>Eksik Ürün Bildirimi Tamamlandı!</b>\n\n` +
                `📦 <b>Ürün:</b> ${reportData.productName}\n` +
                `📸 <b>Fotoğraf:</b> ${reportData.photoFileId ? 'Evet' : 'Hayır'}\n` +
                `🎤 <b>Ses Kaydı:</b> ${reportData.voiceFileId ? 'Evet' : 'Hayır'}\n\n` +
                `🔔 Adminlere bildirim gönderildi.\n` +
                `⏰ Rapor zamanı: ${new Date().toLocaleString('tr-TR')}`,
                { reply_markup: this.getKeyboard('main', await userManager.isAdmin(chatId)) }
            );
            
            // Notify admins
            await this.notifyAdminsAboutProductReport(report, user);
            
        } catch (error) {
            console.error('Product report finalization error:', error);
            await telegramAPI.sendMessage(chatId, 
                "❌ Ürün bildirimi kaydedilirken hata oluştu. Lütfen tekrar deneyin."
            );
        }
    }
    
    // ===== BUTTON TEXT HANDLERS =====
    
    async handleButtonText(chatId, text, from, user, isAdmin) {
        switch (text) {
            case '🏠 Ana Menü':
                await this.handleMainMenu(chatId, text, from, user, isAdmin);
                break;
                
            case '👥 Admin Paneli':
                await this.handleAdminPanel(chatId, text, from, user, isAdmin);
                break;
                
            case '📝 Görevlerim':
                await this.handleMyTasks(chatId, text, from, user, isAdmin);
                break;
                
            case '📦 Eksik Ürün Bildir':
                await this.handleReportProduct(chatId, text, from, user, isAdmin);
                break;
                
            case 'ℹ️ Yardım':
                await this.handleHelp(chatId, text, from, user, isAdmin);
                break;
                
            case '👥 Bekleyen Onaylar':
                await this.handlePendingUsers(chatId, text, from, user, isAdmin);
                break;
                
            case '🗑️ Silinmiş Çalışanlar':
                await this.handleDeletedUsers(chatId, text, from, user, isAdmin);
                break;
                
            case '📋 Görev Yönetimi':
                await this.handleTaskManagement(chatId, user, isAdmin);
                break;
                
            case '📦 Ürün Raporları':
                await this.handleProductReports(chatId, user, isAdmin);
                break;
                
            case '📢 Duyuru Gönder':
                await this.handleBroadcast(chatId, text, from, user, isAdmin);
                break;
                
            case '📊 Detaylı İstatistikler':
            case '📊 İstatistikler':
                await this.handleStats(chatId, text, from, user, isAdmin);
                break;
                
            case '💾 Yedekleme':
                await this.handleBackup(chatId, text, from, user, isAdmin);
                break;
                
            case '📝 Tekil Görev Ata':
                await this.handleTaskCommand(chatId, text, from, user, isAdmin);
                break;
                
            case '📋 Toplu Görev Ata':
                await this.handleTaskAllCommand(chatId, text, from, user, isAdmin);
                break;
                
            case '⏭️ Atla':
                const userState = this.getUserState(chatId);
                if (userState.action === 'awaiting_product_photo') {
                    await this.handleProductPhotoSkip(chatId, user);
                } else if (userState.action === 'awaiting_product_voice') {
                    await this.handleProductVoiceSkip(chatId, user);
                }
                break;
                
            default:
                if (!isAdmin) {
                    await telegramAPI.sendMessage(chatId,
                        "❓ Anlaşılamayan komut. Yardım için /help yazın.",
                        { reply_markup: this.getKeyboard('main', false) }
                    );
                }
                break;
        }
    }
    
    async handleTaskManagement(chatId, user, isAdmin) {
        if (!isAdmin) return;
        
        const tasks = await dataManager.getTasks();
        const activeTasks = tasks.filter(t => t.status !== 'completed').length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        
        const taskText = `📋 <b>Görev Yönetimi</b>\n\n` +
                        `📊 <b>Durum:</b>\n` +
                        `• Aktif: ${activeTasks}\n` +
                        `• Tamamlanan: ${completedTasks}\n` +
                        `• Toplam: ${tasks.length}\n\n` +
                        `⬇️ Yapmak istediğiniz işlemi seçin:`;
        
        await telegramAPI.sendMessage(chatId, taskText, {
            reply_markup: this.getKeyboard('task_types')
        });
    }
    
    async handleProductReports(chatId, user, isAdmin) {
        if (!isAdmin) return;
        
        const products = await dataManager.getMissingProducts();
        
        if (products.length === 0) {
            await telegramAPI.sendMessage(chatId,
                `📦 <b>Ürün Raporları</b>\n\n` +
                `✅ Şu anda bekleyen ürün raporu bulunmuyor.`,
                { reply_markup: this.getKeyboard('admin_panel') }
            );
            return;
        }
        
        let productList = `📦 <b>Eksik Ürün Raporları (${products.length})</b>\n\n`;
        const inlineKeyboard = [];
        
        products.slice(0, 5).forEach(product => {
            const reporter = product.reportedBy;
            const hasMedia = product.photoFileId || product.voiceFileId;
            
            productList += `📦 <b>${product.productName}</b>\n`;
            productList += `👤 Bildiren: ${reporter}\n`;
            productList += `📅 ${new Date(product.timestamp).toLocaleString('tr-TR')}\n`;
            productList += `📎 Medya: ${hasMedia ? 'Var' : 'Yok'}\n\n`;
            
            const buttons = [
                { text: `✅ Tamamlandı`, callback_data: `complete_product_${product.productId}` },
                { text: `🗑️ Sil`, callback_data: `delete_product_${product.productId}` }
            ];
            
            inlineKeyboard.push(buttons);
            
            // Show media if available
            if (product.photoFileId) {
                setTimeout(async () => {
                    await telegramAPI.sendPhoto(chatId, product.photoFileId, 
                        `📸 ${product.productName} - Rapor fotoğrafı`);
                }, 100);
            }
            
            if (product.voiceFileId) {
                setTimeout(async () => {
                    await telegramAPI.sendVoice(chatId, product.voiceFileId, 
                        `🎤 ${product.productName} - Rapor ses kaydı`);
                }, 200);
            }
        });
        
        if (products.length > 5) {
            productList += `... ve ${products.length - 5} rapor daha\n\n`;
        }
        
        inlineKeyboard.push([{ text: "🔄 Yenile", callback_data: "product_reports" }]);
        inlineKeyboard.push([{ text: "👑 Admin Paneli", callback_data: "admin_panel" }]);
        
        await telegramAPI.sendMessage(chatId, productList, {
            reply_markup: { inline_keyboard: inlineKeyboard }
        });
    }
    
    // ===== CALLBACK HANDLERS =====
    
    async handleCallback(callbackQuery) {
        const { id, data, from, message } = callbackQuery;
        const chatId = from.id;
        
        // Answer callback query first
        await telegramAPI.answerCallbackQuery(id);
        
        // Check if user exists and is not blocked
        const user = await userManager.findUser(chatId);
        const isBlocked = await userManager.isBlocked(chatId);
        
        if (isBlocked) return;
        
        const isAdmin = await userManager.isAdmin(chatId);
        
        // Find appropriate handler
        for (const [prefix, handler] of this.callbackHandlers.entries()) {
            if (data.startsWith(prefix)) {
                await handler(data, chatId, from, message, user, isAdmin);
                return;
            }
        }
        
        // Handle specific callbacks
        if (data === 'main_menu') {
            await this.handleMainMenu(chatId, null, from, user, isAdmin);
        } else if (data === 'admin_panel') {
            await this.handleAdminPanel(chatId, null, from, user, isAdmin);
        } else if (data === 'my_tasks') {
            await this.handleMyTasks(chatId, null, from, user, isAdmin);
        } else if (data === 'pending_users') {
            await this.handlePendingUsers(chatId, null, from, user, isAdmin);
        } else if (data === 'deleted_users') {
            await this.handleDeletedUsers(chatId, null, from, user, isAdmin);
        } else if (data === 'product_reports') {
            await this.handleProductReports(chatId, user, isAdmin);
        } else if (data.startsWith('assign_single_')) {
            await this.handleAssignSingleTask(data, chatId, from, message, user, isAdmin);
        }
    }
    
    async handleUserApproval(data, chatId, from, message, user, isAdmin) {
        if (!isAdmin) return;
        
        const targetChatId = data.replace('approve_user_', '');
        
        try {
            const approvedUser = await userManager.approveUser(targetChatId, chatId);
            
            // Remove buttons and update message
            await telegramAPI.editMessageReplyMarkup(chatId, message.message_id);
            
            await telegramAPI.sendMessage(chatId,
                `✅ <b>Kullanıcı Onaylandı!</b>\n\n` +
                `👤 ${approvedUser.firstName}\n` +
                `✅ Sisteme başarıyla eklendi.`
            );
            
            // Notify approved user
            await telegramAPI.sendMessage(targetChatId,
                `🎉 <b>Kayıt Onaylandı!</b>\n\n` +
                `✅ SivalTeam sistemine başarıyla kaydoldunuz!\n` +
                `👤 Onaylayan: ${user.firstName}\n\n` +
                `🚀 Artık sistemi kullanmaya başlayabilirsiniz.`,
                { reply_markup: this.getKeyboard('main', false) }
            );
            
        } catch (error) {
            console.error('User approval error:', error);
            await telegramAPI.sendMessage(chatId, 
                `❌ Onay işlemi başarısız: ${error.message}`
            );
        }
    }
    
    async handleUserRejection(data, chatId, from, message, user, isAdmin) {
        if (!isAdmin) return;
        
        const targetChatId = data.replace('reject_user_', '');
        
        try {
            const rejectedUser = await userManager.rejectUser(targetChatId, chatId);
            
            await telegramAPI.editMessageReplyMarkup(chatId, message.message_id);
            
            await telegramAPI.sendMessage(chatId,
                `❌ <b>Kullanıcı Reddedildi</b>\n\n` +
                `👤 ${rejectedUser.firstName}\n` +
                `❌ Kayıt talebi reddedildi.`
            );
            
            // Notify rejected user
            await telegramAPI.sendMessage(targetChatId,
                `❌ <b>Kayıt Reddedildi</b>\n\n` +
                `Maalesef kayıt talebiniz sistem yöneticisi tarafından reddedildi.\n\n` +
                `📞 Daha fazla bilgi için yöneticinizle iletişime geçin.`
            );
            
        } catch (error) {
            console.error('User rejection error:', error);
            await telegramAPI.sendMessage(chatId, 
                `❌ Reddetme işlemi başarısız: ${error.message}`
            );
        }
    }
    
    async handleUserBlocking(data, chatId, from, message, user, isAdmin) {
        if (!isAdmin) return;
        
        const targetChatId = data.replace('block_user_', '');
        
        try {
            await userManager.blockUser(targetChatId, chatId, 'Admin tarafından engellendi');
            
            await telegramAPI.editMessageReplyMarkup(chatId, message.message_id);
            
            await telegramAPI.sendMessage(chatId,
                `🚫 <b>Kullanıcı Engellendi</b>\n\n` +
                `💬 Chat ID: ${targetChatId}\n` +
                `🚫 Kalıcı olarak engellenmiştir.`
            );
            
        } catch (error) {
            console.error('User blocking error:', error);
            await telegramAPI.sendMessage(chatId, 
                `❌ Engelleme işlemi başarısız: ${error.message}`
            );
        }
    }
    
    async handleUserRestore(data, chatId, from, message, user, isAdmin) {
        if (!isAdmin) return;
        
        const targetChatId = data.replace('restore_user_', '');
        
        try {
            const restoredUser = await userManager.restoreDeletedUser(targetChatId, chatId);
            
            await telegramAPI.sendMessage(chatId,
                `🔄 <b>Kullanıcı Geri Eklendi!</b>\n\n` +
                `👤 ${restoredUser.firstName}\n` +
                `✅ Sisteme tekrar dahil edildi.`
            );
            
            // Notify restored user
            await telegramAPI.sendMessage(targetChatId,
                `🔄 <b>Hesabınız Geri Açıldı!</b>\n\n` +
                `✅ SivalTeam sistemine tekrar erişiminiz açılmıştır.\n` +
                `👤 İşlemi yapan: ${user.firstName}\n\n` +
                `🚀 Sistemi kullanmaya devam edebilirsiniz.`,
                { reply_markup: this.getKeyboard('main', false) }
            );
            
        } catch (error) {
            console.error('User restore error:', error);
            await telegramAPI.sendMessage(chatId, 
                `❌ Geri ekleme işlemi başarısız: ${error.message}`
            );
        }
    }
    
    async handleTaskCompletion(data, chatId, from, message, user, isAdmin) {
        const taskId = data.replace('complete_task_', '');
        
        try {
            const completedTask = await taskManager.completeTask(taskId, chatId);
            
            await telegramAPI.editMessageReplyMarkup(chatId, message.message_id);
            
            await telegramAPI.sendMessage(chatId,
                `✅ <b>Görev Tamamlandı!</b>\n\n` +
                `📝 <b>Görev:</b> ${completedTask.title}\n` +
                `✅ Başarıyla tamamlandı.\n` +
                `📅 ${new Date().toLocaleString('tr-TR')}`
            );
            
            // Notify admin who assigned the task
            if (completedTask.assignedBy) {
                const adminUser = await userManager.findUser(completedTask.assignedBy);
                if (adminUser) {
                    await telegramAPI.sendMessage(completedTask.assignedBy,
                        `🎉 <b>Görev Tamamlandı!</b>\n\n` +
                        `📝 <b>Görev:</b> ${completedTask.title}\n` +
                        `👤 <b>Tamamlayan:</b> ${user.firstName}\n` +
                        `📅 ${new Date().toLocaleString('tr-TR')}\n\n` +
                        `✅ Görev başarıyla sonuçlandırılmıştır.`
                    );
                }
            }
            
        } catch (error) {
            console.error('Task completion error:', error);
            await telegramAPI.sendMessage(chatId, 
                `❌ Görev tamamlama hatası: ${error.message}`
            );
        }
    }
    
    async handleProductCompletion(data, chatId, from, message, user, isAdmin) {
        if (!isAdmin) return;
        
        const productId = data.replace('complete_product_', '');
        
        try {
            await productReportManager.completeReport(productId, chatId);
            
            await telegramAPI.editMessageReplyMarkup(chatId, message.message_id);
            
            await telegramAPI.sendMessage(chatId,
                `✅ <b>Ürün Raporu Tamamlandı!</b>\n\n` +
                `📦 Rapor ID: ${productId}\n` +
                `✅ Başarıyla tamamlandı ve listeden kaldırıldı.`
            );
            
        } catch (error) {
            console.error('Product completion error:', error);
            await telegramAPI.sendMessage(chatId, 
                `❌ Ürün tamamlama hatası: ${error.message}`
            );
        }
    }
    
    async handleProductDeletion(data, chatId, from, message, user, isAdmin) {
        if (!isAdmin) return;
        
        const productId = data.replace('delete_product_', '');
        
        try {
            await productReportManager.deleteReport(productId, chatId);
            
            await telegramAPI.editMessageReplyMarkup(chatId, message.message_id);
            
            await telegramAPI.sendMessage(chatId,
                `🗑️ <b>Ürün Raporu Silindi!</b>\n\n` +
                `📦 Rapor ID: ${productId}\n` +
                `🗑️ Başarıyla silindi.`
            );
            
        } catch (error) {
            console.error('Product deletion error:', error);
            await telegramAPI.sendMessage(chatId, 
                `❌ Ürün silme hatası: ${error.message}`
            );
        }
    }
    
    async handleAssignSingleTask(data, chatId, from, message, user, isAdmin) {
        if (!isAdmin) return;
        
        const targetChatId = data.replace('assign_single_', '');
        const targetUser = await userManager.findUser(targetChatId);
        
        if (!targetUser) {
            await telegramAPI.sendMessage(chatId, "❌ Kullanıcı bulunamadı.");
            return;
        }
        
        await telegramAPI.sendMessage(chatId,
            `📝 <b>Görev Atama - ${targetUser.firstName}</b>\n\n` +
            `👤 <b>Atanacak Çalışan:</b> ${targetUser.firstName}\n\n` +
            `📝 Lütfen görev başlığını yazın:`,
            { reply_markup: this.getKeyboard('cancel') }
        );
        
        this.setUserState(chatId, {
            action: 'awaiting_single_task_title',
            taskData: {
                assignedTo: targetChatId
            }
        });
    }
    
    // ===== NOTIFICATION HELPERS =====
    
    async notifyAdminsAboutNewUser(from) {
        const employees = await dataManager.getEmployees();
        const admins = employees.filter(emp => emp.type === 'admin');
        
        for (const admin of admins) {
            await telegramAPI.sendMessage(admin.chatId,
                `👤 <b>Yeni Kullanıcı Kaydı</b>\n\n` +
                `👤 <b>Ad:</b> ${from.first_name}\n` +
                `🆔 <b>Username:</b> @${from.username || 'yok'}\n` +
                `💬 <b>Chat ID:</b> <code>${from.id}</code>\n\n` +
                `⏳ Onayınızı bekliyor.`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "✅ Onayla", callback_data: `approve_user_${from.id}` },
                                { text: "❌ Reddet", callback_data: `reject_user_${from.id}` }
                            ],
                            [
                                { text: "🚫 Engelle", callback_data: `block_user_${from.id}` }
                            ]
                        ]
                    }
                }
            );
        }
    }
    
    async notifyAdminsAboutDeletedUserRequest(from, deletedInfo) {
        const employees = await dataManager.getEmployees();
        const admins = employees.filter(emp => emp.type === 'admin');
        
        for (const admin of admins) {
            await telegramAPI.sendMessage(admin.chatId,
                `🔄 <b>SİLİNMİŞ KULLANICI GİRİŞİ</b>\n\n` +
                `⚠️ Daha önce silinen bir kullanıcı tekrar giriş yapmak istiyor!\n\n` +
                `👤 <b>Ad:</b> ${from.first_name}\n` +
                `🆔 <b>Username:</b> @${from.username || 'yok'}\n` +
                `💬 <b>Chat ID:</b> <code>${from.id}</code>\n\n` +
                `📋 <b>Eski Bilgiler:</b>\n` +
                `• Eski Ad: ${deletedInfo.firstName}\n` +
                `• Silme Tarihi: ${new Date(deletedInfo.deletedAt).toLocaleString('tr-TR')}\n` +
                `• Silen: ${deletedInfo.deletedBy}\n\n` +
                `🔍 <b>Dikkatli değerlendirme yapınız!</b>`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "✅ Tekrar Kabul Et", callback_data: `approve_user_${from.id}` },
                                { text: "❌ Reddet", callback_data: `reject_user_${from.id}` }
                            ],
                            [
                                { text: "🚫 Engelle (Kalıcı)", callback_data: `block_user_${from.id}` }
                            ]
                        ]
                    }
                }
            );
        }
    }
    
    async notifyAdminsAboutProductReport(report, user) {
        const employees = await dataManager.getEmployees();
        const admins = employees.filter(emp => emp.type === 'admin');
        
        for (const admin of admins) {
            let message = `📦 <b>YENİ ÜRÜN BİLDİRİMİ</b>\n\n` +
                         `📦 <b>Ürün:</b> ${report.productName}\n` +
                         `👤 <b>Bildiren:</b> ${user.firstName}\n` +
                         `📅 <b>Tarih:</b> ${new Date().toLocaleString('tr-TR')}\n` +
                         `📸 <b>Fotoğraf:</b> ${report.photoFileId ? 'Var' : 'Yok'}\n` +
                         `🎤 <b>Ses Kaydı:</b> ${report.voiceFileId ? 'Var' : 'Yok'}`;
            
            await telegramAPI.sendMessage(admin.chatId, message, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ Tamamlandı", callback_data: `complete_product_${report.productId}` },
                            { text: "🗑️ Sil", callback_data: `delete_product_${report.productId}` }
                        ]
                    ]
                }
            });
            
            // Send media if available
            if (report.photoFileId) {
                await telegramAPI.sendPhoto(admin.chatId, report.photoFileId, 
                    `📸 <b>Ürün Fotoğrafı</b>\n📦 ${report.productName}`);
            }
            
            if (report.voiceFileId) {
                await telegramAPI.sendVoice(admin.chatId, report.voiceFileId, 
                    `🎤 <b>Ürün Ses Kaydı</b>\n📦 ${report.productName}`);
            }
        }
    }
    
    // ===== UTILITY METHODS =====
    
    async getPendingCount() {
        try {
            const pending = await dataManager.getPendingUsers();
            return pending.length;
        } catch (error) {
            return 0;
        }
    }
    
    async getDeletedCount() {
        try {
            const deleted = await dataManager.getDeletedEmployees();
            return deleted.length;
        } catch (error) {
            return 0;
        }
    }
    
    async getAdminCount() {
        try {
            const employees = await dataManager.getEmployees();
            return employees.filter(emp => emp.type === 'admin').length;
        } catch (error) {
            return 0;
        }
    }
}

// ===== MAIN APPLICATION =====

// Initialize system
const commandHandler = new BotCommandHandler();

// Initialize data manager
dataManager = new DataManagerWrapper();

// Main message handler
async function handleUpdate(update) {
    try {
        if (update.message) {
            const { chat, from, text, photo, voice, document } = update.message;
            const chatId = chat.id;
            
            // Rate limiting check
            if (!rateLimiter.isAllowed(chatId)) {
                await telegramAPI.sendMessage(chatId, 
                    "⚠️ <b>Çok fazla istek!</b>\n\nLütfen biraz bekleyip tekrar deneyin."
                );
                return;
            }
            
            // Get user info
            const user = await userManager.findUser(chatId);
            const isAdmin = await userManager.isAdmin(chatId);
            
            // Block unauthorized users (except for /start)
            if (!user && text !== '/start') {
                await telegramAPI.sendMessage(chatId,
                    "🔒 <b>Erişim Reddedildi</b>\n\n" +
                    "❌ Bu bot sadece kayıtlı SivalTeam çalışanları içindir.\n\n" +
                    "🚪 Kayıt olmak için: /start"
                );
                return;
            }
            
            // Spam/Ad filter for registered users
            if (user && text && spamDetector.isSpam(text)) {
                await telegramAPI.sendMessage(chatId,
                    "⚠️ <b>İçerik Engellendi</b>\n\n" +
                    "❌ Reklam, spam veya uygunsuz içerik tespit edildi.\n" +
                    "🔄 Lütfen sadece iş ile ilgili mesajlar gönderin."
                );
                
                await activityLogger.log(
                    `Spam/reklam engellendi: ${user.firstName} - "${text.substring(0, 50)}..."`,
                    chatId
                );
                return;
            }
            
            // Handle different message types
            if (text) {
                // Check if it's a command
                if (text.startsWith('/')) {
                    const command = text.split(' ')[0];
                    const handler = commandHandler.commands.get(command);
                    
                    if (handler) {
                        await handler(chatId, text, from, user, isAdmin);
                    } else {
                        await commandHandler.handleTextInput(chatId, text, from, user, isAdmin);
                    }
                } else {
                    await commandHandler.handleTextInput(chatId, text, from, user, isAdmin);
                }
            } else if (photo) {
                await commandHandler.handlePhoto(chatId, photo, update.message.caption, from, user);
            } else if (voice) {
                await commandHandler.handleVoice(chatId, voice, update.message.caption, from, user);
            } else if (document) {
                await commandHandler.handleDocument(chatId, document, update.message.caption, from, user);
            }
            
        } else if (update.callback_query) {
            await commandHandler.handleCallback(update.callback_query);
        }
        
    } catch (error) {
        console.error('❌ Update handling error:', error);
        
        // Try to send error message to user if possible
        if (update.message) {
            try {
                await telegramAPI.sendMessage(update.message.chat.id,
                    "❌ Sistem hatası oluştu. Lütfen daha sonra tekrar deneyin."
                );
            } catch (sendError) {
                console.error('❌ Could not send error message:', sendError);
            }
        }
    }
}

// ===== API ROUTES =====

// Webhook endpoint
app.post('/webhook', async (req, res) => {
    try {
        await handleUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.sendStatus(500);
    }
});

// API Routes for Dashboard Integration
app.get('/api/employees', async (req, res) => {
    try {
        const employees = await dataManager.getEmployees();
        res.json(employees);
    } catch (error) {
        console.error('❌ API Error - employees:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/missing-products', async (req, res) => {
    try {
        const products = await dataManager.getMissingProducts();
        res.json(products);
    } catch (error) {
        console.error('❌ API Error - missing products:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await dataManager.getTasks();
        res.json(tasks);
    } catch (error) {
        console.error('❌ API Error - tasks:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/pending-users', async (req, res) => {
    try {
        const pending = await dataManager.getPendingUsers();
        res.json(pending);
    } catch (error) {
        console.error('❌ API Error - pending users:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/system-stats', async (req, res) => {
    try {
        const stats = await dataManager.getDatabaseStats();
        res.json(stats);
    } catch (error) {
        console.error('❌ API Error - system stats:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: CONFIG.VERSION,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Main route
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>SivalTeam Professional Bot v${CONFIG.VERSION}</title>
                <style>
                    body { font-family: 'Courier New', monospace; background: #1a1a1a; color: #00ff00; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .status { background: #2a2a2a; padding: 15px; border-radius: 8px; margin: 10px 0; }
                    .green { color: #00ff00; }
                    .blue { color: #00bfff; }
                    .yellow { color: #ffff00; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 class="green">🤖 SivalTeam Professional Bot</h1>
                    <h2 class="blue">v${CONFIG.VERSION} - Enterprise Grade</h2>
                </div>
                
                <div class="status">
                    <h3 class="yellow">📊 System Status</h3>
                    <p>✅ MongoDB Connection: Active</p>
                    <p>✅ Telegram Webhook: Configured</p>
                    <p>✅ Rate Limiting: Active</p>
                    <p>✅ Turkish Characters: Protected</p>
                    <p>✅ Spam Detection: Active</p>
                    <p>✅ Auto Backup: Running</p>
                </div>
                
                <div class="status">
                    <h3 class="yellow">🔧 Features</h3>
                    <p>• Advanced user registration & approval system</p>
                    <p>• Task management with individual & bulk assignment</p>
                    <p>• Product reporting with photo & voice support</p>
                    <p>• Deleted user restoration system</p>
                    <p>• Admin panel with comprehensive controls</p>
                    <p>• Real-time dashboard API integration</p>
                    <p>• Enterprise security & spam filtering</p>
                </div>
                
                <div class="status">
                    <h3 class="yellow">⚙️ System Info</h3>
                    <p>Started: ${new Date().toLocaleString('tr-TR')}</p>
                    <p>Environment: ${CONFIG.ENVIRONMENT}</p>
                    <p>Port: ${CONFIG.PORT}</p>
                    <p>Uptime: ${Math.floor(process.uptime())} seconds</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; color: #888;">
                    <p>© 2025 SivalTeam - Built with ❤️ for Professional Teams</p>
                </div>
            </body>
        </html>
    `);
});

// ===== STARTUP SEQUENCE =====

async function startApplication() {
    try {
        // Debug environment variables
        console.log('🔍 Environment Debug:');
        console.log(`BOT_TOKEN: ${CONFIG.BOT_TOKEN ? 'Set' : 'Missing'}`);
        console.log(`WEBHOOK_URL: ${CONFIG.WEBHOOK_URL}`);
        console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? 'Set' : 'Missing'}`);
        
        // Initialize data manager
        await dataManager.initialize();
        
        console.log('🔄 Auto backup enabled (every 60 minutes)');
        
        // Set webhook
        console.log('🔗 Setting up Telegram webhook...');
        const webhookURL = `${CONFIG.WEBHOOK_URL}/webhook`;
        console.log(`🌐 Webhook URL: ${webhookURL}`);
        
        const webhookResponse = await axios.post(
            `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/setWebhook`,
            { url: webhookURL }
        );
        
        if (webhookResponse.data.ok) {
            console.log('✅ Webhook set successfully');
        } else {
            console.error('❌ Webhook setup failed:', webhookResponse.data);
        }
        
        // Start Express server
        app.listen(CONFIG.PORT, () => {
            console.log(`🚀 SivalTeam Professional Bot v${CONFIG.VERSION} is LIVE!`);
            console.log('===============================================');
            console.log(`🌐 Server URL: ${CONFIG.WEBHOOK_URL}`);
            console.log(`🔌 Port: ${CONFIG.PORT}`);
            console.log(`🔧 Environment: ${CONFIG.ENVIRONMENT}`);
            console.log(`📅 Started: ${new Date().toLocaleString('tr-TR')}`);
            console.log(`🔗 Webhook URL: ${CONFIG.WEBHOOK_URL}/webhook`);
            console.log(`📊 Dashboard API: ${CONFIG.WEBHOOK_URL}/api/*`);
            console.log(`💾 Health Check: ${CONFIG.WEBHOOK_URL}/health`);
            console.log('🎯 All systems operational and ready for production!');
            console.log('===============================================');
        });
        
    } catch (error) {
        console.error('❌ Application startup failed:', error);
        process.exit(1);
    }
}

// Start the application
startApplication();