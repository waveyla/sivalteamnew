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
    adminSettings: 'admin_settings.json',
    pendingUsers: 'pending_users.json'
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
// Simple cache for frequently accessed files (lasts 3 seconds)
const fileCache = new Map();
const CACHE_DURATION = 3000; // 3 seconds

function readJsonFile(filename) {
    try {
        const now = Date.now();
        const cached = fileCache.get(filename);
        
        // Return cached data if still fresh (for employees and admin_settings)
        if (cached && (now - cached.timestamp) < CACHE_DURATION && 
            (filename.includes('employees') || filename.includes('admin_settings'))) {
            return cached.data;
        }
        
        if (!fs.existsSync(filename)) {
            const defaultData = filename === 'admin_settings.json' ? { adminUsers: [], approvalRequired: false } :
                               filename === 'categories.json' ? ["Tişört", "Gömlek", "Pantolon"] : [];
            // Cache default data too
            fileCache.set(filename, { data: defaultData, timestamp: now });
            return defaultData;
        }
        const data = fs.readFileSync(filename, 'utf8');
        const parsed = JSON.parse(data);
        
        // Cache frequently accessed files
        if (filename.includes('employees') || filename.includes('admin_settings')) {
            fileCache.set(filename, { data: parsed, timestamp: now });
        }
        
        return parsed;
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return filename === 'admin_settings.json' ? { adminUsers: [], approvalRequired: false } :
               filename === 'categories.json' ? ["Tişört", "Gömlek", "Pantolon"] : [];
    }
}

