const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
require('dotenv').config();

// ==================== EXPRESS SETUP ====================
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 10000;

// ==================== MONGODB SCHEMAS ====================
const userSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true },
    username: String,
    firstName: String,
    lastName: String,
    role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const taskSchema = new mongoose.Schema({
    title: String,
    description: String,
    assignedTo: [String],
    assignedBy: String,
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    completedAt: Date
});

const missingProductSchema = new mongoose.Schema({
    productName: String,
    quantity: Number,
    reportedBy: String,
    reportedByName: String,
    resolved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const MissingProduct = mongoose.model('MissingProduct', missingProductSchema);

// ==================== BOT SETUP ====================
const bot = new TelegramBot(process.env.BOT_TOKEN);

// Set webhook
const WEBHOOK_URL = process.env.WEBHOOK_URL || `https://sivalteam-bot.onrender.com/webhook`;
bot.setWebHook(`${WEBHOOK_URL}/${process.env.BOT_TOKEN}`);

// User states
const userStates = new Map();

// ==================== KEYBOARDS ====================
const adminKeyboard = {
    reply_markup: {
        keyboard: [
            ['📋 Görev Ver', '👥 Kullanıcılar'],
            ['📦 Eksik Ürünler', '📢 Duyuru Yap'],
            ['📊 Raporlar']
        ],
        resize_keyboard: true
    }
};

const employeeKeyboard = {
    reply_markup: {
        keyboard: [
            ['📋 Görevlerim', '📦 Eksik Ürün Bildir'],
            ['📢 Duyurular', 'ℹ️ Bilgilerim']
        ],
        resize_keyboard: true
    }
};

// ==================== DATABASE CONNECTION ====================
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// ==================== HELPER FUNCTIONS ====================
async function getUser(chatId) {
    return await User.findOne({ chatId: String(chatId) });
}

async function isAdmin(chatId) {
    const user = await getUser(chatId);
    return user && user.role === 'admin';
}

function clearState(chatId) {
    userStates.delete(chatId);
}

function setState(chatId, state, data = {}) {
    userStates.set(chatId, { state, data });
}

function getState(chatId) {
    return userStates.get(chatId);
}

// ==================== SPAM/AD PROTECTION ====================
const spamPatterns = [
    /t\.me\/[a-zA-Z0-9_]+/i,
    /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i,
    /@[a-zA-Z0-9_]{5,}/i,
    /kazanç|para kazan|zengin ol/i,
    /bitcoin|crypto|forex/i,
    /\+90\s?\d{3}\s?\d{3}\s?\d{2}\s?\d{2}/
];

function containsSpam(text) {
    if (!text) return false;
    return spamPatterns.some(pattern => pattern.test(text));
}

// ==================== MESSAGE HANDLERS ====================
async function handleStart(msg) {
    const chatId = msg.chat.id;
    const user = await getUser(chatId);
    
    if (user) {
        const keyboard = user.role === 'admin' ? adminKeyboard : employeeKeyboard;
        bot.sendMessage(chatId, 
            `Hoş geldin ${user.firstName}!\n` +
            `Rol: ${user.role === 'admin' ? '👑 Yönetici' : '👷 Çalışan'}`,
            keyboard
        );
    } else {
        const totalUsers = await User.countDocuments();
        
        if (totalUsers === 0) {
            const newAdmin = new User({
                chatId: String(chatId),
                username: msg.from.username,
                firstName: msg.from.first_name,
                lastName: msg.from.last_name,
                role: 'admin'
            });
            await newAdmin.save();
            
            bot.sendMessage(chatId, 
                '🎉 Tebrikler! İlk kullanıcı olarak yönetici oldunuz.',
                adminKeyboard
            );
        } else {
            const newUser = new User({
                chatId: String(chatId),
                username: msg.from.username,
                firstName: msg.from.first_name,
                lastName: msg.from.last_name,
                role: 'employee',
                isActive: false
            });
            await newUser.save();
            
            const admins = await User.find({ role: 'admin' });
            for (const admin of admins) {
                bot.sendMessage(admin.chatId,
                    `🆕 Yeni kullanıcı kaydı:\n` +
                    `İsim: ${msg.from.first_name}\n` +
                    `Username: @${msg.from.username}\n\n` +
                    `Onaylamak için: /approve_${chatId}\n` +
                    `Reddetmek için: /reject_${chatId}`
                );
            }
            
            bot.sendMessage(chatId, 
                '📋 Kaydınız alındı. Yönetici onayı bekleniyor...'
            );
        }
    }
}

async function handleApprove(msg, targetId) {
    const chatId = msg.chat.id;
    
    if (!await isAdmin(chatId)) {
        return bot.sendMessage(chatId, '❌ Bu komutu kullanma yetkiniz yok.');
    }
    
    await User.updateOne({ chatId: targetId }, { isActive: true });
    
    bot.sendMessage(targetId, 
        '✅ Kaydınız onaylandı! Sistemi kullanabilirsiniz.\n' +
        'Başlamak için /start yazın.',
        employeeKeyboard
    );
    
    bot.sendMessage(chatId, '✅ Kullanıcı onaylandı.');
}

async function handleReject(msg, targetId) {
    const chatId = msg.chat.id;
    
    if (!await isAdmin(chatId)) {
        return bot.sendMessage(chatId, '❌ Bu komutu kullanma yetkiniz yok.');
    }
    
    await User.deleteOne({ chatId: targetId });
    
    bot.sendMessage(targetId, '❌ Kaydınız reddedildi.');
    bot.sendMessage(chatId, '✅ Kullanıcı reddedildi.');
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
    
    const user = await getUser(chatId);
    if (!user || !user.isActive) return;
    
    // Check for spam
    if (user.role !== 'admin' && containsSpam(text)) {
        await bot.deleteMessage(chatId, msg.message_id);
        bot.sendMessage(chatId, '⚠️ Reklam ve link paylaşımı yasaktır!');
        
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
            bot.sendMessage(admin.chatId,
                `⚠️ SPAM/REKLAM TESPİT EDİLDİ\n\n` +
                `👤 Kullanıcı: ${user.firstName}\n` +
                `📝 Mesaj: ${text.substring(0, 100)}...`
            );
        }
        return;
    }
    
    const state = getState(chatId);
    
    // Handle state-based responses
    if (state) {
        switch (state.state) {
            case 'awaiting_task_title':
                setState(chatId, 'awaiting_task_description', { title: text });
                bot.sendMessage(chatId, '📝 Görev açıklamasını yazın:');
                return;
                
            case 'awaiting_task_description':
                setState(chatId, 'awaiting_task_assignment', { 
                    ...state.data, 
                    description: text 
                });
                
                const employees = await User.find({ role: 'employee', isActive: true });
                if (employees.length === 0) {
                    bot.sendMessage(chatId, '❌ Aktif çalışan bulunamadı.');
                    clearState(chatId);
                    return;
                }
                
                let keyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '👥 Herkese', callback_data: 'task_all' }],
                            ...employees.map(emp => [
                                { text: `👤 ${emp.firstName}`, callback_data: `task_${emp.chatId}` }
                            ])
                        ]
                    }
                };
                
                bot.sendMessage(chatId, '👥 Kime atanacak?', keyboard);
                return;
                
            case 'awaiting_product_name':
                setState(chatId, 'awaiting_product_quantity', { productName: text });
                bot.sendMessage(chatId, '📊 Kaç adet eksik? (Sadece sayı yazın)');
                return;
                
            case 'awaiting_product_quantity':
                const quantity = parseInt(text);
                if (isNaN(quantity) || quantity <= 0) {
                    bot.sendMessage(chatId, '❌ Geçerli bir sayı girin.');
                    return;
                }
                
                const missingProduct = new MissingProduct({
                    productName: state.data.productName,
                    quantity: quantity,
                    reportedBy: chatId,
                    reportedByName: user.firstName
                });
                await missingProduct.save();
                
                const admins = await User.find({ role: 'admin' });
                for (const admin of admins) {
                    bot.sendMessage(admin.chatId,
                        `🚨 Eksik Ürün Bildirimi!\n\n` +
                        `📦 Ürün: ${state.data.productName}\n` +
                        `📊 Miktar: ${quantity}\n` +
                        `👤 Bildiren: ${user.firstName}`,
                        {
                            reply_markup: {
                                inline_keyboard: [[
                                    { text: '✅ Tedarik Edildi', callback_data: `resolve_${missingProduct._id}` }
                                ]]
                            }
                        }
                    );
                }
                
                bot.sendMessage(chatId, '✅ Eksik ürün bildirimi yapıldı.');
                clearState(chatId);
                return;
                
            case 'awaiting_announcement':
                const announcement = text;
                const allUsers = await User.find({ isActive: true });
                let sentCount = 0;
                
                for (const targetUser of allUsers) {
                    if (targetUser.chatId !== String(chatId)) {
                        try {
                            await bot.sendMessage(targetUser.chatId,
                                `📢 DUYURU\n\n${announcement}\n\n` +
                                `👤 Gönderen: ${user.firstName}`
                            );
                            sentCount++;
                        } catch (err) {
                            console.log(`Failed to send to ${targetUser.chatId}`);
                        }
                    }
                }
                
                bot.sendMessage(chatId, `✅ Duyuru ${sentCount} kişiye gönderildi.`);
                clearState(chatId);
                return;
        }
    }
    
    // Handle button commands
    switch (text) {
        case '📋 Görev Ver':
            if (user.role !== 'admin') {
                bot.sendMessage(chatId, '❌ Bu özellik sadece yöneticiler içindir.');
                return;
            }
            setState(chatId, 'awaiting_task_title');
            bot.sendMessage(chatId, '📝 Görev başlığını yazın:');
            break;
            
        case '📋 Görevlerim':
            const myTasks = await Task.find({ 
                assignedTo: String(chatId),
                status: 'pending'
            });
            
            if (myTasks.length === 0) {
                bot.sendMessage(chatId, '✅ Bekleyen göreviniz yok.');
                return;
            }
            
            for (const task of myTasks) {
                bot.sendMessage(chatId,
                    `📋 GÖREV\n\n` +
                    `📌 ${task.title}\n` +
                    `📝 ${task.description}\n` +
                    `📅 ${task.createdAt.toLocaleDateString('tr-TR')}`,
                    {
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '✅ Tamamla', callback_data: `complete_${task._id}` }
                            ]]
                        }
                    }
                );
            }
            break;
            
        case '📦 Eksik Ürün Bildir':
            setState(chatId, 'awaiting_product_name');
            bot.sendMessage(chatId, '📦 Eksik ürünün adını yazın:');
            break;
            
        case '📦 Eksik Ürünler':
            if (user.role !== 'admin') {
                bot.sendMessage(chatId, '❌ Bu özellik sadece yöneticiler içindir.');
                return;
            }
            
            const missingProducts = await MissingProduct.find({ resolved: false });
            
            if (missingProducts.length === 0) {
                bot.sendMessage(chatId, '✅ Eksik ürün bildirimi yok.');
                return;
            }
            
            for (const product of missingProducts) {
                bot.sendMessage(chatId,
                    `📦 ${product.productName}\n` +
                    `📊 Miktar: ${product.quantity}\n` +
                    `👤 Bildiren: ${product.reportedByName}\n` +
                    `📅 ${product.createdAt.toLocaleDateString('tr-TR')}`,
                    {
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '✅ Tedarik Edildi', callback_data: `resolve_${product._id}` }
                            ]]
                        }
                    }
                );
            }
            break;
            
        case '📢 Duyuru Yap':
            if (user.role !== 'admin') {
                bot.sendMessage(chatId, '❌ Bu özellik sadece yöneticiler içindir.');
                return;
            }
            setState(chatId, 'awaiting_announcement');
            bot.sendMessage(chatId, '📢 Duyuru mesajınızı yazın:');
            break;
            
        case '👥 Kullanıcılar':
            if (user.role !== 'admin') {
                bot.sendMessage(chatId, '❌ Bu özellik sadece yöneticiler içindir.');
                return;
            }
            
            const users = await User.find({ isActive: true });
            let userList = '👥 KULLANICILAR\n\n';
            
            for (const u of users) {
                userList += `${u.role === 'admin' ? '👑' : '👷'} ${u.firstName} (@${u.username})\n`;
            }
            
            bot.sendMessage(chatId, userList);
            break;
            
        case '📊 Raporlar':
            if (user.role !== 'admin') {
                bot.sendMessage(chatId, '❌ Bu özellik sadece yöneticiler içindir.');
                return;
            }
            
            const totalUsers = await User.countDocuments({ isActive: true });
            const totalTasks = await Task.countDocuments();
            const pendingTasks = await Task.countDocuments({ status: 'pending' });
            const missingCount = await MissingProduct.countDocuments({ resolved: false });
            
            bot.sendMessage(chatId,
                `📊 SİSTEM RAPORU\n\n` +
                `👥 Toplam Kullanıcı: ${totalUsers}\n` +
                `📋 Toplam Görev: ${totalTasks}\n` +
                `⏳ Bekleyen Görev: ${pendingTasks}\n` +
                `📦 Eksik Ürün: ${missingCount}`
            );
            break;
            
        case 'ℹ️ Bilgilerim':
            bot.sendMessage(chatId,
                `👤 KULLANICI BİLGİLERİ\n\n` +
                `İsim: ${user.firstName} ${user.lastName || ''}\n` +
                `Username: @${user.username}\n` +
                `Rol: ${user.role === 'admin' ? '👑 Yönetici' : '👷 Çalışan'}\n` +
                `Kayıt: ${user.createdAt.toLocaleDateString('tr-TR')}`
            );
            break;
    }
}

