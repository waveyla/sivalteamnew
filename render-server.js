const { Telegraf, Markup } = require('telegraf');
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
    points: 50,
    duration: 60,
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
    assignedTo: [String],
    assignedBy: String,
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    completedAt: Date,
    deadline: Date
});

const missingProductSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    quantity: Number,
    reportedBy: String,
    location: String,
    urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['reported', 'confirmed', 'resolved'], default: 'reported' },
    reportedAt: { type: Date, default: Date.now },
    resolvedAt: Date
});

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    createdBy: String,
    targetRole: { type: String, enum: ['all', 'admin', 'employee'], default: 'all' },
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
});

const attendanceSchema = new mongoose.Schema({
    chatId: String,
    date: { type: Date, default: Date.now },
    checkIn: Date,
    checkOut: Date,
    status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
    location: String
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const MissingProduct = mongoose.model('MissingProduct', missingProductSchema);
const Announcement = mongoose.model('Announcement', announcementSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);

// ==================== TELEGRAM BOT CLASS ====================
class SivalTeamBot {
    constructor() {
        this.bot = new Telegraf(BOT_TOKEN);
        this.userStates = new Map();
        this.setupMiddleware();
        this.setupHandlers();
        this.setupWebhook();
        console.log('🤖 SivalTeam Bot initialized with Telegraf');
    }

    setupMiddleware() {
        // Rate limiting middleware
        this.bot.use(async (ctx, next) => {
            try {
                await rateLimiter.consume(ctx.chat.id);
                return next();
            } catch (rejRes) {
                console.log(`⚡ Rate limit exceeded for ${ctx.chat.id}`);
                return;
            }
        });

        // Spam filter middleware
        this.bot.use(async (ctx, next) => {
            if (ctx.message && this.isSpamMessage(ctx.message)) {
                console.log(`🚫 Spam blocked from ${ctx.chat.id}: ${ctx.message.text}`);
                await ctx.deleteMessage().catch(() => {});
                return;
            }
            return next();
        });

        // Forward messages block
        this.bot.use(async (ctx, next) => {
            if (ctx.message && (ctx.message.forward_from || ctx.message.forward_from_chat)) {
                await ctx.deleteMessage().catch(() => {});
                await ctx.reply('⚠️ Forward mesajlar engellendi.');
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
                await ctx.reply(
                    '👋 SivalTeam Sistemine Hoş Geldiniz!\n\n' +
                    '📝 Sisteme kayıt olmak için admin onayına ihtiyacınız var.\n' +
                    '⏳ Lütfen yöneticinizle iletişime geçin.',
                    Markup.keyboard([['📞 Yardım İste']]).resize()
                );
                return;
            }

            const welcomeMessage = user.role === 'admin' 
                ? '👨‍💼 Admin paneline hoş geldiniz!' 
                : '👷‍♂️ Çalışan paneline hoş geldiniz!';

            await ctx.reply(
                `${welcomeMessage}\n\n🏢 SivalTeam Yönetim Sistemi`,
                this.getMainKeyboard(user.role)
            );
        });

        // Main menu handlers
        this.bot.hears('📋 Görevler', async (ctx) => {
            const user = await this.getUser(ctx.chat.id);
            if (!user) return;
            await this.showTasks(ctx, user);
        });

        this.bot.hears('📦 Eksik Ürünler', async (ctx) => {
            const user = await this.getUser(ctx.chat.id);
            if (!user) return;
            await this.showMissingProducts(ctx, user);
        });

        this.bot.hears('📢 Duyurular', async (ctx) => {
            const user = await this.getUser(ctx.chat.id);
            if (!user) return;
            await this.showAnnouncements(ctx);
        });

        this.bot.hears('👥 Kullanıcılar', async (ctx) => {
            const user = await this.getUser(ctx.chat.id);
            if (!user || user.role !== 'admin') {
                await ctx.reply('❌ Bu özellik sadece adminler içindir.');
                return;
            }
            await this.showUsers(ctx);
        });

        this.bot.hears('⚙️ Ayarlar', async (ctx) => {
            const user = await this.getUser(ctx.chat.id);
            if (!user) return;
            await this.showSettings(ctx, user);
        });

        // Callback query handlers
        this.bot.on('callback_query', async (ctx) => {
            const data = ctx.callbackQuery.data;
            const user = await this.getUser(ctx.chat.id);
            if (!user) return;

            if (data.startsWith('task_complete_')) {
                const taskId = data.replace('task_complete_', '');
                await this.completeTask(ctx, taskId, user);
            } else if (data.startsWith('product_resolve_')) {
                const productId = data.replace('product_resolve_', '');
                await this.resolveProduct(ctx, productId, user);
            } else if (data.startsWith('user_approve_')) {
                const userId = data.replace('user_approve_', '');
                await this.approveUser(ctx, userId);
            } else if (data.startsWith('user_reject_')) {
                const userId = data.replace('user_reject_', '');
                await this.rejectUser(ctx, userId);
            }

            await ctx.answerCbQuery();
        });

        // Text message handler for states
        this.bot.on('text', async (ctx) => {
            const chatId = ctx.chat.id.toString();
            const state = this.userStates.get(chatId);
            const user = await this.getUser(chatId);
            if (!user) return;

            if (state) {
                await this.handleStateInput(ctx, state, user);
            }
        });

        console.log('🎯 Telegraf handlers setup completed');
    }

    async handleStateInput(ctx, state, user) {
        const chatId = ctx.chat.id.toString();
        const text = ctx.message.text;

        switch (state.action) {
            case 'add_task':
                if (state.step === 'title') {
                    state.data.title = text;
                    state.step = 'description';
                    await ctx.reply('📝 Görev açıklamasını yazın:');
                } else if (state.step === 'description') {
                    state.data.description = text;
                    await this.saveTask(ctx, state.data, user);
                    this.userStates.delete(chatId);
                }
                break;

            case 'add_product':
                if (state.step === 'name') {
                    state.data.productName = text;
                    state.step = 'quantity';
                    await ctx.reply('🔢 Eksik miktar:');
                } else if (state.step === 'quantity') {
                    state.data.quantity = parseInt(text) || 1;
                    await this.saveProduct(ctx, state.data, user);
                    this.userStates.delete(chatId);
                }
                break;

            case 'add_announcement':
                if (state.step === 'title') {
                    state.data.title = text;
                    state.step = 'message';
                    await ctx.reply('📝 Duyuru mesajını yazın:');
                } else if (state.step === 'message') {
                    state.data.message = text;
                    await this.saveAnnouncement(ctx, state.data, user);
                    this.userStates.delete(chatId);
                }
                break;
        }
    }

    async saveTask(ctx, taskData, user) {
        try {
            const task = new Task({
                ...taskData,
                assignedBy: ctx.chat.id.toString()
            });
            await task.save();
            await ctx.reply('✅ Görev başarıyla eklendi!', this.getMainKeyboard(user.role));
        } catch (error) {
            console.error('Task save error:', error);
            await ctx.reply('❌ Görev eklenirken hata oluştu.');
        }
    }

    async saveProduct(ctx, productData, user) {
        try {
            const product = new MissingProduct({
                ...productData,
                reportedBy: ctx.chat.id.toString()
            });
            await product.save();
            await ctx.reply('✅ Eksik ürün raporu eklendi!', this.getMainKeyboard(user.role));
        } catch (error) {
            console.error('Product save error:', error);
            await ctx.reply('❌ Ürün raporu eklenirken hata oluştu.');
        }
    }

    async saveAnnouncement(ctx, announcementData, user) {
        try {
            const announcement = new Announcement({
                ...announcementData,
                createdBy: ctx.chat.id.toString()
            });
            await announcement.save();
            await ctx.reply('✅ Duyuru yayınlandı!', this.getMainKeyboard(user.role));
        } catch (error) {
            console.error('Announcement save error:', error);
            await ctx.reply('❌ Duyuru yayınlanırken hata oluştu.');
        }
    }

    async showTasks(ctx, user) {
        try {
            const tasks = user.role === 'admin' 
                ? await Task.find({ status: { $ne: 'completed' } }).sort({ createdAt: -1 }).limit(10)
                : await Task.find({ 
                    $or: [
                        { assignedTo: ctx.chat.id.toString() },
                        { assignedTo: { $size: 0 } }
                    ],
                    status: { $ne: 'completed' }
                }).sort({ createdAt: -1 }).limit(10);

            if (tasks.length === 0) {
                await ctx.reply('📋 Aktif görev bulunamadı.');
                return;
            }

            for (const task of tasks) {
                const priorityIcon = { low: '🟢', medium: '🟡', high: '🔴' }[task.priority];
                const statusIcon = { pending: '⏳', in_progress: '🔄', completed: '✅' }[task.status];
                
                const message = `${priorityIcon} ${statusIcon} **${task.title}**\n` +
                    `📝 ${task.description || 'Açıklama yok'}\n` +
                    `📅 ${task.createdAt.toLocaleDateString('tr-TR')}`;

                const keyboard = user.role === 'admin' || task.assignedTo.includes(ctx.chat.id.toString())
                    ? Markup.inlineKeyboard([
                        [Markup.button.callback('✅ Tamamla', `task_complete_${task._id}`)]
                    ])
                    : undefined;

                await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
            }

            if (user.role === 'admin') {
                await ctx.reply('➕ Yeni görev eklemek için "Yeni Görev" yazın.');
            }
        } catch (error) {
            console.error('Show tasks error:', error);
            await ctx.reply('❌ Görevler yüklenirken hata oluştu.');
        }
    }

    async showMissingProducts(ctx, user) {
        try {
            const products = await MissingProduct.find({ status: { $ne: 'resolved' } })
                .sort({ reportedAt: -1 }).limit(10);

            if (products.length === 0) {
                await ctx.reply('📦 Eksik ürün raporu bulunamadı.');
                return;
            }

            for (const product of products) {
                const urgencyIcon = { low: '🟢', medium: '🟡', high: '🔴' }[product.urgency];
                const statusIcon = { reported: '📋', confirmed: '🔍', resolved: '✅' }[product.status];
                
                const message = `${urgencyIcon} ${statusIcon} **${product.productName}**\n` +
                    `🔢 Miktar: ${product.quantity || 'Belirtilmemiş'}\n` +
                    `📍 Konum: ${product.location || 'Belirtilmemiş'}\n` +
                    `📅 ${product.reportedAt.toLocaleDateString('tr-TR')}`;

                const keyboard = user.role === 'admin'
                    ? Markup.inlineKeyboard([
                        [Markup.button.callback('✅ Çözüldü', `product_resolve_${product._id}`)]
                    ])
                    : undefined;

                await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
            }

            await ctx.reply('➕ Yeni eksik ürün raporu için "Yeni Ürün" yazın.');
        } catch (error) {
            console.error('Show products error:', error);
            await ctx.reply('❌ Ürün raporları yüklenirken hata oluştu.');
        }
    }

    async showAnnouncements(ctx) {
        try {
            const announcements = await Announcement.find({ isActive: true })
                .sort({ createdAt: -1 }).limit(5);

            if (announcements.length === 0) {
                await ctx.reply('📢 Aktif duyuru bulunamadı.');
                return;
            }

            for (const announcement of announcements) {
                const message = `📢 **${announcement.title}**\n\n` +
                    `${announcement.message}\n\n` +
                    `📅 ${announcement.createdAt.toLocaleDateString('tr-TR')}`;
                
                await ctx.reply(message, { parse_mode: 'Markdown' });
            }
        } catch (error) {
            console.error('Show announcements error:', error);
            await ctx.reply('❌ Duyurular yüklenirken hata oluştu.');
        }
    }

    async showUsers(ctx) {
        try {
            const users = await User.find({}).sort({ registeredAt: -1 }).limit(20);
            
            if (users.length === 0) {
                await ctx.reply('👥 Kullanıcı bulunamadı.');
                return;
            }

            let message = '👥 **Kullanıcı Listesi**\n\n';
            for (const user of users) {
                const roleIcon = user.role === 'admin' ? '👨‍💼' : '👷‍♂️';
                const statusIcon = user.isActive ? '🟢' : '🔴';
                
                message += `${roleIcon} ${statusIcon} ${user.firstName} ${user.lastName || ''}\n`;
                message += `📱 @${user.username || 'Kullanıcı adı yok'}\n`;
                message += `🏷️ ${user.department || 'Departman yok'}\n\n`;
            }

            await ctx.reply(message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Show users error:', error);
            await ctx.reply('❌ Kullanıcılar yüklenirken hata oluştu.');
        }
    }

    async showSettings(ctx, user) {
        const message = '⚙️ **Ayarlar**\n\n' +
            `👤 **Profil Bilgileri**\n` +
            `📛 İsim: ${user.firstName} ${user.lastName || ''}\n` +
            `🏷️ Rol: ${user.role === 'admin' ? 'Admin' : 'Çalışan'}\n` +
            `🏢 Departman: ${user.department || 'Belirtilmemiş'}\n` +
            `📅 Kayıt: ${user.registeredAt.toLocaleDateString('tr-TR')}`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
    }

    async completeTask(ctx, taskId, user) {
        try {
            const task = await Task.findByIdAndUpdate(taskId, {
                status: 'completed',
                completedAt: new Date()
            });

            if (task) {
                await ctx.reply('✅ Görev tamamlandı olarak işaretlendi!');
            } else {
                await ctx.reply('❌ Görev bulunamadı.');
            }
        } catch (error) {
            console.error('Complete task error:', error);
            await ctx.reply('❌ Görev tamamlanırken hata oluştu.');
        }
    }

    async resolveProduct(ctx, productId, user) {
        try {
            const product = await MissingProduct.findByIdAndUpdate(productId, {
                status: 'resolved',
                resolvedAt: new Date()
            });

            if (product) {
                await ctx.reply('✅ Ürün sorunu çözüldü olarak işaretlendi!');
            } else {
                await ctx.reply('❌ Ürün raporu bulunamadı.');
            }
        } catch (error) {
            console.error('Resolve product error:', error);
            await ctx.reply('❌ Ürün çözümlenirken hata oluştu.');
        }
    }

    getMainKeyboard(role) {
        const baseButtons = [
            ['📋 Görevler', '📦 Eksik Ürünler'],
            ['📢 Duyurular', '⚙️ Ayarlar']
        ];

        if (role === 'admin') {
            baseButtons.push(['👥 Kullanıcılar', '📊 Raporlar']);
        }

        return Markup.keyboard(baseButtons).resize();
    }

    async getUser(chatId) {
        try {
            const user = await User.findOne({ chatId: chatId.toString() });
            if (user) {
                user.lastActive = new Date();
                await user.save();
            }
            return user;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    }

    isSpamMessage(msg) {
        if (!msg.text) return false;
        
        const spamKeywords = [
            'reklam', 'advertisement', 'promo', 'discount', 'sale', 'offer',
            'casino', 'bet', 'gambling', 'crypto', 'investment', 'earn money',
            'click here', 'limited time', 'free money', 'join now', 'telegram.me',
            '@', 'http://', 'https://', 'bit.ly', 't.me', 'tinyurl'
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
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected successfully');
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
        version: '2.0.0-Telegraf'
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

// Webhook endpoint for Telegram
app.use(sivalTeamBot.bot.webhookCallback(`/bot${BOT_TOKEN}`));

// User registration endpoint
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
        console.log(`🚀 SivalTeam Bot Server running on port ${PORT}`);
        console.log(`🌐 Health endpoint: http://localhost:${PORT}/health`);
    });

    // Start polling in development
    if (process.env.NODE_ENV !== 'production') {
        sivalTeamBot.bot.launch();
        console.log('🤖 Bot polling started for development');
    }
}

// Graceful shutdown
process.once('SIGINT', () => sivalTeamBot.bot.stop('SIGINT'));
process.once('SIGTERM', () => sivalTeamBot.bot.stop('SIGTERM'));

startServer().catch(error => {
    console.error('❌ Server start error:', error);
    process.exit(1);
});

module.exports = { app, sivalTeamBot };