const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

// --- Configuration ---
const PORT = process.env.PORT || 5173;
const API_KEY = process.env.API_KEY; 
const UPLOAD_DIR = path.join(__dirname, 'public/uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// --- Multer Storage Setup ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Sanitize device name: allow only alphanumeric, dashes, and underscores
        let name = req.body.name || 'unknown';
        name = name.replace(/[^a-zA-Z0-9-_]/g, ''); 
        
        // Create a filename: esp32-name-timestamp.jpg
        const filename = `${name}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API Endpoint ---
app.post('/cam', upload.single('imageFile'), (req, res) => {
    // 1. Check API Key
    const key = req.body.api_key || req.query.api_key || req.headers['x-api-key'];
    
    // Check if API_KEY is set in environment, if not, reject all (or allow all if that's preferred, but better to reject)
    if (!API_KEY) {
        console.error("API_KEY not set in environment variables.");
        return res.status(500).send('Server Misconfiguration: API_KEY missing');
    }

    if (key !== API_KEY) {
        return res.status(403).send('Forbidden: Invalid API Key');
    }

    // 2. Check if file exists
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    console.log(`Received image from ${req.body.name || 'unknown device'}: ${req.file.filename}`);
    res.send('Upload successful');
});

// --- Serve Vue App (Production) ---
// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Serve the uploads directory specifically so images are accessible
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Handle client-side routing: return index.html for all other non-API routes
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Camera endpoint: http://0.0.0.0:${PORT}/cam`);
});
