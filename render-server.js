const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const EventEmitter = require('events');
require('dotenv').config();

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN || '8229159175:AAGRFoLpK9ma5ekPiaaCdI8EKJeca14XoOg';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://serkser2_db_user:4K9JpoVC9U90UtmI@cluster0.pixopf1.mongodb.net/sivalteam?retryWrites=true&w=majority';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://sivalteam-bot.onrender.com';
const PORT = process.env.PORT || 10000;

// ==================== EXPRESS SETUP ====================
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Turkey time helper
const getTurkeyTime = () => {
    return new Date().toLocaleString('tr-TR', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

// Keep-alive mechanism: Active EXCEPT 2AM-8AM (sleep time)
const keepAlive = () => {
    setInterval(async () => {
        const now = new Date();
        const turkeyTime = new Date(now.getTime() + (3 * 60 * 60 * 1000)); // UTC+3 Turkey time
        const hour = turkeyTime.getHours();
        
        // Sleep between 2AM and 8AM Turkey time, keep alive other times
        if (hour >= 2 && hour < 8) {
            console.log(`😴 Sleep time (${hour}:${turkeyTime.getMinutes().toString().padStart(2, '0')}): Keep-alive disabled`);
        } else {
            try {
                const response = await fetch(`${WEBHOOK_URL}/health`);
                console.log(`🟢 Keep-alive ping (${hour}:${turkeyTime.getMinutes().toString().padStart(2, '0')}): ${response.status}`);
            } catch (error) {
                console.log(`❌ Keep-alive ping failed (${hour}:${turkeyTime.getMinutes().toString().padStart(2, '0')}):`, error.message);
            }
        }
    }, 10 * 60 * 1000); // Check every 10 minutes
};

// Log current time every 30 minutes
setInterval(() => {
    console.log(`🕐 Current Turkey time: ${getTurkeyTime()}`);
}, 30 * 60 * 1000);

// Start keep-alive in production (Render)
if (process.env.NODE_ENV === 'production') {
    keepAlive();
    console.log('🔄 Keep-alive started: Active 8AM-2AM, Sleep 2AM-8AM Turkey time');
}

// Rate limiting - very permissive to prevent performance issues
const rateLimiter = new RateLimiterMemory({
    keyPrefix: 'sivalteam_bot',
    points: 1000, // Very high limit
    duration: 60,
    blockDuration: 10, // Short block time
});

// ==================== MONGODB SCHEMAS ====================
// User Schema - Çalışan bilgileri
const userSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true },
    username: String,
    firstName: String,
    lastName: String,
    role: { type: String, enum: ['admin', 'employee', 'manager'], default: 'employee' },
    isActive: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
    department: String,
    position: String,
    shift: { type: String, enum: ['Sabah', 'Öğlen', 'Akşam', 'Gece'], default: 'Sabah' },
    preferredShift: String,
    registeredAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
    telegramUsername: String,
    phone: String,
    email: String
});

// Task Schema - Görev yönetimi
const taskSchema = new mongoose.Schema({
    taskId: { type: String, unique: true, sparse: true }, // Add taskId field to match existing index
    title: { type: String, required: true },
    description: String,
    assignmentType: { type: String, enum: ['individual', 'group'], default: 'individual' },
    assignedTo: [{
        userId: String,
        name: String,
        completed: { type: Boolean, default: false },
        completedAt: Date
    }],
    assignedBy: String,
    assignedByName: String,
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
    category: String,
    dueDate: Date,
    createdAt: { type: Date, default: Date.now },
    completedAt: Date,
    completedCount: { type: Number, default: 0 },
    totalAssigned: { type: Number, default: 0 },
    tags: [String]
});

// Missing Product Schema - Eksik ürün takibi
const missingProductSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    category: { type: String, enum: ['kadın', 'erkek', 'çocuk', 'çamaşır', 'ayakkabı', 'ev_tekstili'], required: true },
    quantity: Number,
    unit: String,
    reportedBy: String,
    reportedByName: String,
    reportMethod: { type: String, enum: ['text', 'photo', 'voice'], default: 'text' },
    photoUrl: String,
    voiceFileId: String,
    location: String,
    urgency: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['reported', 'confirmed', 'ordered', 'resolved'], default: 'reported' },
    reportedAt: { type: Date, default: Date.now },
    resolvedAt: Date,
    resolvedBy: String,
    notes: String,
    estimatedCost: Number
});

// Announcement Schema - Duyuru sistemi
const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    createdBy: String,
    createdByName: String,
    targetRole: { type: String, enum: ['all', 'admin', 'manager', 'employee'], default: 'all' },
    targetDepartments: [String],
    priority: { type: String, enum: ['info', 'warning', 'urgent'], default: 'info' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
    readBy: [{ userId: String, readAt: Date }]
});

// Attendance Schema - Mesai takibi
const attendanceSchema = new mongoose.Schema({
    userId: String,
    userName: String,
    date: { type: Date, default: Date.now },
    checkIn: Date,
    checkOut: Date,
    breakStart: Date,
    breakEnd: Date,
    totalBreakMinutes: { type: Number, default: 0 },
    status: { type: String, enum: ['present', 'absent', 'late', 'on_leave'], default: 'present' },
    location: String,
    overtime: { type: Number, default: 0 },
    notes: String
});

