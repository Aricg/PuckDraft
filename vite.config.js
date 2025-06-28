import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import fs from 'fs';
import path from 'path';
import http from 'http'; // Import the http module

// Helper function to read request body
async function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', err => {
      reject(err);
    });
  });
}

// --- Hit Counter Variables ---
const hitsFilePath = path.resolve(__dirname, 'data/hits.json');
const postUrl = 'http://127.0.0.1:5000/data'; // Target URL for posting hit count
const postInterval = 60 * 1000; // 60 seconds
let hitCount = 0;
let postIntervalId = null;

// --- Hit Counter Functions ---
function loadHitCount() {
  try {
    if (fs.existsSync(hitsFilePath)) {
      const data = fs.readFileSync(hitsFilePath, 'utf-8');
      const jsonData = JSON.parse(data);
      hitCount = jsonData.count || 0;
      console.log(`[HitCounter] Loaded hit count: ${hitCount}`);
    } else {
      hitCount = 0;
      saveHitCount(); // Create the file with initial count 0
      console.log(`[HitCounter] Initialized hits file: ${hitsFilePath}`);
    }
  } catch (error) {
    console.error('[HitCounter] Error loading hit count:', error);
    hitCount = 0; // Reset count on error
  }
}

function saveHitCount() {
  try {
    const dataDir = path.dirname(hitsFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(hitsFilePath, JSON.stringify({ count: hitCount }, null, 2), 'utf-8');
    // console.log(`[HitCounter] Saved hit count: ${hitCount}`); // Optional: Log every save
  } catch (error) {
    console.error('[HitCounter] Error saving hit count:', error);
  }
}

function postHitCount() {
  const payload = JSON.stringify({
    sensor_name: "PuckDraftTotalHits",
    sensor_value: hitCount
  });

  const options = {
    hostname: '127.0.0.1',
    port: 5000,
    path: '/data',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = http.request(options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => {
      responseBody += chunk;
    });
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[HitCounter] Successfully posted hit count ${hitCount} to ${postUrl}. Status: ${res.statusCode}`);
      } else {
        console.error(`[HitCounter] Failed to post hit count to ${postUrl}. Status: ${res.statusCode}, Response: ${responseBody}`);
      }
    });
  });

  req.on('error', (error) => {
    console.error(`[HitCounter] Error posting hit count to ${postUrl}:`, error.message);
  });

  req.write(payload);
  req.end();
}


// --- Vite Plugins ---

// Custom Vite plugin for handling API requests
function apiPlugin() {
  const playersFilePath = path.resolve(__dirname, 'data/players.json');

  return {
    name: 'custom-api-plugin',
    configureServer(server) {
      // --- Hit Counter Setup ---
      loadHitCount(); // Load initial count

      // Middleware to increment hit count on every request
      server.middlewares.use((req, res, next) => {
        hitCount++;
        // Optional: Log every hit - can be noisy
        // console.log(`[HitCounter] Hit received. Count: ${hitCount}`);
        next(); // Pass control to the next middleware
      });

      // Start periodic posting
      if (postIntervalId) clearInterval(postIntervalId); // Clear previous interval if vite restarts
      postIntervalId = setInterval(() => {
        saveHitCount(); // Save count before posting
        postHitCount();
      }, postInterval);
      console.log(`[HitCounter] Started posting hit count every ${postInterval / 1000} seconds to ${postUrl}`);

      // --- API Endpoint Setup ---
      // Ensure the data directory exists (also ensures for hits.json)
      const dataDir = path.dirname(playersFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`Created data directory: ${dataDir}`);
      }
       // Ensure the players file exists
      if (!fs.existsSync(playersFilePath)) {
        fs.writeFileSync(playersFilePath, '[]', 'utf-8');
        console.log(`Created initial players file: ${playersFilePath}`);
      }


      server.middlewares.use('/api/players', async (req, res, next) => {
        console.log(`[API Middleware] Received ${req.method} request for ${req.url}`); // Debug log

        if (req.method === 'GET') {
          try {
            const data = fs.readFileSync(playersFilePath, 'utf-8');
            console.log('[API Middleware] Sending player data (GET)'); // Debug log
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
          } catch (error) {
            console.error('[API Middleware] Error reading players.json (GET):', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ message: 'Error reading player data' }));
          }
        } else if (req.method === 'POST') {
          try {
            const playersData = await readRequestBody(req);
            console.log('[API Middleware] Received data to save (POST):', playersData); // Debug log
            fs.writeFileSync(playersFilePath, JSON.stringify(playersData, null, 2), 'utf-8');
            console.log('[API Middleware] Players saved successfully (POST)'); // Debug log
            res.statusCode = 200;
            res.end(JSON.stringify({ message: 'Players saved successfully' }));
          } catch (error) {
            console.error('[API Middleware] Error processing request (POST):', error);
            res.statusCode = error.message === 'Invalid JSON' ? 400 : 500;
            res.end(JSON.stringify({ message: error.message || 'Error saving player data' }));
          }
        } else {
          // Method Not Allowed for other HTTP methods on this specific path
          console.log(`[API Middleware] Method ${req.method} not allowed for /api/players`); // Debug log
          res.statusCode = 405; // Method Not Allowed
          res.setHeader('Allow', 'GET, POST');
          res.end(JSON.stringify({ message: `Method ${req.method} Not Allowed` }));
          // We don't call next() here because we've handled the request (by rejecting it)
        }
      });

      // --- Server Shutdown Hook (Optional but good practice) ---
      server.httpServer?.on('close', () => {
        console.log('[HitCounter] Server closing. Saving final hit count...');
        if (postIntervalId) clearInterval(postIntervalId); // Stop posting
        saveHitCount(); // Save count one last time
      });
    }
  };
}


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    apiPlugin() // Add our custom API plugin
  ],
  server: {
    host: true // Allows access from network hosts like `fnhl.ca`
  },
});
