const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');
require('dotenv').config();

// Environment variables with fallbacks
const BOT_TOKEN = process.env.BOT_TOKEN || '8229159175:AAGRFoLpK9ma5ekPiaaCdI8EKJeca14XoOg';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://serkser2_db_user:4K9JpoVC9U90UtmI@cluster0.pixopf1.mongodb.net/sivalteam?retryWrites=true&w=majority';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://sivalteam-bot.onrender.com';
const PORT = process.env.PORT || 10000;

// ==================== EXPRESS SETUP ====================
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const rateLimiter = new RateLimiterMemory({
    keyPrefix: 'sivalteam_bot',
    points: 50, // Number of requests
    duration: 60, // Per 60 seconds
});

// ==================== MONGODB SCHEMAS ====================
const userSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true },
    username: String,
    firstName: String,
    lastName: String,
    role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
    isActive: { type: Boolean, default: true },
    department: String,
    registeredAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
});

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    assignedTo: [String], // chatId array
    assignedBy: String,
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    completedAt: Date,
    deadline: Date
});

const missingProductSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    reportedBy: String,
    reportedByName: String,
    resolved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    resolvedAt: Date
});

const announcementSchema = new mongoose.Schema({
    title: String,
    content: { type: String, required: true },
    createdBy: String,
    targetAudience: { type: String, enum: ['all', 'admins', 'employees'], default: 'all' },
    createdAt: { type: Date, default: Date.now }
});

// MongoDB Models
const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const MissingProduct = mongoose.model('MissingProduct', missingProductSchema);
const Announcement = mongoose.model('Announcement', announcementSchema);

// ==================== DATABASE CONNECTION ====================
async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB Atlas connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// ==================== SIVALTEAM BOT CLASS ====================
class SivalTeamBot {
    constructor() {
        this.bot = new TelegramBot(BOT_TOKEN);
        this.userStates = new Map(); // chatId -> state
        this.setupWebhook();
        this.setupHandlers();
        
        console.log('🤖 SivalTeam Bot initialized with security features');
    }
    
    // Webhook setup for Render
    setupWebhook() {
        this.bot.setWebHook(`${WEBHOOK_URL}/webhook/${BOT_TOKEN}`);
        console.log(`🔗 Webhook set: ${WEBHOOK_URL}/webhook/${BOT_TOKEN}`);
    }
    
    // Bot handlers
    setupHandlers() {
        // Rate limiting middleware
        this.bot.on('message', async (msg) => {
            try {
                await rateLimiter.consume(msg.chat.id);
            } catch (rejRes) {
                console.log(`⚡ Rate limit exceeded for ${msg.chat.id}`);
                return;
            }
            
            // Spam filter
            if (this.isSpamMessage(msg)) {
                console.log(`🚫 Spam blocked from ${msg.chat.id}: ${msg.text}`);
                await this.bot.deleteMessage(msg.chat.id, msg.message_id).catch(() => {});
                return;
            }
            
            // Forward mesajlarını engelle
            if (msg.forward_from || msg.forward_from_chat) {
                await this.bot.deleteMessage(msg.chat.id, msg.message_id).catch(() => {});
                this.bot.sendMessage(msg.chat.id, '⚠️ Forward mesajlar engellendi.');
                return;
            }
        });
        
        console.log('🛡️ Security handlers initialized');
    }
    
    // Spam detection
    isSpamMessage(msg) {
        if (!msg.text) return false;
        
        const spamPatterns = [
            /t\.me\/[a-zA-Z0-9_]+/i,
            /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i,
            /@[a-zA-Z0-9_]{5,}/i,
            /kazanç|para kazan|zengin ol|reklam|casino|bet|crypto/i,
            /\+90\s?\d{3}\s?\d{3}\s?\d{2}\s?\d{2}/
        ];
        
        const text = msg.text.toLowerCase();
        return spamPatterns.some(pattern => pattern.test(text));
    }
    
    // User management
    async getUser(chatId) {
        return await User.findOne({ chatId: String(chatId) });
    }
    
    async isAdmin(chatId) {
        const user = await this.getUser(chatId);
        return user && user.role === 'admin';
    }
    
    // State management
    setState(chatId, state, data = {}) {
        this.userStates.set(chatId, { state, data });
    }
    
    getState(chatId) {
        return this.userStates.get(chatId);
    }
    