// Employee Request Schema - Çalışan talepleri
const employeeRequestSchema = new mongoose.Schema({
    employeeId: String,
    employeeName: String,
    type: { type: String, enum: ['leave', 'shift_change', 'overtime', 'expense', 'other'], required: true },
    details: mongoose.Schema.Types.Mixed,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    reason: String,
    adminNote: String,
    createdAt: { type: Date, default: Date.now },
    processedAt: Date,
    processedBy: String
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const MissingProduct = mongoose.model('MissingProduct', missingProductSchema);
const Announcement = mongoose.model('Announcement', announcementSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const EmployeeRequest = mongoose.model('EmployeeRequest', employeeRequestSchema);

// ==================== TELEGRAM BOT CLASS ====================
class SivalTeamBot extends EventEmitter {
    constructor() {
        super();
        this.bot = new Telegraf(BOT_TOKEN);
        this.userStates = new Map();
        this.requests = new Map();
        this.setupMiddleware();
        this.setupHandlers();
        this.setupCallbackHandlers();
        this.setupAdminCommands();
        this.setupWebhook();
        console.log(`🤖 SivalTeam Bot initialized at ${getTurkeyTime()}`);
    }

    setupMiddleware() {
        // Global error handler to prevent crashes
        this.bot.use(async (ctx, next) => {
            try {
                await next();
            } catch (error) {
                console.error('Bot middleware error:', error);
                try {
                    await ctx.reply('⚠️ Geçici bir hata oluştu, lütfen tekrar deneyin.');
                } catch (replyError) {
                    console.error('Failed to send error message:', replyError);
                }
            }
        });
        
        // Performance monitoring
        this.bot.use(async (ctx, next) => {
            const start = Date.now();
            await next();
            const duration = Date.now() - start;
            if (duration > 2000) {
                console.warn(`Slow response: ${duration}ms for ${ctx.updateType}`);
            }
        });
    }

    setupHandlers() {
        // Start command
        this.bot.start(async (ctx) => {
            const chatId = ctx.chat.id.toString();
            const user = await User.findOne({ chatId });

            if (!user) {
                // Check if there is any admin in the system
                const adminCount = await User.countDocuments({ role: 'admin' });
                const isFirstAdmin = adminCount === 0;
                
                console.log(`🔍 Admin check: adminCount=${adminCount}, isFirstAdmin=${isFirstAdmin}`);
                
                if (isFirstAdmin) {
                    // First admin - direct registration
                    const newUser = new User({
                        chatId,
                        username: ctx.from.username,
                        firstName: ctx.from.first_name,
                        lastName: ctx.from.last_name,
                        telegramUsername: ctx.from.username,
                        role: 'admin',
                        isApproved: true,
                        department: 'Yönetim' // Default admin department
                    });
                    await newUser.save();
                    
                    console.log(`👑 First admin registered: ${ctx.from.first_name} (${chatId})`);
                    
                    await ctx.reply(
                        '🎉 *SivalTeam Bot\'a Hoş Geldiniz!*\n\n' +
                        `Merhaba ${ctx.from.first_name}!\n` +
                        `Tebrikler! Bot'un ilk kullanıcısı olarak otomatik admin yetkisi aldınız.\n\n` +
                        '👨‍💼 Artık tüm admin özelliklerini kullanabilirsiniz.',
                        { 
                            parse_mode: 'Markdown',
                            ...this.getMainKeyboard('admin')
                        }
                    );
                } else {
                    // Regular user - ask for department first
                    await ctx.reply(
                        '👋 *SivalTeam Bot\'a Hoş Geldiniz!*\n\n' +
                        `Merhaba ${ctx.from.first_name}!\n\n` +
                        '🏢 Lütfen departmanınızı seçin:',
                        { 
                            parse_mode: 'Markdown',
                            ...Markup.inlineKeyboard([
                                [Markup.button.callback('🛍️ Satış', 'dept_satis')],
                                [Markup.button.callback('📦 Depo', 'dept_depo')],
                                [Markup.button.callback('👔 İnsan Kaynakları', 'dept_ik')],
                                [Markup.button.callback('💰 Muhasebe', 'dept_muhasebe')],
                                [Markup.button.callback('🔧 Teknik', 'dept_teknik')],
                                [Markup.button.callback('🏪 Mağaza', 'dept_magaza')],
                                [Markup.button.callback('🚚 Kargo', 'dept_kargo')],
                                [Markup.button.callback('📞 Müşteri Hizmetleri', 'dept_musteri')]
                            ])
                        }
                    );
                    
                    // Set user state for department selection
                    this.userStates.set(chatId, {
                        action: 'register_user',
                        step: 'department_selection',
                        data: {
                            chatId,
                            username: ctx.from.username,
                            firstName: ctx.from.first_name,
                            lastName: ctx.from.last_name,
                            telegramUsername: ctx.from.username
                        }
                    });
                }
                return;
            }

            // If user was deactivated (kicked), reactivate and require approval
            if (!user.isActive) {
                await User.findOneAndUpdate(
                    { chatId },
                    { 
                        isActive: true,
                        isApproved: false, // Require new approval
                        lastActive: new Date()
                    }
                );
                
                await ctx.reply(
                    '👋 *Tekrar Hoş Geldiniz!*\n\n' +
                    'Bottan çıkarılmıştınız ancak tekrar katıldınız.\n' +
                    '⏳ Yönetici onayı bekleniyor.',
                    { parse_mode: 'Markdown' }
                );
                
                // Notify admins of return with department info
                await this.notifyAdmins(
                    `🔄 *Kullanıcı Geri Döndü*\n\n` +
                    `👤 ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
                    `🆔 @${ctx.from.username || 'username yok'}\n` +
                    `🏢 Departman: ${user.department || 'Belirtilmemiş'}\n` +
                    `💬 Chat ID: ${chatId}\n\n` +
                    `Bu kullanıcı daha önce bottan çıkarılmış, tekrar katıldı.`,
                    this.getApprovalKeyboard(chatId)
                );
                return;
            }

            if (!user.isApproved) {
                await ctx.reply(
                    '⏳ *Onay Bekleniyor*\n\n' +
                    'Hesabınız henüz yönetici tarafından onaylanmamış.\n' +
                    'Lütfen bekleyin veya yöneticinizle iletişime geçin.',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            const welcomeMessage = this.getWelcomeMessage(user);
            await ctx.reply(welcomeMessage, {
                parse_mode: 'Markdown',
                ...this.getMainKeyboard(user.role)
            });
        });

        // Ana menü butonları - Çalışan
        this.bot.hears('📋 Görevlerim', async (ctx) => await this.showMyTasks(ctx));
        this.bot.hears('📦 Eksik Ürün Bildir', async (ctx) => await this.reportMissingProduct(ctx));
        this.bot.hears('📢 Duyurular', async (ctx) => await this.showAnnouncements(ctx));
        this.bot.hears('📊 Durum', async (ctx) => await this.showStatus(ctx));
        this.bot.hears('❓ Yardım', async (ctx) => await this.showHelp(ctx));
        
        // Ana menü butonları - Admin
        this.bot.hears('➕ Görev Oluştur', async (ctx) => await this.createTask(ctx));
        this.bot.hears('📋 Aktif Görevler', async (ctx) => await this.showActiveTasks(ctx));
        this.bot.hears('📦 Eksik Ürünler Listesi', async (ctx) => await this.showMissingProductsList(ctx));
        this.bot.hears('👥 Kullanıcılar', async (ctx) => await this.showUsers(ctx));
        this.bot.hears('📢 Duyuru Yayınla', async (ctx) => await this.publishAnnouncement(ctx));
        
        // Handle photo messages for missing products
        this.bot.on('photo', async (ctx) => await this.handlePhotoMessage(ctx));
        
        // Handle voice messages for missing products
        this.bot.on('voice', async (ctx) => await this.handleVoiceMessage(ctx));

        // Text message handler for states
        this.bot.on('text', async (ctx) => {
            const chatId = ctx.chat.id.toString();
            const state = this.userStates.get(chatId);
            
            console.log(`📝 Text message from ${chatId}: "${ctx.message.text}"`);
            console.log(`🔍 Current state:`, state);
            
            if (state) {
                await this.handleStateInput(ctx, state);
            }
        });
    }

    setupCallbackHandlers() {
        this.bot.on('callback_query', async (ctx) => {
            const data = ctx.callbackQuery.data;
            const chatId = ctx.chat.id.toString();
            
            try {
                // User approval callbacks
                if (data.startsWith('approve_user_')) {
                    await this.handleUserApproval(ctx, data);
                }
                else if (data.startsWith('reject_user_')) {
                    await this.handleUserRejection(ctx, data);
                }
                else if (data.startsWith('block_user_')) {
                    await this.handleUserBlock(ctx, data);
                }
                else if (data.startsWith('delete_user_')) {
                    await this.handleUserDeletion(ctx, data);
                }
                else if (data.startsWith('promote_user_')) {
                    await this.handleUserPromotion(ctx, data);
                }
                // Category selection for missing products
                else if (data.startsWith('category_')) {
                    await this.handleCategorySelection(ctx, data);
                }
                // Task assignment callbacks (must be before generic task_ handler)
                else if (data.startsWith('task_individual')) {
                    await this.handleIndividualTaskAssignment(ctx);
                }
                else if (data.startsWith('task_group')) {
                    await this.handleGroupTaskAssignment(ctx);
                }
                // Task completion callbacks (format: task_complete_ID or task_undo_ID)
                else if (data.startsWith('task_complete_') || data.startsWith('task_undo_')) {
                    await this.handleTaskCallback(ctx, data);
                }
                // Product callbacks
                else if (data.startsWith('complete_product_')) {
                    await this.handleProductCompletion(ctx, data);
                }
                // Leave callbacks
                else if (data.startsWith('leave_')) {
                    await this.handleLeaveCallback(ctx, data);
                }
                // Shift callbacks
                else if (data.startsWith('shift_')) {
                    await this.handleShiftCallback(ctx, data);
                }
                // Cancel callbacks
                else if (data.startsWith('cancel_')) {
                    await this.handleCancelCallback(ctx, data);
                }
                // Employee selection for tasks
                else if (data.startsWith('select_employee_')) {
                    await this.handleEmployeeSelection(ctx, data);
                }
                // Generic task callbacks (fallback)
                else if (data.startsWith('task_')) {
                    console.log(`⚠️ Unhandled task callback: "${data}"`);
                    await ctx.answerCbQuery('Bu özellik henüz aktif değil.');
                }
                // Department selection for new users
                else if (data.startsWith('dept_')) {
                    await this.handleDepartmentSelection(ctx, data);
                }

                await ctx.answerCbQuery();
            } catch (error) {
                console.error('Callback error:', error);
                try {
                    await ctx.answerCbQuery('❌ İşlem başarısız!');
                } catch (cbError) {
                    console.error('Answer callback error:', cbError);
                }
            }
        });
    }

    setupAdminCommands() {
        this.bot.command('broadcast', async (ctx) => await this.broadcastMessage(ctx));
        this.bot.command('stats', async (ctx) => await this.showStats(ctx));
    }

    // ==================== HANDLER METHODS ====================
    
    async showMyTasks(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || !user.isApproved) return;

        const tasks = await Task.find({
            'assignedTo.userId': user.chatId,
            status: { $ne: 'completed' }
        }).sort({ priority: -1, dueDate: 1 });

        if (tasks.length === 0) {
            await ctx.reply('✅ Aktif göreviniz bulunmuyor.');
            return;
        }

        for (const task of tasks) {
            const assignee = task.assignedTo.find(a => a.userId === user.chatId);
            const priorityIcon = {
                low: '🟢', medium: '🟡', high: '🔴', urgent: '🚨'
            }[task.priority];
            
            const message = `${priorityIcon} *Görev #${task._id.toString().slice(-6)}*\n\n` +
                `📌 *${task.title}*\n` +
                `📝 ${task.description || 'Açıklama yok'}\n` +
                `⏰ Son: ${task.dueDate ? task.dueDate.toLocaleDateString('tr-TR') : 'Belirtilmemiş'}\n` +
                `📊 Durum: ${assignee.completed ? '✅ Tamamlandı' : '⏳ Bekliyor'}`;

            const keyboard = !assignee.completed ? Markup.inlineKeyboard([
                [Markup.button.callback('✅ Tamamla', `task_complete_${task._id}`)]
            ]) : Markup.inlineKeyboard([
                [Markup.button.callback('↩️ Tamamlanmadı', `task_undo_${task._id}`)]
            ]);

            await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
        }
    }

    // Employee - Missing Product Report with Categories
    async reportMissingProduct(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || !user.isApproved) {
            await ctx.reply('❌ Bu özelliği kullanma yetkiniz yok.');
            return;
        }

        await ctx.reply(
            '📦 *Eksik Ürün Bildirimi*\n\nHangi kategoriden ürün eksik?',
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('👩 Kadın', 'category_kadın')],
                    [Markup.button.callback('👨 Erkek', 'category_erkek')],
                    [Markup.button.callback('🧒 Çocuk', 'category_çocuk')],
                    [Markup.button.callback('👕 Çamaşır', 'category_çamaşır')],
                    [Markup.button.callback('👟 Ayakkabı', 'category_ayakkabı')],
                    [Markup.button.callback('🏠 Ev Tekstili', 'category_ev_tekstili')],
                    [Markup.button.callback('❌ İptal', 'cancel_report')]
                ])
            }
        );
    }
    
    // Admin - Missing Products List
    async showMissingProductsList(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            await ctx.reply('❌ Bu özellik sadece yöneticiler içindir.');
            return;
        }

        const products = await MissingProduct.find({
            status: { $ne: 'resolved' }
        }).sort({ reportedAt: -1 });

        if (products.length === 0) {
            await ctx.reply('📦 Bekleyen eksik ürün bildirimi bulunmuyor.');
            return;
        }

        let message = '📦 *Eksik Ürünler Listesi*\n\n';
        
        for (let i = 0; i < products.length && i < 10; i++) {
            const product = products[i];
            const categoryIcon = this.getCategoryIcon(product.category);
            const urgencyIcon = {
                low: '🟢', medium: '🟡', high: '🔴', critical: '🚨'
            }[product.urgency];
            
            message += `${urgencyIcon} ${categoryIcon} *${product.productName}*\n`;
            message += `📊 ${product.quantity || 1} ${product.unit || 'adet'}\n`;
            message += `👤 ${product.reportedByName}\n`;
            message += `📅 ${product.reportedAt.toLocaleDateString('tr-TR')}\n`;
            
            if (product.reportMethod === 'photo' && product.photoUrl) {
                message += `📸 Fotoğraf var\n`;
            } else if (product.reportMethod === 'voice' && product.voiceFileId) {
                message += `🎙️ Ses kaydı var\n`;
            }
            
            message += `─────────────\n`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });

        // Show completion buttons for each product
        const keyboard = products.slice(0, 10).map(p => [
            Markup.button.callback(
                `✅ ${p.productName} - Tamamlandı`,
                `complete_product_${p._id}`
            )
        ]);

        if (keyboard.length > 0) {
            await ctx.reply(
                '🔧 Tamamlanan ürünleri işaretleyin:',
                Markup.inlineKeyboard(keyboard)
            );
        }
    }
    
    // Admin - Create Task
    async createTask(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            await ctx.reply('❌ Bu özellik sadece yöneticiler içindir.');
            return;
        }

        await ctx.reply(
            '📋 *Görev Oluştur*\n\nKime görev atanacak?',
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('👤 Bireysel Atama', 'task_individual')],
                    [Markup.button.callback('👥 Toplu Atama', 'task_group')],
                    [Markup.button.callback('❌ İptal', 'cancel_task')]
                ])
            }
        );
    }
    
    // Admin - Show Active Tasks
    async showActiveTasks(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            await ctx.reply('❌ Bu özellik sadece yöneticiler içindir.');
            return;
        }

        const tasks = await Task.find({
            status: { $ne: 'completed' }
        }).sort({ createdAt: -1 });

        if (tasks.length === 0) {
            await ctx.reply('📋 Aktif görev bulunmuyor.');
            return;
        }

        for (const task of tasks.slice(0, 10)) {
            const priorityIcon = {
                low: '🟢', medium: '🟡', high: '🔴', urgent: '🚨'
            }[task.priority];
            
            const completedCount = task.assignedTo.filter(a => a.completed).length;
            const totalAssigned = task.assignedTo.length;
            const progressBar = this.getProgressBar(completedCount, totalAssigned);
            
            let message = `${priorityIcon} *Görev #${task._id.toString().slice(-6)}*\n\n`;
            message += `📌 *${task.title}*\n`;
            message += `📝 ${task.description || 'Açıklama yok'}\n`;
            message += `👥 Atanan: ${totalAssigned} kişi\n`;
            message += `✅ Tamamlanan: ${completedCount}/${totalAssigned}\n`;
            message += `${progressBar}\n`;
            message += `📅 ${task.createdAt.toLocaleDateString('tr-TR')}\n\n`;
            
            // Show who completed
            const completed = task.assignedTo.filter(a => a.completed);
            if (completed.length > 0) {
                message += `*Tamamlayanlar:*\n`;
                completed.forEach(c => {
                    message += `✓ ${c.name}\n`;
                });
                message += `\n`;
            }
            
            // Show who's pending
            const pending = task.assignedTo.filter(a => !a.completed);
            if (pending.length > 0) {
                message += `*Bekleyenler:*\n`;
                pending.forEach(p => {
                    message += `⏳ ${p.name}\n`;
                });
            }

            await ctx.reply(message, { parse_mode: 'Markdown' });
        }
    }

    async showUsers(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            await ctx.reply('❌ Bu özellik sadece yöneticiler içindir.');
            return;
        }

        const users = await User.find({ isActive: true }).sort({ registeredAt: -1 });

        if (users.length === 0) {
            await ctx.reply('👥 Aktif kullanıcı bulunamadı.');
            return;
        }

        // Pending approvals first
        const pendingUsers = users.filter(u => !u.isApproved);
        const approvedUsers = users.filter(u => u.isApproved);

        if (pendingUsers.length > 0) {
            let message = '⏳ *Onay Bekleyen Kullanıcılar*\n\n';
            pendingUsers.forEach(u => {
                message += `👤 ${u.firstName} ${u.lastName || ''}\n`;
                message += `🆔 @${u.username || 'yok'}\n`;
                message += `💬 ${u.chatId}\n\n`;
            });

            await ctx.reply(message, { parse_mode: 'Markdown' });

            // Approval buttons for pending users
            for (const u of pendingUsers.slice(0, 5)) {
                await ctx.reply(
                    `👤 *${u.firstName} ${u.lastName || ''}*\n` +
                    `🆔 @${u.username || 'username yok'}\n` +
                    `🏢 ${u.department || 'Departman belirtilmemiş'}`,
                    {
                        parse_mode: 'Markdown',
                        ...this.getApprovalKeyboard(u.chatId)
                    }
                );
            }
        }

        if (approvedUsers.length > 0) {
            let message = '✅ *Onaylı Kullanıcılar*\n\n';
            approvedUsers.slice(0, 20).forEach(u => {
                const roleIcon = {
                    admin: '👨‍💼',
                    manager: '👔',
                    employee: '👷‍♂️'
                }[u.role];

                const statusIcon = u.isActive ? '🟢' : '🔴';
                
                message += `${roleIcon} ${statusIcon} ${u.firstName} ${u.lastName || ''}\n`;
                message += `🆔 @${u.username || 'yok'} | ${u.department || 'Departman yok'}\n\n`;
            });

            await ctx.reply(message, { parse_mode: 'Markdown' });
            
            // Management buttons for approved users
            for (const u of approvedUsers.slice(0, 10)) {
                if (u.role !== 'admin') { // Don't show buttons for other admins
                    await ctx.reply(
                        `${this.getRoleDisplay(u.role)} *${u.firstName} ${u.lastName || ''}*\n` +
                        `🆔 @${u.username || 'username yok'}\n` +
                        `🏢 ${u.department || 'Departman belirtilmemiş'}`,
                        {
                            parse_mode: 'Markdown',
                            ...this.getUserManagementKeyboard(u.chatId)
                        }
                    );
                }
            }
        }
    }

    async showAnnouncements(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || !user.isApproved) return;

        const announcements = await Announcement.find({
            isActive: true,
            $or: [
                { targetRole: 'all' },
                { targetRole: user.role },
                { targetDepartments: user.department }
            ]
        }).sort({ priority: -1, createdAt: -1 }).limit(5);

        if (announcements.length === 0) {
            await ctx.reply('📢 Aktif duyuru bulunmuyor.');
            return;
        }

        for (const announcement of announcements) {
            const priorityIcon = {
                info: 'ℹ️', warning: '⚠️', urgent: '🚨'
            }[announcement.priority];
            
            const message = `${priorityIcon} *DUYURU*\n\n` +
                `${announcement.content}\n\n` +
                `👤 ${announcement.createdByName}\n` +
                `📅 ${announcement.createdAt.toLocaleDateString('tr-TR')}`;

            await ctx.reply(message, { parse_mode: 'Markdown' });
        }
    }

    async handleBreak(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || !user.isApproved) return;

        // Check if already on break
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const attendance = await Attendance.findOne({
            userId: user.chatId,
            date: { $gte: today },
            breakStart: { $ne: null },
            breakEnd: null
        });

        if (attendance) {
            // End break
            attendance.breakEnd = new Date();
            const breakMinutes = Math.round((attendance.breakEnd - attendance.breakStart) / 60000);
            attendance.totalBreakMinutes += breakMinutes;
            await attendance.save();

            await ctx.reply(
                `☕ *Mola Bitti*\n\n` +
                `Süre: ${breakMinutes} dakika\n` +
                `Toplam mola: ${attendance.totalBreakMinutes} dakika`,
                { parse_mode: 'Markdown' }
            );
        } else {
            // Start break
            await Attendance.findOneAndUpdate(
                {
                    userId: user.chatId,
                    date: { $gte: today }
                },
                {
                    $set: { 
                        breakStart: new Date(),
                        userId: user.chatId,
                        userName: `${user.firstName} ${user.lastName || ''}`
                    }
                },
                { upsert: true, new: true }
            );

            await ctx.reply(
                `☕ *Mola Başladı*\n\n` +
                `Saat: ${new Date().toLocaleTimeString('tr-TR')}\n` +
                `⚠️ Mola süreniz 30 dakikayı geçmemelidir.`,
                { parse_mode: 'Markdown' }
            );
        }
    }

    async showStatus(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || !user.isApproved) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            userId: user.chatId,
            date: { $gte: today }
        });

        const pendingTasks = await Task.countDocuments({
            'assignedTo.userId': user.chatId,
            'assignedTo.completed': false
        });

        let statusMessage = `📊 *Güncel Durumunuz*\n\n`;
        statusMessage += `👤 ${user.firstName} ${user.lastName || ''}\n`;
        statusMessage += `🏢 ${user.department || 'Departman belirtilmemiş'}\n`;
        statusMessage += `💼 ${user.position || 'Pozisyon belirtilmemiş'}\n`;
        statusMessage += `⏰ Vardiya: ${user.shift}\n\n`;

        statusMessage += `*Bugün:*\n`;
        if (attendance) {
            if (attendance.breakStart && !attendance.breakEnd) {
                statusMessage += `☕ Molada (${attendance.breakStart.toLocaleTimeString('tr-TR')})\n`;
            }
            if (attendance.totalBreakMinutes > 0) {
                statusMessage += `⏱️ Toplam mola: ${attendance.totalBreakMinutes} dakika\n`;
            }
        }

        statusMessage += `\n*Özet:*\n`;
        statusMessage += `📋 Bekleyen görev: ${pendingTasks}`;

        await ctx.reply(statusMessage, { parse_mode: 'Markdown' });
    }

    async showHelp(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || !user.isApproved) return;

        const isAdmin = user && (user.role === 'admin' || user.role === 'manager');

        let helpText = `🤖 *SivalTeam Bot Yardım*\n\n`;

        if (isAdmin) {
            helpText += `*Yönetici Özellikleri:*\n`;
            helpText += `➕ Görev Oluştur - Yeni görev oluştur\n`;
            helpText += `📋 Aktif Görevler - Görev durumları\n`;
            helpText += `📦 Eksik Ürünler Listesi - Bildirilen ürünler\n`;
            helpText += `👥 Kullanıcılar - Kullanıcı yönetimi\n`;
            helpText += `📢 Duyuru Yayınla - Duyuru oluştur\n`;
            helpText += `📈 Raporlar - Sistem raporları\n\n`;
        }

        helpText += `*Çalışan Özellikleri:*\n`;
        helpText += `📋 Görevlerim - Atanan görevler\n`;
        helpText += `📦 Eksik Ürün Bildir - Kategorili bildirim\n`;
        helpText += `📢 Duyurular - Güncel duyurular\n`;
        helpText += `📅 İzin Talebi - İzin talep et\n`;
        helpText += `🔄 Vardiya Değişimi - Vardiya değişimi\n`;
        helpText += `☕ Mola - Mola başlat/bitir\n`;
        helpText += `📊 Durum - Güncel durumunuz\n\n`;

        helpText += `💡 *İpuçları:*\n`;
        helpText += `• Görevleri tamamladığınızda işaretleyin\n`;
        helpText += `• Eksik ürünleri fotoğraf, ses veya yazı ile bildirebilirsiniz\n`;
        helpText += `• Tüm talepler yönetici onayına tabidir`;

        await ctx.reply(helpText, { parse_mode: 'Markdown' });
    }

    // ==================== CALLBACK HANDLERS ====================

    async handleUserApproval(ctx, data) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || user.role !== 'admin') {
            await ctx.answerCbQuery('❌ Yetkiniz yok!');
            return;
        }

        const targetChatId = data.replace('approve_user_', '');
        const targetUser = await User.findOneAndUpdate(
            { chatId: targetChatId },
            { isApproved: true, isActive: true },
            { new: true }
        );

        if (targetUser) {
            await ctx.editMessageText(`✅ ${targetUser.firstName} ${targetUser.lastName} onaylandı!`);
            
            // Notify user of approval
            await this.bot.telegram.sendMessage(
                targetChatId,
                '🎉 *Hesabınız Onaylandı!*\n\nSivalTeam Bot\'a hoş geldiniz!\nArtık tüm özellikleri kullanabilirsiniz.',
                { parse_mode: 'Markdown' }
            ).catch(() => {});
        }
    }

    async handleUserRejection(ctx, data) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || user.role !== 'admin') {
            await ctx.answerCbQuery('❌ Yetkiniz yok!');
            return;
        }

        const targetChatId = data.replace('reject_user_', '');
        const targetUser = await User.findOne({ chatId: targetChatId });

        if (targetUser) {
            await ctx.editMessageText(`❌ ${targetUser.firstName} ${targetUser.lastName} reddedildi.`);
            
            // Notify user of rejection
            await this.bot.telegram.sendMessage(
                targetChatId,
                '❌ *Hesap Başvurunuz Reddedildi*\n\nDaha fazla bilgi için yöneticinizle iletişime geçin.',
                { parse_mode: 'Markdown' }
            ).catch(() => {});
        }
    }

    async handleUserDeletion(ctx, data) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || user.role !== 'admin') {
            await ctx.answerCbQuery('❌ Yetkiniz yok!');
            return;
        }

        const targetChatId = data.replace('delete_user_', '');
        const targetUser = await User.findOneAndUpdate(
            { chatId: targetChatId },
            { 
                isActive: false,
                isApproved: false,
                role: 'employee' // Reset role to employee
            },
            { new: true }
        );

        if (targetUser) {
            await ctx.editMessageText(`🗑️ ${targetUser.firstName} ${targetUser.lastName} bottan çıkarıldı!\n\n💡 Tekrar /start ile geri gelebilir.`);
            
            // Notify user they were removed but can return
            await this.bot.telegram.sendMessage(
                targetChatId,
                '🚪 *Bottan Çıkarıldınız*\n\nYönetici tarafından bottan çıkarıldınız.\n\n💡 Tekrar katılmak istiyorsanız /start yazabilirsiniz.',
                { parse_mode: 'Markdown' }
            ).catch(() => {});
        }
    }

    async handleUserPromotion(ctx, data) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || user.role !== 'admin') {
            await ctx.answerCbQuery('❌ Yetkiniz yok!');
            return;
        }

        const targetChatId = data.replace('promote_user_', '');
        const targetUser = await User.findOneAndUpdate(
            { chatId: targetChatId },
            { role: 'admin' },
            { new: true }
        );

        if (targetUser) {
            await ctx.editMessageText(`👨‍💼 ${targetUser.firstName} ${targetUser.lastName} admin yapıldı!`);
            
            // Notify user of promotion
            await this.bot.telegram.sendMessage(
                targetChatId,
                '👨‍💼 *Admin Yetkisi Verildi!*\n\nTebrikler! Artık admin yetkileriniz bulunuyor.',
                { parse_mode: 'Markdown' }
            ).catch(() => {});
        }
    }

    async handleCategorySelection(ctx, data) {
        const category = data.replace('category_', '');
        const chatId = ctx.chat.id.toString();
        const user = await this.getUser(chatId);

        this.userStates.set(chatId, {
            action: 'report_product',
            step: 'product_name',
            data: { category }
        });

        await ctx.editMessageText(
            `📦 *${this.getCategoryIcon(category)} ${this.getCategoryName(category)} Kategorisi*\n\n` +
            `Eksik olan ürünün adını yazın:`
        );
    }

    async handleTaskCallback(ctx, data) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || !user.isApproved) return;

        console.log(`🔍 Task callback data: "${data}"`);
        
        // Parse callback data: format is "task_complete_ID" or "task_undo_ID"
        const parts = data.split('_');
        console.log(`📋 Parts:`, parts);
        
        if (parts.length < 3) {
            console.error(`Invalid callback data format: "${data}"`);
            await ctx.editMessageText('❌ Geçersiz callback formatı.');
            return;
        }
        
        const action = parts[1]; // complete, undo, etc
        const taskId = parts.slice(2).join('_'); // Handle MongoDB ObjectId which might contain underscores
        
        console.log(`🎯 Action: "${action}", TaskId: "${taskId}"`);
        
        // Validate taskId
        if (!taskId || taskId.length < 24) {
            console.error(`Invalid taskId: "${taskId}" from data: "${data}"`);
            await ctx.editMessageText('❌ Geçersiz görev ID.');
            return;
        }
        
        const task = await Task.findById(taskId);
        
        if (!task) {
            await ctx.editMessageText('❌ Görev bulunamadı.');
            return;
        }

        const assigneeIndex = task.assignedTo.findIndex(a => a.userId === user.chatId);
        if (assigneeIndex === -1) {
            await ctx.editMessageText('❌ Bu görev size atanmamış.');
            return;
        }

        if (action === 'complete') {
            task.assignedTo[assigneeIndex].completed = true;
            task.assignedTo[assigneeIndex].completedAt = new Date();
            
            // Update completed count
            task.completedCount = task.assignedTo.filter(a => a.completed).length;
            
            // Check if all completed
            if (task.assignedTo.every(a => a.completed)) {
                task.status = 'completed';
                task.completedAt = new Date();
            }
            
            await task.save();
            await ctx.editMessageText('✅ Görev tamamlandı olarak işaretlendi!');
            
            // Notify admins
            await this.notifyAdmins(
                `✅ *Görev Tamamlandı*\n\n` +
                `📋 ${task.title}\n` +
                `👤 ${user.firstName} ${user.lastName || ''}\n` +
                `⏰ ${new Date().toLocaleString('tr-TR')}`
            );
            
        } else if (action === 'undo') {
            task.assignedTo[assigneeIndex].completed = false;
            task.assignedTo[assigneeIndex].completedAt = null;
            task.status = 'in_progress';
            task.completedCount = task.assignedTo.filter(a => a.completed).length;
            
            await task.save();
            await ctx.editMessageText('↩️ Görev tamamlanmadı olarak işaretlendi.');
        }
    }

    async handleProductCompletion(ctx, data) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            await ctx.answerCbQuery('❌ Yetkiniz yok!');
            return;
        }

        const productId = data.replace('complete_product_', '');
        const product = await MissingProduct.findByIdAndUpdate(
            productId,
            {
                status: 'resolved',
                resolvedAt: new Date(),
                resolvedBy: user.chatId
            },
            { new: true }
        );

        if (product) {
            try {
                await ctx.editMessageText(`✅ ${product.productName} tamamlandı olarak işaretlendi!`);
            } catch (error) {
                // If edit fails, send new message
                await ctx.reply(`✅ ${product.productName} tamamlandı olarak işaretlendi!`);
            }
        } else {
            await ctx.answerCbQuery('❌ Ürün bulunamadı!');
        }
    }

    async handleStateInput(ctx, state) {
        const chatId = ctx.chat.id.toString();
        const text = ctx.message.text;
        const user = await this.getUser(chatId);

        switch (state.action) {
            case 'report_product':
                if (state.step === 'product_name') {
                    // Save product and complete immediately (no quantity needed)
                    const product = new MissingProduct({
                        productName: text,
                        category: state.data.category,
                        quantity: 1, // Default to 1
                        reportedBy: user.chatId,
                        reportedByName: `${user.firstName} ${user.lastName || ''}`,
                        reportMethod: 'text'
                    });
                    
                    await product.save();
                    this.userStates.delete(chatId);
                    
                    await ctx.reply('✅ Eksik ürün bildirimi kaydedildi!\n\n📸 Fotoğraf eklemek isterseniz şimdi gönderebilirsiniz.');
                    
                    // Set state for optional photo
                    this.userStates.set(chatId, {
                        action: 'add_product_media',
                        data: { productId: product._id }
                    });
                    
                    // Notify admins
                    await this.notifyAdmins(
                        `📦 *Yeni Eksik Ürün Bildirimi*\n\n` +
                        `${this.getCategoryIcon(state.data.category)} ${text}\n` +
                        `👤 ${user.firstName} ${user.lastName || ''}`
                    );
                }
                break;

            case 'create_task':
                if (state.step === 'content') {
                    console.log(`📋 Creating task with content: "${text}"`);
                    console.log(`🔍 Task data:`, state.data);
                    
                    // Prepare assignedTo based on task type
                    let assignedTo = [];
                    if (state.data.type === 'individual' && state.data.selectedEmployee) {
                        assignedTo = [{
                            userId: state.data.selectedEmployee.chatId,
                            name: state.data.selectedEmployee.name,
                            completed: false
                        }];
                    } else if (state.data.type === 'group') {
                        // For group tasks, assign to all employees
                        const employees = await User.find({ 
                            isApproved: true, 
                            role: { $in: ['employee', 'manager'] } 
                        });
                        assignedTo = employees.map(emp => ({
                            userId: emp.chatId,
                            name: `${emp.firstName} ${emp.lastName || ''}`,
                            completed: false
                        }));
                    }
                    
                    // Create task
                    const task = new Task({
                        taskId: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique taskId
                        title: text, // Use text as both title and description
                        description: text,
                        assignmentType: state.data.type,
                        assignedTo: assignedTo,
                        assignedBy: user.chatId,
                        assignedByName: `${user.firstName} ${user.lastName || ''}`, // Fix undefined issue
                        totalAssigned: assignedTo.length
                    });
                    
                    await task.save();
                    this.userStates.delete(chatId);
                    
                    await ctx.reply('✅ Görev başarıyla oluşturuldu!');
                    
                    // Send task to assigned users
                    for (const assignee of assignedTo) {
                        await this.bot.telegram.sendMessage(
                            assignee.userId,
                            `🆕 *Yeni Görev!*\n\n` +
                            `📋 ${task.title}\n\n` +
                            `👤 Atayan: ${user.firstName} ${user.lastName || ''}`,
                            {
                                parse_mode: 'Markdown',
                                ...Markup.inlineKeyboard([
                                    [Markup.button.callback('✅ Tamamla', `task_complete_${task._id}`)]
                                ])
                            }
                        ).catch(() => {});
                    }
                }
                break;
                
            case 'create_announcement':
                console.log(`📢 Processing announcement creation for ${user.firstName}`);
                console.log(`📝 Step: ${state.step}, Content: "${text}"`);
                
                if (state.step === 'content') {
                    console.log(`💾 Creating announcement with content: "${text}"`);
                    
                    const announcement = new Announcement({
                        title: 'Genel Duyuru', // Default title
                        message: text, // Use 'message' field as required by schema
                        createdBy: user.chatId,
                        createdByName: `${user.firstName} ${user.lastName || ''}`,
                        targetRole: 'all'
                    });
                    
                    await announcement.save();
                    this.userStates.delete(chatId);
                    
                    // Send announcement to all users
                    const users = await User.find({ isApproved: true, isActive: true });
                    
                    let successCount = 0;
                    let failCount = 0;
                    
                    for (const targetUser of users) {
                        try {
                            await this.bot.telegram.sendMessage(
                                targetUser.chatId,
                                `📢 *DUYURU*\n\n${text}\n\n👤 ${user.firstName} ${user.lastName || ''}`,
                                { parse_mode: 'Markdown' }
                            );
                            successCount++;
                        } catch (error) {
                            console.error(`Duyuru gönderilemedi: ${targetUser.chatId}`, error.message);
                            failCount++;
                        }
                    }
                    
                    await ctx.reply(`✅ Duyuru yayınlandı!\n\n📊 ${successCount} başarılı, ${failCount} başarısız`);
                }
                break;
        }
    }

    // ==================== HELPER METHODS ====================

    async getUser(chatId) {
        try {
            // Add timeout to prevent hanging
            return await Promise.race([
                User.findOne({ chatId: chatId.toString() }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('User query timeout')), 5000)
                )
            ]);
        } catch (error) {
            console.error('getUser error:', error.message);
            return null;
        }
    }

    async notifyAdmins(message, keyboard = null) {
        const admins = await User.find({ role: { $in: ['admin', 'manager'] }, isActive: true, isApproved: true });
        for (const admin of admins) {
            try {
                const options = { parse_mode: 'Markdown' };
                if (keyboard) Object.assign(options, keyboard);
                await this.bot.telegram.sendMessage(admin.chatId, message, options);
            } catch (error) {
                console.error(`Admin notification failed for ${admin.chatId}:`, error.message);
            }
        }
    }

    async notifyAdminsWithPhoto(caption, photoFileId) {
        console.log(`📸 Sending photo to admins. FileId: ${photoFileId}`);
        console.log(`📝 Caption: ${caption}`);
        
        const admins = await User.find({ role: { $in: ['admin', 'manager'] }, isActive: true, isApproved: true });
        console.log(`👥 Found ${admins.length} admins to notify`);
        
        for (const admin of admins) {
            try {
                await this.bot.telegram.sendPhoto(admin.chatId, photoFileId, {
                    caption: caption,
                    parse_mode: 'Markdown'
                });
                console.log(`✅ Photo sent to admin ${admin.firstName} (${admin.chatId})`);
            } catch (error) {
                console.error(`❌ Admin photo notification failed for ${admin.chatId}:`, error.message);
            }
        }
    }

    async notifyAdminsWithVoice(caption, voiceFileId) {
        const admins = await User.find({ role: { $in: ['admin', 'manager'] }, isActive: true, isApproved: true });
        for (const admin of admins) {
            try {
                await this.bot.telegram.sendVoice(admin.chatId, voiceFileId, {
                    caption: caption,
                    parse_mode: 'Markdown'
                });
            } catch (error) {
                console.error(`Admin voice notification failed for ${admin.chatId}:`, error.message);
            }
        }
    }

    getMainKeyboard(role) {
        if (role === 'admin' || role === 'manager') {
            // Admin panel
            const adminButtons = [
                ['➕ Görev Oluştur', '📋 Aktif Görevler'],
                ['📦 Eksik Ürünler Listesi', '👥 Kullanıcılar'],
                ['📢 Duyuru Yayınla', '📦 Eksik Ürün Bildir'],
                ['📊 Durum', '❓ Yardım']
            ];
            return Markup.keyboard(adminButtons).resize();
        } else {
            // Employee panel
            const employeeButtons = [
                ['📋 Görevlerim', '📦 Eksik Ürün Bildir'],
                ['📢 Duyurular', '📊 Durum'],
                ['❓ Yardım']
            ];
            return Markup.keyboard(employeeButtons).resize();
        }
    }

    getWelcomeMessage(user) {
        const roleDisplay = this.getRoleDisplay(user.role);
        const panelType = (user.role === 'admin' || user.role === 'manager') ? 'Yönetici Paneli' : 'Çalışan Paneli';
        return `👋 *Hoş Geldiniz!*\n\n` +
            `${roleDisplay} *${user.firstName} ${user.lastName || ''}*\n` +
            `🏢 SivalTeam Bot - ${panelType}\n\n` +
            `Aşağıdaki menüden işlem seçebilirsiniz.`;
    }

    getApprovalKeyboard(chatId) {
        return Markup.inlineKeyboard([
            [Markup.button.callback('✅ Onayla', `approve_user_${chatId}`)],
            [Markup.button.callback('❌ Reddet', `reject_user_${chatId}`)],
            [Markup.button.callback('🚫 Engelle', `block_user_${chatId}`)],
            [Markup.button.callback('🗑️ Sil', `delete_user_${chatId}`)]
        ]);
    }

    getUserManagementKeyboard(chatId) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('👨‍💼 Admin Yap', `promote_user_${chatId}`),
                Markup.button.callback('🗑️ Bottan Sil', `delete_user_${chatId}`)
            ]
        ]);
    }

    getRoleDisplay(role) {
        const roles = {
            admin: '👨‍💼 Admin',
            manager: '👔 Yönetici',
            employee: '👷‍♂️ Çalışan'
        };
        return roles[role] || role;
    }

    getCategoryIcon(category) {
        const icons = {
            kadın: '👩',
            erkek: '👨',
            çocuk: '🧒',
            çamaşır: '👕',
            ayakkabı: '👟',
            ev_tekstili: '🏠'
        };
        return icons[category] || '📦';
    }

    getCategoryName(category) {
        const names = {
            kadın: 'Kadın',
            erkek: 'Erkek',
            çocuk: 'Çocuk',
            çamaşır: 'Çamaşır',
            ayakkabı: 'Ayakkabı',
            ev_tekstili: 'Ev Tekstili'
        };
        return names[category] || category;
    }

    getProgressBar(completed, total) {
        if (total === 0) return '⬜⬜⬜⬜⬜';
        const percentage = completed / total;
        const filled = Math.round(percentage * 5);
        return '🟩'.repeat(filled) + '⬜'.repeat(5 - filled);
    }

    isSpamMessage(msg) {
        if (!msg.text) return false;
        
        const spamKeywords = [
            'casino', 'bet', 'gambling', 'crypto', 'investment',
            'earn money', 'click here', 'limited time', 'free money',
            'bit.ly', 'tinyurl', 'porn', 'xxx', 'sex'
        ];
        
        const text = msg.text.toLowerCase();
        return spamKeywords.some(keyword => text.includes(keyword));
    }

    setupWebhook() {
        if (process.env.NODE_ENV === 'production') {
            this.bot.telegram.setWebhook(`${WEBHOOK_URL}/bot${BOT_TOKEN}`);
            console.log(`🌐 Webhook set to: ${WEBHOOK_URL}/bot${BOT_TOKEN}`);
        }
    }

    // Placeholder methods to be implemented
    async showReports(ctx) {
        await ctx.reply('📈 Raporlar özelliği geliştirilme aşamasında...');
    }

    async requestLeave(ctx) {
        await ctx.reply('📅 İzin talebi özelliği geliştirilme aşamasında...');
    }

    async requestShiftChange(ctx) {
        await ctx.reply('🔄 Vardiya değişimi özelliği geliştirilme aşamasında...');
    }

    async publishAnnouncement(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            await ctx.reply('❌ Bu özellik sadece yöneticiler içindir.');
            return;
        }
        
        const chatId = ctx.chat.id.toString();
        
        console.log(`📢 Admin ${user.firstName} starting announcement creation`);
        
        await ctx.reply('📢 *Duyuru Yayınla*\n\nDuyuru metnini yazın:', { parse_mode: 'Markdown' });
        
        this.userStates.set(chatId, {
            action: 'create_announcement',
            step: 'content'
        });
        
        console.log(`🎯 Announcement state set for ${chatId}`);
    }

    async handleIndividualTaskAssignment(ctx) {
        const chatId = ctx.chat.id.toString();
        
        console.log(`👤 Admin starting individual task assignment`);
        
        // Set user state for individual task creation
        this.userStates.set(chatId, {
            action: 'create_task',
            step: 'employee_selected',
            data: { type: 'individual' }
        });
        
        // Get all approved employees
        const employees = await User.find({ 
            isApproved: true, 
            role: { $in: ['employee', 'manager'] } 
        }).sort({ firstName: 1 });
        
        if (employees.length === 0) {
            await ctx.reply('❌ Görev atanabilecek onaylanmış çalışan bulunmuyor.');
            return;
        }
        
        // Create employee selection buttons
        const keyboard = employees.map(emp => [
            Markup.button.callback(
                `👤 ${emp.firstName} ${emp.lastName || ''}`, 
                `select_employee_${emp.chatId}`
            )
        ]);
        
        keyboard.push([Markup.button.callback('❌ İptal', 'cancel_task')]);
        
        try {
            await ctx.editMessageText(
                '👤 *Bireysel Görev Atama*\n\nHangi çalışana görev atanacak?',
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard(keyboard)
                }
            );
        } catch (error) {
            await ctx.reply(
                '👤 *Bireysel Görev Atama*\n\nHangi çalışana görev atanacak?',
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard(keyboard)
                }
            );
        }
        
        // Set user state for task creation
        this.userStates.set(chatId, {
            action: 'create_task',
            step: 'employee_selected',
            data: { type: 'individual' }
        });
    }

    async handleGroupTaskAssignment(ctx) {
        const chatId = ctx.chat.id.toString();
        
        console.log(`👥 Admin starting group task assignment`);
        
        try {
            await ctx.editMessageText(
                '👥 *Toplu Görev Atama*\n\nTüm çalışanlara atanacak görevi yazın:',
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            await ctx.reply(
                '👥 *Toplu Görev Atama*\n\nTüm çalışanlara atanacak görevi yazın:',
                { parse_mode: 'Markdown' }
            );
        }
        
        // Set user state for group task creation
        this.userStates.set(chatId, {
            action: 'create_task',
            step: 'content',
            data: { type: 'group' }
        });
    }

    async handleLeaveCallback(ctx, data) {
        await ctx.answerCbQuery('İzin talebi özelliği geliştirilme aşamasında...');
    }

    async handleShiftCallback(ctx, data) {
        await ctx.answerCbQuery('Vardiya değişimi özelliği geliştirilme aşamasında...');
    }

    async handleCancelCallback(ctx, data) {
        const requestId = data.split('_')[1];
        this.requests.delete(requestId);
        this.userStates.delete(ctx.chat.id.toString());
        await ctx.editMessageText('❌ İşlem iptal edildi.');
    }

    async handleEmployeeSelection(ctx, data) {
        const chatId = ctx.chat.id.toString();
        const employeeChatId = data.replace('select_employee_', '');
        const state = this.userStates.get(chatId);
        
        if (!state || state.action !== 'create_task') return;
        
        // Get employee info
        const employee = await User.findOne({ chatId: employeeChatId });
        if (!employee) {
            await ctx.answerCbQuery('❌ Çalışan bulunamadı!');
            return;
        }
        
        // Update state with selected employee
        state.data.selectedEmployee = {
            chatId: employeeChatId,
            name: `${employee.firstName} ${employee.lastName || ''}`
        };
        state.step = 'content';
        this.userStates.set(chatId, state);
        
        
        try {
            await ctx.editMessageText(
                `👤 *Seçilen Çalışan:* ${employee.firstName} ${employee.lastName || ''}\n\n` +
                `📝 Atanacak görevi yazın:`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            await ctx.reply(
                `👤 *Seçilen Çalışan:* ${employee.firstName} ${employee.lastName || ''}\n\n` +
                `📝 Atanacak görevi yazın:`,
                { parse_mode: 'Markdown' }
            );
        }
    }

    async handleDepartmentSelection(ctx, data) {
        const chatId = ctx.chat.id.toString();
        const state = this.userStates.get(chatId);
        
        if (!state || state.action !== 'register_user') return;
        
        // Map department codes to names
        const departmentMap = {
            'dept_satis': 'Satış',
            'dept_depo': 'Depo',
            'dept_ik': 'İnsan Kaynakları',
            'dept_muhasebe': 'Muhasebe',
            'dept_teknik': 'Teknik',
            'dept_magaza': 'Mağaza',
            'dept_kargo': 'Kargo',
            'dept_musteri': 'Müşteri Hizmetleri'
        };
        
        const selectedDepartment = departmentMap[data];
        
        // Create new user with selected department
        const newUser = new User({
            chatId: state.data.chatId,
            username: state.data.username,
            firstName: state.data.firstName,
            lastName: state.data.lastName,
            telegramUsername: state.data.telegramUsername,
            role: 'employee',
            isApproved: false,
            department: selectedDepartment
        });
        
        await newUser.save();
        this.userStates.delete(chatId);
        
        
        await ctx.editMessageText(
            `✅ *Kayıt Tamamlandı!*\n\n` +
            `👤 ${state.data.firstName} ${state.data.lastName || ''}\n` +
            `🏢 Departman: ${selectedDepartment}\n\n` +
            '⏳ Admin onayı bekleniyor...',
            { parse_mode: 'Markdown' }
        );
        
        // Notify admins with department info
        await this.notifyAdmins(
            `🆕 *Yeni kullanıcı onay bekliyor:*\n\n` +
            `👤 ${state.data.firstName} ${state.data.lastName || ''}\n` +
            `🆔 @${state.data.username || 'username yok'}\n` +
            `🏢 Departman: ${selectedDepartment}\n` +
            `💬 Chat ID: ${chatId}`,
            this.getApprovalKeyboard(chatId)
        );
    }

    async handlePhotoMessage(ctx) {
        const chatId = ctx.chat.id.toString();
        const state = this.userStates.get(chatId);
        const user = await this.getUser(chatId);
        
        if (state && state.action === 'add_product_media') {
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            
            // Get product info
            const product = await MissingProduct.findById(state.data.productId);
            
            // Update existing product with photo
            await MissingProduct.findByIdAndUpdate(state.data.productId, {
                reportMethod: 'photo',
                photoUrl: photo.file_id
            });
            
            this.userStates.delete(chatId);
            await ctx.reply('✅ Fotoğraf eklendi!');
            
            // Send photo to admins
            if (product && user) {
                console.log(`📦 Product found: ${product.productName}`);
                console.log(`👤 User found: ${user.firstName}`);
                console.log(`📷 Photo file_id: ${photo.file_id}`);
                
                await this.notifyAdminsWithPhoto(
                    `📸 *Eksik Ürün Fotoğrafı*\n\n` +
                    `📦 ${product.productName}\n` +
                    `📂 ${product.category}\n` +
                    `👤 ${user.firstName} ${user.lastName || ''}`,
                    photo.file_id
                );
            } else {
                console.error(`❌ Missing data - Product: ${!!product}, User: ${!!user}`);
            }
        } else if (user && (user.role === 'admin' || user.role === 'manager')) {
            // Admin/manager can send photos anywhere - just acknowledge
            await ctx.reply('📸 Fotoğraf alındı!');
        }
    }

    async handleVoiceMessage(ctx) {
        const chatId = ctx.chat.id.toString();
        const state = this.userStates.get(chatId);
        const user = await this.getUser(chatId);
        
        if (state && state.action === 'add_product_media') {
            // Get product info
            const product = await MissingProduct.findById(state.data.productId);
            
            // Update existing product with voice
            await MissingProduct.findByIdAndUpdate(state.data.productId, {
                reportMethod: 'voice',
                voiceFileId: ctx.message.voice.file_id
            });
            
            this.userStates.delete(chatId);
            await ctx.reply('✅ Ses kaydı eklendi!');
            
            // Send voice to admins
            if (product && user) {
                await this.notifyAdminsWithVoice(
                    `🎤 *Eksik Ürün Ses Kaydı*\n\n` +
                    `📦 ${product.productName}\n` +
                    `📂 ${product.category}\n` +
                    `👤 ${user.firstName} ${user.lastName || ''}`,
                    ctx.message.voice.file_id
                );
            }
        } else if (user && (user.role === 'admin' || user.role === 'manager')) {
            // Admin/manager can send voice anywhere - just acknowledge
            await ctx.reply('🎤 Ses kaydı alındı!');
        }
    }

    // Admin commands
    async broadcastMessage(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || user.role !== 'admin') {
            await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
            return;
        }

        const message = ctx.message.text.replace('/broadcast', '').trim();
        if (!message) {
            await ctx.reply('Kullanım: /broadcast [mesaj]');
            return;
        }

        const users = await User.find({ isActive: true, isApproved: true });
        let sent = 0;
        let failed = 0;

        for (const u of users) {
            try {
                await this.bot.telegram.sendMessage(u.chatId, `📢 *Yönetim Duyurusu*\n\n${message}`, {
                    parse_mode: 'Markdown'
                });
                sent++;
            } catch (error) {
                failed++;
            }
        }

        await ctx.reply(`✅ Mesaj gönderildi.\nBaşarılı: ${sent}\nBaşarısız: ${failed}`);
    }

    async showStats(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
            return;
        }

        const stats = {
            totalUsers: await User.countDocuments(),
            approvedUsers: await User.countDocuments({ isApproved: true }),
            pendingUsers: await User.countDocuments({ isApproved: false }),
            activeTasks: await Task.countDocuments({ status: { $ne: 'completed' } }),
            completedTasks: await Task.countDocuments({ status: 'completed' }),
            missingProducts: await MissingProduct.countDocuments({ status: { $ne: 'resolved' } })
        };

        const message = `📊 *Sistem İstatistikleri*\n\n` +
            `👥 Toplam Kullanıcı: ${stats.totalUsers}\n` +
            `✅ Onaylı: ${stats.approvedUsers}\n` +
            `⏳ Bekleyen: ${stats.pendingUsers}\n\n` +
            `📋 Aktif Görev: ${stats.activeTasks}\n` +
            `✅ Tamamlanan: ${stats.completedTasks}\n\n` +
            `📦 Eksik Ürün: ${stats.missingProducts}`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
    }
}

