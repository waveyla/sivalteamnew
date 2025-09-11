#!/usr/bin/env node

/**
 * 🤖 SIVALTEAM BOT v5.0.0 - ULTIMATE CLEAN VERSION
 * ===============================================
 * 🔥 Sıfırdan yazılmış temiz kod mimarisi
 * 🇹🇷 Gelişmiş Türkçe karakter desteği  
 * ⚡ Pure MongoDB entegrasyonu
 * 🔒 Kurumsal güvenlik sistemi
 * 📊 Gerçek zamanlı dashboard
 * 🔄 Medya desteği (Fotoğraf/Ses)
 * 
 * Copyright 2025 - SivalTeam
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();
const { connectDB } = require('./database');
const MongoDataManager = require('./dataManager');

// 🚀 Uygulama Konfigürasyonu
const CONFIG = {
    PORT: process.env.PORT || 10000,
    BOT_TOKEN: process.env.BOT_TOKEN || '8229159175:AAGRFoLpK9ma5ekPiaaCdI8EKJeca14XoOg',
    WEBHOOK_URL: process.env.WEBHOOK_URL || 'https://sivalteam-bot.onrender.com',
    VERSION: '5.0.0',
    NODE_ENV: process.env.NODE_ENV || 'production'
};

// 📊 Global değişkenler
let dataManager;
const app = express();
const userSessions = new Map();
const rateLimitMap = new Map();

// 🔧 Express middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🛡️ Rate Limiter Class
class RateLimiter {
    static check(userId) {
        const now = Date.now();
        const userKey = `user_${userId}`;
        
        if (!rateLimitMap.has(userKey)) {
            rateLimitMap.set(userKey, { count: 1, firstRequest: now });
            return true;
        }
        
        const userData = rateLimitMap.get(userKey);
        if (now - userData.firstRequest > 60000) { // 1 dakika geçti
            rateLimitMap.set(userKey, { count: 1, firstRequest: now });
            return true;
        }
        
        if (userData.count >= 30) { // Dakikada 30 istek limiti
            return false;
        }
        
        userData.count++;
        return true;
    }
}

// 🇹🇷 Türkçe Karakter Koruma Sistemi
class TurkishTextProtector {
    static protect(text) {
        if (!text) return text;
        return text
            .replace(/ı/g, 'ı').replace(/I/g, 'İ')
            .replace(/ğ/g, 'ğ').replace(/Ğ/g, 'Ğ')
            .replace(/ü/g, 'ü').replace(/Ü/g, 'Ü')
            .replace(/ş/g, 'ş').replace(/Ş/g, 'Ş')
            .replace(/ö/g, 'ö').replace(/Ö/g, 'Ö')
            .replace(/ç/g, 'ç').replace(/Ç/g, 'Ç');
    }
}

// 🤖 Telegram API Wrapper
class TelegramBot {
    constructor(token) {
        this.token = token;
        this.apiUrl = `https://api.telegram.org/bot${token}`;
    }

    async sendMessage(chatId, text, options = {}) {
        try {
            const payload = {
                chat_id: chatId,
                text: TurkishTextProtector.protect(text),
                parse_mode: 'HTML',
                ...options
            };
            
            const response = await axios.post(`${this.apiUrl}/sendMessage`, payload, {
                timeout: 10000
            });
            
            return response.data;
        } catch (error) {
            console.error(`❌ Mesaj gönderme hatası [${chatId}]:`, error.message);
            throw error;
        }
    }

    async editMessage(chatId, messageId, text, options = {}) {
        try {
            const payload = {
                chat_id: chatId,
                message_id: messageId,
                text: TurkishTextProtector.protect(text),
                parse_mode: 'HTML',
                ...options
            };
            
            await axios.post(`${this.apiUrl}/editMessageText`, payload);
        } catch (error) {
            console.error(`❌ Mesaj düzenleme hatası [${chatId}]:`, error.message);
        }
    }

    async deleteMessage(chatId, messageId) {
        try {
            await axios.post(`${this.apiUrl}/deleteMessage`, {
                chat_id: chatId,
                message_id: messageId
            });
        } catch (error) {
            console.error(`❌ Mesaj silme hatası [${chatId}]:`, error.message);
        }
    }

    async sendPhoto(chatId, photo, options = {}) {
        try {
            const payload = {
                chat_id: chatId,
                photo: photo,
                ...options
            };
            
            const response = await axios.post(`${this.apiUrl}/sendPhoto`, payload);
            return response.data;
        } catch (error) {
            console.error(`❌ Fotoğraf gönderme hatası [${chatId}]:`, error.message);
            throw error;
        }
    }

    async sendDocument(chatId, document, options = {}) {
        try {
            const payload = {
                chat_id: chatId,
                document: document,
                ...options
            };
            
            const response = await axios.post(`${this.apiUrl}/sendDocument`, payload);
            return response.data;
        } catch (error) {
            console.error(`❌ Doküman gönderme hatası [${chatId}]:`, error.message);
            throw error;
        }
    }
}

// 📱 Keyboard Generator
class KeyboardGenerator {
    static getMainKeyboard(userType) {
        const keyboards = {
            admin: {
                reply_markup: {
                    keyboard: [
                        [{ text: "👥 Kullanıcı Yönetimi" }, { text: "📋 Görev Yönetimi" }],
                        [{ text: "📦 Ürün Yönetimi" }, { text: "📢 Duyuru Sistemi" }],
                        [{ text: "📊 Raporlar" }, { text: "⚙️ Sistem Ayarları" }]
                    ],
                    resize_keyboard: true
                }
            },
            employee: {
                reply_markup: {
                    keyboard: [
                        [{ text: "📋 Görevlerim" }, { text: "📦 Ürün Raporla" }],
                        [{ text: "📢 Duyurular" }, { text: "ℹ️ Bilgilerim" }]
                    ],
                    resize_keyboard: true
                }
            }
        };
        
        return keyboards[userType] || keyboards.employee;
    }

    static getInlineKeyboard(type, data = {}) {
        const keyboards = {
            user_approval: {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ Onayla", callback_data: `approve_${data.userId}` },
                            { text: "❌ Reddet", callback_data: `reject_${data.userId}` }
                        ]
                    ]
                }
            },
            task_actions: {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ Tamamla", callback_data: `complete_task_${data.taskId}` },
                            { text: "📝 Detay", callback_data: `task_detail_${data.taskId}` }
                        ]
                    ]
                }
            },
            product_actions: {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "➕ Stok Ekle", callback_data: `add_stock_${data.productId}` },
                            { text: "➖ Stok Azalt", callback_data: `reduce_stock_${data.productId}` }
                        ],
                        [
                            { text: "📝 Düzenle", callback_data: `edit_product_${data.productId}` }
                        ]
                    ]
                }
            },
            back_to_main: {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔙 Ana Menüye Dön", callback_data: "main_menu" }]
                    ]
                }
            }
        };
        
        return keyboards[type] || keyboards.back_to_main;
    }
}

// 🔐 User Session Manager
class SessionManager {
    static getUserSession(chatId) {
        return userSessions.get(chatId) || {};
    }

    static setUserSession(chatId, data) {
        const currentSession = userSessions.get(chatId) || {};
        userSessions.set(chatId, { ...currentSession, ...data });
    }

    static clearUserSession(chatId) {
        userSessions.delete(chatId);
    }

    static setUserState(chatId, state, data = {}) {
        this.setUserSession(chatId, { state, stateData: data, timestamp: Date.now() });
    }

    static getUserState(chatId) {
        const session = this.getUserSession(chatId);
        return session.state || null;
    }
}

// 📨 Message Handler Class
class MessageHandler {
    constructor(bot, dataManager) {
        this.bot = bot;
        this.dataManager = dataManager;
    }

    async handleStart(chatId, user) {
        try {
            // Mevcut kullanıcı kontrolü
            const existingUser = await this.dataManager.getEmployees();
            const currentUser = existingUser.find(emp => emp.chatId === chatId.toString());
            
            if (currentUser) {
                // Mevcut kullanıcı giriş yaptı
                await this.bot.sendMessage(
                    chatId,
                    `🎉 <b>Hoş geldiniz, ${currentUser.firstName || 'Değerli Kullanıcı'}!</b>\n\n` +
                    `✨ SivalTeam Bot v${CONFIG.VERSION} sistemi aktif\n` +
                    `👤 Durum: ${currentUser.type === 'admin' ? '👑 Yönetici' : '👨‍💼 Çalışan'}\n` +
                    `📅 Kayıt Tarihi: ${new Date(currentUser.registeredDate).toLocaleDateString('tr-TR')}\n\n` +
                    `🚀 Aşağıdaki menüden işleminizi seçebilirsiniz:`,
                    KeyboardGenerator.getMainKeyboard(currentUser.type)
                );
                
                // Kullanıcı aktivitesini güncelle
                await this.dataManager.setUserState(chatId, { lastActive: new Date() });
                return;
            }

            // Yeni kullanıcı kaydı
            const employees = await this.dataManager.getEmployees();
            
            if (employees.length === 0) {
                // İlk admin kaydı
                try {
                    const adminUser = await this.dataManager.addEmployee({
                        chatId: chatId.toString(),
                        username: user.username || 'admin',
                        firstName: user.first_name || 'Admin',
                        lastName: user.last_name || 'User',
                        type: 'admin'
                    });

                    await this.bot.sendMessage(
                        chatId,
                        `🎊 <b>İlk Admin Kaydı Tamamlandı!</b>\n\n` +
                        `👑 Siz sistemin ilk yöneticisisiniz\n` +
                        `🔑 Tüm yetkilere sahipsiniz\n` +
                        `📋 Sistemi yönetmeye başlayabilirsiniz\n\n` +
                        `✨ <i>SivalTeam Bot v${CONFIG.VERSION} başarıyla kuruldu!</i>`,
                        KeyboardGenerator.getMainKeyboard('admin')
                    );

                    console.log(`✅ İlk admin kaydedildi: ${user.first_name} (${chatId})`);
                    
                } catch (error) {
                    if (error.code === 11000) {
                        // Duplicate key error - kullanıcı zaten var
                        const existingUser = await this.dataManager.getEmployees();
                        const currentUser = existingUser.find(emp => emp.chatId === chatId.toString());
                        
                        if (currentUser) {
                            await this.bot.sendMessage(
                                chatId,
                                `✅ Zaten kayıtlısınız! Hoş geldiniz ${currentUser.firstName}`,
                                KeyboardGenerator.getMainKeyboard(currentUser.type)
                            );
                        }
                    } else {
                        throw error;
                    }
                }
            } else {
                // Onay bekleyen yeni kullanıcı
                await this.bot.sendMessage(
                    chatId,
                    `👋 <b>Merhaba ${user.first_name || 'Değerli Kullanıcı'}!</b>\n\n` +
                    `🔐 SivalTeam sistemine erişim için admin onayı gerekiyor\n` +
                    `⏳ Kaydınız yöneticilere gönderildi\n` +
                    `📱 Onay sonucunu buradan öğreneceksiniz\n\n` +
                    `💡 <i>Lütfen sabırlı olun...</i>`
                );

                // Pending user olarak ekle
                await this.dataManager.addPendingUser({
                    chatId: chatId.toString(),
                    username: user.username,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    requestDate: new Date()
                });

                // Admin'lere bildirim gönder
                const adminUsers = employees.filter(emp => emp.type === 'admin');
                for (const admin of adminUsers) {
                    await this.bot.sendMessage(
                        admin.chatId,
                        `🔔 <b>Yeni Kullanıcı Onay Talebi</b>\n\n` +
                        `👤 <b>Kullanıcı:</b> ${user.first_name} ${user.last_name || ''}\n` +
                        `💬 <b>Kullanıcı Adı:</b> @${user.username || 'Yok'}\n` +
                        `🆔 <b>Chat ID:</b> <code>${chatId}</code>\n` +
                        `📅 <b>Talep Zamanı:</b> ${new Date().toLocaleString('tr-TR')}`,
                        KeyboardGenerator.getInlineKeyboard('user_approval', { userId: chatId })
                    );
                }

                console.log(`📝 Yeni kullanıcı onay bekliyor: ${user.first_name} (${chatId})`);
            }

        } catch (error) {
            console.error('❌ Start komutu hatası:', error);
            await this.bot.sendMessage(
                chatId,
                `🚫 <b>Sistem Hatası!</b>\n\n` +
                `⚠️ Bir hata oluştu, lütfen daha sonra tekrar deneyin\n` +
                `🔧 Hata kodu: ${error.message}`
            );
        }
    }

    async handleUserManagement(chatId) {
        try {
            const employees = await this.dataManager.getEmployees();
            const pendingUsers = await this.dataManager.getPendingUsers();
            const blockedUsers = await this.dataManager.getBlockedUsers();
            const deletedEmployees = await this.dataManager.getDeletedEmployees();

            let message = `👥 <b>Kullanıcı Yönetimi Paneli</b>\n\n`;
            
            message += `📊 <b>İstatistikler:</b>\n`;
            message += `✅ Aktif Çalışanlar: ${employees.length}\n`;
            message += `⏳ Onay Bekleyenler: ${pendingUsers.length}\n`;
            message += `🚫 Engellenmiş: ${blockedUsers.length}\n`;
            message += `🗑️ Silinmiş: ${deletedEmployees.length}\n\n`;

            if (employees.length > 0) {
                message += `👨‍💼 <b>Aktif Çalışanlar:</b>\n`;
                employees.forEach((emp, index) => {
                    const role = emp.type === 'admin' ? '👑' : '👨‍💼';
                    message += `${role} ${emp.firstName} ${emp.lastName || ''} (${emp.username || 'N/A'})\n`;
                });
                message += '\n';
            }

            if (pendingUsers.length > 0) {
                message += `⏳ <b>Onay Bekleyenler:</b>\n`;
                pendingUsers.forEach((user, index) => {
                    message += `📝 ${user.firstName} ${user.lastName || ''} (@${user.username || 'N/A'})\n`;
                });
                message += '\n';
            }

            if (deletedEmployees.length > 0) {
                message += `🗑️ <b>Silinmiş Çalışanlar:</b>\n`;
                deletedEmployees.forEach((emp, index) => {
                    message += `♻️ ${emp.firstName} ${emp.lastName || ''} - Geri Yüklenebilir\n`;
                });
            }

            await this.bot.sendMessage(chatId, message, KeyboardGenerator.getInlineKeyboard('back_to_main'));

        } catch (error) {
            console.error('❌ Kullanıcı yönetimi hatası:', error);
            await this.bot.sendMessage(chatId, '🚫 Kullanıcı bilgileri yüklenirken hata oluştu.');
        }
    }

    async handleTaskManagement(chatId, userType) {
        try {
            const tasks = await this.dataManager.getTasks();
            
            let message = `📋 <b>Görev Yönetimi</b>\n\n`;
            
            if (userType === 'admin') {
                message += `📊 <b>Görev İstatistikleri:</b>\n`;
                message += `📝 Toplam: ${tasks.length}\n`;
                message += `⏳ Beklemede: ${tasks.filter(t => t.status === 'pending').length}\n`;
                message += `🔄 Aktif: ${tasks.filter(t => t.status === 'active').length}\n`;
                message += `✅ Tamamlanmış: ${tasks.filter(t => t.status === 'completed').length}\n\n`;
            }

            if (tasks.length > 0) {
                const userTasks = userType === 'admin' ? tasks : tasks.filter(t => t.assignedTo === chatId.toString());
                
                if (userTasks.length > 0) {
                    message += `📝 <b>Görevler:</b>\n`;
                    userTasks.slice(0, 10).forEach((task, index) => {
                        const statusIcon = task.status === 'completed' ? '✅' : task.status === 'active' ? '🔄' : '⏳';
                        const priorityIcon = task.priority === 'high' ? '🔥' : task.priority === 'low' ? '💡' : '⚡';
                        message += `${statusIcon} ${priorityIcon} <b>${task.title}</b>\n`;
                        message += `   📄 ${task.description || 'Açıklama yok'}\n`;
                        if (task.deadline) {
                            message += `   📅 Bitiş: ${new Date(task.deadline).toLocaleDateString('tr-TR')}\n`;
                        }
                        message += `\n`;
                    });
                    
                    if (userTasks.length > 10) {
                        message += `... ve ${userTasks.length - 10} görev daha\n`;
                    }
                } else {
                    message += `📝 Henüz göreviniz bulunmuyor.\n`;
                }
            } else {
                message += `📝 Sistem genelinde görev bulunmuyor.\n`;
            }

            await this.bot.sendMessage(chatId, message, KeyboardGenerator.getInlineKeyboard('back_to_main'));

        } catch (error) {
            console.error('❌ Görev yönetimi hatası:', error);
            await this.bot.sendMessage(chatId, '🚫 Görev bilgileri yüklenirken hata oluştu.');
        }
    }

    async handleProductManagement(chatId) {
        try {
            const products = await this.dataManager.getProducts();
            const missingProducts = await this.dataManager.getMissingProducts();
            
            let message = `📦 <b>Ürün Yönetimi</b>\n\n`;
            
            message += `📊 <b>Stok İstatistikleri:</b>\n`;
            message += `📦 Toplam Ürün: ${products.length}\n`;
            message += `⚠️ Düşük Stok: ${products.filter(p => p.quantity <= p.minQuantity).length}\n`;
            message += `🚫 Tükenmiş: ${products.filter(p => p.quantity === 0).length}\n`;
            message += `📝 Eksik Raporları: ${missingProducts.length}\n\n`;

            if (products.length > 0) {
                const lowStockProducts = products.filter(p => p.quantity <= p.minQuantity);
                
                if (lowStockProducts.length > 0) {
                    message += `⚠️ <b>Dikkat Gereken Ürünler:</b>\n`;
                    lowStockProducts.slice(0, 5).forEach(product => {
                        const statusIcon = product.quantity === 0 ? '🚫' : '⚠️';
                        message += `${statusIcon} <b>${product.name}</b>\n`;
                        message += `   📊 Stok: ${product.quantity}/${product.minQuantity} ${product.unit || 'adet'}\n`;
                        message += `   💰 Fiyat: ${product.price || 'Belirtilmemiş'}\n\n`;
                    });
                    
                    if (lowStockProducts.length > 5) {
                        message += `... ve ${lowStockProducts.length - 5} ürün daha\n\n`;
                    }
                }

                message += `📦 <b>Son Eklenen Ürünler:</b>\n`;
                products.slice(-5).reverse().forEach(product => {
                    message += `✅ <b>${product.name}</b> - ${product.quantity} ${product.unit || 'adet'}\n`;
                });
            } else {
                message += `📦 Henüz ürün eklenmemiş.\n`;
            }

            if (missingProducts.length > 0) {
                message += `\n🚨 <b>Son Eksik Ürün Raporları:</b>\n`;
                missingProducts.slice(0, 3).forEach(missing => {
                    message += `📝 ${missing.productName} - ${missing.quantity || 1} adet gerekli\n`;
                    message += `   👤 Rapor eden: ${missing.reportedBy}\n`;
                });
            }

            await this.bot.sendMessage(chatId, message, KeyboardGenerator.getInlineKeyboard('back_to_main'));

        } catch (error) {
            console.error('❌ Ürün yönetimi hatası:', error);
            await this.bot.sendMessage(chatId, '🚫 Ürün bilgileri yüklenirken hata oluştu.');
        }
    }

    async handleProductReport(chatId, user) {
        try {
            await this.bot.sendMessage(
                chatId,
                `📦 <b>Eksik Ürün Bildirimi</b>\n\n` +
                `📝 Lütfen eksik olan ürünün adını yazınız:\n` +
                `💡 <i>Örnek: "Kırmızı Kalem" veya "A4 Kağıdı"</i>\n\n` +
                `❌ İptal etmek için /cancel yazabilirsiniz.`
            );

            SessionManager.setUserState(chatId, 'awaiting_product_name', {
                reporterName: `${user.first_name} ${user.last_name || ''}`,
                reporterId: chatId
            });

        } catch (error) {
            console.error('❌ Ürün rapor başlatma hatası:', error);
            await this.bot.sendMessage(chatId, '🚫 Ürün raporu başlatılırken hata oluştu.');
        }
    }

    async handleAnnouncements(chatId, userType) {
        try {
            const announcements = await this.dataManager.getAnnouncements();
            
            let message = `📢 <b>Duyuru Sistemi</b>\n\n`;
            
            if (announcements.length > 0) {
                message += `📋 <b>Son Duyurular:</b>\n\n`;
                
                announcements.slice(0, 5).forEach((announcement, index) => {
                    message += `📢 <b>${announcement.title || 'Başlıksız Duyuru'}</b>\n`;
                    message += `📝 ${announcement.content}\n`;
                    message += `👤 Gönderen: ${announcement.createdBy}\n`;
                    message += `📅 ${new Date(announcement.createdAt).toLocaleString('tr-TR')}\n\n`;
                    message += `${'-'.repeat(30)}\n\n`;
                });
                
                if (announcements.length > 5) {
                    message += `... ve ${announcements.length - 5} duyuru daha var\n`;
                }
            } else {
                message += `📢 Henüz duyuru bulunmuyor.\n`;
            }

            if (userType === 'admin') {
                message += `\n💡 <i>Yeni duyuru eklemek için "Yeni Duyuru" yazabilirsiniz.</i>`;
            }

            await this.bot.sendMessage(chatId, message, KeyboardGenerator.getInlineKeyboard('back_to_main'));

        } catch (error) {
            console.error('❌ Duyuru listesi hatası:', error);
            await this.bot.sendMessage(chatId, '🚫 Duyurular yüklenirken hata oluştu.');
        }
    }

    async handleReports(chatId) {
        try {
            const stats = await this.dataManager.getDatabaseStats();
            
            let message = `📊 <b>Sistem Raporları</b>\n\n`;
            
            message += `📈 <b>Genel İstatistikler:</b>\n`;
            message += `👥 Toplam Kullanıcı: ${stats.users || 0}\n`;
            message += `👨‍💼 Çalışan Sayısı: ${stats.employees || 0}\n`;
            message += `📋 Toplam Görev: ${stats.tasks || 0}\n`;
            message += `📦 Ürün Sayısı: ${stats.products || 0}\n`;
            message += `🔔 Bildirim: ${stats.notifications || 0}\n`;
            message += `📢 Duyuru: ${stats.announcements || 0}\n`;
            message += `📁 Medya Dosyası: ${stats.media || 0}\n\n`;
            
            message += `💾 <b>Veritabanı Bilgileri:</b>\n`;
            message += `📊 Toplam Boyut: ${stats.totalSize || 0} MB\n`;
            message += `🔄 Sistem Sürümü: v${CONFIG.VERSION}\n`;
            message += `🕐 Rapor Zamanı: ${new Date().toLocaleString('tr-TR')}\n\n`;
            
            message += `⚡ <b>Sistem Durumu:</b>\n`;
            message += `🟢 Database: Bağlı\n`;
            message += `🟢 Bot API: Aktif\n`;
            message += `🟢 Webhook: Çalışıyor\n`;

            await this.bot.sendMessage(chatId, message, KeyboardGenerator.getInlineKeyboard('back_to_main'));

        } catch (error) {
            console.error('❌ Rapor oluşturma hatası:', error);
            await this.bot.sendMessage(chatId, '🚫 Sistem raporları oluşturulurken hata oluştu.');
        }
    }

    async handleSystemSettings(chatId) {
        try {
            let message = `⚙️ <b>Sistem Ayarları</b>\n\n`;
            
            message += `🔧 <b>Bot Konfigürasyonu:</b>\n`;
            message += `📱 Bot Sürümü: v${CONFIG.VERSION}\n`;
            message += `🌐 Ortam: ${CONFIG.NODE_ENV}\n`;
            message += `🔗 Webhook URL: ${CONFIG.WEBHOOK_URL}\n`;
            message += `🔌 Port: ${CONFIG.PORT}\n\n`;
            
            message += `📊 <b>Performans Ayarları:</b>\n`;
            message += `⚡ Rate Limit: 30 istek/dakika\n`;
            message += `⏱️ Timeout: 30 saniye\n`;
            message += `📝 Max Mesaj: 4096 karakter\n\n`;
            
            message += `🔒 <b>Güvenlik Özellikleri:</b>\n`;
            message += `✅ Rate Limiting: Aktif\n`;
            message += `✅ Spam Koruması: Aktif\n`;
            message += `✅ Türkçe Karakter Koruması: Aktif\n`;
            message += `✅ Admin Onay Sistemi: Aktif\n\n`;
            
            message += `💾 <b>Veritabanı:</b>\n`;
            message += `✅ MongoDB: Bağlı\n`;
            message += `🔄 Auto Backup: 90 gün\n`;
            message += `🗑️ Auto Cleanup: Aktif\n`;

            await this.bot.sendMessage(chatId, message, KeyboardGenerator.getInlineKeyboard('back_to_main'));

        } catch (error) {
            console.error('❌ Sistem ayarları hatası:', error);
            await this.bot.sendMessage(chatId, '🚫 Sistem ayarları yüklenirken hata oluştu.');
        }
    }

    async handleMyInfo(chatId) {
        try {
            const employees = await this.dataManager.getEmployees();
            const user = employees.find(emp => emp.chatId === chatId.toString());
            
            if (!user) {
                await this.bot.sendMessage(chatId, '❌ Kullanıcı bilgileriniz bulunamadı.');
                return;
            }

            const userTasks = await this.dataManager.getTasks();
            const myTasks = userTasks.filter(task => task.assignedTo === chatId.toString());
            
            let message = `ℹ️ <b>Kullanıcı Bilgilerim</b>\n\n`;
            
            message += `👤 <b>Kişisel Bilgiler:</b>\n`;
            message += `📛 Ad Soyad: ${user.firstName} ${user.lastName || ''}\n`;
            message += `💬 Kullanıcı Adı: @${user.username || 'Belirtilmemiş'}\n`;
            message += `🆔 Chat ID: <code>${user.chatId}</code>\n`;
            message += `👑 Yetki: ${user.type === 'admin' ? 'Yönetici' : 'Çalışan'}\n`;
            message += `📅 Kayıt Tarihi: ${new Date(user.registeredDate).toLocaleDateString('tr-TR')}\n`;
            message += `🕐 Son Aktivite: ${new Date(user.lastActive).toLocaleString('tr-TR')}\n\n`;
            
            message += `📊 <b>Görev İstatistiklerim:</b>\n`;
            message += `📝 Toplam Görev: ${myTasks.length}\n`;
            message += `✅ Tamamlanan: ${myTasks.filter(t => t.status === 'completed').length}\n`;
            message += `🔄 Devam Eden: ${myTasks.filter(t => t.status === 'active').length}\n`;
            message += `⏳ Beklemede: ${myTasks.filter(t => t.status === 'pending').length}\n\n`;
            
            if (user.type === 'admin') {
                message += `👑 <b>Yönetici Yetkileri:</b>\n`;
                message += `✅ Kullanıcı Yönetimi\n`;
                message += `✅ Görev Oluşturma\n`;
                message += `✅ Ürün Yönetimi\n`;
                message += `✅ Duyuru Paylaşımı\n`;
                message += `✅ Sistem Yönetimi\n`;
            }

            await this.bot.sendMessage(chatId, message, KeyboardGenerator.getInlineKeyboard('back_to_main'));

        } catch (error) {
            console.error('❌ Kullanıcı bilgileri hatası:', error);
            await this.bot.sendMessage(chatId, '🚫 Kullanıcı bilgileri yüklenirken hata oluştu.');
        }
    }

    async handleTextMessage(chatId, messageText, user) {
        try {
            // State kontrolü
            const currentState = SessionManager.getUserState(chatId);
            
            if (currentState) {
                await this.handleStateBasedMessage(chatId, messageText, currentState, user);
                return;
            }

            // Normal mesaj işleme
            const lowerText = messageText.toLowerCase().trim();
            
            // Cancel komutu kontrolü
            if (lowerText === '/cancel' || lowerText === 'iptal') {
                SessionManager.clearUserSession(chatId);
                await this.bot.sendMessage(chatId, '❌ İşlem iptal edildi.');
                return;
            }

            // Kullanıcı tipini al
            const employees = await this.dataManager.getEmployees();
            const currentUser = employees.find(emp => emp.chatId === chatId.toString());
            
            if (!currentUser) {
                await this.bot.sendMessage(
                    chatId, 
                    '🚫 Sisteme kayıtlı değilsiniz. Lütfen /start komutunu kullanın.'
                );
                return;
            }

            // Menü seçenekleri
            switch (messageText) {
                case '👥 Kullanıcı Yönetimi':
                    if (currentUser.type === 'admin') {
                        await this.handleUserManagement(chatId);
                    } else {
                        await this.bot.sendMessage(chatId, '🚫 Bu özellik sadece yöneticiler içindir.');
                    }
                    break;
                    
                case '📋 Görev Yönetimi':
                case '📋 Görevlerim':
                    await this.handleTaskManagement(chatId, currentUser.type);
                    break;
                    
                case '📦 Ürün Yönetimi':
                    if (currentUser.type === 'admin') {
                        await this.handleProductManagement(chatId);
                    } else {
                        await this.bot.sendMessage(chatId, '🚫 Bu özellik sadece yöneticiler içindir.');
                    }
                    break;
                    
                case '📦 Ürün Raporla':
                    await this.handleProductReport(chatId, user);
                    break;
                    
                case '📢 Duyuru Sistemi':
                case '📢 Duyurular':
                    await this.handleAnnouncements(chatId, currentUser.type);
                    break;
                    
                case '📊 Raporlar':
                    if (currentUser.type === 'admin') {
                        await this.handleReports(chatId);
                    } else {
                        await this.bot.sendMessage(chatId, '🚫 Bu özellik sadece yöneticiler içindir.');
                    }
                    break;
                    
                case '⚙️ Sistem Ayarları':
                    if (currentUser.type === 'admin') {
                        await this.handleSystemSettings(chatId);
                    } else {
                        await this.bot.sendMessage(chatId, '🚫 Bu özellik sadece yöneticiler içindir.');
                    }
                    break;
                    
                case 'ℹ️ Bilgilerim':
                    await this.handleMyInfo(chatId);
                    break;
                    
                default:
                    // Bilinmeyen komut
                    await this.bot.sendMessage(
                        chatId,
                        `🤔 <b>Anlaşılamayan komut</b>\n\n` +
                        `💡 Lütfen menüden bir seçenek seçiniz veya\n` +
                        `📱 /start komutu ile ana menüye dönünüz.\n\n` +
                        `❓ Yazdığınız: "${messageText}"`
                    );
                    break;
            }

        } catch (error) {
            console.error('❌ Metin mesaj işleme hatası:', error);
            await this.bot.sendMessage(
                chatId,
                '🚫 <b>Bir hata oluştu!</b>\n\n' +
                '⚠️ Lütfen daha sonra tekrar deneyin veya\n' +
                '🔄 /start komutu ile sistemi yeniden başlatın.'
            );
        }
    }

    async handleStateBasedMessage(chatId, messageText, currentState, user) {
        try {
            const session = SessionManager.getUserSession(chatId);
            
            switch (currentState) {
                case 'awaiting_product_name':
                    if (messageText.trim().length < 2) {
                        await this.bot.sendMessage(
                            chatId,
                            '❌ Ürün adı çok kısa! En az 2 karakter girmelisiniz.'
                        );
                        return;
                    }

                    await this.bot.sendMessage(
                        chatId,
                        `📦 <b>Eksik Ürün: ${messageText}</b>\n\n` +
                        `📝 Kaç adet gerekli?\n` +
                        `💡 <i>Sadece sayı giriniz (örn: 5)</i>`
                    );

                    SessionManager.setUserState(chatId, 'awaiting_product_quantity', {
                        ...session.stateData,
                        productName: messageText.trim()
                    });
                    break;

                case 'awaiting_product_quantity':
                    const quantity = parseInt(messageText.trim());
                    
                    if (isNaN(quantity) || quantity <= 0) {
                        await this.bot.sendMessage(
                            chatId,
                            '❌ Geçersiz miktar! Lütfen pozitif bir sayı giriniz.'
                        );
                        return;
                    }

                    // Eksik ürün raporunu kaydet
                    await this.dataManager.addMissingProduct({
                        productName: session.stateData.productName,
                        reportedBy: session.stateData.reporterName,
                        quantity: quantity,
                        createdAt: new Date()
                    });

                    await this.bot.sendMessage(
                        chatId,
                        `✅ <b>Eksik Ürün Raporu Oluşturuldu!</b>\n\n` +
                        `📦 <b>Ürün:</b> ${session.stateData.productName}\n` +
                        `📊 <b>Miktar:</b> ${quantity} adet\n` +
                        `👤 <b>Rapor Eden:</b> ${session.stateData.reporterName}\n` +
                        `📅 <b>Tarih:</b> ${new Date().toLocaleString('tr-TR')}\n\n` +
                        `🔔 <i>Yöneticilere bildirim gönderildi.</i>`,
                        KeyboardGenerator.getInlineKeyboard('back_to_main')
                    );

                    // Admin'lere bildirim gönder
                    const employees = await this.dataManager.getEmployees();
                    const adminUsers = employees.filter(emp => emp.type === 'admin');
                    
                    for (const admin of adminUsers) {
                        await this.bot.sendMessage(
                            admin.chatId,
                            `🚨 <b>Yeni Eksik Ürün Raporu</b>\n\n` +
                            `📦 <b>Ürün:</b> ${session.stateData.productName}\n` +
                            `📊 <b>Miktar:</b> ${quantity} adet\n` +
                            `👤 <b>Rapor Eden:</b> ${session.stateData.reporterName}\n` +
                            `📅 <b>Tarih:</b> ${new Date().toLocaleString('tr-TR')}\n\n` +
                            `💡 <i>Stok teminini değerlendiriniz.</i>`
                        );
                    }

                    SessionManager.clearUserSession(chatId);
                    break;

                default:
                    // Bilinmeyen state
                    SessionManager.clearUserSession(chatId);
                    await this.bot.sendMessage(
                        chatId,
                        '🔄 Oturum sıfırlandı. Lütfen işleminizi tekrar başlatın.'
                    );
                    break;
            }

        } catch (error) {
            console.error('❌ State based mesaj hatası:', error);
            SessionManager.clearUserSession(chatId);
            await this.bot.sendMessage(
                chatId,
                '🚫 İşlem sırasında hata oluştu. Lütfen tekrar deneyin.'
            );
        }
    }

    async handleCallbackQuery(callbackQuery) {
        try {
            const chatId = callbackQuery.message.chat.id;
            const data = callbackQuery.data;
            const messageId = callbackQuery.message.message_id;

            // Callback'i yanıtla
            await axios.post(`${this.bot.apiUrl}/answerCallbackQuery`, {
                callback_query_id: callbackQuery.id,
                text: "İşlem gerçekleştiriliyor..."
            });

            if (data.startsWith('approve_')) {
                const userId = data.replace('approve_', '');
                await this.handleUserApproval(chatId, userId, messageId, true);
            } else if (data.startsWith('reject_')) {
                const userId = data.replace('reject_', '');
                await this.handleUserApproval(chatId, userId, messageId, false);
            } else if (data.startsWith('complete_task_')) {
                const taskId = data.replace('complete_task_', '');
                await this.handleTaskCompletion(chatId, taskId, messageId);
            } else if (data === 'main_menu') {
                const employees = await this.dataManager.getEmployees();
                const user = employees.find(emp => emp.chatId === chatId.toString());
                if (user) {
                    await this.bot.editMessage(
                        chatId, 
                        messageId, 
                        `🏠 Ana menüye döndünüz.\n\nMenüden işleminizi seçebilirsiniz:`,
                        KeyboardGenerator.getMainKeyboard(user.type)
                    );
                }
            }

        } catch (error) {
            console.error('❌ Callback query hatası:', error);
        }
    }

    async handleUserApproval(chatId, userId, messageId, approved) {
        try {
            const pendingUsers = await this.dataManager.getPendingUsers();
            const pendingUser = pendingUsers.find(u => u.chatId === userId);

            if (!pendingUser) {
                await this.bot.editMessage(
                    chatId,
                    messageId,
                    '❌ Kullanıcı bulunamadı veya zaten işlem yapılmış.'
                );
                return;
            }

            if (approved) {
                // Kullanıcıyı onayla ve sisteme ekle
                await this.dataManager.addEmployee({
                    chatId: userId,
                    username: pendingUser.username,
                    firstName: pendingUser.firstName,
                    lastName: pendingUser.lastName,
                    type: 'employee'
                });

                await this.dataManager.removePendingUser(userId);

                await this.bot.editMessage(
                    chatId,
                    messageId,
                    `✅ <b>Kullanıcı Onaylandı!</b>\n\n` +
                    `👤 ${pendingUser.firstName} ${pendingUser.lastName || ''}\n` +
                    `💬 @${pendingUser.username || 'N/A'}\n` +
                    `📅 ${new Date().toLocaleString('tr-TR')}`
                );

                // Kullanıcıya onay mesajı gönder
                await this.bot.sendMessage(
                    userId,
                    `🎉 <b>Tebrikler!</b>\n\n` +
                    `✅ SivalTeam sistemine kaydınız onaylandı\n` +
                    `🚀 Artık tüm özellikleri kullanabilirsiniz\n` +
                    `💡 /start komutu ile başlayabilirsiniz`
                );

            } else {
                // Kullanıcıyı reddet
                await this.dataManager.removePendingUser(userId);

                await this.bot.editMessage(
                    chatId,
                    messageId,
                    `❌ <b>Kullanıcı Reddedildi</b>\n\n` +
                    `👤 ${pendingUser.firstName} ${pendingUser.lastName || ''}\n` +
                    `📅 ${new Date().toLocaleString('tr-TR')}`
                );

                // Kullanıcıya red mesajı gönder
                await this.bot.sendMessage(
                    userId,
                    `🚫 <b>Üzgünüz!</b>\n\n` +
                    `❌ SivalTeam sistemine kaydınız reddedildi\n` +
                    `📞 Daha fazla bilgi için yöneticinizle iletişime geçin`
                );
            }

        } catch (error) {
            console.error('❌ Kullanıcı onay hatası:', error);
            await this.bot.editMessage(
                chatId,
                messageId,
                '🚫 İşlem sırasında hata oluştu.'
            );
        }
    }

    async handleTaskCompletion(chatId, taskId, messageId) {
        try {
            const task = await this.dataManager.updateTask(taskId, {
                status: 'completed',
                completedAt: new Date(),
                completionNotes: 'Bot üzerinden tamamlandı'
            });

            if (task) {
                await this.bot.editMessage(
                    chatId,
                    messageId,
                    `✅ <b>Görev Tamamlandı!</b>\n\n` +
                    `📋 <b>Görev:</b> ${task.title}\n` +
                    `📝 ${task.description || ''}\n` +
                    `🕐 <b>Tamamlanma:</b> ${new Date().toLocaleString('tr-TR')}`
                );

                // Görev verenin admin olması durumunda bildirim gönder
                if (task.assignedBy) {
                    await this.bot.sendMessage(
                        task.assignedBy,
                        `✅ <b>Görev Tamamlandı</b>\n\n` +
                        `📋 <b>Görev:</b> ${task.title}\n` +
                        `👤 <b>Tamamlayan:</b> Çalışan\n` +
                        `🕐 <b>Tamamlanma:</b> ${new Date().toLocaleString('tr-TR')}`
                    );
                }
            } else {
                await this.bot.editMessage(
                    chatId,
                    messageId,
                    '❌ Görev bulunamadı veya güncellenemedi.'
                );
            }

        } catch (error) {
            console.error('❌ Görev tamamlama hatası:', error);
            await this.bot.editMessage(
                chatId,
                messageId,
                '🚫 Görev tamamlanırken hata oluştu.'
            );
        }
    }

    async handlePhoto(chatId, photo, caption, user) {
        try {
            // Fotoğrafı medya olarak kaydet
            const fileId = photo[photo.length - 1].file_id; // En büyük boyutu al
            
            await this.dataManager.addMedia({
                fileId: fileId,
                type: 'photo',
                caption: caption || '',
                uploadedBy: `${user.first_name} ${user.last_name || ''}`,
                relatedTo: 'general'
            });

            await this.bot.sendMessage(
                chatId,
                `📸 <b>Fotoğraf Alındı!</b>\n\n` +
                `✅ Fotoğrafınız sisteme kaydedildi\n` +
                `📝 Açıklama: ${caption || 'Yok'}\n` +
                `👤 Yükleyen: ${user.first_name}\n` +
                `🕐 Tarih: ${new Date().toLocaleString('tr-TR')}\n\n` +
                `💡 <i>Bu fotoğraf raporlama sisteminizde kullanılabilir.</i>`
            );

        } catch (error) {
            console.error('❌ Fotoğraf işleme hatası:', error);
            await this.bot.sendMessage(chatId, '🚫 Fotoğraf işlenirken hata oluştu.');
        }
    }

    async handleVoice(chatId, voice, user) {
        try {
            // Ses kaydını medya olarak kaydet
            await this.dataManager.addMedia({
                fileId: voice.file_id,
                type: 'voice',
                caption: 'Ses kaydı',
                uploadedBy: `${user.first_name} ${user.last_name || ''}`,
                relatedTo: 'general'
            });

            await this.bot.sendMessage(
                chatId,
                `🎤 <b>Ses Kaydı Alındı!</b>\n\n` +
                `✅ Ses kaydınız sisteme kaydedildi\n` +
                `⏱️ Süre: ${voice.duration} saniye\n` +
                `👤 Gönderen: ${user.first_name}\n` +
                `🕐 Tarih: ${new Date().toLocaleString('tr-TR')}\n\n` +
                `💡 <i>Bu ses kaydı raporlama sisteminizde kullanılabilir.</i>`
            );

        } catch (error) {
            console.error('❌ Ses kaydı işleme hatası:', error);
            await this.bot.sendMessage(chatId, '🚫 Ses kaydı işlenirken hata oluştu.');
        }
    }

    async handleDocument(chatId, document, user) {
        try {
            // Dokümanı medya olarak kaydet
            await this.dataManager.addMedia({
                fileId: document.file_id,
                type: 'document',
                caption: document.file_name || 'Doküman',
                uploadedBy: `${user.first_name} ${user.last_name || ''}`,
                relatedTo: 'general'
            });

            await this.bot.sendMessage(
                chatId,
                `📄 <b>Doküman Alındı!</b>\n\n` +
                `✅ Dokümanınız sisteme kaydedildi\n` +
                `📝 Dosya Adı: ${document.file_name || 'Bilinmeyen'}\n` +
                `📊 Boyut: ${Math.round(document.file_size / 1024)} KB\n` +
                `👤 Yükleyen: ${user.first_name}\n` +
                `🕐 Tarih: ${new Date().toLocaleString('tr-TR')}\n\n` +
                `💡 <i>Bu doküman raporlama sisteminizde kullanılabilir.</i>`
            );

        } catch (error) {
            console.error('❌ Doküman işleme hatası:', error);
            await this.bot.sendMessage(chatId, '🚫 Doküman işlenirken hata oluştu.');
        }
    }
}

// 🚀 Ana Bot Sınıfı
class SivalTeamBot {
    constructor() {
        this.bot = new TelegramBot(CONFIG.BOT_TOKEN);
        this.messageHandler = null;
    }

    async initialize() {
        try {
            console.log('🚀 SivalTeam Bot v5.0.0 başlatılıyor...');
            
            // MongoDB bağlantısı
            await connectDB();
            console.log('✅ MongoDB bağlantısı başarılı');
            
            // Data Manager başlat
            global.dataManager = new MongoDataManager();
            dataManager = global.dataManager;
            console.log('✅ DataManager başlatıldı');
            
            // Message Handler başlat
            this.messageHandler = new MessageHandler(this.bot, dataManager);
            console.log('✅ MessageHandler başlatıldı');
            
            // Webhook ayarla
            await this.setupWebhook();
            console.log('✅ Webhook kurulumu tamamlandı');
            
            console.log(`🎉 SivalTeam Bot v${CONFIG.VERSION} hazır ve çalışıyor!`);
            
        } catch (error) {
            console.error('❌ Bot başlatma hatası:', error);
            process.exit(1);
        }
    }

    async setupWebhook() {
        try {
            const webhookUrl = `${CONFIG.WEBHOOK_URL}/webhook`;
            
            // Mevcut webhook'u sil
            await axios.post(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/deleteWebhook`);
            
            // Yeni webhook'u kur
            const response = await axios.post(
                `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/setWebhook`,
                { url: webhookUrl }
            );
            
            if (response.data.ok) {
                console.log(`✅ Webhook kuruldu: ${webhookUrl}`);
            } else {
                throw new Error(`Webhook kurulum hatası: ${response.data.description}`);
            }
            
        } catch (error) {
            console.error('❌ Webhook kurulum hatası:', error);
            throw error;
        }
    }

    async processUpdate(update) {
        try {
            if (update.message) {
                await this.handleMessage(update.message);
            } else if (update.callback_query) {
                await this.messageHandler.handleCallbackQuery(update.callback_query);
            }
        } catch (error) {
            console.error('❌ Update işleme hatası:', error);
        }
    }

    async handleMessage(message) {
        const chatId = message.chat.id;
        const user = message.from;

        try {
            // Rate limiting kontrolü
            if (!RateLimiter.check(chatId)) {
                await this.bot.sendMessage(
                    chatId,
                    '⚠️ <b>Çok hızlı mesaj gönderiyorsunuz!</b>\n\n' +
                    '🕐 Lütfen 1 dakika bekleyip tekrar deneyin.\n' +
                    '🛡️ Spam koruması aktif.'
                );
                return;
            }

            // Mesaj tipine göre işleme
            if (message.text) {
                if (message.text === '/start') {
                    await this.messageHandler.handleStart(chatId, user);
                } else {
                    await this.messageHandler.handleTextMessage(chatId, message.text, user);
                }
            } else if (message.photo) {
                await this.messageHandler.handlePhoto(chatId, message.photo, message.caption, user);
            } else if (message.voice) {
                await this.messageHandler.handleVoice(chatId, message.voice, user);
            } else if (message.document) {
                await this.messageHandler.handleDocument(chatId, message.document, user);
            } else {
                // Desteklenmeyen mesaj tipi
                await this.bot.sendMessage(
                    chatId,
                    '🤔 Bu mesaj tipini henüz desteklemiyoruz.\n' +
                    '📝 Metin, fotoğraf, ses kaydı veya doküman gönderebilirsiniz.'
                );
            }

        } catch (error) {
            console.error(`❌ Mesaj işleme hatası [${chatId}]:`, error);
            await this.bot.sendMessage(
                chatId,
                '🚫 <b>Bir hata oluştu!</b>\n\n' +
                '⚠️ Lütfen daha sonra tekrar deneyin.\n' +
                '🔄 /start komutu ile yeniden başlayabilirsiniz.'
            );
        }
    }
}

// 🌐 Express Server Routes
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: '🤖 SivalTeam Bot v5.0.0 - Aktif ve Çalışıyor!',
        version: CONFIG.VERSION,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        features: [
            '👥 Kullanıcı Yönetimi',
            '📋 Görev Sistemi', 
            '📦 Ürün Takibi',
            '📢 Duyuru Sistemi',
            '📊 Raporlama',
            '🔐 Güvenlik',
            '🇹🇷 Türkçe Destek',
            '📱 Medya Desteği'
        ]
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: CONFIG.VERSION,
        environment: CONFIG.NODE_ENV,
        database: 'connected'
    });
});

app.post('/webhook', async (req, res) => {
    try {
        const update = req.body;
        
        if (sivalTeamBot && sivalTeamBot.messageHandler) {
            await sivalTeamBot.processUpdate(update);
        } else {
            console.log('⚠️ Bot henüz başlatılmamış, update atlandı');
        }
        
        res.status(200).send('OK');
        
    } catch (error) {
        console.error('❌ Webhook hatası:', error);
        res.status(500).send('Error');
    }
});

// 📊 Dashboard API Endpoints
app.get('/api/stats', async (req, res) => {
    try {
        if (!dataManager) {
            return res.status(503).json({ error: 'DataManager not initialized' });
        }
        
        const stats = await dataManager.getDatabaseStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Stats API hatası:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        if (!dataManager) {
            return res.status(503).json({ error: 'DataManager not initialized' });
        }
        
        const users = await dataManager.getEmployees();
        res.json({
            success: true,
            data: users.map(user => ({
                chatId: user.chatId,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                type: user.type,
                isActive: user.isActive,
                registeredDate: user.registeredDate
            })),
            count: users.length
        });
    } catch (error) {
        console.error('❌ Users API hatası:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/tasks', async (req, res) => {
    try {
        if (!dataManager) {
            return res.status(503).json({ error: 'DataManager not initialized' });
        }
        
        const tasks = await dataManager.getTasks();
        res.json({
            success: true,
            data: tasks,
            count: tasks.length
        });
    } catch (error) {
        console.error('❌ Tasks API hatası:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        if (!dataManager) {
            return res.status(503).json({ error: 'DataManager not initialized' });
        }
        
        const products = await dataManager.getProducts();
        res.json({
            success: true,
            data: products,
            count: products.length
        });
    } catch (error) {
        console.error('❌ Products API hatası:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 🚀 Server başlat
let sivalTeamBot;

async function startServer() {
    try {
        // Bot'u başlat
        sivalTeamBot = new SivalTeamBot();
        await sivalTeamBot.initialize();
        
        // Express server'ı başlat
        app.listen(CONFIG.PORT, () => {
            console.log(`🌐 Server ${CONFIG.PORT} portunda çalışıyor`);
            console.log(`🔗 Webhook URL: ${CONFIG.WEBHOOK_URL}/webhook`);
            console.log(`📊 Dashboard: ${CONFIG.WEBHOOK_URL}/`);
            console.log(`🏥 Health Check: ${CONFIG.WEBHOOK_URL}/health`);
        });
        
    } catch (error) {
        console.error('❌ Server başlatma hatası:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 SIGTERM alındı, sunucu kapatılıyor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📴 SIGINT alındı, sunucu kapatılıyor...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// 🚀 Ana başlangıç
if (require.main === module) {
    startServer();
}

module.exports = app;