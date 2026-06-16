import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = 'ghostcut-video-watermark-remover.p.rapidapi.com';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// === 1. SERVE REACT BUILD ===
const DIST_DIR = path.join(__dirname, 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  console.log('Serving React from /dist');
}

// === 2. HEALTH CHECK ===
app.get('/api/health', (req, res) => {
  res.json({
    status: 'GhostCut Proxy Running',
    provider: 'RapidAPI',
    timestamp: new Date().toISOString(),
    hasKey: !!RAPIDAPI_KEY
  });
});

// === 3. GHOSTCUT API ROUTES ===

// Submit watermark removal task
app.post('/api/ghostcut/submit-task', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl required' });
    
    if (!RAPIDAPI_KEY) return res.status(500).json({ error: 'RAPIDAPI_KEY not set' });

    const form = new FormData();
    form.append('video_url', videoUrl);

    const response = await fetch(`https://${RAPIDAPI_HOST}/submit-task`, {
      method: 'POST',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
        ...form.getHeaders()
      },
      body: form
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Failed to submit task' });
  }
});

// Check task status
app.get('/api/ghostcut/task-status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!RAPIDAPI_KEY) return res.status(500).json({ error: 'RAPIDAPI_KEY not set' });

    const response = await fetch(`https://${RAPIDAPI_HOST}/task-status/${taskId}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      }
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Status error:', err);
    res.status(500).json({ error: 'Failed to get task status' });
  }
});

// Download processed video
app.get('/api/ghostcut/download/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!RAPIDAPI_KEY) return res.status(500).json({ error: 'RAPIDAPI_KEY not set' });

    const response = await fetch(`https://${RAPIDAPI_HOST}/download/${taskId}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      }
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).send(err);
    }

    res.setHeader('Content-Type', 'video/mp4');
    response.body.pipe(res);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Failed to download video' });
  }
});

// === 4. CATCH-ALL FOR REACT ROUTER ===
// Must be last. Sends index.html for any route not matched above
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'React build not found. Run npm run build' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});