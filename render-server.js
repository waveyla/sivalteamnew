const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

// Bot configuration
const BOT_TOKEN = '8229159175:AAGRFoLpK9ma5ekPiaaCdI8EKJeca14XoOg';
const WEBHOOK_URL = `https://sivalteam-bot.onrender.com/webhook`;

// Console startup banner
console.log(`
███████╗██╗██╗   ██╗ █████╗ ██╗  ████████╗███████╗ █████╗ ███╗   ███╗
██╔════╝██║██║   ██║██╔══██╗██║  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║
███████╗██║██║   ██║███████║██║     ██║   █████╗  ███████║██╔████╔██║
╚════██║██║╚██╗ ██╔╝██╔══██║██║     ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║
███████║██║ ╚████╔╝ ██║  ██║███████╗██║   ███████╗██║  ██║██║ ╚═╝ ██║
╚══════╝╚═╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝

🤖 SIVALTEAM RENDER SERVER v2.0.0
==================================
🌐 Webhook: ${WEBHOOK_URL}
🔄 Turkish Character Protection: ACTIVE
✅ Persistent Login: FIXED
`);

// Middleware
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Data files
const DATA_FILES = {
    employees: 'employees.json',
    deletedEmployees: 'deleted_employees.json',
    missingProducts: 'missing_products.json',
    activityLog: 'activity_log.json',
    tasks: 'tasks.json',
    categories: 'categories.json',
    adminSettings: 'admin_settings.json'
};

// Turkish character protection function - V2.0.0 CRITICAL FIX
function protectTurkishChars(text) {
    if (!text || typeof text !== 'string') return text;
    
    // Comprehensive Turkish character protection map
    const charMap = {
        'Ã¼': 'ü', 'Ã¼': 'ü', 'ÃŸ': 'ş', 'Ã§': 'ç', 'Ä±': 'ı', 'Ã¶': 'ö', 'Ä°': 'İ',
        'ãŸ': 'ş', 'ã§': 'ç', 'ã¶': 'ö', 'ä±': 'ı', 'Ç': 'Ç', 'Ü': 'Ü', 'Ö': 'Ö',
        'Ş': 'Ş', 'Ğ': 'Ğ', 'I': 'İ', 'ç': 'ç', 'ü': 'ü', 'ö': 'ö', 'ş': 'ş', 'ğ': 'ğ', 'ı': 'ı',
        // Clean broken characters
        ' Â ': ' ', 'Â': '', '\\u00A0': ' ',
        'Ã': '', 'â€™': "'", 'â€œ': '"', 'â€': '"',
        '    ': ' ', '   ': ' ', '  ': ' '
    };
    
    let result = text;
    Object.keys(charMap).forEach(broken => {
        result = result.replace(new RegExp(broken, 'g'), charMap[broken]);
    });
    
    return result.trim();
}

// Initialize data files
function initializeDataFiles() {
    Object.values(DATA_FILES).forEach(filename => {
        if (!fs.existsSync(filename)) {
            let initialData = [];
            if (filename === 'admin_settings.json') {
                initialData = { adminUsers: [], approvalRequired: false };
            } else if (filename === 'categories.json') {
                initialData = [
                    "Tişört", "Gömlek", "Pantolon", "Etek", "Elbise", 
                    "Ceket", "Ayakkabı", "Çanta", "Aksesuar", "İç Giyim"
                ];
            }
            writeJsonFile(filename, initialData);
            console.log(`✅ ${filename} initialized`);
        }
    });
}