// ==================== DATABASE CLEANUP ====================
async function cleanupDatabase() {
    try {
        // Get database stats
        const stats = await mongoose.connection.db.stats();
        const sizeInMB = stats.dataSize / (1024 * 1024);
        
        console.log(`📈 Database size: ${sizeInMB.toFixed(2)} MB`);
        
        // If database is over 500MB, start cleanup
        if (sizeInMB > 500) {
            console.log('🧽 Starting database cleanup...');
            
            // Delete old completed tasks (older than 30 days)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const deletedTasks = await Task.deleteMany({
                status: 'completed',
                completedAt: { $lt: thirtyDaysAgo }
            });
            
            // Delete old resolved missing products (older than 30 days)
            const deletedProducts = await MissingProduct.deleteMany({
                status: 'resolved',
                resolvedAt: { $lt: thirtyDaysAgo }
            });
            
            // Delete old attendance records (older than 90 days)
            const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            const deletedAttendance = await Attendance.deleteMany({
                date: { $lt: ninetyDaysAgo }
            });
            
            // Delete old employee requests (older than 60 days)
            const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
            const deletedRequests = await EmployeeRequest.deleteMany({
                createdAt: { $lt: sixtyDaysAgo },
                status: { $in: ['approved', 'rejected', 'cancelled'] }
            });
            
            // Delete old announcements (older than 60 days)
            const deletedAnnouncements = await Announcement.deleteMany({
                createdAt: { $lt: sixtyDaysAgo },
                isActive: false
            });
            
            console.log(`✨ Cleanup completed:`);
            console.log(`   - Tasks: ${deletedTasks.deletedCount}`);
            console.log(`   - Products: ${deletedProducts.deletedCount}`);
            console.log(`   - Attendance: ${deletedAttendance.deletedCount}`);
            console.log(`   - Requests: ${deletedRequests.deletedCount}`);
            console.log(`   - Announcements: ${deletedAnnouncements.deletedCount}`);
        }
    } catch (error) {
        console.error('❌ Database cleanup error:', error);
    }
}

