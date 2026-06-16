import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';

const app = express();
const PORT = process.env.PORT || 3001;
const streamPipeline = promisify(pipeline);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'ghostcut.p.rapidapi.com';
const TMP_DIR = '/tmp';

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

console.log('[GhostCut Proxy] Starting...');
console.log('[GhostCut Proxy] RAPIDAPI_KEY:', RAPIDAPI_KEY? 'SET' : 'MISSING');

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'GhostCut Proxy Running', provider: 'RapidAPI', timestamp: new Date().toISOString() });
});

// Submit task to GhostCut
app.post('/api/ghostcut/submit-task', async (req, res) => {
  try {
    const { videoUrl, regions, watermarkType } = req.body;

    console.log('[GhostCut Proxy] Submit request received');
    console.log('[GhostCut Proxy] Video URL:', videoUrl?.substring(0, 80) + '...');
    console.log('[GhostCut Proxy] Regions:', regions);

    if (!RAPIDAPI_KEY) {
      return res.status(500).json({ error: 'RAPIDAPI_KEY not configured' });
    }

    if (!videoUrl) {
      return res.status(400).json({ error: 'videoUrl required' });
    }

    const formData = new FormData();
    formData.append('video_url', videoUrl);
    formData.append('mode', 'remove_watermark');

    // CRITICAL: RapidAPI expects string 'inpaint' for clean removal, not '2'
    formData.append('watermark_type', 'inpaint');
    formData.append('inpainting', 'true');
    formData.append('output_format', 'mp4');

    // Add regions if provided (x,y,w,h format)
    if (regions && Array.isArray(regions) && regions.length > 0) {
      formData.append('regions', JSON.stringify(regions));
      console.log('[GhostCut Proxy] Using custom regions');
    }

    console.log('[GhostCut Proxy] Calling RapidAPI...');

    const response = await fetch(`https://${RAPIDAPI_HOST}/api/v1/tasks`, {
      method: 'POST',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
       ...formData.getHeaders(),
      },
      body: formData,
      timeout: 30000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GhostCut Proxy] RapidAPI error:', response.status, errorText);
      return res.status(response.status).json({ error: 'RapidAPI error', details: errorText });
    }

    const data = await response.json();
    console.log('[GhostCut Proxy] Task submitted successfully:', data.task_id || data.id);

    res.json({
      task_id: data.task_id || data.id,
      status: data.status || 'processing',
     ...data
    });

  } catch (error) {
    console.error('[GhostCut Proxy] Submit error:', error.message);
    res.status(500).json({ error: 'Submit failed', message: error.message });
  }
});

// Check task status and download result
app.get('/api/ghostcut/check-task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    console.log('[GhostCut Proxy] Checking task:', taskId);

    if (!RAPIDAPI_KEY) {
      return res.status(500).json({ error: 'RAPIDAPI_KEY not configured' });
    }

    const response = await fetch(`https://${RAPIDAPI_HOST}/api/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      timeout: 15000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GhostCut Proxy] Check error:', response.status, errorText);
      return res.status(response.status).json({ error: 'Check failed', details: errorText });
    }

    const data = await response.json();
    console.log('[GhostCut Proxy] Task status:', data.status);

    // If completed, download the video to /tmp
    if (data.status === 'completed' && data.result_url) {
      const filename = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
      const filePath = path.join(TMP_DIR, filename);

      console.log('[GhostCut Proxy] Downloading result to:', filename);

      try {
        const videoResponse = await fetch(data.result_url);
        if (!videoResponse.ok) throw new Error(`Download failed: ${videoResponse.status}`);

        await streamPipeline(videoResponse.body, fs.createWriteStream(filePath));

        console.log('[GhostCut Proxy] Download complete:', filename);

        // Return local URL instead of external URL
        data.local_url = `/api/temp-video/${filename}`;
        data.result_url = `${req.protocol}://${req.get('host')}/api/temp-video/${filename}`;

      } catch (downloadError) {
        console.error('[GhostCut Proxy] Download error:', downloadError.message);
        // Still return original URL if download fails
      }
    }

    res.json(data);

  } catch (error) {
    console.error('[GhostCut Proxy] Check error:', error.message);
    res.status(500).json({ error: 'Check failed', message: error.message });
  }
});

// Serve temp videos with proper headers for streaming
app.get('/api/temp-video/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(TMP_DIR, filename);

  console.log('[GhostCut Proxy] Serving temp video:', filename);

  if (!fs.existsSync(filePath)) {
    console.error('[GhostCut Proxy] File not found:', filePath);
    return res.status(404).send('Video not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Handle range requests for video streaming (206 Partial Content)
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1]? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;

    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'public, max-age=3600',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    };

    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Cleanup old temp files (runs every hour)
setInterval(() => {
  try {
    const files = fs.readdirSync(TMP_DIR);
    const now = Date.now();
    let cleaned = 0;

    files.forEach(file => {
      if (file.startsWith('temp_')) {
        const filePath = path.join(TMP_DIR, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        // Delete files older than 2 hours
        if (age > 2 * 60 * 60 * 1000) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }
    });

    if (cleaned > 0) {
      console.log(`[GhostCut Proxy] Cleaned ${cleaned} old temp files`);
    }
  } catch (error) {
    console.error('[GhostCut Proxy] Cleanup error:', error);
  }
}, 60 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GhostCut Proxy] Server running on port ${PORT}`);
  console.log(`[GhostCut Proxy] Temp directory: ${TMP_DIR}`);
  console.log(`[GhostCut Proxy] Ready for RapidAPI requests`);
});
