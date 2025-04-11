import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import fs from 'fs';
import path from 'path';

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

// Custom Vite plugin for handling API requests
function apiPlugin() {
  const playersFilePath = path.resolve(__dirname, 'data/players.json');

  return {
    name: 'custom-api-plugin',
    configureServer(server) {
      // Ensure the data directory exists
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
    }
  };
}


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    apiPlugin() // Add our custom API plugin
  ],
  // server object can be removed if only used for configureServer previously
});