    clearState(chatId) {
        this.userStates.delete(chatId);
    }
    
    // Send message with security
    async sendSecureMessage(chatId, message, options = {}) {
        try {
            return await this.bot.sendMessage(chatId, message, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                ...options
            });
        } catch (error) {
            console.error(`❌ Failed to send message to ${chatId}:`, error);
            return false;
        }
    }
}

// Bot instance
const sivalBot = new SivalTeamBot();

// ==================== KEYBOARDS ====================
const getMainKeyboard = (role) => {
    if (role === 'admin') {
        return {
            reply_markup: {
                keyboard: [
                    ['📋 Görev Ver', '👥 Kullanıcılar'],
                    ['📦 Eksik Ürünler', '📢 Duyuru Yap'],
                    ['📊 Raporlar', '⚙️ Ayarlar'],
                    ['ℹ️ Bilgilerim']
                ],
                resize_keyboard: true
            }
        };
    } else {
        return {
            reply_markup: {
                keyboard: [
                    ['📋 Görevlerim', '📦 Eksik Ürün Bildir'],
                    ['📢 Duyurular', 'ℹ️ Bilgilerim'],
                    ['🆘 Yardım']
                ],
                resize_keyboard: true
            }
        };
    }
};

const getInlineKeyboard = (type, data = {}) => {
    const keyboards = {
        task_actions: {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Tamamla', callback_data: `complete_task_${data.taskId}` },
                        { text: '📝 Detay', callback_data: `detail_task_${data.taskId}` }
                    ]
                ]
            }
        },
        task_assignment: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '👥 Herkese', callback_data: 'assign_all' }],
                    ...data.users.map(user => [
                        { text: `👤 ${user.firstName}`, callback_data: `assign_${user.chatId}` }
                    ])
                ]
            }
        },
        missing_product_actions: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✅ Tedarik Edildi', callback_data: `resolve_product_${data.productId}` }]
                ]
            }
        }
    };
    
    return keyboards[type] || { reply_markup: { inline_keyboard: [] } };
};

// ==================== MESSAGE HANDLERS ====================
async function handleStart(msg) {
    const chatId = msg.chat.id;
    const user = await sivalBot.getUser(chatId);
    
    if (user) {
        // Existing user
        user.lastActive = new Date();
        await user.save();
        
        const keyboard = getMainKeyboard(user.role);
        await sivalBot.sendSecureMessage(chatId, 
            `🏢 <b>SivalTeam Yönetim Sistemi</b>\n\n` +
            `👋 Hoş geldin ${user.firstName}!\n` +
            `👤 Rol: ${user.role === 'admin' ? '👑 Yönetici' : '👷 Çalışan'}\n\n` +
            `🚀 Menüden işleminizi seçebilirsiniz:`,
            keyboard
        );
    } else {
        // New user
        const totalUsers = await User.countDocuments();
        
        if (totalUsers === 0) {
            // First user becomes admin
            const newAdmin = new User({
                chatId: String(chatId),
                username: msg.from.username,
                firstName: msg.from.first_name,
                lastName: msg.from.last_name,
                role: 'admin'
            });
            await newAdmin.save();
            
            await sivalBot.sendSecureMessage(chatId, 
                `🎉 <b>İlk Yönetici Olarak Kayıt Oldunuz!</b>\n\n` +
                `👑 Sistem yöneticisi yetkileriniz aktif\n` +
                `🔐 Güvenlik sistemi aktif\n` +
                `🛡️ Spam koruması etkin\n\n` +
                `🚀 Başlamak için aşağıdaki menüyü kullanın:`,
                getMainKeyboard('admin')
            );
        } else {
            // Other users need approval
            const newUser = new User({
                chatId: String(chatId),
                username: msg.from.username,
                firstName: msg.from.first_name,
                lastName: msg.from.last_name,
                role: 'employee',
                isActive: false
            });
            await newUser.save();
            
            // Notify admins
            const admins = await User.find({ role: 'admin', isActive: true });
            for (const admin of admins) {
                await sivalBot.sendSecureMessage(admin.chatId,
                    `🆕 <b>Yeni Kullanıcı Kaydı</b>\n\n` +
                    `👤 <b>İsim:</b> ${msg.from.first_name} ${msg.from.last_name || ''}\n` +
                    `💬 <b>Username:</b> @${msg.from.username || 'N/A'}\n` +
                    `🆔 <b>ID:</b> ${chatId}\n\n` +
                    `✅ Onaylamak için: /approve_${chatId}\n` +
                    `❌ Reddetmek için: /reject_${chatId}`
                );
            }
            
            await sivalBot.sendSecureMessage(chatId, 
                `🏢 <b>SivalTeam Sistemine Hoş Geldiniz!</b>\n\n` +
                `📋 Kaydınız alındı ve yönetici onayına gönderildi\n` +
                `⏳ Lütfen onay sürecini bekleyin\n` +
                `📱 Sonuç bilgisi bu sohbet üzerinden gelecektir\n\n` +
                `💡 Sorularınız için yöneticinizle iletişime geçebilirsiniz.`
            );
        }
    }
}