async function handleCallbackQuery(query) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;
    
    const user = await getUser(chatId);
    if (!user) return;
    
    // Task assignment
    if (data.startsWith('task_')) {
        const state = getState(chatId);
        if (!state || state.state !== 'awaiting_task_assignment') return;
        
        const targetId = data === 'task_all' ? 'all' : data.replace('task_', '');
        
        if (targetId === 'all') {
            const employees = await User.find({ role: 'employee', isActive: true });
            const task = new Task({
                title: state.data.title,
                description: state.data.description,
                assignedTo: employees.map(e => e.chatId),
                assignedBy: String(chatId)
            });
            await task.save();
            
            for (const emp of employees) {
                bot.sendMessage(emp.chatId,
                    `📋 YENİ GÖREV!\n\n` +
                    `📌 ${state.data.title}\n` +
                    `📝 ${state.data.description}`
                );
            }
            
            bot.editMessageText(
                `✅ Görev ${employees.length} kişiye atandı.`,
                { chat_id: chatId, message_id: messageId }
            );
        } else {
            const task = new Task({
                title: state.data.title,
                description: state.data.description,
                assignedTo: [targetId],
                assignedBy: String(chatId)
            });
            await task.save();
            
            bot.sendMessage(targetId,
                `📋 YENİ GÖREV!\n\n` +
                `📌 ${state.data.title}\n` +
                `📝 ${state.data.description}`
            );
            
            bot.editMessageText(
                `✅ Görev atandı.`,
                { chat_id: chatId, message_id: messageId }
            );
        }
        
        clearState(chatId);
    }
    
    // Complete task
    if (data.startsWith('complete_')) {
        const taskId = data.replace('complete_', '');
        
        await Task.updateOne(
            { _id: taskId },
            { status: 'completed', completedAt: new Date() }
        );
        
        bot.editMessageText(
            '✅ Görev tamamlandı!',
            { chat_id: chatId, message_id: messageId }
        );
        
        const task = await Task.findById(taskId);
        if (task && task.assignedBy) {
            bot.sendMessage(task.assignedBy,
                `✅ Görev tamamlandı!\n\n` +
                `📌 ${task.title}\n` +
                `👤 Tamamlayan: ${user.firstName}`
            );
        }
    }
    
    // Resolve missing product
    if (data.startsWith('resolve_')) {
        const productId = data.replace('resolve_', '');
        
        await MissingProduct.updateOne(
            { _id: productId },
            { resolved: true }
        );
        
        bot.editMessageText(
            '✅ Ürün tedarik edildi olarak işaretlendi.',
            { chat_id: chatId, message_id: messageId }
        );
    }
    
    bot.answerCallbackQuery(query.id);
}

// ==================== EXPRESS ROUTES ====================
app.get('/', (req, res) => {
    res.send('🤖 SivalTeam Bot v2.0 - Running on Render!');
});

app.post(`/webhook/${process.env.BOT_TOKEN}`, async (req, res) => {
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

// ==================== START SERVER ====================
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📌 Webhook URL: ${WEBHOOK_URL}`);
        console.log('✅ Bot ready for Render deployment');
        console.log('🛡️ Spam protection enabled');
    });
});