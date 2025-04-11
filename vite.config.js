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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // Add middleware for API endpoints
    configureServer(server) {
      const playersFilePath = path.resolve(__dirname, 'data/players.json');

      // Middleware for /api/players
      server.middlewares.use('/api/players', async (req, res, next) => {
        if (req.method === 'GET') {
          try {
            if (fs.existsSync(playersFilePath)) {
              const data = fs.readFileSync(playersFilePath, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
            } else {
              // If file doesn't exist, return empty array
              res.setHeader('Content-Type', 'application/json');
              res.end('[]');
            }
          } catch (error) {
            console.error('Error reading players.json:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ message: 'Error reading player data' }));
          }
        } else if (req.method === 'POST') {
          try {
            const playersData = await readRequestBody(req);
            fs.writeFileSync(playersFilePath, JSON.stringify(playersData, null, 2), 'utf-8');
            res.statusCode = 200;
            res.end(JSON.stringify({ message: 'Players saved successfully' }));
          } catch (error) {
            console.error('Error writing players.json:', error);
            res.statusCode = error.message === 'Invalid JSON' ? 400 : 500;
            res.end(JSON.stringify({ message: error.message || 'Error saving player data' }));
          }
        } else {
          // Pass request to next middleware if not GET or POST
          next();
        }
      });
    }
  }
});
