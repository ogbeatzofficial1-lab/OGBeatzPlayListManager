import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;
let geminiApiKey = "";
try {
  geminiApiKey = ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || "";
} catch (e) {}

if (!geminiApiKey && typeof process !== 'undefined' && process.env) {
  try {
    geminiApiKey = process.env.GEMINI_API_KEY || "";
  } catch (err) {}
}

if (geminiApiKey && geminiApiKey !== "undefined" && geminiApiKey.trim()) {
  try {
    ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } catch (err) {
    console.warn("Failed to initialize GoogleGenAI client:", err);
  }
}

export async function generateVideoAesthetic(trackInfo: any) {
  try {
    const response = await fetch("/api/generate-aesthetic", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trackInfo }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    console.warn("Server-side Gemini aesthetic generation failed, utilizing offline fallback:", err);
    return { 
      imagePrompt: `Professional record studio console close-up, steel metallic details, glowing safety orange audio meters, bokeh backlights. Vibe of ${trackInfo?.name || "Reference track"}.`,
      suggestedStyle: "Neon Chrome",
      motionDescription: "Slow tracking pan along the mixer console faders with audio reactive glow."
    };
  }
}

export async function generatePromoPack(trackInfo: any) {
  try {
    const response = await fetch("/api/generate-promo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trackInfo }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    console.warn("Server-side Gemini promo generation failed, utilizing offline fallback:", err);
    return {
      youtube: {
        title: `🎹 ${trackInfo?.name || "Special Beat"} [Reference Mix] - Prod. ${trackInfo?.artist || "OGBeatz"}`,
        description: `Reference mix for client review.\n\nTEMPO: ${trackInfo?.bpm || 120} BPM\nKEY: ${trackInfo?.key_signature || "C Major"}\n\nAll rights reserved. Secure portal link generated for active clients.`
      },
      instagram: `🔥 NEW VAULT EXCLUSIVE: "${trackInfo?.name || "Unreleased"}" represents the latest blueprint from the lab. tempo: ${trackInfo?.bpm || 120} bpm | key: ${trackInfo?.key_signature || "C Major"}. Full WAV references now sent to partners. Let's record.`,
      generic: `Ready for licensing review: "${trackInfo?.name || "New Beat"}" by ${trackInfo?.artist || "OGBeatz"}. Securely packaged. Let me know if you need the track split stems.`
    };
  }
}
