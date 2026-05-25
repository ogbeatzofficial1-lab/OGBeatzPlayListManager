import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API - Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API - Analyze Track
  app.post("/api/analyze", async (req, res) => {
    const { filename } = req.body;
    if (!filename || typeof filename !== "string") {
      res.status(400).json({ error: "Filename is required" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "undefined" || !apiKey.trim()) {
      res.status(503).json({ error: "Gemini API key is not configured on the server." });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build-server',
          }
        }
      });

      const prompt = `Analyze the audio track filename "${filename}" as a music expert. Determine its likely BPM, musical key signature (standard format, e.g. "C Major", "F# Minor", "A Min"), and 3 to 4 stylistic genre and mood tags. Check if the name contains bpm clues. Alos determine if the track is likely an instrumental or has vocals, and generate 4 high-value SEO keywords.`;
      
      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an automated professional music transcription and mastering intelligence agent.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bpm: { type: Type.INTEGER, description: "BPM speed of the track, between 60 and 200" },
              key: { type: Type.STRING, description: "Key signature of the track, e.g. C Major, F# Minor, etc." },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Up to 4 stylistic or genre-related tags, e.g. Trap, Clean, Dark"
              },
              instrumental: { type: Type.BOOLEAN, description: "True if the track is likely an instrumental track, false if it contains prominent lead vocals" },
              seo_keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 to 4 SEO-friendly keywords for search discoverability, e.g. 'lofi trap beat', 'chill electronic backing track'"
              }
            },
            required: ["bpm", "key", "tags", "instrumental", "seo_keywords"]
          }
        }
      });

      const text = aiResponse.text;
      if (text) {
        try {
          const data = JSON.parse(text.trim());
          if (data && typeof data.bpm === "number" && typeof data.key === "string" && Array.isArray(data.tags)) {
            res.json({
              bpm: data.bpm,
              key: data.key,
              tags: data.tags,
              instrumental: data.instrumental ?? true,
              seo_keywords: data.seo_keywords ?? []
            });
            return;
          }
        } catch (jsonErr) {
          console.error("Failed to parse Gemini JSON output:", jsonErr);
        }
      }
      res.status(502).json({ error: "Invalid response pattern from AI assistant" });
    } catch (err: any) {
      console.error("Server-side Gemini analysis error:", err?.message || err);
      res.status(500).json({ error: "Analysis process encounters interior intelligence failure", details: err?.message });
    }
  });

  // API - Generate Aesthetic
  app.post("/api/generate-aesthetic", async (req, res) => {
    const { trackInfo } = req.body;
    if (!trackInfo) {
      res.status(400).json({ error: "trackInfo is required" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "undefined" || !apiKey.trim()) {
      res.status(503).json({ error: "Gemini API key is not configured on the server." });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build-server',
          }
        }
      });

      const prompt = `Analyze the audio metadata for this reference track:
Name: ${trackInfo.name || "Untitled"}
Artist: ${trackInfo.artist || "Unknown"}
BPM: ${trackInfo.bpm || 120}
Key: ${trackInfo.key_signature || "C Major"}
Duration: ${trackInfo.duration || 180}s
Tags: ${JSON.stringify(trackInfo.tags || [])}

Based on this, generate:
1. imagePrompt: A detailed, ready-to-use prompt for an image generator (like Imagen 3 or Midjourney) describing a visual background loop asset. It must fit our 'Industrial Cyber-Chrome & Neon Orange' style. Include material textures (brushed metal, polished chrome, glowing fiber optics), studio gear (modular synths, tape recorders, reels), and colors (charcoal black, vibrant neon safety orange, steel blue accents).
2. suggestedStyle: A short style name summarizing this track's vibe.
3. motionDescription: A brief instruction card directing real-time graphic engine camera shifts, pan movements, or element animations.`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an visual creative director and music visualizer director. You specialize in synthwave, cyberpunk, lo-fi, trap, and industrial audio visuals. Always respond with valid JSON matching the schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              imagePrompt: {
                type: Type.STRING,
                description: "High-end 8k image generator prompt fitting cyber-chrome neon orange theme."
              },
              suggestedStyle: {
                type: Type.STRING,
                description: "Compact visual style category."
              },
              motionDescription: {
                type: Type.STRING,
                description: "Directives for background camera rendering adjustments."
              }
            },
            required: ["imagePrompt", "suggestedStyle", "motionDescription"]
          }
        }
      });

      const text = aiResponse.text;
      if (text) {
        try {
          res.json(JSON.parse(text.trim()));
          return;
        } catch (jsonErr) {
          console.error("Failed to parse Gemini aesthetic JSON:", jsonErr);
        }
      }
      res.status(502).json({ error: "Invalid response pattern from AI assistant" });
    } catch (err: any) {
      console.error("Server-side Gemini aesthetic generation error:", err?.message || err);
      res.status(500).json({ error: "Aesthetic generation failure", details: err?.message });
    }
  });

  // API - Generate Promo Pack
  app.post("/api/generate-promo", async (req, res) => {
    const { trackInfo } = req.body;
    if (!trackInfo) {
      res.status(400).json({ error: "trackInfo is required" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "undefined" || !apiKey.trim()) {
      res.status(503).json({ error: "Gemini API key is not configured on the server." });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build-server',
          }
        }
      });

      const prompt = `Create marketing and promotional copy packages for an elite, high-fidelity audio release reference:
Name: ${trackInfo.name || "Untitled"}
Artist: ${trackInfo.artist || "Unknown"}
BPM: ${trackInfo.bpm || 120}
Key: ${trackInfo.key_signature || "C Major"}
Tags: ${JSON.stringify(trackInfo.tags || [])}

We need three core formats and an advanced music metadata analysis:
1. YouTube Title and professional description copy card incorporating BPM, Key, credentials, and legal licensing instructions.
2. Instagram promotional caption filled with hype emojis, hashtag blocks, and call-to-actions to access the secure artist portal.
3. A short, humble professional email/message copy meant for pitch delivery to A&Rs, managers, and recording artists.
4. An intelligent musical assessment under 'analysis' consisting of:
   - instrument_status: determine whether this track is likely an "Instrumental" or a "Vocal / Song" based on the name, artist, bpm, and tags.
   - seo_keywords: an array of 6-8 high-volume music discovery keywords (e.g. "free Drake type beat 2026", "ambient synthesizers").
   - beatstars_tags: an array of exactly 3 short, raw, genre-specific, high-value tags (e.g., "trap", "ambient", "synthwave") strictly limited to 1 word each, perfect for BeatStars catalog.
   - youtube_tags: an array of 8 to 12 long-tail search tags/keywords perfect for copying into YouTube's key search tag index (e.g. "free trap beat", "melancholic instrumental").
   - mood_tags: an array of exactly 3 emotional mood/vibe words descriptors (e.g. "Dark", "Aggressive", "Chill") perfect for BeatStars metadata.
   - mood: a descriptive word or two for the track's emotional space (e.g. Melancholic, Aggressive, Uplifting, Chill).
   - energy: estimate energy flow: "Low", "Medium", or "High".
   - target_audience: name 2 or 3 contemporary artists or platforms this fit (e.g. "Travis Scott, Lil Baby, Netflix background sync").
   - instruments: an array of 3-4 notable instruments heard or implied (e.g. "Reversed Rhodes, slide 808s, acoustic guitar, clean claps").`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a platinum-selling hip-hop, electronic, and trap music marketing copywriter. You know how to make unreleased sound references sound ultra-exclusive and premium. Return direct JSON with youtube, instagram, generic, and analysis properties as specified.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              youtube: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["title", "description"]
              },
              instagram: { type: Type.STRING },
              generic: { type: Type.STRING },
              analysis: {
                type: Type.OBJECT,
                properties: {
                  instrument_status: { type: Type.STRING },
                  seo_keywords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  beatstars_tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  youtube_tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  mood_tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  mood: { type: Type.STRING },
                  energy: { type: Type.STRING },
                  target_audience: { type: Type.STRING },
                  instruments: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["instrument_status", "seo_keywords", "beatstars_tags", "youtube_tags", "mood_tags", "mood", "energy", "target_audience", "instruments"]
              }
            },
            required: ["youtube", "instagram", "generic", "analysis"]
          }
        }
      });

      const text = aiResponse.text;
      if (text) {
        try {
          res.json(JSON.parse(text.trim()));
          return;
        } catch (jsonErr) {
          console.error("Failed to parse Gemini promo JSON:", jsonErr);
        }
      }
      res.status(502).json({ error: "Invalid response pattern from AI assistant" });
    } catch (err: any) {
      console.error("Server-side Gemini promo generation error:", err?.message || err);
      res.status(500).json({ error: "Promo generation failure", details: err?.message });
    }
  });

  // Vite middleware for development vs static asset serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server starting error:", err);
});