// Read JSON file with UTF-8 encoding
function readJsonFile(filename) {
    try {
        if (!fs.existsSync(filename)) {
            return filename === 'admin_settings.json' ? { adminUsers: [], approvalRequired: false } :
                   filename === 'categories.json' ? ["Tişört", "Gömlek", "Pantolon"] : [];
        }
        const data = fs.readFileSync(filename, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return filename === 'admin_settings.json' ? { adminUsers: [], approvalRequired: false } :
               filename === 'categories.json' ? ["Tişört", "Gömlek", "Pantolon"] : [];
    }
}

// Write JSON file with UTF-8 encoding - V2.0.0 CRITICAL FIX
function writeJsonFile(filename, data) {
    try {
        fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
        console.log(`💾 ${filename} saved with UTF-8 encoding`);
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
    }
}

// Log activity with Turkish character protection
function logActivity(message, userId = null, userName = null) {
    const activityLog = readJsonFile(DATA_FILES.activityLog);
    const protectedMessage = protectTurkishChars(message);
    const protectedUserName = protectTurkishChars(userName);
    
    activityLog.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        message: protectedMessage,
        userId,
        userName: protectedUserName
    });
    
    // Keep only last 1000 entries
    if (activityLog.length > 1000) {
        activityLog.splice(0, activityLog.length - 1000);
    }
    
    writeJsonFile(DATA_FILES.activityLog, activityLog);
}

// Send message to Telegram with Turkish character protection
async function sendTelegramMessage(chatId, text, replyMarkup = null) {
    try {
        const protectedText = protectTurkishChars(text);
        const payload = {
            chat_id: chatId,
            text: protectedText,
            parse_mode: 'HTML'
        };
        
        if (replyMarkup) {
            payload.reply_markup = replyMarkup;
        }
        
        const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, payload);
        return response.data;
    } catch (error) {
        console.error('Telegram API Error:', error.response?.data || error.message);
        return null;
    }
}

