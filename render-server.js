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

// Rate limiting
const rateLimiter = new RateLimiterMemory({
    keyPrefix: 'sivalteam_bot',
    points: 50,
    duration: 60,
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
    title: { type: String, required: true },
    description: String,
    assignedTo: [{
        userId: String,
        name: String,
        completed: { type: Boolean, default: false },
        completedAt: Date
    }],
    assignedBy: String,
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
    category: String,
    dueDate: Date,
    createdAt: { type: Date, default: Date.now },
    completedAt: Date,
    tags: [String]
});

// Missing Product Schema - Eksik ürün takibi
const missingProductSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    quantity: Number,
    unit: String,
    reportedBy: String,
    reportedByName: String,
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

// Violation Schema - İhlal kayıtları (SecurityTrackerPro özelliği)
const violationSchema = new mongoose.Schema({
    employeeId: String,
    employeeName: String,
    type: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    description: String,
    location: String,
    cameraId: String,
    detectedAt: { type: Date, default: Date.now },
    resolvedAt: Date,
    resolvedBy: String,
    status: { type: String, enum: ['pending', 'reviewing', 'resolved', 'dismissed'], default: 'pending' },
    evidence: String,
    actions: [String]
});

// Shift Schedule Schema - Vardiya programı
const shiftScheduleSchema = new mongoose.Schema({
    employeeId: String,
    employeeName: String,
    date: Date,
    shift: { type: String, enum: ['Sabah', 'Öğlen', 'Akşam', 'Gece'] },
    isConfirmed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    createdBy: String
});