async function handleApprove(msg, targetId) {
    const chatId = msg.chat.id;
    
    if (!await sivalBot.isAdmin(chatId)) {
        return sivalBot.sendSecureMessage(chatId, '❌ Bu komutu kullanma yetkiniz yok.');
    }
    
    const user = await User.findOne({ chatId: targetId });
    if (!user) {
        return sivalBot.sendSecureMessage(chatId, '❌ Kullanıcı bulunamadı.');
    }
    
    user.isActive = true;
    await user.save();
    
    await sivalBot.sendSecureMessage(targetId, 
        `✅ <b>Kaydınız Onaylandı!</b>\n\n` +
        `🎉 SivalTeam sistemine hoş geldiniz\n` +
        `🚀 Tüm özelliklere erişim aktif\n` +
        `📱 Başlamak için /start yazın`,
        getMainKeyboard('employee')
    );
    
    await sivalBot.sendSecureMessage(chatId, `✅ ${user.firstName} onaylandı ve sisteme eklendi.`);
}

async function handleReject(msg, targetId) {
    const chatId = msg.chat.id;
    
    if (!await sivalBot.isAdmin(chatId)) {
        return sivalBot.sendSecureMessage(chatId, '❌ Bu komutu kullanma yetkiniz yok.');
    }
    
    const user = await User.findOneAndDelete({ chatId: targetId });
    if (!user) {
        return sivalBot.sendSecureMessage(chatId, '❌ Kullanıcı bulunamadı.');
    }
    
    await sivalBot.sendSecureMessage(targetId, 
        `❌ <b>Kaydınız Reddedildi</b>\n\n` +
        `🚫 SivalTeam sistemine erişim reddedildi\n` +
        `📞 Bilgi için yöneticinizle iletişime geçin`
    );
    
    await sivalBot.sendSecureMessage(chatId, `❌ ${user.firstName} reddedildi ve sistemden kaldırıldı.`);
}

