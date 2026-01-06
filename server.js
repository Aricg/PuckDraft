const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http'); // For the hit counter
const app = express();

// --- Configuration ---
const PORT = process.env.PORT || 5173;
const API_KEY = process.env.API_KEY; 
const UPLOAD_DIR = path.join(__dirname, 'public/uploads');
const DATA_DIR = path.join(__dirname, 'data');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure players.json exists
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
if (!fs.existsSync(PLAYERS_FILE)) {
    fs.writeFileSync(PLAYERS_FILE, '[]', 'utf-8');
}

// Ensure gamestatus.json exists
const GAME_STATUS_FILE = path.join(DATA_DIR, 'gamestatus.json');
if (!fs.existsSync(GAME_STATUS_FILE)) {
    fs.writeFileSync(GAME_STATUS_FILE, JSON.stringify({ cancelledFor: null, bbqOn: false, message: '', teamsLocked: false }), 'utf-8');
}

// --- Hit Counter Logic (Ported from vite.config.js) ---
const HITS_FILE = path.join(DATA_DIR, 'hits.json');
const HIT_POST_URL = 'http://127.0.0.1:5000/data';
let hitCount = 0;

try {
    if (fs.existsSync(HITS_FILE)) {
        hitCount = JSON.parse(fs.readFileSync(HITS_FILE, 'utf-8')).count || 0;
    } else {
        fs.writeFileSync(HITS_FILE, JSON.stringify({ count: 0 }), 'utf-8');
    }
} catch (e) {
    console.error('Error loading hit count:', e);
}

function saveHitCount() {
    try {
        fs.writeFileSync(HITS_FILE, JSON.stringify({ count: hitCount }, null, 2), 'utf-8');
    } catch (e) { console.error('Error saving hits:', e); }
}

function postHitCount() {
    const payload = JSON.stringify({ sensor_name: "PuckDraftTotalHits", sensor_value: hitCount });
    const req = http.request({
        hostname: '127.0.0.1', port: 5000, path: '/data', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    });
    req.on('error', (e) => console.error('Hit post error:', e.message));
    req.write(payload);
    req.end();
}

// Save hits every 60s
setInterval(() => {
    saveHitCount();
}, 60000);

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Hit Counter Middleware
app.use((req, res, next) => {
    hitCount++;
    next();
});

// --- Auth Middleware (Smell First) ---
const requireApiKey = (req, res, next) => {
    // Check Query or Headers (Available before body parsing)
    const key = req.query.api_key || req.headers['x-api-key'];
    
    if (!API_KEY) {
        return res.status(500).send('Server Misconfiguration: API_KEY missing');
    }

    if (key === API_KEY) {
        return next(); // Key is good, proceed to upload
    }

    return res.status(403).send('Forbidden: Invalid API Key. Send in URL (?api_key=...) or Header (x-api-key).');
};

