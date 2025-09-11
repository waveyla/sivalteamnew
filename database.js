const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sivalteam', {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const userSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true },
    username: String,
    firstName: String,
    lastName: String,
    type: { type: String, enum: ['admin', 'employee', 'regular'], default: 'regular' },
    isActive: { type: Boolean, default: true },
    registeredDate: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
    state: { type: Map, of: mongoose.Schema.Types.Mixed },
    permissions: [String],
    settings: { type: Map, of: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
    taskId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: String,
    assignedTo: String,
    assignedBy: String,
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['pending', 'active', 'completed', 'cancelled'], default: 'pending' },
    deadline: Date,
    createdAt: { type: Date, default: Date.now },
    completedAt: Date,
    completionNotes: String,
    tags: [String]
}, { timestamps: true });

const productSchema = new mongoose.Schema({
    productId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: String,
    quantity: { type: Number, default: 0 },
    minQuantity: { type: Number, default: 0 },
    price: Number,
    unit: String,
    addedBy: String,
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
    notificationId: { type: String, required: true, unique: true },
    userId: String,
    message: String,
    type: String,
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    chatId: String,
    data: { type: Map, of: mongoose.Schema.Types.Mixed },
    expiresAt: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const Product = mongoose.model('Product', productSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Session = mongoose.model('Session', sessionSchema);

module.exports = {
    connectDB,
    User,
    Task,
    Product,
    Notification,
    Session
};