async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    if (!text) return;
    
    // Handle commands
    if (text === '/start') {
        return handleStart(msg);
    }
    
    const approveMatch = text.match(/^\/approve_(\d+)$/);
    if (approveMatch) {
        return handleApprove(msg, approveMatch[1]);
    }
    
    const rejectMatch = text.match(/^\/reject_(\d+)$/);
    if (rejectMatch) {
        return handleReject(msg, rejectMatch[1]);
    }
    
    const user = await sivalBot.getUser(chatId);
    if (!user || !user.isActive) return;
    
    // Update last active
    user.lastActive = new Date();
    await user.save();
    
    const state = sivalBot.getState(chatId);
    
    // Handle state-based responses
    if (state) {
        switch (state.state) {
            case 'awaiting_task_title':
                sivalBot.setState(chatId, 'awaiting_task_description', { title: text });
                return sivalBot.sendSecureMessage(chatId, '📝 <b>Görev açıklamasını yazın:</b>');
                
            case 'awaiting_task_description':
                const employees = await User.find({ role: 'employee', isActive: true });
                if (employees.length === 0) {
                    sivalBot.clearState(chatId);
                    return sivalBot.sendSecureMessage(chatId, '❌ Aktif çalışan bulunamadı.');
                }
                
                sivalBot.setState(chatId, 'awaiting_task_assignment', { 
                    ...state.data, 
                    description: text 
                });
                
                return sivalBot.sendSecureMessage(chatId, 
                    '👥 <b>Kime atanacak?</b>',
                    getInlineKeyboard('task_assignment', { users: employees })
                );
                
            case 'awaiting_product_name':
                sivalBot.setState(chatId, 'awaiting_product_quantity', { productName: text });
                return sivalBot.sendSecureMessage(chatId, '📊 <b>Kaç adet eksik?</b> (Sadece sayı yazın)');
                
            case 'awaiting_product_quantity':
                const quantity = parseInt(text);
                if (isNaN(quantity) || quantity <= 0) {
                    return sivalBot.sendSecureMessage(chatId, '❌ Geçerli bir sayı girin.');
                }
                
                const missingProduct = new MissingProduct({
                    productName: state.data.productName,
                    quantity: quantity,
                    reportedBy: chatId,
                    reportedByName: user.firstName
                });
                await missingProduct.save();
                
                // Notify admins
                const admins = await User.find({ role: 'admin', isActive: true });
                for (const admin of admins) {
                    await sivalBot.sendSecureMessage(admin.chatId,
                        `🚨 <b>Yeni Eksik Ürün Bildirimi!</b>\n\n` +
                        `📦 <b>Ürün:</b> ${state.data.productName}\n` +
                        `📊 <b>Miktar:</b> ${quantity} adet\n` +
                        `👤 <b>Bildiren:</b> ${user.firstName}\n` +
                        `📅 <b>Tarih:</b> ${new Date().toLocaleString('tr-TR')}`,
                        getInlineKeyboard('missing_product_actions', { productId: missingProduct._id })
                    );
                }
                
                await sivalBot.sendSecureMessage(chatId, 
                    `✅ <b>Eksik ürün bildirimi gönderildi!</b>\n\n` +
                    `📦 ${state.data.productName} - ${quantity} adet\n` +
                    `👑 Yöneticilere bildirim yapıldı`
                );
                sivalBot.clearState(chatId);
                return;
                
            case 'awaiting_announcement':
                const announcement = new Announcement({
                    content: text,
                    createdBy: user.firstName
                });
                await announcement.save();
                
                const allUsers = await User.find({ isActive: true });
                let sentCount = 0;
                
                for (const targetUser of allUsers) {
                    if (targetUser.chatId !== String(chatId)) {
                        const success = await sivalBot.sendSecureMessage(targetUser.chatId,
                            `📢 <b>DUYURU</b>\n\n${text}\n\n` +
                            `👤 <b>Gönderen:</b> ${user.firstName}\n` +
                            `📅 <b>Tarih:</b> ${new Date().toLocaleString('tr-TR')}`
                        );
                        if (success) sentCount++;
                    }
                }
                
                await sivalBot.sendSecureMessage(chatId, 
                    `✅ <b>Duyuru gönderildi!</b>\n\n` +
                    `📡 ${sentCount} kişiye ulaştırıldı\n` +
                    `📅 ${new Date().toLocaleString('tr-TR')}`
                );
                sivalBot.clearState(chatId);
                return;
        }
    }
    
    // Handle menu commands
    switch (text) {
        case '📋 Görev Ver':
            if (user.role !== 'admin') {
                return sivalBot.sendSecureMessage(chatId, '❌ Bu özellik sadece yöneticiler içindir.');
            }
            sivalBot.setState(chatId, 'awaiting_task_title');
            return sivalBot.sendSecureMessage(chatId, '📝 <b>Görev başlığını yazın:</b>');
            
        case '📋 Görevlerim':
            const myTasks = await Task.find({ 
                assignedTo: String(chatId),
                status: { $in: ['pending', 'in_progress'] }
            }).sort({ createdAt: -1 });
            
            if (myTasks.length === 0) {
                return sivalBot.sendSecureMessage(chatId, '✅ Bekleyen göreviniz yok.');
            }
            
            for (const task of myTasks.slice(0, 5)) {
                await sivalBot.sendSecureMessage(chatId,
                    `📋 <b>GÖREV</b>\n\n` +
                    `📌 <b>Başlık:</b> ${task.title}\n` +
                    `📝 <b>Açıklama:</b> ${task.description}\n` +
                    `⏰ <b>Durum:</b> ${task.status}\n` +
                    `📅 <b>Tarih:</b> ${task.createdAt.toLocaleDateString('tr-TR')}`,
                    getInlineKeyboard('task_actions', { taskId: task._id })
                );
            }
            break;
            
        case '📦 Eksik Ürün Bildir':
            sivalBot.setState(chatId, 'awaiting_product_name');
            return sivalBot.sendSecureMessage(chatId, '📦 <b>Eksik ürünün adını yazın:</b>');
            
        case '📦 Eksik Ürünler':
            if (user.role !== 'admin') {
                return sivalBot.sendSecureMessage(chatId, '❌ Bu özellik sadece yöneticiler içindir.');
            }
            
            const missingProducts = await MissingProduct.find({ resolved: false })
                .sort({ createdAt: -1 })
                .limit(10);
                
            if (missingProducts.length === 0) {
                return sivalBot.sendSecureMessage(chatId, '✅ Eksik ürün bildirimi yok.');
            }
            
            for (const product of missingProducts) {
                await sivalBot.sendSecureMessage(chatId,
                    `📦 <b>EKSİK ÜRÜN</b>\n\n` +
                    `📌 <b>Ürün:</b> ${product.productName}\n` +
                    `📊 <b>Miktar:</b> ${product.quantity} adet\n` +
                    `👤 <b>Bildiren:</b> ${product.reportedByName}\n` +
                    `📅 <b>Tarih:</b> ${product.createdAt.toLocaleDateString('tr-TR')}`,
                    getInlineKeyboard('missing_product_actions', { productId: product._id })
                );
            }
            break;
            
        case '📢 Duyuru Yap':
            if (user.role !== 'admin') {
                return sivalBot.sendSecureMessage(chatId, '❌ Bu özellik sadece yöneticiler içindir.');
            }
            sivalBot.setState(chatId, 'awaiting_announcement');
            return sivalBot.sendSecureMessage(chatId, '📢 <b>Duyuru mesajınızı yazın:</b>');
            
        case '👥 Kullanıcılar':
            if (user.role !== 'admin') {
                return sivalBot.sendSecureMessage(chatId, '❌ Bu özellik sadece yöneticiler içindir.');
            }
            
            const users = await User.find({ isActive: true }).sort({ registeredAt: -1 });
            let userList = `👥 <b>KULLANICI LİSTESİ</b>\n\n`;
            
            users.forEach((u, index) => {
                userList += `${index + 1}. ${u.role === 'admin' ? '👑' : '👷'} ${u.firstName} ${u.lastName || ''}\n`;
                userList += `   💬 @${u.username || 'N/A'}\n`;
                userList += `   📅 ${u.registeredAt.toLocaleDateString('tr-TR')}\n\n`;
            });
            
            return sivalBot.sendSecureMessage(chatId, userList);
            
        case '📊 Raporlar':
            if (user.role !== 'admin') {
                return sivalBot.sendSecureMessage(chatId, '❌ Bu özellik sadece yöneticiler içindir.');
            }
            
            const totalUsers = await User.countDocuments({ isActive: true });
            const totalTasks = await Task.countDocuments();
            const pendingTasks = await Task.countDocuments({ status: 'pending' });
            const completedTasks = await Task.countDocuments({ status: 'completed' });
            const missingCount = await MissingProduct.countDocuments({ resolved: false });
            
            return sivalBot.sendSecureMessage(chatId,
                `📊 <b>SİSTEM RAPORU</b>\n\n` +
                `👥 <b>Kullanıcılar:</b> ${totalUsers}\n` +
                `📋 <b>Toplam Görev:</b> ${totalTasks}\n` +
                `⏳ <b>Bekleyen Görev:</b> ${pendingTasks}\n` +
                `✅ <b>Tamamlanan:</b> ${completedTasks}\n` +
                `📦 <b>Eksik Ürün:</b> ${missingCount}\n\n` +
                `📅 <b>Rapor Tarihi:</b> ${new Date().toLocaleString('tr-TR')}\n` +
                `🛡️ <b>Güvenlik:</b> Aktif\n` +
                `⚡ <b>Rate Limit:</b> Aktif`
            );
            
        case 'ℹ️ Bilgilerim':
            return sivalBot.sendSecureMessage(chatId,
                `👤 <b>KULLANICI BİLGİLERİ</b>\n\n` +
                `👤 <b>İsim:</b> ${user.firstName} ${user.lastName || ''}\n` +
                `💬 <b>Username:</b> @${user.username || 'N/A'}\n` +
                `🏷️ <b>Rol:</b> ${user.role === 'admin' ? '👑 Yönetici' : '👷 Çalışan'}\n` +
                `📅 <b>Kayıt:</b> ${user.registeredAt.toLocaleDateString('tr-TR')}\n` +
                `🕐 <b>Son Aktif:</b> ${user.lastActive.toLocaleDateString('tr-TR')}\n` +
                `🆔 <b>Chat ID:</b> ${chatId}`
            );
            
        case '🆘 Yardım':
            const helpMsg = user.role === 'admin' ? 
                `🆘 <b>YÖNETİCİ YARDIM</b>\n\n` +
                `📋 <b>Görev Ver</b> - Çalışanlara görev atama\n` +
                `👥 <b>Kullanıcılar</b> - Kullanıcı listesi\n` +
                `📦 <b>Eksik Ürünler</b> - Ürün raporları\n` +
                `📢 <b>Duyuru Yap</b> - Toplu mesaj gönder\n` +
                `📊 <b>Raporlar</b> - Sistem istatistikleri\n\n` +
                `⚙️ <b>Komutlar:</b>\n` +
                `/approve_ID - Kullanıcı onayla\n` +
                `/reject_ID - Kullanıcı reddet` :
                `🆘 <b>ÇALIŞAN YARDIM</b>\n\n` +
                `📋 <b>Görevlerim</b> - Atanan görevler\n` +
                `📦 <b>Eksik Ürün Bildir</b> - Ürün eksikliği\n` +
                `📢 <b>Duyurular</b> - Sistem duyuruları\n` +
                `ℹ️ <b>Bilgilerim</b> - Hesap bilgileri`;
                
            return sivalBot.sendSecureMessage(chatId, helpMsg);
    }
}