// Report Schema - Rapor sistemi
const reportSchema = new mongoose.Schema({
    title: String,
    type: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'] },
    department: String,
    generatedBy: String,
    generatedAt: { type: Date, default: Date.now },
    data: mongoose.Schema.Types.Mixed,
    fileUrl: String
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const MissingProduct = mongoose.model('MissingProduct', missingProductSchema);
const Announcement = mongoose.model('Announcement', announcementSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const EmployeeRequest = mongoose.model('EmployeeRequest', employeeRequestSchema);
const Violation = mongoose.model('Violation', violationSchema);
const ShiftSchedule = mongoose.model('ShiftSchedule', shiftScheduleSchema);
const Report = mongoose.model('Report', reportSchema);

// ==================== TELEGRAM BOT CLASS ====================
class SecurityTrackerBot extends EventEmitter {
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
        console.log('🤖 SecurityTrackerPro Bot initialized');
    }

    setupMiddleware() {
        // Rate limiting middleware
        this.bot.use(async (ctx, next) => {
            try {
                await rateLimiter.consume(ctx.chat?.id || 'unknown');
                return next();
            } catch (rejRes) {
                console.log(`⚡ Rate limit exceeded for ${ctx.chat?.id}`);
                return;
            }
        });

        // User activity tracking
        this.bot.use(async (ctx, next) => {
            if (ctx.chat?.id) {
                await User.findOneAndUpdate(
                    { chatId: ctx.chat.id.toString() },
                    { lastActive: new Date() }
                );
            }
            return next();
        });

        // Spam filter
        this.bot.use(async (ctx, next) => {
            if (ctx.message && this.isSpamMessage(ctx.message)) {
                console.log(`🚫 Spam blocked from ${ctx.chat?.id}: ${ctx.message.text}`);
                await ctx.deleteMessage().catch(() => {});
                return;
            }
            return next();
        });
    }

    setupHandlers() {
        // Start command
        this.bot.start(async (ctx) => {
            const chatId = ctx.chat.id.toString();
            const user = await User.findOne({ chatId });

            if (!user) {
                // Yeni kullanıcı kaydı
                const newUser = new User({
                    chatId,
                    username: ctx.from.username,
                    firstName: ctx.from.first_name,
                    lastName: ctx.from.last_name,
                    telegramUsername: ctx.from.username
                });
                await newUser.save();

                await ctx.reply(
                    '👋 *SecurityTrackerPro Bot\'a Hoş Geldiniz!*\n\n' +
                    `Merhaba ${ctx.from.first_name}!\n` +
                    `Chat ID'niz: \`${chatId}\`\n\n` +
                    '📝 Sisteme tam erişim için admin onayı bekleniyor.\n' +
                    '⏳ Yöneticiniz sizi onayladığında bildirim alacaksınız.',
                    { parse_mode: 'Markdown' }
                );

                // Admin bilgilendirmesi
                await this.notifyAdmins(
                    `🆕 Yeni kullanıcı kaydı:\n` +
                    `👤 ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
                    `🆔 @${ctx.from.username || 'username yok'}\n` +
                    `💬 Chat ID: ${chatId}`
                );
                return;
            }

            const welcomeMessage = this.getWelcomeMessage(user);
            await ctx.reply(welcomeMessage, {
                parse_mode: 'Markdown',
                ...this.getMainKeyboard(user.role)
            });
        });

        // Ana menü butonları
        this.bot.hears('📋 Görevlerim', async (ctx) => await this.showMyTasks(ctx));
        this.bot.hears('📦 Eksik Ürünler', async (ctx) => await this.showMissingProducts(ctx));
        this.bot.hears('📢 Duyurular', async (ctx) => await this.showAnnouncements(ctx));
        this.bot.hears('📅 İzin Talebi', async (ctx) => await this.requestLeave(ctx));
        this.bot.hears('🔄 Vardiya Değişimi', async (ctx) => await this.requestShiftChange(ctx));
        this.bot.hears('☕ Mola', async (ctx) => await this.handleBreak(ctx));
        this.bot.hears('📊 Durum', async (ctx) => await this.showStatus(ctx));
        this.bot.hears('⚙️ Ayarlar', async (ctx) => await this.showSettings(ctx));
        this.bot.hears('👥 Kullanıcılar', async (ctx) => await this.showUsers(ctx));
        this.bot.hears('📈 Raporlar', async (ctx) => await this.showReports(ctx));
        this.bot.hears('🚨 İhlaller', async (ctx) => await this.showViolations(ctx));
        this.bot.hears('❓ Yardım', async (ctx) => await this.showHelp(ctx));

        // Text message handler for states
        this.bot.on('text', async (ctx) => {
            const chatId = ctx.chat.id.toString();
            const state = this.userStates.get(chatId);
            
            if (state) {
                await this.handleStateInput(ctx, state);
            }
        });
    }

    setupCallbackHandlers() {
        this.bot.on('callback_query', async (ctx) => {
            const data = ctx.callbackQuery.data;
            const chatId = ctx.chat.id.toString();
            const user = await this.getUser(chatId);
            
            if (!user) {
                await ctx.answerCbQuery('❌ Yetkiniz yok!');
                return;
            }

            try {
                // Task callbacks
                if (data.startsWith('task_')) {
                    await this.handleTaskCallback(ctx, data, user);
                }
                // Product callbacks
                else if (data.startsWith('product_')) {
                    await this.handleProductCallback(ctx, data, user);
                }
                // Request callbacks
                else if (data.startsWith('request_')) {
                    await this.handleRequestCallback(ctx, data, user);
                }
                // User management callbacks
                else if (data.startsWith('user_')) {
                    await this.handleUserCallback(ctx, data, user);
                }
                // Violation callbacks
                else if (data.startsWith('violation_')) {
                    await this.handleViolationCallback(ctx, data, user);
                }
                // Leave callbacks
                else if (data.startsWith('leave_')) {
                    await this.handleLeaveCallback(ctx, data, user);
                }
                // Shift callbacks
                else if (data.startsWith('shift_')) {
                    await this.handleShiftCallback(ctx, data, user);
                }
                // Cancel callback
                else if (data.startsWith('cancel_')) {
                    await this.handleCancelCallback(ctx, data);
                }

                await ctx.answerCbQuery();
            } catch (error) {
                console.error('Callback error:', error);
                await ctx.answerCbQuery('❌ İşlem başarısız!');
            }
        });
    }

    setupAdminCommands() {
        // Admin komutları
        this.bot.command('broadcast', async (ctx) => await this.broadcastMessage(ctx));
        this.bot.command('stats', async (ctx) => await this.showStats(ctx));
        this.bot.command('addtask', async (ctx) => await this.addTask(ctx));
        this.bot.command('announce', async (ctx) => await this.createAnnouncement(ctx));
        this.bot.command('report', async (ctx) => await this.generateReport(ctx));
        this.bot.command('makeadmin', async (ctx) => await this.makeAdmin(ctx));
        this.bot.command('removeadmin', async (ctx) => await this.removeAdmin(ctx));
        this.bot.command('activate', async (ctx) => await this.activateUser(ctx));
        this.bot.command('deactivate', async (ctx) => await this.deactivateUser(ctx));
    }

    // ==================== HANDLER METHODS ====================
    
    async showMyTasks(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user) return;

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
                [Markup.button.callback('✅ Tamamla', `task_complete_${task._id}`)],
                [Markup.button.callback('💬 Not Ekle', `task_note_${task._id}`)]
            ]) : Markup.inlineKeyboard([
                [Markup.button.callback('↩️ Tamamlanmadı', `task_undo_${task._id}`)]
            ]);

            await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
        }
    }

    async showMissingProducts(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user) return;

        const products = await MissingProduct.find({
            status: { $ne: 'resolved' }
        }).sort({ urgency: -1, reportedAt: -1 }).limit(10);

        if (products.length === 0) {
            await ctx.reply('📦 Eksik ürün raporu bulunmuyor.');
            
            if (user.role !== 'employee') {
                await ctx.reply('➕ Yeni eksik ürün bildirmek için /addproduct komutunu kullanabilirsiniz.');
            }
            return;
        }

        let message = '📦 *Eksik Ürün Listesi*\n\n';
        for (const product of products) {
            const urgencyIcon = {
                low: '🟢', medium: '🟡', high: '🔴', critical: '🚨'
            }[product.urgency];
            
            message += `${urgencyIcon} *${product.productName}*\n`;
            message += `📊 Miktar: ${product.quantity} ${product.unit || 'adet'}\n`;
            message += `📍 Konum: ${product.location || 'Belirtilmemiş'}\n`;
            message += `👤 Bildiren: ${product.reportedByName}\n`;
            message += `📅 ${product.reportedAt.toLocaleDateString('tr-TR')}\n`;
            message += `─────────────\n`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });

        if (user.role === 'admin' || user.role === 'manager') {
            await ctx.reply(
                '🔧 Ürün durumunu güncellemek için ilgili ürünü seçin:',
                Markup.inlineKeyboard(
                    products.slice(0, 5).map(p => [
                        Markup.button.callback(
                            `${p.productName} - ${p.status}`,
                            `product_manage_${p._id}`
                        )
                    ])
                )
            );
        }
    }

    async showAnnouncements(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user) return;

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
            
            const readStatus = announcement.readBy.some(r => r.userId === user.chatId) ? '✅' : '🔵';
            
            const message = `${priorityIcon} ${readStatus} *${announcement.title}*\n\n` +
                `${announcement.message}\n\n` +
                `👤 ${announcement.createdByName}\n` +
                `📅 ${announcement.createdAt.toLocaleDateString('tr-TR')}`;

            const keyboard = !announcement.readBy.some(r => r.userId === user.chatId) ?
                Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Okundu', `announcement_read_${announcement._id}`)]
                ]) : undefined;

            await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });

            // Mark as read
            if (!announcement.readBy.some(r => r.userId === user.chatId)) {
                announcement.readBy.push({ userId: user.chatId, readAt: new Date() });
                await announcement.save();
            }
        }
    }

    async requestLeave(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user) return;

        const requestId = Date.now().toString();
        this.requests.set(requestId, {
            type: 'leave',
            employeeId: user.chatId,
            employeeName: `${user.firstName} ${user.lastName}`,
            status: 'pending'
        });

        await ctx.reply(
            '📅 *İzin Talebi*\n\nNe zaman izin almak istiyorsunuz?',
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback('Bugün', `leave_today_${requestId}`),
                        Markup.button.callback('Yarın', `leave_tomorrow_${requestId}`)
                    ],
                    [
                        Markup.button.callback('Bu Hafta', `leave_week_${requestId}`),
                        Markup.button.callback('Özel Tarih', `leave_custom_${requestId}`)
                    ],
                    [Markup.button.callback('❌ İptal', `cancel_${requestId}`)]
                ])
            }
        );
    }

    async requestShiftChange(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user) return;

        const requestId = Date.now().toString();
        this.requests.set(requestId, {
            type: 'shift_change',
            employeeId: user.chatId,
            employeeName: `${user.firstName} ${user.lastName}`,
            currentShift: user.shift,
            status: 'pending'
        });

        const shifts = ['Sabah', 'Öğlen', 'Akşam', 'Gece'].filter(s => s !== user.shift);

        await ctx.reply(
            `🔄 *Vardiya Değişimi*\n\nMevcut: ${user.shift}\nHangi vardiyaya geçmek istiyorsunuz?`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    ...shifts.map(shift => [
                        Markup.button.callback(shift, `shift_${shift.toLowerCase()}_${requestId}`)
                    ]),
                    [Markup.button.callback('❌ İptal', `cancel_${requestId}`)]
                ])
            }
        );
    }

    async handleBreak(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user) return;

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

            this.emit('break_ended', {
                userId: user.chatId,
                userName: `${user.firstName} ${user.lastName}`,
                duration: breakMinutes
            });
        } else {
            // Start break
            const newAttendance = await Attendance.findOneAndUpdate(
                {
                    userId: user.chatId,
                    date: { $gte: today }
                },
                {
                    $set: { breakStart: new Date() }
                },
                { upsert: true, new: true }
            );

            await ctx.reply(
                `☕ *Mola Başladı*\n\n` +
                `Saat: ${new Date().toLocaleTimeString('tr-TR')}\n` +
                `⚠️ Mola süreniz 30 dakikayı geçmemelidir.`,
                { parse_mode: 'Markdown' }
            );

            this.emit('break_started', {
                userId: user.chatId,
                userName: `${user.firstName} ${user.lastName}`,
                time: new Date()
            });
        }
    }

    async showStatus(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user) return;

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

        const pendingRequests = await EmployeeRequest.countDocuments({
            employeeId: user.chatId,
            status: 'pending'
        });

        let statusMessage = `📊 *Güncel Durumunuz*\n\n`;
        statusMessage += `👤 ${user.firstName} ${user.lastName}\n`;
        statusMessage += `🏢 ${user.department || 'Departman belirtilmemiş'}\n`;
        statusMessage += `💼 ${user.position || 'Pozisyon belirtilmemiş'}\n`;
        statusMessage += `⏰ Vardiya: ${user.shift}\n\n`;

        statusMessage += `*Bugün:*\n`;
        if (attendance) {
            if (attendance.checkIn) {
                statusMessage += `✅ Giriş: ${attendance.checkIn.toLocaleTimeString('tr-TR')}\n`;
            }
            if (attendance.checkOut) {
                statusMessage += `🚪 Çıkış: ${attendance.checkOut.toLocaleTimeString('tr-TR')}\n`;
            } else if (attendance.checkIn) {
                statusMessage += `🟢 Şu anda iştesiniz\n`;
            }
            if (attendance.breakStart && !attendance.breakEnd) {
                statusMessage += `☕ Molada (${attendance.breakStart.toLocaleTimeString('tr-TR')})\n`;
            }
            if (attendance.totalBreakMinutes > 0) {
                statusMessage += `⏱️ Toplam mola: ${attendance.totalBreakMinutes} dakika\n`;
            }
        } else {
            statusMessage += `❌ Giriş kaydınız yok\n`;
        }

        statusMessage += `\n*Özet:*\n`;
        statusMessage += `📋 Bekleyen görev: ${pendingTasks}\n`;
        statusMessage += `📝 Bekleyen talep: ${pendingRequests}`;

        await ctx.reply(statusMessage, { parse_mode: 'Markdown' });
    }

    async showSettings(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user) return;

        const message = `⚙️ *Ayarlar*\n\n` +
            `*Profil Bilgileri:*\n` +
            `👤 ${user.firstName} ${user.lastName || ''}\n` +
            `📱 @${user.username || 'Kullanıcı adı yok'}\n` +
            `🏷️ Rol: ${this.getRoleDisplay(user.role)}\n` +
            `🏢 Departman: ${user.department || 'Belirtilmemiş'}\n` +
            `💼 Pozisyon: ${user.position || 'Belirtilmemiş'}\n` +
            `⏰ Vardiya: ${user.shift}\n` +
            `📅 Kayıt: ${user.registeredAt.toLocaleDateString('tr-TR')}\n` +
            `🟢 Durum: ${user.isActive ? 'Aktif' : 'Pasif'}`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('📝 Bilgileri Güncelle', 'settings_update')],
            [Markup.button.callback('🔔 Bildirim Ayarları', 'settings_notifications')],
            [Markup.button.callback('🔐 Güvenlik', 'settings_security')]
        ]);

        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    }

    async showUsers(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || user.role === 'employee') {
            await ctx.reply('❌ Bu özellik sadece yöneticiler içindir.');
            return;
        }

        const users = await User.find({}).sort({ department: 1, firstName: 1 }).limit(50);

        if (users.length === 0) {
            await ctx.reply('👥 Kullanıcı bulunamadı.');
            return;
        }

        let currentDepartment = '';
        let message = '👥 *Kullanıcı Listesi*\n\n';

        for (const u of users) {
            if (u.department !== currentDepartment) {
                currentDepartment = u.department || 'Belirtilmemiş';
                message += `\n*${currentDepartment}*\n`;
            }

            const roleIcon = {
                admin: '👨‍💼',
                manager: '👔',
                employee: '👷‍♂️'
            }[u.role];

            const statusIcon = u.isActive ? '🟢' : '🔴';
            
            message += `${roleIcon} ${statusIcon} ${u.firstName} ${u.lastName || ''} (@${u.username || 'yok'})\n`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });

        if (user.role === 'admin') {
            await ctx.reply(
                '👥 Kullanıcı yönetimi için:\n' +
                '/makeadmin [chatId] - Admin yap\n' +
                '/removeadmin [chatId] - Admin yetkisini kaldır\n' +
                '/activate [chatId] - Kullanıcıyı aktifleştir\n' +
                '/deactivate [chatId] - Kullanıcıyı pasifleştir'
            );
        }
    }

    async showViolations(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || user.role === 'employee') {
            await ctx.reply('❌ Bu özellik sadece yöneticiler içindir.');
            return;
        }

        const violations = await Violation.find({
            status: { $ne: 'resolved' }
        }).sort({ severity: -1, detectedAt: -1 }).limit(10);

        if (violations.length === 0) {
            await ctx.reply('🚨 Aktif ihlal kaydı bulunmuyor.');
            return;
        }

        for (const violation of violations) {
            const severityIcon = {
                low: '🟡',
                medium: '🟠',
                high: '🔴',
                critical: '🚨'
            }[violation.severity];

            const message = `${severityIcon} *İhlal #${violation._id.toString().slice(-6)}*\n\n` +
                `📋 Tür: ${violation.type}\n` +
                `👤 Çalışan: ${violation.employeeName || 'Bilinmiyor'}\n` +
                `📍 Konum: ${violation.location || 'Belirtilmemiş'}\n` +
                `📅 Tarih: ${violation.detectedAt.toLocaleString('tr-TR')}\n` +
                `📝 ${violation.description || 'Açıklama yok'}\n` +
                `🔍 Durum: ${this.getStatusDisplay(violation.status)}`;

            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Çözüldü', `violation_resolve_${violation._id}`),
                    Markup.button.callback('❌ Reddet', `violation_dismiss_${violation._id}`)
                ],
                [Markup.button.callback('📝 Not Ekle', `violation_note_${violation._id}`)]
            ]);

            await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
        }
    }

    async showHelp(ctx) {
        const user = await this.getUser(ctx.chat.id);
        const isAdmin = user && user.role === 'admin';
        const isManager = user && user.role === 'manager';

        let helpText = `🤖 *SecurityTrackerPro Bot Yardım*\n\n`;

        helpText += `*Genel Komutlar:*\n`;
        helpText += `/start - Botu başlat\n`;
        helpText += `/help - Bu yardım mesajı\n\n`;

        helpText += `*Çalışan Özellikleri:*\n`;
        helpText += `📋 Görevlerim - Aktif görevleri görüntüle\n`;
        helpText += `📦 Eksik Ürünler - Eksik ürün listesi\n`;
        helpText += `📢 Duyurular - Güncel duyurular\n`;
        helpText += `📅 İzin Talebi - İzin talep et\n`;
        helpText += `🔄 Vardiya Değişimi - Vardiya değişimi talep et\n`;
        helpText += `☕ Mola - Mola başlat/bitir\n`;
        helpText += `📊 Durum - Güncel durumunuz\n`;
        helpText += `⚙️ Ayarlar - Profil ayarları\n\n`;

        if (isManager || isAdmin) {
            helpText += `*Yönetici Özellikleri:*\n`;
            helpText += `👥 Kullanıcılar - Kullanıcı listesi\n`;
            helpText += `📈 Raporlar - Sistem raporları\n`;
            helpText += `🚨 İhlaller - İhlal kayıtları\n`;
            helpText += `/addtask - Yeni görev ekle\n`;
            helpText += `/announce - Duyuru yayınla\n`;
            helpText += `/stats - İstatistikler\n\n`;
        }

        if (isAdmin) {
            helpText += `*Admin Komutları:*\n`;
            helpText += `/broadcast - Toplu mesaj gönder\n`;
            helpText += `/makeadmin [chatId] - Admin yap\n`;
            helpText += `/removeadmin [chatId] - Admin yetkisini kaldır\n`;
            helpText += `/activate [chatId] - Kullanıcıyı aktifleştir\n`;
            helpText += `/deactivate [chatId] - Kullanıcıyı pasifleştir\n`;
            helpText += `/report - Detaylı rapor oluştur\n\n`;
        }

        helpText += `💡 *İpuçları:*\n`;
        helpText += `• Görevleri tamamladığınızda işaretlemeyi unutmayın\n`;
        helpText += `• Mola sürelerinize dikkat edin\n`;
        helpText += `• Tüm talepler yönetici onayına tabidir\n`;
        helpText += `• Sorun yaşarsanız yöneticinizle iletişime geçin`;

        await ctx.reply(helpText, { parse_mode: 'Markdown' });
    }

    // ==================== CALLBACK HANDLERS ====================

    async handleTaskCallback(ctx, data, user) {
        const [, action, taskId] = data.split('_');
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
            
            // Check if all completed
            if (task.assignedTo.every(a => a.completed)) {
                task.status = 'completed';
                task.completedAt = new Date();
            }
            
            await task.save();
            await ctx.editMessageText('✅ Görev tamamlandı olarak işaretlendi!');
            
            this.emit('task_completed', {
                taskId: task._id,
                userId: user.chatId,
                userName: `${user.firstName} ${user.lastName}`
            });
        } else if (action === 'undo') {
            task.assignedTo[assigneeIndex].completed = false;
            task.assignedTo[assigneeIndex].completedAt = null;
            task.status = 'in_progress';
            
            await task.save();
            await ctx.editMessageText('↩️ Görev tamamlanmadı olarak işaretlendi.');
        }
    }

    async handleProductCallback(ctx, data, user) {
        const [, action, productId] = data.split('_');
        
        if (user.role === 'employee') {
            await ctx.answerCbQuery('❌ Yetkiniz yok!');
            return;
        }

        if (action === 'manage') {
            const product = await MissingProduct.findById(productId);
            if (!product) {
                await ctx.editMessageText('❌ Ürün bulunamadı.');
                return;
            }

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('✅ Çözüldü', `product_resolve_${productId}`)],
                [Markup.button.callback('📦 Sipariş Verildi', `product_ordered_${productId}`)],
                [Markup.button.callback('🔍 Onaylandı', `product_confirmed_${productId}`)],
                [Markup.button.callback('❌ İptal', 'cancel')]
            ]);

            await ctx.editMessageText(
                `📦 *${product.productName}*\n\n` +
                `Miktar: ${product.quantity} ${product.unit || 'adet'}\n` +
                `Durum: ${product.status}\n\n` +
                `Ne yapmak istiyorsunuz?`,
                { parse_mode: 'Markdown', ...keyboard }
            );
        } else if (action === 'resolve') {
            await MissingProduct.findByIdAndUpdate(productId, {
                status: 'resolved',
                resolvedAt: new Date(),
                resolvedBy: user.chatId
            });
            await ctx.editMessageText('✅ Ürün sorunu çözüldü!');
        } else if (action === 'ordered') {
            await MissingProduct.findByIdAndUpdate(productId, {
                status: 'ordered'
            });
            await ctx.editMessageText('📦 Ürün sipariş edildi olarak işaretlendi.');
        } else if (action === 'confirmed') {
            await MissingProduct.findByIdAndUpdate(productId, {
                status: 'confirmed'
            });
            await ctx.editMessageText('🔍 Ürün eksikliği onaylandı.');
        }
    }

    async handleLeaveCallback(ctx, data, user) {
        const parts = data.split('_');
        const dateType = parts[1];
        const requestId = parts[2];
        const request = this.requests.get(requestId);

        if (!request) {
            await ctx.editMessageText('❌ Talep bulunamadı.');
            return;
        }

        let leaveDate = new Date();
        let endDate = new Date();

        switch(dateType) {
            case 'today':
                break;
            case 'tomorrow':
                leaveDate.setDate(leaveDate.getDate() + 1);
                endDate = new Date(leaveDate);
                break;
            case 'week':
                endDate.setDate(endDate.getDate() + 7);
                request.duration = 'week';
                break;
            case 'custom':
                this.userStates.set(user.chatId, {
                    action: 'leave_date',
                    requestId
                });
                await ctx.editMessageText('📅 İzin tarihini GG.AA.YYYY formatında yazın:');
                return;
        }

        request.startDate = leaveDate;
        request.endDate = endDate;

        const employeeRequest = new EmployeeRequest({
            employeeId: user.chatId,
            employeeName: `${user.firstName} ${user.lastName}`,
            type: 'leave',
            details: {
                startDate: leaveDate,
                endDate: endDate,
                duration: request.duration
            },
            reason: request.reason
        });

        await employeeRequest.save();
        this.requests.delete(requestId);

        await ctx.editMessageText(
            `✅ İzin talebiniz alındı.\n\n` +
            `📅 Başlangıç: ${leaveDate.toLocaleDateString('tr-TR')}\n` +
            `📅 Bitiş: ${endDate.toLocaleDateString('tr-TR')}\n\n` +
            `⏳ Yönetici onayı bekleniyor...`
        );

        await this.notifyAdmins(
            `📅 *Yeni İzin Talebi*\n\n` +
            `👤 ${user.firstName} ${user.lastName}\n` +
            `📅 ${leaveDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}`
        );
    }

    async handleShiftCallback(ctx, data, user) {
        const parts = data.split('_');
        const newShift = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        const requestId = parts[2];
        const request = this.requests.get(requestId);

        if (!request) {
            await ctx.editMessageText('❌ Talep bulunamadı.');
            return;
        }

        request.newShift = newShift;

        const employeeRequest = new EmployeeRequest({
            employeeId: user.chatId,
            employeeName: `${user.firstName} ${user.lastName}`,
            type: 'shift_change',
            details: {
                currentShift: request.currentShift,
                requestedShift: newShift
            }
        });

        await employeeRequest.save();
        this.requests.delete(requestId);

        await ctx.editMessageText(
            `✅ Vardiya değişim talebiniz alındı.\n\n` +
            `🔄 Mevcut: ${request.currentShift}\n` +
            `➡️ Talep: ${newShift}\n\n` +
            `⏳ Yönetici onayı bekleniyor...`
        );

        await this.notifyAdmins(
            `🔄 *Yeni Vardiya Değişim Talebi*\n\n` +
            `👤 ${user.firstName} ${user.lastName}\n` +
            `Mevcut: ${request.currentShift} → Talep: ${newShift}`
        );
    }

    async handleCancelCallback(ctx, data) {
        const requestId = data.split('_')[1];
        this.requests.delete(requestId);
        await ctx.editMessageText('❌ Talep iptal edildi.');
    }

    // ==================== ADMIN COMMANDS ====================

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

        const users = await User.find({ isActive: true });
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
            activeUsers: await User.countDocuments({ isActive: true }),
            pendingTasks: await Task.countDocuments({ status: { $ne: 'completed' } }),
            completedTasks: await Task.countDocuments({ status: 'completed' }),
            missingProducts: await MissingProduct.countDocuments({ status: { $ne: 'resolved' } }),
            pendingRequests: await EmployeeRequest.countDocuments({ status: 'pending' }),
            activeViolations: await Violation.countDocuments({ status: { $ne: 'resolved' } })
        };

        const message = `📊 *Sistem İstatistikleri*\n\n` +
            `👥 Toplam Kullanıcı: ${stats.totalUsers}\n` +
            `🟢 Aktif Kullanıcı: ${stats.activeUsers}\n\n` +
            `📋 Bekleyen Görev: ${stats.pendingTasks}\n` +
            `✅ Tamamlanan Görev: ${stats.completedTasks}\n\n` +
            `📦 Eksik Ürün: ${stats.missingProducts}\n` +
            `📝 Bekleyen Talep: ${stats.pendingRequests}\n` +
            `🚨 Aktif İhlal: ${stats.activeViolations}`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
    }

    async makeAdmin(ctx) {
        const user = await this.getUser(ctx.chat.id);
        if (!user || user.role !== 'admin') {
            await ctx.reply('❌ Bu komutu kullanma yetkiniz yok.');
            return;
        }

        const targetChatId = ctx.message.text.split(' ')[1];
        if (!targetChatId) {
            await ctx.reply('Kullanım: /makeadmin [chatId]');
            return;
        }

        const targetUser = await User.findOneAndUpdate(
            { chatId: targetChatId },
            { role: 'admin' },
            { new: true }
        );

        if (targetUser) {
            await ctx.reply(`✅ ${targetUser.firstName} admin yapıldı.`);
            await this.bot.telegram.sendMessage(targetChatId, '🎉 Admin yetkisi verildi!');
        } else {
            await ctx.reply('❌ Kullanıcı bulunamadı.');
        }
    }

    // ==================== HELPER METHODS ====================

    async getUser(chatId) {
        return await User.findOne({ chatId: chatId.toString() });
    }

    async notifyAdmins(message) {
        const admins = await User.find({ role: { $in: ['admin', 'manager'] }, isActive: true });
        for (const admin of admins) {
            try {
                await this.bot.telegram.sendMessage(admin.chatId, message, { parse_mode: 'Markdown' });
            } catch (error) {
                console.error(`Admin notification failed for ${admin.chatId}:`, error.message);
            }
        }
    }

    async handleStateInput(ctx, state) {
        const chatId = ctx.chat.id.toString();
        const text = ctx.message.text;

        switch (state.action) {
            case 'leave_date':
                // Parse date and save leave request
                const request = this.requests.get(state.requestId);
                if (request) {
                    // Date parsing logic here
                    await ctx.reply('✅ Tarih kaydedildi. Talep gönderildi.');
                    this.requests.delete(state.requestId);
                }
                this.userStates.delete(chatId);
                break;

            case 'add_task':
                // Handle task creation steps
                if (!state.data) state.data = {};
                
                if (!state.data.title) {
                    state.data.title = text;
                    await ctx.reply('📝 Görev açıklamasını yazın:');
                } else if (!state.data.description) {
                    state.data.description = text;
                    await this.saveTask(state.data);
                    await ctx.reply('✅ Görev oluşturuldu!');
                    this.userStates.delete(chatId);
                }
                break;
        }
    }

    getMainKeyboard(role) {
        const baseButtons = [
            ['📋 Görevlerim', '📦 Eksik Ürünler'],
            ['📢 Duyurular', '📊 Durum'],
            ['📅 İzin Talebi', '🔄 Vardiya Değişimi'],
            ['☕ Mola', '⚙️ Ayarlar'],
            ['❓ Yardım']
        ];

        if (role === 'admin' || role === 'manager') {
            baseButtons.push(['👥 Kullanıcılar', '📈 Raporlar', '🚨 İhlaller']);
        }

        return Markup.keyboard(baseButtons).resize();
    }

    getWelcomeMessage(user) {
        const roleDisplay = this.getRoleDisplay(user.role);
        return `👋 *Hoş Geldiniz!*\n\n` +
            `${roleDisplay} *${user.firstName} ${user.lastName || ''}*\n` +
            `🏢 SecurityTrackerPro Bot\n\n` +
            `Aşağıdaki menüden işlem seçebilirsiniz.`;
    }

    getRoleDisplay(role) {
        const roles = {
            admin: '👨‍💼 Admin',
            manager: '👔 Yönetici',
            employee: '👷‍♂️ Çalışan'
        };
        return roles[role] || role;
    }

    getStatusDisplay(status) {
        const statuses = {
            pending: '⏳ Bekliyor',
            in_progress: '🔄 İşlemde',
            completed: '✅ Tamamlandı',
            resolved: '✅ Çözüldü',
            reviewing: '🔍 İnceleniyor',
            dismissed: '❌ Reddedildi',
            approved: '✅ Onaylandı',
            rejected: '❌ Reddedildi',
            cancelled: '🚫 İptal edildi'
        };
        return statuses[status] || status;
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
}

