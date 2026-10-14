import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import apiRouter from './src/backend/routes/index.ts';
import { dbStore } from './src/backend/db/index.ts';
import { errorHandler } from './src/backend/middleware/errorHandler.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // Dev server must run on 3000 behind Nginx (port 8080)
  const PORT = process.env.APP_PORT ? parseInt(process.env.APP_PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Parse JSON bodies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Initialize DB and Seed Data
  await dbStore.init();

  // Block any web access to database and backup files
  app.use(['/data', '/backups', '/.backup'], (_req, res) => {
    res.status(403).json({ success: false, error: 'Access forbidden' });
  });

  // Serve uploaded assets securely
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Central Error Handler for API
  app.use('/api', errorHandler);

  // Mount Vite or serve static dist in production
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [Server] Restaurant backend & client running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