// Write JSON file with UTF-8 encoding - V2.0.0 CRITICAL FIX + CACHE CLEAR
function writeJsonFile(filename, data) {
    try {
        fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
        console.log(`💾 ${filename} saved with UTF-8 encoding`);
        
        // Clear cache for this file to ensure fresh data next time
        fileCache.delete(filename);
        
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
        
        // Telegram message length limit: 4096 characters
        if (protectedText.length > 4000) {
            console.error('Message too long:', protectedText.length, 'characters');
            const truncatedText = protectedText.substring(0, 3900) + '\n\n... (mesaj kısaltıldı)';
            return sendTelegramMessage(chatId, truncatedText, replyMarkup);
        }
        
        const payload = {
            chat_id: chatId,
            text: protectedText,
            parse_mode: 'HTML'
        };
        
        if (replyMarkup) {
            payload.reply_markup = replyMarkup;
        }
        
        const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, payload, {
            timeout: 5000, // 5 second timeout for faster responses
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        // Better error handling to prevent slowdowns
        if (error.code === 'ECONNABORTED') {
            console.error('Telegram timeout - message may have been delivered');
        } else if (error.response?.status === 400) {
            console.error('Telegram 400 Error:', error.response.data.description);
            console.error('Problem message preview:', text.substring(0, 200) + '...');
        } else {
            console.error('Telegram API Error:', error.response?.data || error.message);
        }
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
        
        let keyboard;
        
        if (isAdmin) {
            // Admin menüsü - Görevlerim yok, admin paneli var
            keyboard = [
                [{ text: "📦 Eksik Ürün Bildir" }, { text: "👑 Admin Panel" }],
                [{ text: "📊 İstatistikler" }, { text: "ℹ️ Yardım" }]
            ];
        } else {
            // Çalışan menüsü - Görevlerim var, admin panel yok
            keyboard = [
                [{ text: "📦 Eksik Ürün Bildir" }, { text: "📋 Görevlerim" }],
                [{ text: "📊 İstatistikler" }, { text: "ℹ️ Yardım" }]
            ];
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
    
    // CHECK IF USER IS ALREADY PENDING - CRITICAL FIX!
    const pendingUsers = readJsonFile(DATA_FILES.pendingUsers);
    const existingPendingUser = pendingUsers.find(u => Number(u.chatId) === numericChatId);
    
    if (existingPendingUser) {
        // User already requested approval
        sendTelegramMessage(chatId, 
            `⏳ <b>Onay Bekleniyor</b>\n\n` +
            `Kayıt talebiniz daha önce admin onayına gönderildi.\n` +
            `📅 İstek tarihi: ${new Date(existingPendingUser.timestamp).toLocaleString('tr-TR')}\n\n` +
            `⌛ Lütfen admin onayını bekleyiniz. Tekrar başvuru yapmanıza gerek yoktur.`
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
    
    // Add to pending users file
    pendingUsers.push(pendingUser);
    writeJsonFile(DATA_FILES.pendingUsers, pendingUsers);
    
    // Notify user
    sendTelegramMessage(chatId, 
        `👋 <b>Hoşgeldin ${pendingUser.firstName}!</b>\n\n` +
        `📝 SivalTeam sistemine kayıt talebiniz alındı.\n` +
        `🔄 Kayıt talebiniz admin onayına gönderildi.\n` +
        `⏳ Admin onayı sonrası sistemi kullanabileceksiniz.\n\n` +
        `⌛ Lütfen bekleyiniz...`
    );
    
    // Notify all admins
    adminSettings.adminUsers.forEach(adminChatId => {
        sendTelegramMessage(adminChatId,
            `🆕 <b>Yeni Kullanıcı Kayıt Talebi</b>\n\n` +
            `👤 Ad: <b>${pendingUser.firstName} ${pendingUser.lastName}</b>\n` +
            `🆔 Username: @${pendingUser.username}\n` +
            `💬 Chat ID: <code>${pendingUser.chatId}</code>\n` +
            `📅 Tarih: ${new Date().toLocaleString('tr-TR')}\n\n` +
            `⬇️ Bu kullanıcıyı onaylamak için butonları kullanın:`,
            {
                inline_keyboard: [[
                    { text: "✅ Onayla", callback_data: `approve_${pendingUser.chatId}` },
                    { text: "❌ Reddet", callback_data: `reject_${pendingUser.chatId}` }
                ]]
            }
        );
    });
    
    logActivity(`Yeni kullanıcı kayıt talebi: ${pendingUser.firstName} ${pendingUser.lastName}`, chatId, pendingUser.firstName);
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
    // IMMEDIATELY respond to Telegram to prevent timeout
    res.status(200).json({ status: 'ok' });
    
    try {
        const { message, callback_query } = req.body;
        
        // Handle callback queries (inline buttons)
        if (callback_query) {
            const { data, from, message: callbackMessage } = callback_query;
            const chatId = from.id;
            
            // Answer callback query to stop loading animation - FAST
            axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                callback_query_id: callback_query.id,
                text: "İşlem alındı..."
            }, { timeout: 2000 }).catch(error => {
                // Ignore all callback query errors for speed
                if (!error.message.includes('Bad Request: query is too old')) {
                    console.error('Callback query timeout - ignored for speed');
                }
            });
            
            // Handle admin approval/rejection
            if (data.startsWith('approve_') || data.startsWith('reject_')) {
                const [action, targetChatId] = data.split('_');
                const numericTargetChatId = Number(targetChatId);
                
                // Get pending user info
                const pendingUsers = readJsonFile(DATA_FILES.pendingUsers);
                const pendingUser = pendingUsers.find(u => Number(u.chatId) === numericTargetChatId);
                
                if (!pendingUser) {
                    sendTelegramMessage(chatId, `❌ Bu kullanıcı için bekleyen kayıt bulunamadı.`);
                    return;
                }
                
                if (action === 'approve') {
                    // Add user as employee
                    const employees = readJsonFile(DATA_FILES.employees);
                    const newEmployee = {
                        chatId: numericTargetChatId,
                        name: pendingUser.firstName + (pendingUser.lastName ? ' ' + pendingUser.lastName : ''),
                        department: "Yeni Çalışan",
                        role: "employee",
                        username: pendingUser.username,
                        addedBy: from.id,
                        addedAt: new Date().toISOString(),
                        status: "active"
                    };
                    
                    employees.push(newEmployee);
                    writeJsonFile(DATA_FILES.employees, employees);
                    
                    // Remove from pending users
                    const updatedPendingUsers = pendingUsers.filter(u => Number(u.chatId) !== numericTargetChatId);
                    writeJsonFile(DATA_FILES.pendingUsers, updatedPendingUsers);
                    
                    // Notify approved user
                    sendTelegramMessage(numericTargetChatId,
                        `🎉 <b>Hoşgeldin SivalTeam'e!</b>\n\n` +
                        `✅ Kaydınız onaylandı ve sisteme eklendiniz.\n` +
                        `👤 Adınız: ${newEmployee.name}\n` +
                        `🏢 Departman: ${newEmployee.department}\n\n` +
                        `🚀 Artık sistemi kullanabilirsiniz! /start komutuyla başlayın.`
                    );
                    
                    // Notify admin
                    sendTelegramMessage(chatId, 
                        `✅ <b>Kullanıcı Onaylandı</b>\n\n` +
                        `👤 ${newEmployee.name} başarıyla sisteme eklendi.\n` +
                        `💬 Chat ID: ${targetChatId}`
                    );
                    logActivity(`Kullanıcı onaylandı: ${newEmployee.name}`, chatId, from.first_name);
                    
                } else if (action === 'reject') {
                    // Remove from pending users
                    const updatedPendingUsers = pendingUsers.filter(u => Number(u.chatId) !== numericTargetChatId);
                    writeJsonFile(DATA_FILES.pendingUsers, updatedPendingUsers);
                    
                    // Notify rejected user
                    sendTelegramMessage(numericTargetChatId,
                        `❌ <b>Kayıt Talebi Reddedildi</b>\n\n` +
                        `Üzgünüz, SivalTeam sistemine kayıt talebiniz reddedildi.\n` +
                        `📞 Daha fazla bilgi için sistem yöneticisiyle iletişime geçebilirsiniz.`
                    );
                    
                    // Notify admin
                    sendTelegramMessage(chatId, 
                        `❌ <b>Kullanıcı Reddedildi</b>\n\n` +
                        `👤 ${pendingUser.firstName} kayıt talebi reddedildi.\n` +
                        `💬 Chat ID: ${targetChatId}`
                    );
                    logActivity(`Kullanıcı reddedildi: ${pendingUser.firstName}`, chatId, from.first_name);
                }
            }
            
            // Handle product completion
            if (data.startsWith('complete_product_')) {
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                if (!adminSettings.adminUsers.includes(numericChatId)) {
                    sendTelegramMessage(chatId, "❌ Bu işlem sadece adminler tarafından yapılabilir.");
                    return;
                }
                
                const productId = data.replace('complete_product_', '');
                const products = readJsonFile(DATA_FILES.missingProducts);
                const productIndex = products.findIndex(p => p.id == productId);
                
                if (productIndex === -1) {
                    sendTelegramMessage(chatId, "❌ Ürün bulunamadı veya zaten silinmiş.");
                    return;
                }
                
                const completedProduct = products[productIndex];
                products.splice(productIndex, 1);
                writeJsonFile(DATA_FILES.missingProducts, products);
                
                sendTelegramMessage(chatId, 
                    `✅ <b>Ürün Tamamlandı</b>\n\n` +
                    `📦 <b>${protectTurkishChars(completedProduct.product)}</b>\n` +
                    `🏷️ Kategori: ${protectTurkishChars(completedProduct.category)}\n` +
                    `👤 Bildiren: ${protectTurkishChars(completedProduct.reportedBy)}\n\n` +
                    `🗑️ Ürün eksik ürün listesinden kaldırıldı.`
                );
                
                logActivity(`Eksik ürün tamamlandı: ${completedProduct.product}`, chatId, from.first_name);
            }
            
            // Handle clear all products
            if (data === 'clear_all_products') {
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                if (!adminSettings.adminUsers.includes(numericChatId)) {
                    sendTelegramMessage(chatId, "❌ Bu işlem sadece adminler tarafından yapılabilir.");
                    return;
                }
                
                const products = readJsonFile(DATA_FILES.missingProducts);
                const productCount = products.length;
                
                writeJsonFile(DATA_FILES.missingProducts, []);
                
                sendTelegramMessage(chatId, 
                    `🗑️ <b>Tüm Eksik Ürün Listesi Temizlendi</b>\n\n` +
                    `📊 ${productCount} ürün bildirimi silindi.\n` +
                    `✅ Liste baştan başlıyor.`
                );
                
                logActivity(`Tüm eksik ürün listesi temizlendi (${productCount} ürün)`, chatId, from.first_name);
            }
            
            // Handle task completion
            if (data.startsWith('complete_task_')) {
                const taskId = data.replace('complete_task_', '');
                const tasks = readJsonFile(DATA_FILES.tasks);
                const numericChatId = Number(chatId);
                
                const taskIndex = tasks.findIndex(t => t.id == taskId && Number(t.assignedTo) === numericChatId);
                
                if (taskIndex === -1) {
                    sendTelegramMessage(chatId, "❌ Görev bulunamadı veya size ait değil.");
                    return;
                }
                
                const completedTask = tasks[taskIndex];
                
                // Mark task as completed
                tasks[taskIndex].status = 'completed';
                tasks[taskIndex].completedAt = new Date().toISOString();
                tasks[taskIndex].completedBy = numericChatId;
                
                writeJsonFile(DATA_FILES.tasks, tasks);
                
                // Send completion confirmation to employee
                sendTelegramMessage(chatId, 
                    `✅ <b>Görev Tamamlandı!</b>\n\n` +
                    `🎯 <b>${protectTurkishChars(completedTask.title)}</b>\n` +
                    `📝 ${protectTurkishChars(completedTask.description)}\n\n` +
                    `🎉 Tebrikler! Görev başarıyla tamamlandı.`,
                    {
                        keyboard: [
                            [{ text: "📦 Eksik Ürün Bildir" }, { text: "📋 Görevlerim" }],
                            [{ text: "📊 İstatistikler" }, { text: "ℹ️ Yardım" }]
                        ],
                        resize_keyboard: true
                    }
                );
                
                // Notify admin about task completion
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const employees = readJsonFile(DATA_FILES.employees);
                const employee = employees.find(e => Number(e.chatId) === numericChatId);
                const employeeName = employee ? employee.name : 'Bilinmeyen Çalışan';
                
                adminSettings.adminUsers.forEach(adminChatId => {
                    sendTelegramMessage(adminChatId, 
                        `✅ <b>Görev Tamamlandı!</b>\n\n` +
                        `👤 <b>Çalışan:</b> ${protectTurkishChars(employeeName)}\n` +
                        `🎯 <b>Görev:</b> ${protectTurkishChars(completedTask.title)}\n` +
                        `📝 <b>Açıklama:</b> ${protectTurkishChars(completedTask.description)}\n` +
                        `📅 <b>Tamamlanma:</b> ${new Date().toLocaleString('tr-TR')}\n\n` +
                        `🎉 Görev başarıyla tamamlandı!`
                    );
                });
                
                logActivity(`Görev tamamlandı: ${completedTask.title}`, chatId, employeeName);
            }
            
            // Handle refresh my tasks
            if (data === 'refresh_my_tasks') {
                const employees = readJsonFile(DATA_FILES.employees);
                const tasks = readJsonFile(DATA_FILES.tasks);
                const numericChatId = Number(chatId);
                const employee = employees.find(e => Number(e.chatId) === numericChatId);
                
                if (!employee) {
                    sendTelegramMessage(chatId, "❌ Bu özelliği kullanmak için önce kayıt olmalısınız.");
                    return;
                }
                
                const userTasks = tasks.filter(task => Number(task.assignedTo) === numericChatId);
                const pendingTasks = userTasks.filter(task => task.status === 'pending');
                const completedTasks = userTasks.filter(task => task.status === 'completed');
                
                if (userTasks.length === 0) {
                    sendTelegramMessage(chatId, 
                        `📋 <b>Görevleriniz</b>\n\n` +
                        `📝 Şu anda size atanmış görev bulunmuyor.\n\n` +
                        `✅ Yeni görevler atandığında size bildirim gelecektir.`,
                        {
                            keyboard: [
                                [{ text: "📦 Eksik Ürün Bildir" }, { text: "📊 İstatistikler" }],
                                [{ text: "ℹ️ Yardım" }]
                            ],
                            resize_keyboard: true
                        }
                    );
                    return;
                }
                
                // Create task list with detailed info
                let taskText = `📋 <b>${employee.name} - Görevleriniz</b>\n\n`;
                taskText += `📊 <b>Özet:</b>\n`;
                taskText += `⏳ Bekleyen: ${pendingTasks.length}\n`;
                taskText += `✅ Tamamlanan: ${completedTasks.length}\n`;
                taskText += `📈 Toplam: ${userTasks.length}\n\n`;
                
                if (pendingTasks.length > 0) {
                    taskText += `⏳ <b>Bekleyen Görevler:</b>\n\n`;
                    
                    pendingTasks.forEach((task, index) => {
                        taskText += `${index + 1}. 🎯 <b>${protectTurkishChars(task.title)}</b>\n`;
                        taskText += `   📝 ${protectTurkishChars(task.description)}\n`;
                        taskText += `   👤 Atayan: ${protectTurkishChars(task.assignedByName)}\n`;
                        taskText += `   📅 ${new Date(task.createdAt).toLocaleString('tr-TR')}\n`;
                        taskText += `   ${task.type === 'bulk' ? '📢 Toplu Görev' : '👤 Kişisel Görev'}\n\n`;
                    });
                }
                
                if (completedTasks.length > 0) {
                    taskText += `✅ <b>Son Tamamlanan Görevler:</b>\n\n`;
                    
                    completedTasks.slice(-3).forEach((task, index) => { // Show last 3 completed
                        taskText += `${index + 1}. ✅ <b>${protectTurkishChars(task.title)}</b>\n`;
                        taskText += `   📅 ${new Date(task.completedAt || task.createdAt).toLocaleDateString('tr-TR')}\n\n`;
                    });
                    
                    if (completedTasks.length > 3) {
                        taskText += `... ve ${completedTasks.length - 3} görev daha\n\n`;
                    }
                }
                
                // Create inline keyboard with complete buttons for pending tasks
                const inlineKeyboard = [];
                
                pendingTasks.slice(0, 10).forEach(task => { // Limit to 10 tasks
                    inlineKeyboard.push([{
                        text: `✅ "${protectTurkishChars(task.title)}" Tamamlandı`,
                        callback_data: `complete_task_${task.id}`
                    }]);
                });
                
                if (pendingTasks.length === 0) {
                    inlineKeyboard.push([{
                        text: "🔄 Görevleri Yenile",
                        callback_data: "refresh_my_tasks"
                    }]);
                }
                
                sendTelegramMessage(chatId, taskText, {
                    inline_keyboard: inlineKeyboard
                });
            }
            else if (text.startsWith('/task ')) {
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                if (!adminSettings.adminUsers.includes(numericChatId)) {
                    sendTelegramMessage(chatId, "❌ Görev atama sadece adminler tarafından yapılabilir.");
                    return;
                }
                
                // Parse: /task @username veya chatId Görev başlığı | Açıklama
                const taskText = text.replace('/task ', '').trim();
                const parts = taskText.split(' ');
                
                if (parts.length < 2 || !taskText.includes('|')) {
                    sendTelegramMessage(chatId, 
                        "❌ <b>Kullanım:</b>\n" +
                        "/task @username Görev başlığı | Açıklama\n" +
                        "veya\n" +
                        "/task &lt;chatId&gt; Görev başlığı | Açıklama"
                    );
                    return;
                }
                
                let targetIdentifier = parts[0];
                let taskContent = parts.slice(1).join(' ');
                let [title, description] = taskContent.split('|').map(s => protectTurkishChars(s.trim()));
                
                if (!title || !description) {
                    sendTelegramMessage(chatId, "❌ Görev başlığı ve açıklaması gereklidir.");
                    return;
                }
                
                const employees = readJsonFile(DATA_FILES.employees);
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
                    sendTelegramMessage(chatId, "❌ Çalışan bulunamadı. @username veya chat ID kontrolünü yapın.");
                    return;
                }
                
                const tasks = readJsonFile(DATA_FILES.tasks);
                const newTask = {
                    id: Date.now(),
                    title: title,
                    description: description,
                    assignedTo: Number(targetEmployee.chatId),
                    assignedToName: protectTurkishChars(targetEmployee.name),
                    assignedBy: numericChatId,
                    assignedByName: from.first_name || 'Admin',
                    createdAt: new Date().toISOString(),
                    status: 'pending',
                    type: 'individual'
                };
                
                tasks.push(newTask);
                writeJsonFile(DATA_FILES.tasks, tasks);
                
                // Notify admin
                sendTelegramMessage(chatId, 
                    `✅ <b>Görev Atandı</b>\n\n` +
                    `📋 <b>${title}</b>\n` +
                    `📄 ${description}\n\n` +
                    `👤 Atanan: ${targetEmployee.name}\n` +
                    `💬 Chat ID: ${targetEmployee.chatId}\n` +
                    `📅 Tarih: ${new Date().toLocaleDateString('tr-TR')}`
                );
                
                // Notify employee
                sendTelegramMessage(targetEmployee.chatId,
                    `📋 <b>Yeni Görev Atandı!</b>\n\n` +
                    `🎯 <b>${title}</b>\n` +
                    `📝 ${description}\n\n` +
                    `👤 Atayan: ${from.first_name || 'Admin'}\n` +
                    `📅 Tarih: ${new Date().toLocaleDateString('tr-TR')}\n\n` +
                    `📋 Görevlerinizi görmek için: "📋 Görevlerim" butonunu kullanın.`,
                    {
                        keyboard: [
                            [{ text: "📋 Görevlerim" }, { text: "📦 Eksik Ürün Bildir" }],
                            [{ text: "📊 İstatistikler" }, { text: "ℹ️ Yardım" }]
                        ],
                        resize_keyboard: true
                    }
                );
                
                logActivity(`Tekil görev atandı: "${title}" → ${targetEmployee.name}`, chatId, from.first_name);
            }
            else if (text.startsWith('/taskall ')) {
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                if (!adminSettings.adminUsers.includes(numericChatId)) {
                    sendTelegramMessage(chatId, "❌ Toplu görev atama sadece adminler tarafından yapılabilir.");
                    return;
                }
                
                // Parse: /taskall Görev başlığı | Açıklama
                const taskText = text.replace('/taskall ', '').trim();
                
                if (!taskText.includes('|')) {
                    sendTelegramMessage(chatId, 
                        "❌ <b>Kullanım:</b>\n" +
                        "/taskall Görev başlığı | Açıklama\n\n" +
                        "Bu komut tüm çalışanlara aynı görevi atar."
                    );
                    return;
                }
                
                let [title, description] = taskText.split('|').map(s => protectTurkishChars(s.trim()));
                
                if (!title || !description) {
                    sendTelegramMessage(chatId, "❌ Görev başlığı ve açıklaması gereklidir.");
                    return;
                }
                
                const employees = readJsonFile(DATA_FILES.employees);
                const regularEmployees = employees.filter(emp => emp.role !== 'admin');
                
                if (regularEmployees.length === 0) {
                    sendTelegramMessage(chatId, "❌ Görev atanacak çalışan bulunamadı.");
                    return;
                }
                
                const tasks = readJsonFile(DATA_FILES.tasks);
                const baseTaskId = Date.now();
                
                let assignedCount = 0;
                
                // Create individual task for each employee
                regularEmployees.forEach((employee, index) => {
                    const newTask = {
                        id: baseTaskId + index,
                        title: title,
                        description: description,
                        assignedTo: Number(employee.chatId),
                        assignedToName: protectTurkishChars(employee.name),
                        assignedBy: numericChatId,
                        assignedByName: from.first_name || 'Admin',
                        createdAt: new Date().toISOString(),
                        status: 'pending',
                        type: 'bulk',
                        bulkId: baseTaskId // Group bulk tasks
                    };
                    
                    tasks.push(newTask);
                    
                    // Notify employee
                    sendTelegramMessage(employee.chatId,
                        `📢 <b>Toplu Görev Atandı!</b>\n\n` +
                        `🎯 <b>${title}</b>\n` +
                        `📝 ${description}\n\n` +
                        `👤 Atayan: ${from.first_name || 'Admin'}\n` +
                        `📅 Tarih: ${new Date().toLocaleDateString('tr-TR')}\n\n` +
                        `📋 Bu görev tüm çalışanlara atanmıştır.\n` +
                        `🔍 Görevlerinizi görmek için: "📋 Görevlerim"`,
                        {
                            keyboard: [
                                [{ text: "📋 Görevlerim" }, { text: "📦 Eksik Ürün Bildir" }],
                                [{ text: "📊 İstatistikler" }, { text: "ℹ️ Yardım" }]
                            ],
                            resize_keyboard: true
                        }
                    );
                    
                    assignedCount++;
                });
                
                writeJsonFile(DATA_FILES.tasks, tasks);
                
                // Notify admin
                sendTelegramMessage(chatId,
                    `✅ <b>Toplu Görev Atandı</b>\n\n` +
                    `📋 <b>${title}</b>\n` +
                    `📄 ${description}\n\n` +
                    `👥 Atanan Çalışan Sayısı: ${assignedCount}\n` +
                    `📅 Tarih: ${new Date().toLocaleDateString('tr-TR')}\n\n` +
                    `📊 Tüm çalışanlara başarıyla gönderildi.`
                );
                
                logActivity(`Toplu görev atandı: "${title}" → ${assignedCount} çalışan`, chatId, from.first_name);
            }
            
            // Handle refresh products
            if (data === 'refresh_products') {
                // Simulate refresh by resending the products list
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                if (!adminSettings.adminUsers.includes(numericChatId)) {
                    sendTelegramMessage(chatId, "❌ Bu işlem sadece adminler tarafından yapılabilir.");
                    return;
                }
                
                sendTelegramMessage(chatId, "🔄 Eksik ürün listesi yenileniyor...");
                
                // Trigger products list again
                setTimeout(() => {
                    // Re-call the products handler
                    const products = readJsonFile(DATA_FILES.missingProducts);
                    
                    if (products.length === 0) {
                        sendTelegramMessage(chatId, "📦 <b>Eksik Ürün Listesi</b>\n\n✅ Şu anda eksik ürün bildirimi bulunmuyor.");
                        return;
                    }
                    
                    // Regenerate product list (same code as above)
                    // This could be refactored into a separate function
                    sendTelegramMessage(chatId, `✅ Liste yenilendi. Toplam ${products.length} ürün bildirimi.`);
                }, 1000);
            }
            
            // Handle task completion by employee
            if (data.startsWith('complete_task_')) {
                const taskId = data.replace('complete_task_', '');
                const tasks = readJsonFile(DATA_FILES.tasks);
                const taskIndex = tasks.findIndex(t => t.id == taskId);
                
                if (taskIndex === -1) {
                    sendTelegramMessage(chatId, "❌ Görev bulunamadı veya zaten tamamlanmış.");
                    return;
                }
                
                const task = tasks[taskIndex];
                const numericChatId = Number(chatId);
                
                // Check if user owns this task
                if (Number(task.assignedTo) !== numericChatId) {
                    sendTelegramMessage(chatId, "❌ Bu görev size ait değil.");
                    return;
                }
                
                // Mark task as completed
                tasks[taskIndex].status = 'completed';
                tasks[taskIndex].completedAt = new Date().toISOString();
                tasks[taskIndex].completedBy = numericChatId;
                
                writeJsonFile(DATA_FILES.tasks, tasks);
                
                const employees = readJsonFile(DATA_FILES.employees);
                const employee = employees.find(e => Number(e.chatId) === numericChatId);
                const employeeName = employee ? employee.name : 'Bilinmeyen Çalışan';
                
                // Notify employee
                sendTelegramMessage(chatId,
                    `✅ <b>Görev Tamamlandı!</b>\n\n` +
                    `🎯 <b>${protectTurkishChars(task.title)}</b>\n` +
                    `📝 ${protectTurkishChars(task.description)}\n\n` +
                    `📅 Tamamlama Tarihi: ${new Date().toLocaleString('tr-TR')}\n` +
                    `⏱️ Süre: ${Math.ceil((new Date() - new Date(task.createdAt)) / (1000 * 60 * 60 * 24))} gün\n\n` +
                    `🎉 Tebrikler! Göreviniz başarıyla tamamlandı ve listeden kaldırıldı.`
                );
                
                // Notify admin who assigned the task
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                if (adminSettings.adminUsers.includes(Number(task.assignedBy))) {
                    sendTelegramMessage(task.assignedBy,
                        `✅ <b>Görev Tamamlandı</b>\n\n` +
                        `🎯 <b>${protectTurkishChars(task.title)}</b>\n` +
                        `👤 Tamamlayan: ${protectTurkishChars(employeeName)}\n` +
                        `📅 Tamamlama: ${new Date().toLocaleString('tr-TR')}\n\n` +
                        `🎉 ${task.type === 'bulk' ? 'Toplu görev' : 'Kişisel görev'} başarıyla tamamlandı.`
                    );
                }
                
                logActivity(`Görev tamamlandı: "${task.title}" - ${employeeName}`, numericChatId, employeeName);
            }
            
            // Handle refresh my tasks
            if (data === 'refresh_my_tasks') {
                sendTelegramMessage(chatId, "🔄 Görevleriniz yenileniyor...");
                
                setTimeout(() => {
                    const tasks = readJsonFile(DATA_FILES.tasks);
                    const numericChatId = Number(chatId);
                    const userTasks = tasks.filter(task => Number(task.assignedTo) === numericChatId);
                    const pendingTasks = userTasks.filter(task => task.status === 'pending');
                    
                    if (pendingTasks.length === 0) {
                        sendTelegramMessage(chatId, "✅ Görevler yenilendi. Bekleyen göreviniz bulunmuyor.");
                    } else {
                        sendTelegramMessage(chatId, `✅ Görevler yenilendi. ${pendingTasks.length} bekleyen göreviniz var.`);
                    }
                }, 1000);
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
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                // Reset user state
                employees.forEach(emp => {
                    if (Number(emp.chatId) === numericChatId) {
                        emp.currentAction = null;
                        emp.selectedCategory = null;
                    }
                });
                writeJsonFile(DATA_FILES.employees, employees);
                
                // Check if user is admin
                const isAdmin = adminSettings.adminUsers.includes(numericChatId);
                
                let keyboard;
                
                if (isAdmin) {
                    // Admin menüsü - Görevlerim yok, admin paneli var
                    keyboard = [
                        [{ text: "📦 Eksik Ürün Bildir" }, { text: "👑 Admin Panel" }],
                        [{ text: "📊 İstatistikler" }, { text: "ℹ️ Yardım" }]
                    ];
                } else {
                    // Çalışan menüsü - Görevlerim var, admin panel yok
                    keyboard = [
                        [{ text: "📦 Eksik Ürün Bildir" }, { text: "📋 Görevlerim" }],
                        [{ text: "📊 İstatistikler" }, { text: "ℹ️ Yardım" }]
                    ];
                }
                
                sendTelegramMessage(chatId, "🏠 Ana menüye dönüldü.", {
                    keyboard,
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
            else if (text === "📋 Görevlerim") {
                const employees = readJsonFile(DATA_FILES.employees);
                const tasks = readJsonFile(DATA_FILES.tasks);
                const numericChatId = Number(chatId);
                const employee = employees.find(e => Number(e.chatId) === numericChatId);
                
                if (!employee) {
                    sendTelegramMessage(chatId, "❌ Bu özelliği kullanmak için önce kayıt olmalısınız.");
                    return;
                }
                
                const userTasks = tasks.filter(task => Number(task.assignedTo) === numericChatId);
                const pendingTasks = userTasks.filter(task => task.status === 'pending');
                const completedTasks = userTasks.filter(task => task.status === 'completed');
                
                if (userTasks.length === 0) {
                    sendTelegramMessage(chatId, 
                        `📋 <b>Görevleriniz</b>\n\n` +
                        `📝 Şu anda size atanmış görev bulunmuyor.\n\n` +
                        `✅ Yeni görevler atandığında size bildirim gelecektir.`,
                        {
                            keyboard: [
                                [{ text: "📦 Eksik Ürün Bildir" }, { text: "📊 İstatistikler" }],
                                [{ text: "ℹ️ Yardım" }]
                            ],
                            resize_keyboard: true
                        }
                    );
                    return;
                }
                
                // Create task list with detailed info
                let taskText = `📋 <b>${employee.name} - Görevleriniz</b>\n\n`;
                taskText += `📊 <b>Özet:</b>\n`;
                taskText += `⏳ Bekleyen: ${pendingTasks.length}\n`;
                taskText += `✅ Tamamlanan: ${completedTasks.length}\n`;
                taskText += `📈 Toplam: ${userTasks.length}\n\n`;
                
                if (pendingTasks.length > 0) {
                    taskText += `⏳ <b>Bekleyen Görevler:</b>\n\n`;
                    
                    pendingTasks.forEach((task, index) => {
                        taskText += `${index + 1}. 🎯 <b>${protectTurkishChars(task.title)}</b>\n`;
                        taskText += `   📝 ${protectTurkishChars(task.description)}\n`;
                        taskText += `   👤 Atayan: ${protectTurkishChars(task.assignedByName)}\n`;
                        taskText += `   📅 ${new Date(task.createdAt).toLocaleString('tr-TR')}\n`;
                        taskText += `   ${task.type === 'bulk' ? '📢 Toplu Görev' : '👤 Kişisel Görev'}\n\n`;
                    });
                }
                
                if (completedTasks.length > 0) {
                    taskText += `✅ <b>Tamamlanan Görevler:</b>\n\n`;
                    
                    completedTasks.slice(-3).forEach((task, index) => { // Show last 3 completed
                        taskText += `${index + 1}. ✅ <b>${protectTurkishChars(task.title)}</b>\n`;
                        taskText += `   📅 ${new Date(task.completedAt || task.createdAt).toLocaleDateString('tr-TR')}\n\n`;
                    });
                    
                    if (completedTasks.length > 3) {
                        taskText += `... ve ${completedTasks.length - 3} görev daha\n\n`;
                    }
                }
                
                // Create inline keyboard with complete buttons for pending tasks
                const inlineKeyboard = [];
                
                pendingTasks.slice(0, 10).forEach(task => { // Limit to 10 tasks
                    inlineKeyboard.push([{
                        text: `✅ "${protectTurkishChars(task.title)}" Tamamlandı`,
                        callback_data: `complete_task_${task.id}`
                    }]);
                });
                
                if (pendingTasks.length === 0) {
                    inlineKeyboard.push([{
                        text: "🔄 Görevleri Yenile",
                        callback_data: "refresh_my_tasks"
                    }]);
                }
                
                sendTelegramMessage(chatId, taskText, {
                    inline_keyboard: inlineKeyboard.length > 0 ? inlineKeyboard : undefined
                });
            }
            else if (text === "👑 Admin Panel") {
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                if (!adminSettings.adminUsers.includes(numericChatId)) {
                    sendTelegramMessage(chatId, "❌ Bu özellik sadece adminler için erişilebilir.");
                    return;
                }
                
                const employees = readJsonFile(DATA_FILES.employees);
                const products = readJsonFile(DATA_FILES.missingProducts);
                const activities = readJsonFile(DATA_FILES.activityLog);
                
                const pendingUsers = readJsonFile(DATA_FILES.pendingUsers);
                
                const adminText = `👑 <b>SivalTeam Admin Panel</b>\n\n` +
                    `📊 <b>Sistem İstatistikleri:</b>\n` +
                    `👥 Kayıtlı Çalışan: ${employees.length}\n` +
                    `⏳ Onay Bekleyen: ${pendingUsers.length}\n` +
                    `📦 Eksik Ürün Bildirimi: ${products.length}\n` +
                    `📈 Toplam Aktivite: ${activities.length}\n\n` +
                    `🔧 <b>Kullanıcı Yönetimi:</b>\n` +
                    `/adduser &lt;chatId&gt; &lt;ad&gt; &lt;departman&gt; - Manuel çalışan ekleme\n` +
                    `/removeuser &lt;chatId&gt; - Çalışan silme\n` +
                    `/listusers - Tüm çalışanları listeleme\n` +
                    `/pending - Onay bekleyen kullanıcılar\n\n` +
                    `📦 <b>Ürün Yönetimi:</b>\n` +
                    `/products - Eksik ürün listesi (sadece admin)\n` +
                    `/clearproducts - Tüm eksik ürün listesini temizleme\n\n` +
                    `📢 <b>İletişim:</b>\n` +
                    `/broadcast &lt;mesaj&gt; - Tüm çalışanlara duyuru\n` +
                    `/addtask &lt;chatId&gt; &lt;başlık&gt; | &lt;açıklama&gt; - Görev atama\n\n` +
                    `📊 <b>Raporlama:</b>\n` +
                    `/stats - Detaylı sistem istatistikleri\n` +
                    `/activity - Son aktivite raporu`;
                
                sendTelegramMessage(chatId, adminText, {
                    keyboard: [
                        [{ text: "👥 Çalışanları Listele" }, { text: "📦 Eksik Ürünler" }],
                        [{ text: "⏳ Bekleyen Onaylar" }, { text: "📊 İstatistikler" }],
                        [{ text: "📢 Duyuru Gönder" }, { text: "🔙 Ana Menü" }]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: false
                });
            }
            else if (text === "ℹ️ Yardım") {
                const helpText = `ℹ️ <b>SivalTeam Yardım</b>\n\n` +
                    `📦 <b>Eksik Ürün Bildir:</b> Mağazada eksik olan ürünleri bildirin\n` +
                    `📋 <b>Görevlerim:</b> Size atanan görevleri görün\n` +
                    `📊 <b>İstatistikler:</b> Sistem istatistiklerini görün\n` +
                    `👑 <b>Admin Panel:</b> Admin yetkilerine sahipseniz yönetim paneli\n\n` +
                    `❓ Sorun yaşıyorsanız sistem yöneticisiyle iletişime geçin.`;
                
                sendTelegramMessage(chatId, helpText);
            }
            else if (text.startsWith('/adduser')) {
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                if (!adminSettings.adminUsers.includes(numericChatId)) {
                    sendTelegramMessage(chatId, "❌ Bu komut sadece adminler tarafından kullanılabilir.");
                    return;
                }
                
                const parts = text.split(' ');
                if (parts.length < 4) {
                    sendTelegramMessage(chatId, "❌ Kullanım: /adduser &lt;chatId&gt; &lt;ad&gt; &lt;departman&gt;");
                    return;
                }
                
                const targetChatId = Number(parts[1]);
                const name = protectTurkishChars(parts[2]);
                const department = protectTurkishChars(parts.slice(3).join(' '));
                
                const employees = readJsonFile(DATA_FILES.employees);
                const existingEmployee = employees.find(e => Number(e.chatId) === targetChatId);
                
                if (existingEmployee) {
                    sendTelegramMessage(chatId, "❌ Bu chatId zaten kayıtlı.");
                    return;
                }
                
                const newEmployee = {
                    chatId: targetChatId,
                    name: name,
                    department: department,
                    role: 'employee',
                    addedBy: numericChatId,
                    addedAt: new Date().toISOString(),
                    status: 'active'
                };
                
                employees.push(newEmployee);
                writeJsonFile(DATA_FILES.employees, employees);
                
                sendTelegramMessage(chatId, `✅ Kullanıcı eklendi: ${name} (${department})`);
                sendTelegramMessage(targetChatId, 
                    `🎉 <b>SivalTeam'e Hoşgeldin!</b>\n\n` +
                    `👤 Adınız: ${name}\n` +
                    `🏢 Departman: ${department}\n\n` +
                    `✅ Artık sistemi kullanabilirsiniz! /start ile başlayın.`
                );
                
                logActivity(`Yeni kullanıcı eklendi: ${name}`, chatId, from.first_name);
            }
            else if (text === '/listusers') {
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                if (!adminSettings.adminUsers.includes(numericChatId)) {
                    sendTelegramMessage(chatId, "❌ Bu komut sadece adminler tarafından kullanılabilir.");
                    return;
                }
                
                const employees = readJsonFile(DATA_FILES.employees);
                
                if (employees.length === 0) {
                    sendTelegramMessage(chatId, "📋 Henüz kayıtlı kullanıcı bulunmuyor.");
                    return;
                }
                
                const userList = employees.map((emp, index) => 
                    `${index + 1}. <b>${protectTurkishChars(emp.name)}</b>\n` +
                    `   🏢 ${protectTurkishChars(emp.department)}\n` +
                    `   🆔 ${emp.chatId}\n` +
                    `   ${adminSettings.adminUsers.includes(Number(emp.chatId)) ? '👑 Admin' : '👤 Çalışan'}`
                ).join('\n\n');
                
                sendTelegramMessage(chatId, `👥 <b>Kayıtlı Kullanıcılar (${employees.length})</b>\n\n${userList}`);
            }
            else if (text.startsWith('/removeuser')) {
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                if (!adminSettings.adminUsers.includes(numericChatId)) {
                    sendTelegramMessage(chatId, "❌ Bu komut sadece adminler tarafından kullanılabilir.");
                    return;
                }
                
                const parts = text.split(' ');
                if (parts.length !== 2) {
                    sendTelegramMessage(chatId, "❌ Kullanım: /removeuser &lt;chatId&gt;");
                    return;
                }
                
                const targetChatId = Number(parts[1]);
                const employees = readJsonFile(DATA_FILES.employees);
                const employeeIndex = employees.findIndex(e => Number(e.chatId) === targetChatId);
                
                if (employeeIndex === -1) {
                    sendTelegramMessage(chatId, "❌ Bu chatId'ye sahip kullanıcı bulunamadı.");
                    return;
                }
                
                const removedEmployee = employees[employeeIndex];
                employees.splice(employeeIndex, 1);
                writeJsonFile(DATA_FILES.employees, employees);
                
                // Add to deleted employees
                const deletedEmployees = readJsonFile(DATA_FILES.deletedEmployees);
                deletedEmployees.push({
                    ...removedEmployee,
                    deletedAt: new Date().toISOString(),
                    deletedBy: numericChatId
                });
                writeJsonFile(DATA_FILES.deletedEmployees, deletedEmployees);
                
                sendTelegramMessage(chatId, `✅ Kullanıcı silindi: ${removedEmployee.name}`);
                sendTelegramMessage(targetChatId, 
                    `❌ <b>SivalTeam Erişiminiz İptal Edildi</b>\n\n` +
                    `Üzgünüz, sistem erişiminiz admin tarafından iptal edildi.\n` +
                    `Daha fazla bilgi için sistem yöneticisiyle iletişime geçin.`
                );
                
                logActivity(`Kullanıcı silindi: ${removedEmployee.name}`, chatId, from.first_name);
            }
            else if (text === '/clearproducts') {
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                if (!adminSettings.adminUsers.includes(numericChatId)) {
                    sendTelegramMessage(chatId, "❌ Bu komut sadece adminler tarafından kullanılabilir.");
                    return;
                }
                
                const products = readJsonFile(DATA_FILES.missingProducts);
                const productCount = products.length;
                
                writeJsonFile(DATA_FILES.missingProducts, []);
                
                sendTelegramMessage(chatId, `✅ Eksik ürün listesi temizlendi. ${productCount} ürün silindi.`);
                logActivity(`Eksik ürün listesi temizlendi (${productCount} ürün)`, chatId, from.first_name);
            }
            else if (text.startsWith('/broadcast ')) {
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                if (!adminSettings.adminUsers.includes(numericChatId)) {
                    sendTelegramMessage(chatId, "❌ Bu komut sadece adminler tarafından kullanılabilir.");
                    return;
                }
                
                const message = protectTurkishChars(text.replace('/broadcast ', ''));
                const employees = readJsonFile(DATA_FILES.employees);
                
                if (!message.trim()) {
                    sendTelegramMessage(chatId, "❌ Kullanım: /broadcast &lt;mesaj&gt;");
                    return;
                }
                
                let sentCount = 0;
                const broadcastMessage = `📢 <b>Genel Duyuru</b>\n\n${message}`;
                
                for (const employee of employees) {
                    try {
                        await sendTelegramMessage(employee.chatId, broadcastMessage);
                        sentCount++;
                        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
                    } catch (error) {
                        console.error(`Broadcast error for ${employee.chatId}:`, error);
                    }
                }
                
                sendTelegramMessage(chatId, `✅ Duyuru ${sentCount}/${employees.length} kullanıcıya gönderildi.`);
                logActivity(`Genel duyuru gönderildi: ${sentCount} kullanıcı`, chatId, from.first_name);
            }
            else if (text.startsWith('/addtask ')) {
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                if (!adminSettings.adminUsers.includes(numericChatId)) {
                    sendTelegramMessage(chatId, "❌ Bu komut sadece adminler tarafından kullanılabilir.");
                    return;
                }
                
                // /addtask &lt;chatId&gt; &lt;başlık&gt; | &lt;açıklama&gt;
                const taskText = text.replace('/addtask ', '');
                const parts = taskText.split(' ');
                
                if (parts.length < 2 || !taskText.includes('|')) {
                    sendTelegramMessage(chatId, "❌ Kullanım: /addtask &lt;chatId&gt; &lt;başlık&gt; | &lt;açıklama&gt;");
                    return;
                }
                
                const targetChatId = Number(parts[0]);
                const taskContent = parts.slice(1).join(' ');
                const [title, description] = taskContent.split('|').map(s => protectTurkishChars(s.trim()));
                
                const employees = readJsonFile(DATA_FILES.employees);
                const targetEmployee = employees.find(e => Number(e.chatId) === targetChatId);
                
                if (!targetEmployee) {
                    sendTelegramMessage(chatId, "❌ Bu chatId'ye sahip çalışan bulunamadı.");
                    return;
                }
                
                const tasks = readJsonFile(DATA_FILES.tasks);
                const newTask = {
                    id: Date.now(),
                    title: title,
                    description: description || 'Açıklama belirtilmedi',
                    assignedTo: targetChatId,
                    assignedToName: targetEmployee.name,
                    assignedBy: numericChatId,
                    createdAt: new Date().toISOString(),
                    status: 'pending'
                };
                
                tasks.push(newTask);
                writeJsonFile(DATA_FILES.tasks, tasks);
                
                sendTelegramMessage(chatId, `✅ Görev atandı: "${title}" → ${targetEmployee.name}`);
                sendTelegramMessage(targetChatId, 
                    `📋 <b>Yeni Görev Atandı</b>\n\n` +
                    `📝 <b>${title}</b>\n` +
                    `📄 ${description}\n\n` +
                    `👤 Atayan: Admin\n` +
                    `📅 Tarih: ${new Date().toLocaleDateString('tr-TR')}\n\n` +
                    `✅ Tamamladığınızda bildirin.`
                );
                
                logActivity(`Görev atandı: "${title}" → ${targetEmployee.name}`, chatId, from.first_name);
            }
            else if (text === "👥 Çalışanları Listele" || text === "/listusers") {
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                if (!adminSettings.adminUsers.includes(numericChatId)) {
                    sendTelegramMessage(chatId, "❌ Bu özellik sadece adminler için erişilebilir.");
                    return;
                }
                
                const employees = readJsonFile(DATA_FILES.employees);
                
                if (employees.length === 0) {
                    sendTelegramMessage(chatId, "👥 <b>Çalışan Listesi</b>\n\nHenüz kayıtlı çalışan bulunmuyor.");
                    return;
                }
                
                const userList = employees.map((emp, index) => 
                    `${index + 1}. <b>${protectTurkishChars(emp.name)}</b>\n` +
                    `   🏢 ${protectTurkishChars(emp.department)}\n` +
                    `   💬 Chat ID: <code>${emp.chatId}</code>\n` +
                    `   ${adminSettings.adminUsers.includes(Number(emp.chatId)) ? '👑 Admin' : '👤 Çalışan'}\n` +
                    `   📅 ${new Date(emp.addedAt).toLocaleDateString('tr-TR')}`
                ).join('\n\n');
                
                sendTelegramMessage(chatId, `👥 <b>Kayıtlı Çalışanlar (${employees.length})</b>\n\n${userList}`);
            }
            else if (text === "📦 Eksik Ürünler" || text === "/products") {
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                if (!adminSettings.adminUsers.includes(numericChatId)) {
                    sendTelegramMessage(chatId, "❌ Eksik ürün listesi sadece adminler tarafından görülebilir.");
                    return;
                }
                
                const products = readJsonFile(DATA_FILES.missingProducts);
                
                if (products.length === 0) {
                    sendTelegramMessage(chatId, "📦 <b>Eksik Ürün Listesi</b>\n\n✅ Şu anda eksik ürün bildirimi bulunmuyor.");
                    return;
                }
                
                // Group by category
                const productsByCategory = {};
                products.forEach(product => {
                    const category = product.category || 'Kategori Belirtilmemiş';
                    if (!productsByCategory[category]) {
                        productsByCategory[category] = [];
                    }
                    productsByCategory[category].push(product);
                });
                
                let productText = `📦 <b>Eksik Ürün Raporu</b>\n\n`;
                productText += `📊 Toplam: ${products.length} ürün bildirimi\n\n`;
                
                Object.keys(productsByCategory).forEach(category => {
                    const categoryProducts = productsByCategory[category];
                    productText += `🏷️ <b>${protectTurkishChars(category)}</b> (${categoryProducts.length})\n`;
                    
                    categoryProducts.slice(0, 10).forEach((product, index) => {
                        productText += `   ${index + 1}. ${protectTurkishChars(product.product)}\n`;
                        productText += `      👤 ${protectTurkishChars(product.reportedBy)} - ${new Date(product.timestamp).toLocaleDateString('tr-TR')}\n`;
                    });
                    
                    if (categoryProducts.length > 10) {
                        productText += `   ... ve ${categoryProducts.length - 10} ürün daha\n`;
                    }
                    productText += `\n`;
                });
                
                // Create inline keyboard for each product with complete buttons
                const inlineKeyboard = [];
                let buttonCount = 0;
                
                products.slice(0, 20).forEach(product => { // Limit to first 20 products
                    if (buttonCount < 20) { // Telegram limit
                        inlineKeyboard.push([{
                            text: `✅ ${protectTurkishChars(product.product)} - Tamamlandı`,
                            callback_data: `complete_product_${product.id}`
                        }]);
                        buttonCount++;
                    }
                });
                
                // Add management buttons
                inlineKeyboard.push([
                    { text: "🗑️ Tümünü Temizle", callback_data: "clear_all_products" },
                    { text: "🔄 Listeyi Yenile", callback_data: "refresh_products" }
                ]);
                
                sendTelegramMessage(chatId, productText, {
                    inline_keyboard: inlineKeyboard
                });
            }
            else if (text === "⏳ Bekleyen Onaylar" || text === "/pending") {
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                if (!adminSettings.adminUsers.includes(numericChatId)) {
                    sendTelegramMessage(chatId, "❌ Bu özellik sadece adminler için erişilebilir.");
                    return;
                }
                
                const pendingUsers = readJsonFile(DATA_FILES.pendingUsers);
                
                if (pendingUsers.length === 0) {
                    sendTelegramMessage(chatId, "⏳ <b>Bekleyen Onaylar</b>\n\n✅ Şu anda onay bekleyen kullanıcı bulunmuyor.");
                    return;
                }
                
                const pendingText = pendingUsers.map((user, index) => 
                    `${index + 1}. <b>${protectTurkishChars(user.firstName)} ${protectTurkishChars(user.lastName)}</b>\n` +
                    `   🆔 Username: @${user.username}\n` +
                    `   💬 Chat ID: <code>${user.chatId}</code>\n` +
                    `   📅 Tarih: ${new Date(user.timestamp).toLocaleString('tr-TR')}\n` +
                    `   ⚡ Onaylamak için: /approve ${user.chatId}`
                ).join('\n\n');
                
                sendTelegramMessage(chatId, 
                    `⏳ <b>Onay Bekleyen Kullanıcılar (${pendingUsers.length})</b>\n\n${pendingText}`, {
                        keyboard: [
                            [{ text: "👑 Admin Panel" }, { text: "🔄 Yenile" }]
                        ],
                        resize_keyboard: true
                    });
            }
            else if (text === "🗑️ Listeyi Temizle") {
                const adminSettings = readJsonFile(DATA_FILES.adminSettings);
                const numericChatId = Number(chatId);
                
                if (!adminSettings.adminUsers.includes(numericChatId)) {
                    sendTelegramMessage(chatId, "❌ Bu işlem sadece adminler tarafından yapılabilir.");
                    return;
                }
                
                const products = readJsonFile(DATA_FILES.missingProducts);
                const productCount = products.length;
                
                writeJsonFile(DATA_FILES.missingProducts, []);
                
                sendTelegramMessage(chatId, 
                    `✅ <b>Eksik Ürün Listesi Temizlendi</b>\n\n` +
                    `🗑️ ${productCount} ürün bildirimi silindi.\n` +
                    `📊 Liste baştan başlıyor.`);
                
                logActivity(`Eksik ürün listesi temizlendi (${productCount} ürün)`, chatId, from.first_name);
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
    } catch (error) {
        console.error('Webhook Error:', error);
        // Don't send response again, already sent at the beginning
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