// ==================== MONGODB CONNECTION ====================
async function connectMongoDB() {
    try {
        // Optimize MongoDB connection for performance
        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 10, // Maximum number of connections
            serverSelectionTimeoutMS: 5000, // How long to try selecting server
            socketTimeoutMS: 45000, // How long a socket stays open
            maxIdleTimeMS: 30000 // Close connections after 30 seconds of inactivity
        });
        
        // Configure mongoose buffering separately
        mongoose.set('bufferCommands', false);
        console.log('✅ MongoDB connected successfully');
        
        // Only clear on first deploy - check if there are users without any admin
        const userCount = await User.countDocuments();
        const adminCount = await User.countDocuments({ role: 'admin' });
        
        // Clear only if users exist but no admin (indicates old/broken data)
        if (userCount > 0 && adminCount === 0) {
            await User.deleteMany({});
            await Task.deleteMany({});
            await MissingProduct.deleteMany({});
            await Announcement.deleteMany({});
            await Attendance.deleteMany({});
            await EmployeeRequest.deleteMany({});
            console.log(`🗑️ Cleared ${userCount} orphaned users (no admin found) for fresh start`);
        }
        
        // Run cleanup on startup
        await cleanupDatabase();
        
        // Schedule cleanup every 24 hours
        setInterval(cleanupDatabase, 24 * 60 * 60 * 1000);
        
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// ==================== INITIALIZE BOT ====================
const sivalTeamBot = new SivalTeamBot();