// Handle /start command - V2.0.0 PERSISTENT LOGIN FIX + FIRST USER AUTO ADMIN
function handleStartCommand(chatId, from) {
    const employees = readJsonFile(DATA_FILES.employees);
    const adminSettings = readJsonFile(DATA_FILES.adminSettings);
    const numericChatId = Number(chatId); // CRITICAL FIX: Ensure numeric comparison
    
    // FIRST USER BECOMES ADMIN AUTOMATICALLY
    if (employees.length === 0 && adminSettings.adminUsers.length === 0) {
        const firstAdmin = {
            chatId: numericChatId,
            name: protectTurkishChars(from.first_name || 'Admin'),
            department: 'Yönetim',
            role: 'admin',
            addedAt: new Date().toISOString(),
            status: 'active'
        };
        
        employees.push(firstAdmin);
        writeJsonFile(DATA_FILES.employees, employees);
        
        adminSettings.adminUsers.push(numericChatId);
        writeJsonFile(DATA_FILES.adminSettings, adminSettings);
        
        sendTelegramMessage(chatId, 
            `👑 <b>Hoşgeldin İlk Admin!</b>\n\n` +
            `🎉 Sen bu sistemin ilk kullanıcısısın ve otomatik olarak <b>Admin</b> oldun!\n\n` +
            `👑 Admin yetkilerin:\n` +
            `• Yeni kullanıcıları onaylama\n` +
            `• Çalışan bilgilerini düzenleme\n` +
            `• Sistem ayarları\n\n` +
            `✅ Artık sistemi tam yetkilerle kullanabilirsin!`,
            {
                keyboard: [
                    [{ text: "📦 Eksik Ürün Bildir" }, { text: "📋 Görevlerim" }],
                    [{ text: "📊 İstatistikler" }, { text: "👑 Admin Panel" }],
                    [{ text: "ℹ️ Yardım" }]
                ],
                resize_keyboard: true
            }
        );
        
        logActivity(`İlk admin otomatik olarak eklendi: ${firstAdmin.name}`, chatId, firstAdmin.name);
        return;
    }
    
    // Find existing employee by numeric chatId comparison
    let employee = employees.find(e => Number(e.chatId) === numericChatId);
    
    if (employee) {
        // Employee exists - direct login without approval
        const isAdmin = adminSettings.adminUsers.includes(numericChatId);
        const welcomeText = `🎉 Hoşgeldin <b>${protectTurkishChars(employee.name)}</b>!\n\n` +
                           `🏢 Departman: ${protectTurkishChars(employee.department)}\n` +
                           `${isAdmin ? '👑 Yetki: Admin\n' : ''}` +
                           `✅ Giriş başarılı - Artık sistemi kullanabilirsin.`;
        
        const keyboard = [
            [{ text: "📦 Eksik Ürün Bildir" }, { text: "📋 Görevlerim" }],
            [{ text: "📊 İstatistikler" }, { text: "ℹ️ Yardım" }]
        ];
        
        if (isAdmin) {
            keyboard.splice(1, 0, [{ text: "👑 Admin Panel" }]);
        }
        
        sendTelegramMessage(chatId, welcomeText, {
            keyboard,
            resize_keyboard: true
        });
        
        logActivity(`${employee.name} sisteme giriş yaptı`, chatId, employee.name);
        return;
    }
    
    // New user - admin approval required
    if (adminSettings.adminUsers.length === 0) {
        sendTelegramMessage(chatId, 
            `❌ <b>Sistem Hatası</b>\n\n` +
            `Hiç admin kullanıcı bulunamadı. Bu durumda sistem çalışamaz.\n` +
            `Lütfen sistem yöneticisiyle iletişime geçin.`
        );
        return;
    }
    const pendingUser = {
        chatId: numericChatId,
        firstName: protectTurkishChars(from.first_name || 'Bilinmiyor'),
        lastName: protectTurkishChars(from.last_name || ''),
        username: from.username || 'username_yok',
        timestamp: new Date().toISOString(),
        status: 'pending'
    };
    
    // Notify user
    sendTelegramMessage(chatId, 
        `👋 Merhaba <b>${pendingUser.firstName}</b>!\n\n` +
        `🔄 Kayıt talebiniz admin onayına gönderildi.\n` +
        `⏳ Lütfen admin onayını bekleyiniz.`
    );
    
    // Notify all admins
    adminSettings.adminUsers.forEach(adminChatId => {
        sendTelegramMessage(adminChatId,
            `🆕 <b>Yeni Kullanıcı Kaydı</b>\n\n` +
            `👤 Ad: ${pendingUser.firstName} ${pendingUser.lastName}\n` +
            `🆔 Username: @${pendingUser.username}\n` +
            `🆔 Chat ID: ${pendingUser.chatId}\n\n` +
            `Bu kullanıcıyı onaylamak için: /approve ${pendingUser.chatId}`,
            {
                inline_keyboard: [[
                    { text: "✅ Onayla", callback_data: `approve_${pendingUser.chatId}` },
                    { text: "❌ Reddet", callback_data: `reject_${pendingUser.chatId}` }
                ]]
            }
        );
    });
    
    logActivity(`Yeni kullanıcı kaydı: ${pendingUser.firstName} ${pendingUser.lastName}`, chatId, pendingUser.firstName);
}

// Handle missing product report
function handleMissingProductReport(chatId, from) {
    const employees = readJsonFile(DATA_FILES.employees);
    const numericChatId = Number(chatId);
    const employee = employees.find(e => Number(e.chatId) === numericChatId);
    
    if (!employee) {
        sendTelegramMessage(chatId, "❌ Bu özelliği kullanmak için önce kayıt olmalısınız.");
        return;
    }
    
    const categories = readJsonFile(DATA_FILES.categories);
    const keyboard = categories.map(cat => [{ text: protectTurkishChars(cat) }]);
    keyboard.push([{ text: "🔙 Ana Menü" }]);
    
    sendTelegramMessage(chatId, 
        "📦 <b>Eksik Ürün Bildirimi</b>\n\n" +
        "Hangi kategoriden ürün eksik? Aşağıdaki kategorilerden birini seçin:",
        { keyboard, resize_keyboard: true, one_time_keyboard: true }
    );
    
    // Set user state for category selection
    employees.forEach(emp => {
        if (Number(emp.chatId) === numericChatId) {
            emp.currentAction = 'selecting_category';
        }
    });
    writeJsonFile(DATA_FILES.employees, employees);
}