async function handleCallbackQuery(query) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;
    
    const user = await sivalBot.getUser(chatId);
    if (!user || !user.isActive) return;
    
    try {
        if (data.startsWith('complete_task_')) {
            const taskId = data.replace('complete_task_', '');
            
            await Task.updateOne(
                { _id: taskId },
                { 
                    status: 'completed', 
                    completedAt: new Date() 
                }
            );
            
            await sivalBot.bot.editMessageText(
                `✅ <b>Görev tamamlandı!</b>\n\n` +
                `👤 <b>Tamamlayan:</b> ${user.firstName}\n` +
                `📅 <b>Tamamlama:</b> ${new Date().toLocaleString('tr-TR')}`,
                { 
                    chat_id: chatId, 
                    message_id: messageId,
                    parse_mode: 'HTML'
                }
            );
            
            // Notify admin
            const task = await Task.findById(taskId);
            if (task && task.assignedBy) {
                await sivalBot.sendSecureMessage(task.assignedBy,
                    `✅ <b>Görev Tamamlandı!</b>\n\n` +
                    `📋 <b>Görev:</b> ${task.title}\n` +
                    `👤 <b>Tamamlayan:</b> ${user.firstName}\n` +
                    `📅 <b>Tarih:</b> ${new Date().toLocaleString('tr-TR')}`
                );
            }
        }
        
        else if (data.startsWith('assign_')) {
            const state = sivalBot.getState(chatId);
            if (!state || state.state !== 'awaiting_task_assignment') return;
            
            const targetId = data === 'assign_all' ? 'all' : data.replace('assign_', '');
            
            if (targetId === 'all') {
                const employees = await User.find({ role: 'employee', isActive: true });
                
                const task = new Task({
                    title: state.data.title,
                    description: state.data.description,
                    assignedTo: employees.map(e => e.chatId),
                    assignedBy: String(chatId)
                });
                await task.save();
                
                // Notify all employees
                for (const emp of employees) {
                    await sivalBot.sendSecureMessage(emp.chatId,
                        `📋 <b>YENİ GÖREV ATANDI!</b>\n\n` +
                        `📌 <b>Başlık:</b> ${state.data.title}\n` +
                        `📝 <b>Açıklama:</b> ${state.data.description}\n` +
                        `👤 <b>Atayan:</b> ${user.firstName}`,
                        getInlineKeyboard('task_actions', { taskId: task._id })
                    );
                }
                
                await sivalBot.bot.editMessageText(
                    `✅ <b>Toplu Görev Atandı!</b>\n\n` +
                    `📋 ${state.data.title}\n` +
                    `👥 ${employees.length} çalışana gönderildi`,
                    { 
                        chat_id: chatId, 
                        message_id: messageId,
                        parse_mode: 'HTML'
                    }
                );
            } else {
                const task = new Task({
                    title: state.data.title,
                    description: state.data.description,
                    assignedTo: [targetId],
                    assignedBy: String(chatId)
                });
                await task.save();
                
                const targetUser = await User.findOne({ chatId: targetId });
                
                await sivalBot.sendSecureMessage(targetId,
                    `📋 <b>YENİ GÖREV ATANDI!</b>\n\n` +
                    `📌 <b>Başlık:</b> ${state.data.title}\n` +
                    `📝 <b>Açıklama:</b> ${state.data.description}\n` +
                    `👤 <b>Atayan:</b> ${user.firstName}`,
                    getInlineKeyboard('task_actions', { taskId: task._id })
                );
                
                await sivalBot.bot.editMessageText(
                    `✅ <b>Görev Atandı!</b>\n\n` +
                    `📋 ${state.data.title}\n` +
                    `👤 ${targetUser.firstName} kullanıcısına atandı`,
                    { 
                        chat_id: chatId, 
                        message_id: messageId,
                        parse_mode: 'HTML'
                    }
                );
            }
            
            sivalBot.clearState(chatId);
        }
        
        else if (data.startsWith('resolve_product_')) {
            const productId = data.replace('resolve_product_', '');
            
            await MissingProduct.updateOne(
                { _id: productId },
                { 
                    resolved: true, 
                    resolvedAt: new Date() 
                }
            );
            
            await sivalBot.bot.editMessageText(
                `✅ <b>Ürün Tedarik Edildi!</b>\n\n` +
                `👤 <b>İşlem Yapan:</b> ${user.firstName}\n` +
                `📅 <b>Çözüm Tarihi:</b> ${new Date().toLocaleString('tr-TR')}`,
                { 
                    chat_id: chatId, 
                    message_id: messageId,
                    parse_mode: 'HTML'
                }
            );
        }
        
        await sivalBot.bot.answerCallbackQuery(query.id);
        
    } catch (error) {
        console.error('Callback query error:', error);
        await sivalBot.bot.answerCallbackQuery(query.id, { text: '❌ İşlem başarısız' });
    }
}

