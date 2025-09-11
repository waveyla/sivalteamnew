const { User, Task, Product, Notification, Session, MissingProduct, Announcement, Media } = require('./database');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class MongoDataManager {
    constructor() {
        this.models = {
            users: User,
            tasks: Task,
            products: Product,
            notifications: Notification,
            sessions: Session,
            missingProducts: MissingProduct,
            announcements: Announcement,
            media: Media
        };
        this.initializeCleanupIndexes();
    }

    async initializeCleanupIndexes() {
        try {
            // MongoDB TTL index'leri otomatik temizlik için
            await Notification.collection.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 7776000 });
            await MissingProduct.collection.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 7776000 });
            await Announcement.collection.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 7776000 });
            await Media.collection.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 7776000 });
            console.log('✅ TTL indexes created for automatic cleanup after 90 days');
        } catch (error) {
            console.log('⚠️ TTL indexes might already exist:', error.message);
        }
    }

    async getEmployees() {
        try {
            const employees = await User.find({ type: 'employee' }).lean();
            return employees || [];
        } catch (error) {
            console.error('Error getting employees:', error);
            return [];
        }
    }

    async addEmployee(employeeData) {
        try {
            const employee = new User({
                chatId: String(employeeData.chatId),
                username: employeeData.username,
                firstName: employeeData.firstName,
                lastName: employeeData.lastName,
                type: 'employee',
                isActive: true,
                registeredDate: new Date()
            });
            await employee.save();
            return employee;
        } catch (error) {
            console.error('Error adding employee:', error);
            throw error;
        }
    }

    async deleteEmployee(chatId) {
        try {
            await User.deleteOne({ chatId: String(chatId), type: 'employee' });
            return true;
        } catch (error) {
            console.error('Error deleting employee:', error);
            return false;
        }
    }

    async getTasks() {
        try {
            const tasks = await Task.find().lean();
            return tasks || [];
        } catch (error) {
            console.error('Error getting tasks:', error);
            return [];
        }
    }

    async addTask(taskData) {
        try {
            const task = new Task({
                taskId: taskData.taskId || crypto.randomBytes(16).toString('hex'),
                title: taskData.title,
                description: taskData.description,
                assignedTo: taskData.assignedTo,
                assignedBy: taskData.assignedBy,
                priority: taskData.priority || 'medium',
                status: 'pending',
                type: taskData.type || 'individual',
                deadline: taskData.deadline,
                tags: taskData.tags || []
            });
            await task.save();
            return task;
        } catch (error) {
            console.error('Error adding task:', error);
            throw error;
        }
    }

    async updateTask(taskId, updates) {
        try {
            const task = await Task.findOneAndUpdate(
                { taskId },
                updates,
                { new: true }
            );
            return task;
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    async getProducts() {
        try {
            const products = await Product.find().lean();
            return products || [];
        } catch (error) {
            console.error('Error getting products:', error);
            return [];
        }
    }

    async addProduct(productData) {
        try {
            const product = new Product({
                productId: productData.productId || crypto.randomBytes(16).toString('hex'),
                name: productData.name,
                category: productData.category,
                quantity: productData.quantity || 0,
                minQuantity: productData.minQuantity || 0,
                price: productData.price,
                unit: productData.unit,
                addedBy: productData.addedBy
            });
            await product.save();
            return product;
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    }

    async updateProduct(productId, updates) {
        try {
            const product = await Product.findOneAndUpdate(
                { productId },
                { ...updates, lastUpdated: new Date() },
                { new: true }
            );
            return product;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    async getUserState(chatId) {
        try {
            const user = await User.findOne({ chatId: String(chatId) });
            if (user && user.state) {
                return Object.fromEntries(user.state);
            }
            return {};
        } catch (error) {
            console.error('Error getting user state:', error);
            return {};
        }
    }

    async setUserState(chatId, state) {
        try {
            await User.findOneAndUpdate(
                { chatId: String(chatId) },
                { 
                    $set: { 
                        state: state,
                        lastActive: new Date()
                    }
                },
                { upsert: true }
            );
            return true;
        } catch (error) {
            console.error('Error setting user state:', error);
            return false;
        }
    }

    async clearUserState(chatId) {
        try {
            await User.findOneAndUpdate(
                { chatId: String(chatId) },
                { $unset: { state: 1 } }
            );
            return true;
        } catch (error) {
            console.error('Error clearing user state:', error);
            return false;
        }
    }

    async addNotification(notificationData) {
        try {
            const notification = new Notification({
                notificationId: notificationData.notificationId || crypto.randomBytes(16).toString('hex'),
                userId: notificationData.userId,
                message: notificationData.message,
                type: notificationData.type,
                isRead: false
            });
            await notification.save();
            return notification;
        } catch (error) {
            console.error('Error adding notification:', error);
            throw error;
        }
    }

    async getNotifications(userId) {
        try {
            const notifications = await Notification.find({ 
                userId: String(userId),
                isRead: false 
            }).sort({ createdAt: -1 }).lean();
            return notifications || [];
        } catch (error) {
            console.error('Error getting notifications:', error);
            return [];
        }
    }

    async markNotificationRead(notificationId) {
        try {
            await Notification.findOneAndUpdate(
                { notificationId },
                { isRead: true }
            );
            return true;
        } catch (error) {
            console.error('Error marking notification read:', error);
            return false;
        }
    }

    async createSession(chatId, sessionData) {
        try {
            const session = new Session({
                sessionId: crypto.randomBytes(16).toString('hex'),
                chatId: String(chatId),
                data: sessionData,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            });
            await session.save();
            return session.sessionId;
        } catch (error) {
            console.error('Error creating session:', error);
            throw error;
        }
    }

    async getSession(sessionId) {
        try {
            const session = await Session.findOne({ sessionId });
            if (session && session.expiresAt > new Date()) {
                return Object.fromEntries(session.data);
            }
            return null;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }

    async exportToJSON() {
        try {
            const data = {
                users: await User.find().lean(),
                tasks: await Task.find().lean(),
                products: await Product.find().lean(),
                notifications: await Notification.find().lean(),
                exportDate: new Date().toISOString()
            };
            
            const filename = `backup_${Date.now()}.json`;
            const filepath = path.join('backups', filename);
            
            await fs.writeFile(filepath, JSON.stringify(data, null, 2));
            console.log(`✅ Data exported to ${filepath}`);
            return filepath;
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    async importFromJSON(filepath) {
        try {
            const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
            
            if (data.users) {
                await User.deleteMany({});
                await User.insertMany(data.users);
            }
            
            if (data.tasks) {
                await Task.deleteMany({});
                await Task.insertMany(data.tasks);
            }
            
            if (data.products) {
                await Product.deleteMany({});
                await Product.insertMany(data.products);
            }
            
            console.log('✅ Data imported successfully');
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            throw error;
        }
    }

    // Eksik Ürün Metodları
    async addMissingProduct(productData) {
        try {
            const missingProduct = new MissingProduct({
                productId: productData.productId,
                productName: productData.productName,
                reportedBy: productData.reportedBy,
                quantity: productData.quantity
            });
            await missingProduct.save();
            return missingProduct;
        } catch (error) {
            console.error('Error adding missing product:', error);
            throw error;
        }
    }

    async getMissingProducts() {
        try {
            const products = await MissingProduct.find().sort({ createdAt: -1 }).lean();
            return products || [];
        } catch (error) {
            console.error('Error getting missing products:', error);
            return [];
        }
    }

    // Duyuru Metodları
    async addAnnouncement(announcementData) {
        try {
            const announcement = new Announcement({
                announcementId: announcementData.announcementId || crypto.randomBytes(16).toString('hex'),
                title: announcementData.title,
                content: announcementData.content,
                createdBy: announcementData.createdBy,
                targetAudience: announcementData.targetAudience || ['all']
            });
            await announcement.save();
            return announcement;
        } catch (error) {
            console.error('Error adding announcement:', error);
            throw error;
        }
    }

    async getAnnouncements() {
        try {
            const announcements = await Announcement.find().sort({ createdAt: -1 }).lean();
            return announcements || [];
        } catch (error) {
            console.error('Error getting announcements:', error);
            return [];
        }
    }

    // Medya Metodları
    async addMedia(mediaData) {
        try {
            const media = new Media({
                mediaId: mediaData.mediaId || crypto.randomBytes(16).toString('hex'),
                fileId: mediaData.fileId,
                type: mediaData.type,
                caption: mediaData.caption,
                uploadedBy: mediaData.uploadedBy,
                relatedTo: mediaData.relatedTo
            });
            await media.save();
            return media;
        } catch (error) {
            console.error('Error adding media:', error);
            throw error;
        }
    }

    async getMedia(relatedTo) {
        try {
            const media = await Media.find({ relatedTo }).sort({ createdAt: -1 }).lean();
            return media || [];
        } catch (error) {
            console.error('Error getting media:', error);
            return [];
        }
    }

    // Veritabanı İstatistikleri
    async getDatabaseStats() {
        try {
            const stats = {
                users: await User.countDocuments(),
                employees: await User.countDocuments({ type: 'employee' }),
                tasks: await Task.countDocuments(),
                products: await Product.countDocuments(),
                notifications: await Notification.countDocuments(),
                missingProducts: await MissingProduct.countDocuments(),
                announcements: await Announcement.countDocuments(),
                media: await Media.countDocuments(),
                totalSize: await this.getCollectionsSizeInMB()
            };
            return stats;
        } catch (error) {
            console.error('Error getting database stats:', error);
            return {};
        }
    }

    async getCollectionsSizeInMB() {
        try {
            // Bu metod yaklaşık bir tahmin verir
            const collections = ['users', 'tasks', 'products', 'notifications', 'missingproducts', 'announcements', 'media'];
            let totalSize = 0;
            
            for (const coll of collections) {
                try {
                    const stats = await this.models[coll]?.collection.stats();
                    if (stats) {
                        totalSize += stats.size;
                    }
                } catch (e) {
                    // Collection henüz oluşmamış olabilir
                }
            }
            
            return (totalSize / (1024 * 1024)).toFixed(2); // MB cinsinden
        } catch (error) {
            return 0;
        }
    }
}

module.exports = MongoDataManager;