// Handle category selection for missing products
function handleCategorySelection(chatId, categoryText, from) {
    const employees = readJsonFile(DATA_FILES.employees);
    const numericChatId = Number(chatId);
    const employee = employees.find(e => Number(e.chatId) === numericChatId);
    
    if (!employee || employee.currentAction !== 'selecting_category') {
        return false;
    }
    
    const protectedCategory = protectTurkishChars(categoryText);
    
    // Update employee state
    employees.forEach(emp => {
        if (Number(emp.chatId) === numericChatId) {
            emp.currentAction = 'entering_product';
            emp.selectedCategory = protectedCategory;
        }
    });
    writeJsonFile(DATA_FILES.employees, employees);
    
    sendTelegramMessage(chatId,
        `📦 <b>${protectedCategory}</b> kategorisi seçildi.\n\n` +
        `Eksik olan ürünün adını yazın (örnek: Beyaz Tişört, Mavi Gömlek):`
    );
    
    return true;
}

// Handle product name input
function handleProductNameInput(chatId, productName, from) {
    const employees = readJsonFile(DATA_FILES.employees);
    const numericChatId = Number(chatId);
    const employee = employees.find(e => Number(e.chatId) === numericChatId);
    
    if (!employee || employee.currentAction !== 'entering_product') {
        return false;
    }
    
    const protectedProductName = protectTurkishChars(productName);
    const protectedCategory = protectTurkishChars(employee.selectedCategory);
    const protectedEmployeeName = protectTurkishChars(employee.name);
    
    // Save missing product
    const missingProducts = readJsonFile(DATA_FILES.missingProducts);
    const newProduct = {
        id: Date.now(),
        category: protectedCategory,
        product: protectedProductName,
        reportedBy: protectedEmployeeName,
        reportedByChatId: numericChatId,
        timestamp: new Date().toISOString(),
        status: 'reported'
    };
    
    missingProducts.push(newProduct);
    writeJsonFile(DATA_FILES.missingProducts, missingProducts);
    
    // Reset employee state
    employees.forEach(emp => {
        if (Number(emp.chatId) === numericChatId) {
            emp.currentAction = null;
            emp.selectedCategory = null;
        }
    });
    writeJsonFile(DATA_FILES.employees, employees);
    
    // Success message
    sendTelegramMessage(chatId,
        `✅ <b>Eksik Ürün Bildirildi</b>\n\n` +
        `📦 Kategori: ${protectedCategory}\n` +
        `🏷️ Ürün: ${protectedProductName}\n` +
        `👤 Bildiren: ${protectedEmployeeName}\n\n` +
        `Bildiriminiz kaydedildi ve yöneticilere iletildi.`,
        {
            keyboard: [
                [{ text: "📦 Eksik Ürün Bildir" }, { text: "📋 Görevlerim" }],
                [{ text: "📊 İstatistikler" }, { text: "ℹ️ Yardım" }]
            ],
            resize_keyboard: true
        }
    );
    
    logActivity(`Eksik ürün bildirimi: ${protectedCategory} - ${protectedProductName}`, chatId, protectedEmployeeName);
    
    // Notify admins
    const adminSettings = readJsonFile(DATA_FILES.adminSettings);
    adminSettings.adminUsers.forEach(adminChatId => {
        sendTelegramMessage(adminChatId,
            `🚨 <b>Yeni Eksik Ürün Bildirimi</b>\n\n` +
            `📦 Kategori: ${protectedCategory}\n` +
            `🏷️ Ürün: ${protectedProductName}\n` +
            `👤 Bildiren: ${protectedEmployeeName}\n` +
            `⏰ Tarih: ${new Date().toLocaleString('tr-TR')}`
        );
    });
    
    return true;
}