// ==================== EXPRESS ROUTES ====================
app.get('/', (req, res) => {
    res.json({
        name: '🏢 SivalTeam Management Bot',
        version: '2.0',
        status: 'active',
        features: ['Security', 'Rate Limiting', 'Spam Protection', 'MongoDB'],
        timestamp: new Date().toISOString()
    });
});

app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
    try {
        const { message, callback_query } = req.body;
        
        if (message) {
            await handleMessage(message);
        }
        
        if (callback_query) {
            await handleCallbackQuery(callback_query);
        }
        
        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error);
        res.sendStatus(500);
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const totalTasks = await Task.countDocuments();
        const pendingTasks = await Task.countDocuments({ status: 'pending' });
        
        res.json({
            status: 'healthy',
            database: 'connected',
            bot: 'active',
            security: 'enabled',
            stats: {
                totalUsers,
                activeUsers,
                totalTasks,
                pendingTasks
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ==================== START SERVER ====================
connectDB().then(() => {
    app.listen(PORT, async () => {
        console.log(`🚀 SivalTeam Bot Server running on port ${PORT}`);
        console.log(`📌 Base URL: ${WEBHOOK_URL}`);
        console.log(`🔗 Full Webhook: ${WEBHOOK_URL}/webhook/${BOT_TOKEN}`);
        console.log(`🤖 Bot Token: ${BOT_TOKEN ? 'SET ✅' : 'NOT SET ❌'}`);
        console.log(`🗄️ MongoDB: ${MONGODB_URI ? 'Atlas Connected ✅' : 'NOT SET ❌'}`);
        console.log(`🛡️ Security Features: Rate Limiting ✅ | Spam Filter ✅ | Helmet ✅`);
        
        // Webhook info
        try {
            const webhookInfo = await sivalBot.bot.getWebHookInfo();
            console.log('📡 Webhook Status:', webhookInfo.url ? 'Active ✅' : 'Not Set ❌');
        } catch (error) {
            console.log('⚠️ Webhook info error:', error.message);
        }
        
        console.log('✅ SivalTeam Bot v2.0 - Professional Edition Ready!');
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down SivalTeam Bot...');
    mongoose.connection.close();
    process.exit(0);
});

module.exports = { app, sivalBot };