// ==================== MONGODB CONNECTION ====================
async function connectMongoDB() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// ==================== INITIALIZE BOT ====================
const securityBot = new SecurityTrackerBot();

// ==================== EXPRESS ROUTES ====================
app.get('/', (req, res) => {
    res.json({ 
        status: 'SecurityTrackerPro Bot Active',
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
app.use(securityBot.bot.webhookCallback(`/bot${BOT_TOKEN}`));

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

app.post('/api/send-task', async (req, res) => {
    try {
        const { task } = req.body;
        
        for (const assignee of task.assignedTo) {
            const user = await User.findOne({ chatId: assignee.userId });
            if (user) {
                await securityBot.bot.telegram.sendMessage(
                    user.chatId,
                    `🆕 *Yeni Görev!*\n\n${task.title}\n${task.description}`,
                    { parse_mode: 'Markdown' }
                );
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== SERVER START ====================
async function startServer() {
    await connectMongoDB();
    
    app.listen(PORT, () => {
        console.log(`🚀 SecurityTrackerPro Bot Server running on port ${PORT}`);
        console.log(`🌐 Health endpoint: http://localhost:${PORT}/health`);
        console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Start polling in development
    if (process.env.NODE_ENV !== 'production') {
        securityBot.bot.launch();
        console.log('🤖 Bot polling started for development');
    }
}

// Graceful shutdown
process.once('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    securityBot.bot.stop('SIGINT');
    process.exit(0);
});

process.once('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    securityBot.bot.stop('SIGTERM');
    process.exit(0);
});

// Start the server
startServer().catch(error => {
    console.error('❌ Server start error:', error);
    process.exit(1);
});

module.exports = { app, securityBot };