// Webhook endpoint - Main bot handler
app.post('/webhook', async (req, res) => {
    try {
        const { message, callback_query } = req.body;
        
        // Handle callback queries (inline buttons)
        if (callback_query) {
            const { data, from, message: callbackMessage } = callback_query;
            const chatId = from.id;
            
            // Answer callback query to stop loading animation
            try {
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                    callback_query_id: callback_query.id,
                    text: "İşlem alındı..."
                });
            } catch (error) {
                // Ignore timeout errors for callback queries
                if (!error.message.includes('Bad Request: query is too old')) {
                    console.error('Callback query error:', error.message);
                }
            }
            
            // Handle admin approval/rejection
            if (data.startsWith('approve_') || data.startsWith('reject_')) {
                const [action, targetChatId] = data.split('_');
                const numericTargetChatId = Number(targetChatId);
                
                if (action === 'approve') {
                    // Add user as employee (admin will set details later)
                    const employees = readJsonFile(DATA_FILES.employees);
                    const newEmployee = {
                        chatId: numericTargetChatId,
                        name: "Yeni Çalışan",
                        department: "Atanmamış",
                        role: "employee",
                        addedBy: from.id,
                        addedAt: new Date().toISOString(),
                        status: "active"
                    };
                    
                    employees.push(newEmployee);
                    writeJsonFile(DATA_FILES.employees, employees);
                    
                    // Notify approved user
                    sendTelegramMessage(numericTargetChatId,
                        `🎉 <b>Kaydınız Onaylandı!</b>\n\n` +
                        `✅ Artık SivalTeam sistemini kullanabilirsiniz.\n` +
                        `👤 Profil bilgileriniz admin tarafından güncellenecek.\n\n` +
                        `Başlamak için /start komutunu tekrar kullanın.`
                    );
                    
                    // Notify admin
                    sendTelegramMessage(chatId, `✅ Kullanıcı ${targetChatId} başarıyla onaylandı.`);
                    logActivity(`Kullanıcı onaylandı: ChatID ${targetChatId}`, chatId, from.first_name);
                    
                } else if (action === 'reject') {
                    // Notify rejected user
                    sendTelegramMessage(numericTargetChatId,
                        `❌ <b>Kaydınız Reddedildi</b>\n\n` +
                        `Üzgünüz, kayıt talebiniz admin tarafından reddedildi.\n` +
                        `Daha fazla bilgi için sistem yöneticisiyle iletişime geçin.`
                    );
                    
                    // Notify admin
                    sendTelegramMessage(chatId, `❌ Kullanıcı ${targetChatId} reddedildi.`);
                    logActivity(`Kullanıcı reddedildi: ChatID ${targetChatId}`, chatId, from.first_name);
                }
            }
            
            return res.status(200).json({ status: 'ok' });
        }
        
        // Handle regular messages
        if (message) {
            const { chat, from, text } = message;
            const chatId = chat.id;
            
            if (!text) return res.status(200).json({ status: 'ok' });
            
            // Handle commands
            if (text.startsWith('/start')) {
                handleStartCommand(chatId, from);
            }
            else if (text === "📦 Eksik Ürün Bildir") {
                handleMissingProductReport(chatId, from);
            }
            else if (text === "🔙 Ana Menü") {
                const employees = readJsonFile(DATA_FILES.employees);
                const numericChatId = Number(chatId);
                
                // Reset user state
                employees.forEach(emp => {
                    if (Number(emp.chatId) === numericChatId) {
                        emp.currentAction = null;
                        emp.selectedCategory = null;
                    }
                });
                writeJsonFile(DATA_FILES.employees, employees);
                
                sendTelegramMessage(chatId, "🏠 Ana menüye dönüldü.", {
                    keyboard: [
                        [{ text: "📦 Eksik Ürün Bildir" }, { text: "📋 Görevlerim" }],
                        [{ text: "📊 İstatistikler" }, { text: "ℹ️ Yardım" }]
                    ],
                    resize_keyboard: true
                });
            }
            else if (text === "📊 İstatistikler") {
                const employees = readJsonFile(DATA_FILES.employees);
                const products = readJsonFile(DATA_FILES.missingProducts);
                const tasks = readJsonFile(DATA_FILES.tasks);
                
                const statsText = `📊 <b>Sistem İstatistikleri</b>\n\n` +
                    `👥 Toplam Çalışan: ${employees.length}\n` +
                    `📦 Eksik Ürün Bildirimi: ${products.length}\n` +
                    `📋 Aktif Görev: ${tasks.filter(t => t.status !== 'completed').length}\n` +
                    `✅ Tamamlanan Görev: ${tasks.filter(t => t.status === 'completed').length}`;
                
                sendTelegramMessage(chatId, statsText);
            }
            else if (text === "ℹ️ Yardım") {
                const helpText = `ℹ️ <b>SivalTeam Yardım</b>\n\n` +
                    `📦 <b>Eksik Ürün Bildir:</b> Mağazada eksik olan ürünleri bildirin\n` +
                    `📋 <b>Görevlerim:</b> Size atanan görevleri görün\n` +
                    `📊 <b>İstatistikler:</b> Sistem istatistiklerini görün\n\n` +
                    `❓ Sorun yaşıyorsanız sistem yöneticisiyle iletişime geçin.`;
                
                sendTelegramMessage(chatId, helpText);
            }
            else {
                // Handle category selection or product name input
                const categoryHandled = handleCategorySelection(chatId, text, from);
                if (!categoryHandled) {
                    const productHandled = handleProductNameInput(chatId, text, from);
                    if (!productHandled) {
                        // Unknown command
                        sendTelegramMessage(chatId, 
                            "❓ Anlaşılmadı. Lütfen menüdeki seçenekleri kullanın veya /start ile başlayın."
                        );
                    }
                }
            }
        }
        
        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API Endpoints for Desktop App Integration
app.get('/api/employees', (req, res) => {
    const employees = readJsonFile(DATA_FILES.employees);
    res.json(employees);
});

app.get('/api/missing-products', (req, res) => {
    const products = readJsonFile(DATA_FILES.missingProducts);
    res.json(products);
});

app.get('/api/activity-log', (req, res) => {
    const activities = readJsonFile(DATA_FILES.activityLog);
    res.json(activities);
});

app.get('/api/tasks', (req, res) => {
    const tasks = readJsonFile(DATA_FILES.tasks);
    res.json(tasks);
});

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'SivalTeam Bot v2.0.0 Running',
        timestamp: new Date().toISOString(),
        features: {
            'Turkish Character Protection': 'ACTIVE',
            'Persistent Login': 'FIXED',
            'UTF-8 Encoding': 'ACTIVE'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Set webhook
async function setWebhook() {
    try {
        const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
            url: WEBHOOK_URL,
            max_connections: 40,
            allowed_updates: ['message', 'callback_query']
        });
        
        if (response.data.ok) {
            console.log('✅ Webhook set successfully');
        } else {
            console.error('❌ Failed to set webhook:', response.data);
        }
    } catch (error) {
        console.error('❌ Webhook setup error:', error.message);
    }
}

// Initialize and start server
initializeDataFiles();

app.listen(PORT, () => {
    console.log(`🚀 SivalTeam Render Server v2.0.0 running on port ${PORT}`);
    console.log(`🔗 Webhook URL: ${WEBHOOK_URL}`);
    console.log('🛡️ Turkish Character Protection: ACTIVE');
    console.log('✅ Persistent Login Fix: ACTIVE');
    
    // Set webhook after server starts
    setTimeout(setWebhook, 2000);
    
    // Log startup
    logActivity('SivalTeam Render Server v2.0.0 started', null, 'System');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('⏹️ SivalTeam Server shutting down...');
    logActivity('SivalTeam Render Server shutdown', null, 'System');
    process.exit(0);
});