// --- Camera Upload Endpoint ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Get device name from body (sanitize it)
        let name = req.body.name || 'unknown';
        name = name.replace(/[^a-zA-Z0-9-_]/g, ''); 
        
        // Get current date for folder structure (YYYY-MM-DD)
        const date = new Date().toISOString().split('T')[0];
        
        // Create directory: public/uploads/{name}/{date}
        const deviceDir = path.join(UPLOAD_DIR, name, date);

        if (!fs.existsSync(deviceDir)) {
            fs.mkdirSync(deviceDir, { recursive: true });
        }
        
        cb(null, deviceDir);
    },
    filename: (req, file, cb) => {
        // Filename is just the timestamp
        const filename = `${Date.now()}${path.extname(file.originalname)}`;
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Protect route with requireApiKey BEFORE upload.single
app.post('/cam', requireApiKey, upload.single('imageFile'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    
    console.log(`Received image from ${req.body.name || 'unknown'}: ${req.file.filename}`);
    res.send('Upload successful');
});

// 5. Camera Images API
app.get('/api/cam/images', (req, res) => {
    try {
        if (!fs.existsSync(UPLOAD_DIR)) {
            return res.json({});
        }

        const devices = fs.readdirSync(UPLOAD_DIR).filter(f => fs.statSync(path.join(UPLOAD_DIR, f)).isDirectory());
        const result = {};

        devices.forEach(device => {
            result[device] = {};
            const devicePath = path.join(UPLOAD_DIR, device);
            const dates = fs.readdirSync(devicePath).filter(f => fs.statSync(path.join(devicePath, f)).isDirectory());

            dates.forEach(date => {
                result[device][date] = [];
                const datePath = path.join(devicePath, date);
                const files = fs.readdirSync(datePath);

                files.forEach(file => {
                    if (file.match(/\.(jpg|jpeg|png|gif)$/i)) {
                        // timestamp is the filename without extension
                        const timestamp = parseInt(file.split('.')[0]);
                        if (!isNaN(timestamp)) {
                            result[device][date].push({
                                url: `/uploads/${device}/${date}/${file}`,
                                timestamp: timestamp,
                                filename: file
                            });
                        }
                    }
                });
                
                // Sort by timestamp
                result[device][date].sort((a, b) => a.timestamp - b.timestamp);
            });
        });

        res.json(result);
    } catch (e) {
        console.error("Error listing images:", e);
        res.status(500).json({ message: 'Error listing images' });
    }
});

// --- API Endpoints (Ported from vite.config.js) ---

// 1. Players API
app.get('/api/players', (req, res) => {
    try {
        const data = fs.readFileSync(PLAYERS_FILE, 'utf-8');
        res.header('Content-Type', 'application/json').send(data);
    } catch (e) {
        res.status(500).json({ message: 'Error reading player data' });
    }
});

app.post('/api/players', (req, res) => {
    try {
        fs.writeFileSync(PLAYERS_FILE, JSON.stringify(req.body, null, 2), 'utf-8');
        res.json({ message: 'Players saved successfully' });
    } catch (e) {
        res.status(500).json({ message: 'Error saving player data' });
    }
});

// 2. Game Status API
app.get('/api/gamestatus', (req, res) => {
    try {
        const data = fs.readFileSync(GAME_STATUS_FILE, 'utf-8');
        res.header('Content-Type', 'application/json').send(data);
    } catch (e) {
        res.status(500).json({ message: 'Error reading game status' });
    }
});

app.post('/api/gamestatus', (req, res) => {
    try {
        fs.writeFileSync(GAME_STATUS_FILE, JSON.stringify(req.body, null, 2), 'utf-8');
        res.json({ message: 'Game status saved' });
    } catch (e) {
        res.status(500).json({ message: 'Error saving game status' });
    }
});

// 3. Previous Games API
app.get('/api/previous-games', (req, res) => {
    try {
        const files = fs.readdirSync(DATA_DIR);
        const teamFiles = files.filter(file => /^\d+\.teams\.json$/.test(file));
        res.json(teamFiles);
    } catch (e) {
        res.status(500).json({ message: 'Error reading game files' });
    }
});

// 4. Teams API
app.get('/api/teams', (req, res) => {
    const filename = req.query.filename;
    if (!filename) return res.status(400).json({ message: 'Missing filename' });
    
    const filePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
        res.header('Content-Type', 'application/json').send(fs.readFileSync(filePath, 'utf-8'));
    } else {
        res.status(404).json({ message: 'Teams file not found' });
    }
});

app.post('/api/teams', (req, res) => {
    const { filename, teams, score, vote } = req.body;
    if (!filename) return res.status(400).json({ message: 'Missing filename' });
    
    const filePath = path.join(DATA_DIR, filename);
    
    try {
        if (teams) {
            fs.writeFileSync(filePath, JSON.stringify(teams, null, 2), 'utf-8');
            res.json({ message: 'Teams saved successfully' });
        } else if (score || vote) {
            if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Game file not found' });
            
            const gameData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            
            if (score) {
                gameData.scoreLight = typeof score.light === 'number' ? score.light : gameData.scoreLight;
                gameData.scoreDark = typeof score.dark === 'number' ? score.dark : gameData.scoreDark;
                fs.writeFileSync(filePath, JSON.stringify(gameData, null, 2), 'utf-8');
                res.json({ message: 'Score saved' });
            } else if (vote) {
                if (vote === 'Light') gameData.votesLight = (gameData.votesLight || 0) + 1;
                else if (vote === 'Dark') gameData.votesDark = (gameData.votesDark || 0) + 1;
                fs.writeFileSync(filePath, JSON.stringify(gameData, null, 2), 'utf-8');
                res.json({ message: 'Vote saved', votesLight: gameData.votesLight, votesDark: gameData.votesDark });
            }
        } else {
            res.status(400).json({ message: 'Invalid request body' });
        }
    } catch (e) {
        res.status(500).json({ message: 'Error processing request' });
    }
});

// --- Serve Vue App (Production) ---
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Handle client-side routing
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});