#!/usr/bin/env node

const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// ASCII Logo
console.log(`
███████╗██╗██╗   ██╗ █████╗ ██╗  ████████╗███████╗ █████╗ ███╗   ███╗
██╔════╝██║██║   ██║██╔══██╗██║  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║
███████╗██║██║   ██║███████║██║     ██║   █████╗  ███████║██╔████╔██║
╚════██║██║╚██╗ ██╔╝██╔══██║██║     ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║
███████║██║ ╚████╔╝ ██║  ██║███████╗██║   ███████╗██║  ██║██║ ╚═╝ ██║
╚══════╝╚═╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝

🤖 SIVALTEAM DESKTOP APPLICATION v2.0.0
======================================
🌐 Bot Status: Running on Render.com (24/7)
🔄 Sync: Auto-sync every 30 seconds
📊 Dashboard: http://localhost:3001
`);

const app = express();
const PORT = 3001;

// Data storage
const DATA_FILE = path.join(__dirname, 'sivalteam-data.json');

// Turkish character protection
function protectTurkishChars(text) {
    if (!text || typeof text !== 'string') return text;
    
    // Koruma ve düzeltme map'i
    const charMap = {
        'Ã¼': 'ü', 'Ã¼': 'ü', 'ÃŸ': 'ş', 'Ã§': 'ç', 'Ä±': 'ı', 'Ã¶': 'ö', 'Ä°': 'İ', 
        'ãŸ': 'ş', 'ã§': 'ç', 'ã¶': 'ö', 'ä±': 'ı', 'Ç': 'Ç', 'Ü': 'Ü', 'Ö': 'Ö', 
        'Ş': 'Ş', 'Ğ': 'Ğ', 'I': 'İ', 'ç': 'ç', 'ü': 'ü', 'ö': 'ö', 'ş': 'ş', 'ğ': 'ğ', 'ı': 'ı',
        // Bozuk karakterleri temizle
        ' Â ': ' ', 'Â': '', '\u00A0': ' ',
        // Yaygın bozulmalar
        'Ã': '', 'â€™': "'", 'â€œ': '"', 'â€': '"', 
        '    ': '', '   ': '', '  ': ' '
    };
    
    let result = text;
    Object.keys(charMap).forEach(broken => {
        result = result.replace(new RegExp(broken, 'g'), charMap[broken]);
    });
    
    // Başında ve sonunda boşluk temizle
    return result.trim();
}

// Initialize data file
function initializeData() {
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = {
            employees: [],
            products: [],
            activities: [],
            settings: {
                renderUrl: 'https://sivalteam-bot.onrender.com',
                botToken: '8229159175:AAGRFoLpK9ma5ekPiaaCdI8EKJeca14XoOg',
                lastSync: null
            }
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
        console.log('✅ Data file initialized');
    }
}

// Read data
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data:', error);
        return { employees: [], products: [], activities: [], settings: {} };
    }
}

// Save data
function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log('💾 Data saved');
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Serve main page
app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'ultra-clean-bot.html');
    if (fs.existsSync(htmlPath)) {
        let html = fs.readFileSync(htmlPath, 'utf8');
        
        // Inject data persistence
        const dataScript = `
        <script>
        // Data persistence
        const APP_DATA_API = 'http://localhost:3001/api';
        
        // Override saveData to persist to file
        const originalSaveData = window.saveData || function(){};
        window.saveData = function() {
            fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appState.data)
            }).catch(console.error);
        };
        
        // Load data on startup
        fetch('/api/data')
            .then(r => r.json())
            .then(data => {
                Object.assign(appState.data, data);
                updateStats();
                updateEmployeeList();
                updateProductList();
                updateActivityLog();
                console.log('📊 Data loaded from file');
            })
            .catch(console.error);
        </script>
        `;
        
        html = html.replace('</body>', dataScript + '</body>');
        res.send(html);
    } else {
        res.send('<h1>❌ ultra-clean-bot.html not found</h1>');
    }
});

// API Routes
app.get('/api/data', (req, res) => {
    const data = readData();
    res.json(data);
});

app.post('/api/data', (req, res) => {
    const currentData = readData();
    
    // Türkçe karakterleri koru
    const protectedData = JSON.parse(JSON.stringify(req.body));
    if (protectedData.employees) {
        protectedData.employees = protectedData.employees.map(emp => ({
            ...emp,
            name: protectTurkishChars(emp.name),
            department: protectTurkishChars(emp.department)
        }));
    }
    if (protectedData.products) {
        protectedData.products = protectedData.products.map(prod => ({
            ...prod,
            category: protectTurkishChars(prod.category),
            product: protectTurkishChars(prod.product),
            reportedBy: protectTurkishChars(prod.reportedBy)
        }));
    }
    if (protectedData.activities) {
        protectedData.activities = protectedData.activities.map(act => ({
            ...act,
            message: protectTurkishChars(act.message)
        }));
    }
    if (protectedData.tasks) {
        protectedData.tasks = protectedData.tasks.map(task => ({
            ...task,
            title: protectTurkishChars(task.title),
            description: protectTurkishChars(task.description),
            assignedToName: protectTurkishChars(task.assignedToName)
        }));
    }
    
    const newData = { ...currentData, ...protectedData, settings: currentData.settings };
    saveData(newData);
    res.json({ success: true });
});

// Auto-sync with Render
async function syncWithRender() {
    try {
        const data = readData();
        const renderUrl = data.settings.renderUrl;
        
        if (!renderUrl) return;
        
        // Sync employees
        const employeesRes = await fetch(`${renderUrl}/api/employees`);
        if (employeesRes.ok) {
            const employees = await employeesRes.json();
            data.employees = employees;
        }
        
        // Sync products
        const productsRes = await fetch(`${renderUrl}/api/missing-products`);
        if (productsRes.ok) {
            const products = await productsRes.json();
            data.products = products;
        }
        
        // Sync activity
        const activityRes = await fetch(`${renderUrl}/api/activity-log`);
        if (activityRes.ok) {
            const activity = await activityRes.json();
            data.activities = activity.slice(-50);
        }
        
        data.settings.lastSync = new Date().toISOString();
        saveData(data);
        console.log(`🔄 Synced with Render at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
        console.error('❌ Sync failed:', error.message);
    }
}

// Initialize
initializeData();

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`🔄 Starting auto-sync...`);
    
    // Auto-sync every 30 seconds
    setInterval(syncWithRender, 30000);
    
    // Initial sync after 3 seconds
    setTimeout(syncWithRender, 3000);
    
    // Open browser
    setTimeout(() => {
        console.log(`🌐 Opening dashboard...`);
        exec(`start http://localhost:${PORT}`, (error) => {
            if (error) {
                console.log(`📋 Manual: Open http://localhost:${PORT} in browser`);
            }
        });
    }, 2000);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏹️  SivalTeam Desktop shutting down...');
    process.exit(0);
});