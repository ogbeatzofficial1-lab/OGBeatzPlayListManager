import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;
let geminiApiKey = "";

export function getGeminiClient(): GoogleGenAI | null {
  if (ai) return ai;
  let key = "";
  try {
    key = ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || "";
  } catch (e) {}

  if (!key && typeof process !== 'undefined' && process.env) {
    try {
      key = process.env.GEMINI_API_KEY || "";
    } catch (err) {}
  }

  if (key && key !== "undefined" && key.trim()) {
    try {
      ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      return ai;
    } catch (err) {
      console.warn("Failed to initialize GoogleGenAI client:", err);
    }
  }
  return null;
}

export async function generateVideoAesthetic(trackInfo: any) {
  const client = getGeminiClient();
  if (!client) {
    console.warn("Gemini client is not initialized. Using offline visual fallback.");
    return {
      imagePrompt: `Professional record studio console close-up, steel metallic details, glowing safety orange audio meters, bokeh backlights. Vibe of ${trackInfo?.name || "Reference track"}.`,
      suggestedStyle: "Neon Chrome",
      motionDescription: "Slow tracking pan along the mixer console faders with audio reactive glow."
    };
  }

  try {
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

    const aiResponse = await client.models.generateContent({
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

    if (aiResponse.text) {
      return JSON.parse(aiResponse.text.trim());
    }
    throw new Error("Empty response from Gemini");
  } catch (err) {
    console.warn("Client-side Gemini aesthetic generation failed, utilizing offline fallback:", err);
    return { 
      imagePrompt: `Professional record studio console close-up, steel metallic details, glowing safety orange audio meters, bokeh backlights. Vibe of ${trackInfo?.name || "Reference track"}.`,
      suggestedStyle: "Neon Chrome",
      motionDescription: "Slow tracking pan along the mixer console faders with audio reactive glow."
    };
  }
}

export function getMockPromoPack(info: any) {
  const name = info?.name || "Untitled Track";
  const artist = info?.artist || "Unknown Artist";
  const bpm = info?.bpm || 120;
  const key = info?.key_signature || "C Major";
  const tags: string[] = Array.isArray(info?.tags) ? info.tags : [];
  const tagsLower = tags.map(t => t.toLowerCase());

  const hasTag = (words: string[]) => words.some(w => tagsLower.includes(w) || name.toLowerCase().includes(w));

  if (hasTag(["lofi", "lo-fi", "chill", "relax", "study", "ambient", "smooth"])) {
    return {
      youtube: {
        title: `☕ "${name}" - ${artist} [Official Audio] (Chill Lofi / Bedroom Soul)`,
        description: `Stream/Download "${name}" by ${artist}: [Streaming Link]\n\nGrab a warm coffee and relax. A heartfelt, nostalgic song escape titled "${name}".\n\nProduced with organic texture layers, vinyl dust saturation, primary vocals, and warm chord movements, perfect for late-night driving, studying, or bedroom relaxation.\n\nTEMPO: ${bpm} BPM\nKEY: ${key}\n\nOut now on Spotify, Apple Music, and all platforms. For playlist placement inquiries, reach out via the artist portal.`
      },
      instagram: `☕ Sat down and let the dust settle. "${name}" is officially out everywhere today. Warm vintage Keys, crackling vinyl breaks, and analog tape warmth backing an intimate performance.\n\ntempo: ${bpm} bpm | key: ${key}\n\nStream "${name}" now via the link in my profile! Let me know your favorite part.`,
      generic: `Hi there, hope you're doing great! Just wanted to share my new cozy, nostalgic single release titled "${name}". It has a very heartfelt, relaxed vibe with warm vintage keys and mellow vocals. I think it would be a perfect fit for your lofi / bedroom playlists. Let me know if you would like me to send over structural files or schedule an interview! Cheers.`,
      analysis: {
        instrument_status: "Vocal Release / Song",
        seo_keywords: ["lofi chill single", "chill study song", "relaxing vocal lofi", `${artist.toLowerCase()} lofi`, "cozy bedroom single"],
        beatstars_tags: ["lofi", "chill", "vocal"],
        youtube_tags: ["lofi vocal song", "relaxing bedroom music", "lofi study single", "lofi song for streaming", "cozy background lofi"],
        mood_tags: ["Cozy", "Chill", "Nostalgic"],
        mood: "Warm & Nostalgic",
        energy: "Low Flow",
        target_audience: "Lofi Playlists, Chillout Curator Inboxes, Late-night vloggers",
        instruments: ["Spitfire felt piano", "Warm Rhodes keys", "Intimate vocals", "Dusty vinyl crackle"]
      }
    };
  }

  if (hasTag(["drill", "grime", "uk", "industrial", "gritty", "aggressive"])) {
    return {
      youtube: {
        title: `💀 ${artist} - "${name}" [Official Visualizer] (UK/NY Drill Active Release)`,
        description: `Step into pure industrial grit. Presenting the relentless single "${name}" by ${artist}.\n\nFeaturing raw vocal velocities, dark orchestral string patterns, rapid triplet hi-hat runs, and heavy sliding 808 register flows. Built for peak sound system impact.\n\nTEMPO: ${bpm} BPM\nKEY: ${key}\n\nStream Link: [Streaming Link]\nDM for Bookings: [Booking Email]\nCopyright owned by the artist.`
      },
      instagram: `💀 RAW VOLTAGE: "${name}" is finally active on all platforms. Sliding sub-bass glides, rapid hi-hat rolling patterns, and dark string suspense backing a heavyweight flows.\n\ntempo: ${bpm} bpm | key: ${key}\n\nStream it, play it loud, add it to your rotation. Official visualizer out now, link in bio!`,
      generic: `Yo! Just released a heavy new Drill record titled "${name}" and wanted to put it on your radar for playlist considerations or blog roundups. It's got sliding sub glides and very aggressive momentum that gets immediate reaction. Appreciate you tuning in!`,
      analysis: {
        instrument_status: "Vocal Release / Song",
        seo_keywords: ["drill release 2026", "uk drill artist", "ny drill track", "sliding bass vocal rap", "hard drill single"],
        beatstars_tags: ["drill", "gritty", "uk-drill"],
        youtube_tags: ["uk drill rap song", "ny drill official audio", "hard street rap single", "heavy sliding bass track", "dark drill release"],
        mood_tags: ["Aggressive", "Gritty", "Dark"],
        mood: "Aggressive & Gritty",
        energy: "High Flow",
        target_audience: "Drill Rap Playlists, Urban music blogs, High-energy workout channels",
        instruments: ["Sliding 808 glides", "Haunting violins", "Rapid copper hats", "Heavyweight lead vocals"]
      }
    };
  }

  if (hasTag(["acoustic", "melodic", "guitar", "organic", "folk", "guitarra"])) {
    return {
      youtube: {
        title: `🎸 "${name}" - ${artist} (Official Acoustic Session / Song)`,
        description: `A deeply organic, emotional canvas for storytelling. Presenting an intimate acoustic-led single titled "${name}" by ${artist}.\n\nFeatures warm acoustic fingerpicking, authentic vocal lines, and melancholic ambient strings to provide deep emotional space for lyrics.\n\nTEMPO: ${bpm} BPM\nKEY: ${key}\n\nStream on Spotify & Apple Music: [Streaming Link]\nSubscribe to stay updated with monthly acoustic sessions.`
      },
      instagram: `🎸 Intimate guitar chords and raw storytelling. This is "${name}", featuring handcrafted guitar melodies, warm organic percussion, and highly personal lyric sheets.\n\ntempo: ${bpm} bpm | key: ${key}\n\nStream "${name}" now via the link in my profile! It would mean the world if you shared it.`,
      generic: `Hi! I wanted to pitch my beautiful, guitar-driven single titled "${name}". It has live acoustic vibes blended with deep modern bass, creating a highly emotional atmosphere for songwriting and relatable vocals. I would love to hear your thoughts for playlist support or blog coverage. Cheers!`,
      analysis: {
        instrument_status: "Vocal Release / Song",
        seo_keywords: ["acoustic guitar song", "emotional singer songwriter", "melodic indie pop track", `${artist.toLowerCase()} acoustic`, "organic storytelling song"],
        beatstars_tags: ["acoustic", "guitar", "melodic"],
        youtube_tags: ["acoustic indie song", "guitar rap vocal", "emotional acoustic single", "melodic folk pop audio", "sad story song 2026"],
        mood_tags: ["Intimate", "Emotional", "Heartfelt"],
        mood: "Intimate & Heartfelt",
        energy: "Medium Flow",
        target_audience: "Acoustic indie fans, Spotify editorial playlists, Melodic rap/pop curators",
        instruments: ["Chamber acoustic guitar", "Soft acoustic bass", "Heartfealt vocals", "Melancholic cellos"]
      }
    };
  }

  // Default Trap variant
  return {
    youtube: {
      title: `🔥 ${artist} - "${name}" [Official Music Video / Audio]`,
      description: `The official release of "${name}" by ${artist}. Out now on all digital streaming networks.\n\nEquipped with heavyweight sub-bass registers, crisp double-time hats, atmospheric synthesizer textures, and hard-hitting vocal layouts.\n\nTEMPO: ${bpm} BPM\nKEY: ${key}\n\nStream Link: [Streaming Link]\nFor features and booking contact: [Booking Email]`
    },
    instagram: `🔥 THE SINGLE OUT NOW: "${name}" is officially live everywhere. Heavyweight sub-bass, rapid-fire hi-hat velocities, dark atmospheric layers, and uncut vocal performance.\n\ntempo: ${bpm} bpm | key: ${key}\n\nStream it, play it loud, add it to your playlists! Link in my profile! 🔗`,
    generic: `Hey! I just dropped a massive new trap-influenced single titled "${name}". This one has heavy sliding 808 sub bass, energetic dark synth leads, and powerful lyrical delivery. It would fit perfectly on your playlist for new high-energy hip-hop releases. Let me know what you think! Thanks.`,
    analysis: {
      instrument_status: "Vocal Release / Song",
      seo_keywords: ["trap single release", "dark active rap song", "808 heavy vocals", `${artist.toLowerCase()} trap`, "cinematic urban track"],
      beatstars_tags: ["trap", "hiphop", "vocal"],
      youtube_tags: ["trap hip hop song", "hard active rap audio", "heavy 808 track", "dark trap release 2026", "rap song with lead vocals"],
      mood_tags: ["Dark", "Cinematic", "Energetic"],
      mood: "Dark & Cinematic",
      energy: "High Flow",
      target_audience: "Modern hip-hop stream playlists, Urban radio, Gaming channels",
      instruments: ["Roland TR-808 sub", "Crisp double-time hats", "Space-age analog synthesizers", "Lyrical vocals"]
    }
  };
}

export async function generatePromoPack(trackInfo: any) {
  const client = getGeminiClient();
  if (!client) {
    console.warn("Gemini Client is inactive, outputting default mocked promo block.");
    return getMockPromoPack(trackInfo);
  }

  try {
    let acousticDetails = "";
    if (trackInfo.acousticReport) {
      const ar = trackInfo.acousticReport;
      acousticDetails = `
DECODED AUDIO FILE CHARACTERISTICS (PROFILED VIA WEB AUDIO ENGINE):
- Peak Amplitude Level: ${ar.peakLevelDb} dB
- RMS Average Energy level: ${ar.rmsDb} dB
- Measured Dynamic Range: ${ar.dynamicRangeDb} dB (A lower Dynamic Range implies brickwall-limited hits with uniform squashed waveforms like club drill or hyper-trap; a higher value indicates organic acoustic, lofi, dynamic pads, or solo strings/piano).
- Scanned Low Register (Sub-Bass Density): ${ar.bassDensity} Low-End Weight.
- Scanned Mid Register (Formant / Melody registers): ${ar.midPresence} Presence.
- Scanned High Register (Air / Transient Crispness): ${ar.highAirRange} Crispness.
- Temporal Rhythm Density (Peak Transients rate): ${ar.rhythmTransients} Flow.

CONSTRAINTS REGARDING INSTRUMENT SELECTION & MOOD:
1. You MUST align your listed "instruments" (in 'analysis.instruments') 100% to these physical readings. Do NOT list acoustic strings if Mid Presence is recessed and tags denote electronic trap. Do NOT assume heavy sub-bass exists if Bass Density is 'Subtle'.
2. If low registers (Bass Density) are 'Subtle', do NOT suggest massive sliding 808s or subs; instead, list soft bass chord backings, acoustic bass, synth basslines, or specify there is no heavy bass. If Bass Density is 'High', list sliding 808s, heavy sub-bass, or aggressive bass loops.
3. If Mid-Frequency is 'Dominant', specify exact mid instruments that match the genre/tags: e.g., if Tags are 'Lofi', suggest cozy vintage felt piano or Rhodes; if Tags are 'Acoustic', suggest real fingerpicked nylon guitar, folk acoustic chords, or piano; if tags are 'Drill', list eerie detuned brass or gothic orchestral bells; if tags are 'Trap', list gated analog synth pads or digital plucks.
4. If High Air Range is 'Crisp', highlight bright hi-hat rolls, snapping handclaps, vocal breaths, or copper sizzles. If High Air Range is 'Warm' or 'Muted', focus on retro vinyl dust loops, muffled keys, muffled tape hiss (no sharp metallic frequencies).
5. Never hallucinate instruments that are completely irrelevant to this track's file traits.
`;
    }

    const prompt = `Create marketing and promotional copy packages for an elite, high-fidelity audio release reference:
Name: ${trackInfo.name || "Untitled"}
Artist: ${trackInfo.artist || "Unknown"}
BPM: ${trackInfo.bpm || 120}
Key: ${trackInfo.key_signature || "C Major"}
Tags: ${JSON.stringify(trackInfo.tags || [])}
${acousticDetails}

IMPORTANT INSTRUCTIONS FOR GENRE ALIGNMENT:
- Identify the target genre from the tags. If the tags contain "Lofi" or "Chill" or "Ambient", the tone must be soft, cozy, nostalgic, relaxed, and bedroom-vibe.
- If the tags contain "Acoustic", "Organic", or "Guitar", the tone should be intimate, soulful, raw, folk-influenced or melodic singer-songwriter.
- If the tags contain "Drill", "Gritty", or "Aggressive", the tone should be industrial, aggressive, gritty, and street-focused (e.g., heavy sliding bass register, high-voltage rap/vocal delivery).
- If the tags contain "Trap" or "Heavy", the tone should be dark, heavy, atmospheric, cinematic, and modern urban.
- Match all copywriting, hashtags, emotions, instruments, and target/similar artists directly to this analyzed genre. Never use generic trap templates for unrelated genres.

CRITICAL REQUIREMENT - PROMOTING COMPLETED SONGS, NOT BEATS:
This track is a COMPLETED song/release by an artist who is launching it to the public, NOT a background beat for sale. 
- You MUST write the description, caption, and email pitch as a single/original track release.
- Avoid ANY mention of "beat leases", "leasing rights", "licenses", "BeatStars website", "buying beats", or "WAV stems".
- Pitch the track for streaming on Spotify, Apple Music, and YouTube Music. Focus on pitching to playlist curators, securing radio/club play, getting fans to pre-save, and launching TikTok/Reels sounds.

We need three core formats and an advanced music metadata analysis:
1. YouTube Title and professional description copy card incorporating BPM, Key, credentials, and streaming/playlist links.
2. Instagram promotional caption filled with appropriate emojis, hashtag blocks, and call-to-actions to stream on platforms.
3. A short, humble professional email/message copy meant for pitch delivery to playlist curators, playlist editors, and music blogs.
4. An intelligent musical assessment under 'analysis' consisting of:
   - instrument_status: determine whether this track is likely an "Instrumental" or a "Vocal / Song" based on the name, artist, bpm, and tags.
   - seo_keywords: an array of 6-8 high-volume music discovery keywords (e.g. "Drake new single 2026", "chill aesthetic song to stream"). No "type beat" keywords.
   - beatstars_tags: an array of exactly 3 short, raw, genre-specific, high-value streaming/catalog tags (e.g., "chillout", "lofi", "bedroom") strictly limited to 1 word each.
   - youtube_tags: an array of 8 to 12 long-tail search tags/keywords perfect for copying into YouTube page tags for song discovery (e.g. "vocal lofi release", "melodic indie pop song"). No "type beat" keywords.
   - mood_tags: an array of exactly 3 emotional mood/vibe words descriptors (e.g. "Nostalgic", "Aggressive", "Chill").
   - mood: a descriptive word or two for the track's emotional space (e.g. Melancholic, Aggressive, Uplifting, Chill).
   - energy: estimate energy flow: "Low", "Medium", or "High".
   - target_audience: name 2 or 3 contemporary artists or platforms this fits.
   - instruments: an array of 3-4 notable instruments heard or implied (e.g. "Rhodes piano, lead vocals, dynamic drums").`;

    const aiResponse = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a platinum-selling music marketing copywriter specializing in artist song releases across hip-hop, trap, lofi, electronic, drill, pop, and acoustic indie productions. You write highly customized, authentic, and evocative promotional copy that perfectly aligns with the specific subgenre, emotional vibe, and instrumentation. Return direct JSON with youtube, instagram, generic, and analysis properties as specified.",
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

    if (aiResponse.text) {
      return JSON.parse(aiResponse.text.trim());
    }
    throw new Error("Empty response from AI");
  } catch (err) {
    console.error("Client promo generation issue, falling back:", err);
    return getMockPromoPack(trackInfo);
  }
}

export async function analyzeTrackWithGemini(filename: string): Promise<any> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error("Gemini client not initialized");
  }

  const prompt = `Analyze the audio track filename "${filename}" as a music expert. Determine its likely BPM, musical key signature (standard format, e.g. "C Major", "F# Minor", "A Min"), and 3 to 4 stylistic genre and mood tags. Check if the name contains bpm clues. Alos determine if the track is likely an instrumental or has vocals, and generate 4 high-value SEO keywords.`;

  const aiResponse = await client.models.generateContent({
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

  if (aiResponse.text) {
    return JSON.parse(aiResponse.text.trim());
  }
  throw new Error("Invalid response pattern from AI assistant");
}

export async function pullLyricsWithGemini(trackInfo: any, rawLyricsText?: string): Promise<any> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error("Gemini client is not available. Please make sure your GEMINI_API_KEY is configured.");
  }

  const trackName = trackInfo.name || "Untitled Track";
  const artist = trackInfo.artist || "Unknown Artist";
  const bpm = trackInfo.bpm || 120;
  const duration = trackInfo.duration || 180;
  const tags = trackInfo.tags || [];

  let prompt = "";
  if (rawLyricsText && rawLyricsText.trim()) {
    prompt = `You are a professional music transcription and lyric alignment intelligence.
The user has supplied their official, exact song lyrics for the track.
Your task is to take this EXACT text, break it up into logical, individual short lines/phrases (typically 4-8 words per line), and assign precise, sequential, non-overlapping startTime and endTime (in seconds) stretching across the duration of the track (${duration} seconds).

CRITICAL DIRECTIVES:
1. DO NOT invent, rewrite, drop, or alter any words. Keep the exact text of the user's lyrics perfectly intact.
2. Distribute the timings sequentially and smoothly across the duration of the track so the text flows dynamically.
3. Return the array of lyrics as a structured JSON object according to the response schema. Target duration: ${duration} seconds.

Official Raw Lyrics:
"""
${rawLyricsText}
"""
`;
  } else {
    prompt = `You are a professional music transcription and lyric alignment intelligence.
Analyze the target audio release and pull or transcribe the full, accurate text lyrics synchronized with precise time intervals.

Track Name: "${trackName}"
Artist: "${artist}"
BPM: ${bpm}
Duration: ${duration} seconds
Style/Tags: ${JSON.stringify(tags)}

Task:
1. Pull the official lyrics for this song if known. Do NOT make up random lyrics or change the lyrics of the song. If this track is an original production, beat, or instrumental, output a high-quality, minimal structured sequence of song structure markers (e.g., "[Intro]", "[Verse 1]", "[Chorus]", "[Guitar Solo]", "[Outro]" with beautiful descriptive headers) spaced out gracefully across the ${duration} seconds duration.
2. Segment this lyrics list into sequential, non-overlapping startTime and endTime (in seconds) matched to the track tempo.
3. Return the array of lyrics as a structured JSON object as defined in the response schema. Keep all timestamps strictly between 0 and ${duration} seconds.
`;
  }

  const aiResponse = await client.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are an automated professional music transcription, lyric synchronization, and subtitling intelligence agent. Always respond with strict, valid JSON matching the schema.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          lyrics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "One line or fragment of the song lyrics" },
                startTime: { type: Type.NUMBER, description: "Start time of the line in seconds, e.g. 4.2" },
                endTime: { type: Type.NUMBER, description: "End time of the line in seconds, e.g. 7.9" }
              },
              required: ["text", "startTime", "endTime"]
            }
          }
        },
        required: ["lyrics"]
      }
    }
  });

  if (aiResponse.text) {
    const parsed = JSON.parse(aiResponse.text.trim());
    if (parsed && Array.isArray(parsed.lyrics)) {
      return parsed.lyrics;
    }
  }
  throw new Error("Invalid response from transcription engine");
}