// ==================== EXPRESS ROUTES ====================
app.get('/', (req, res) => {
    res.json({ 
        status: 'SivalTeam Bot Active',
        timestamp: new Date().toISOString(),
        version: '3.0.0'
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// Webhook endpoint
app.use(sivalTeamBot.bot.webhookCallback(`/bot${BOT_TOKEN}`));

// API Routes
app.post('/api/register-user', async (req, res) => {
    try {
        const { chatId, userData } = req.body;
        
        const existingUser = await User.findOne({ chatId: chatId.toString() });
        if (existingUser) {
            return res.json({ success: true, message: 'User already exists' });
        }

        const user = new User({
            chatId: chatId.toString(),
            ...userData
        });

        await user.save();
        res.json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        console.error('User registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== SERVER START ====================
async function startServer() {
    await connectMongoDB();
    
    app.listen(PORT, () => {
        console.log(`🚀 SivalTeam Bot Server running on port ${PORT} at ${getTurkeyTime()}`);
        console.log(`🌐 Health endpoint: http://localhost:${PORT}/health`);
        console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Start polling in development
    if (process.env.NODE_ENV !== 'production') {
        try {
            // Clear webhook first to avoid conflicts
            await sivalTeamBot.bot.telegram.deleteWebhook();
            console.log('🗑️ Webhook cleared for development mode');
            
            await sivalTeamBot.bot.launch();
            console.log('🤖 Bot polling started for development');
        } catch (error) {
            console.error('❌ Failed to start bot in development:', error.message);
        }
    }
}

// Graceful shutdown
process.once('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    try {
        if (sivalTeamBot && sivalTeamBot.bot) {
            sivalTeamBot.bot.stop('SIGINT');
        }
    } catch (error) {
        console.log('Bot already stopped or not running');
    }
    process.exit(0);
});

process.once('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    try {
        if (sivalTeamBot && sivalTeamBot.bot) {
            sivalTeamBot.bot.stop('SIGTERM');
        }
    } catch (error) {
        console.log('Bot already stopped or not running');
    }
    process.exit(0);
});

// Start the server
startServer().catch(error => {
    console.error('❌ Server start error:', error);
    process.exit(1);
});

module.exports = { app, sivalTeamBot };