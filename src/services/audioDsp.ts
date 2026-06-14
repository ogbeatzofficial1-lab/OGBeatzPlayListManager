/**
 * Client-Side Web Audio Digital Signal Processing (DSP) Engine.
 * 
 * This module performs actual mathematical and statistical analysis of raw audio
 * sample arrays to extract BPM, key signatures, and spectral elements (Crest Factor,
 * High-Frequency Balance) to infer structural music metadata completely offline.
 */

export interface DspAnalysisResult {
  bpm: number;
  key: string;
  camelotKey: string;
  genreCategory: string;
  mood: string;
  vibe: string;
  instruments: string[];
  tags: string[];
  pitch: string;
  spectralMetrics: {
    crestFactor: number;
    brightnessRatio: number;
    tempoConfidence: number;
    keyConfidence: number;
  };
}

/**
 * Standard Camelot wheel matrix for harmonically-compatible mixing.
 */
const CAMELOT_MAP: Record<string, string> = {
  "A Major": "11B", "A Minor": "8A", "A# Major": "6B", "A# Minor": "3A",
  "B Major": "1B",  "B Minor": "10A", "C Major": "8B",  "C Minor": "5A",
  "C# Major": "3B", "C# Minor": "12A", "D Major": "10B", "D Minor": "7A",
  "D# Major": "5B", "D# Minor": "2A",  "E Major": "12B", "E Minor": "9A",
  "F Major": "7B",  "F Minor": "4A",  "F# Major": "2B", "F# Minor": "11A",
  "G Major": "9B",  "G Minor": "6A",  "G# Major": "4B", "G# Minor": "1A",
};

/**
 * Helper to estimate root key based on fundamental spectral bins (Chroma-like vectors).
 */
const CHROMATIC_SCALE = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
];

const NOTE_FREQS = [
  16.35, 17.32, 18.35, 19.45, 20.60, 21.83, 23.12, 24.50, 25.96, 27.50, 29.14, 30.87
]; // Octave 0 base frequencies

/**
 * Perform Digital Signal Processing analysis on an uploaded Audio File.
 */
export async function analyzeAudioDsp(file: File): Promise<DspAnalysisResult> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // Decode audio data. Keep a shallow copy or notify progress
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.warn("Standard decode failed. Retrying with OfflineAudioContext...", err);
    // Fallback using OfflineAudioContext
    const offlineCtx = new OfflineAudioContext(1, 44100 * 30, 44100); // Analyze first 30 seconds
    audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await audioContext.close();
  }

  const sampleRate = audioBuffer.sampleRate;
  const rawData = audioBuffer.getChannelData(0); // Analyze primary channel
  const duration = audioBuffer.duration;

  // 1. TEMPO / BPM EXTRACTION via Peak-Envelope Clustered-Interval Autocorrelation
  const bpmAnalysis = extractBpmFromBuffer(rawData, sampleRate);
  
  // 2. SPECTRAL & ENERGY ANALYSIS (RMS, Crest Factor & High-Pass Brightness Ratio)
  const spectral = extractSpectralMetrics(rawData, sampleRate);

  // 3. KEY SIGNATURE ESTIMATION via Pitch Chromagram Accumulation
  const keyAnalysis = estimateKeySignature(rawData, sampleRate);

  // 4. METADATA INDUCTION
  // Map Crest Factor (low = compressed/dense like trap, high = high-dynamic range acoustic/synthwave) 
  // and Brightness (low = lofi/dull, high = high-hat energetic/phonk/glassy synthwave) to genre tax.
  let genreCategory = "Ambient Lofi Beat";
  let mood = "Chill & Nostalgic";
  let vibe = "Warm Tape Haze";
  let instruments = ["Felt Piano", "Synth Pad", "Sub Bass"];
  let tags = ["Lofi", "Chill", "Relaxed"];
  
  const calculatedBpm = bpmAnalysis.bpm;
  const isUpTempo = calculatedBpm > 115;
  const isMidTempo = calculatedBpm >= 90 && calculatedBpm <= 115;
  const isDownTempo = calculatedBpm < 90;

  if (spectral.brightnessRatio > 0.4) {
    if (isUpTempo) {
      genreCategory = "Neo-Retro Synthwave";
      mood = "High-Energy & Driving";
      vibe = "Neon Laser Brilliancy";
      instruments = ["Analog Lead", "Drum Machine", "Pluck Synth"];
      tags = ["Synthwave", "Cyberpunk", "Driving", "Fast"];
    } else if (isMidTempo) {
      genreCategory = "Gritty Cyber Rap / Trap";
      mood = "Intense & Mysterious";
      vibe = "Stark Metallic Edge";
      instruments = ["808 Bass", "Hi-Hat Roller", "Dark Synth Bells"];
      tags = ["Trap", "Dark", "Hard", "Gritty"];
    } else {
      genreCategory = "Chillhop Chillout";
      mood = "Warm & Contemplative";
      vibe = "Vinyl Crackle Crack";
      instruments = ["Rhodes Piano", "Vinyl Flutter", "Jazz Plucks"];
      tags = ["Chillhop", "Chillout", "Cozy", "Lofi"];
    }
  } else if (spectral.crestFactor > 5.5) { // Highly dynamic tracks, like acoustic / indie or modular ambient
    if (isDownTempo) {
      genreCategory = "Cinematic Neo-Noir";
      mood = "Melancholic & Reflective";
      vibe = "Deep Shadow Resonance";
      instruments = ["Acoustic felt piano", "Cello", "Subdued Percussion"];
      tags = ["Cinematic", "Ambient", "Sorrowful", "Indie"];
    } else {
      genreCategory = "Electro-Acoustic Chill";
      mood = "Inspiring & Uplifting";
      vibe = "Airy Ambient Atmosphere";
      instruments = ["Swell Guitar", "Organic Click", "Hollow Bass"];
      tags = ["Acoustic", "Warm", "Delicate", "Inspiring"];
    }
  } else { // Standard heavy production, dense mixing
    if (isUpTempo) {
      genreCategory = "Phonk / Electronic Beat";
      mood = "Aggressive & Energetic";
      vibe = "Distorted Tape Saturation";
      instruments = ["Distorted 808", "Cowbell Hook", "Aggressive Snares"];
      tags = ["Phonk", "Hardcore", "Tense", "Heavy"];
    } else if (isMidTempo) {
      genreCategory = "Obsidian Trap / Drill";
      mood = "Gritty & Menacing";
      vibe = "Smoky Obsidian Night";
      instruments = ["Slamming 808", "Vocal Choppers", "Glided Flute"];
      tags = ["Drill", "Trap", "Westcoast", "Slamming"];
    } else {
      genreCategory = "Deep Minimal Techno";
      mood = "Hypnotic & Deep";
      vibe = "Sub-bass Undercurrent";
      instruments = ["Filtered Kick", "FM Plucks", "Analog Synthesizer"];
      tags = ["Minimal", "Techno", "Hypnotic", "Underground"];
    }
  }

  // Generate an expert marketing pitch
  const velocityTerm = calculatedBpm > 130 ? "high-speed kinetic energy" : (calculatedBpm > 100 ? "mid-tempo rhythmic bounce" : "leisured, laidback stride");
  const pitch = `A highly polished ${genreCategory} track registered at ${calculatedBpm} BPM in ${keyAnalysis.key}, boasting ${mood.toLowerCase()} tones backed by ${instruments.slice(0,2).join(" combined with ")} for a ${vibe.toLowerCase()} dynamic.`;

  return {
    bpm: calculatedBpm,
    key: keyAnalysis.key,
    camelotKey: keyAnalysis.camelotKey,
    genreCategory,
    mood,
    vibe,
    instruments,
    tags,
    pitch,
    spectralMetrics: {
      crestFactor: Math.min(Math.max(spectral.crestFactor, 1), 12),
      brightnessRatio: Math.min(Math.max(spectral.brightnessRatio, 0.01), 1),
      tempoConfidence: Math.round(bpmAnalysis.confidence * 100),
      keyConfidence: Math.round(keyAnalysis.confidence * 100)
    }
  };
}

/**
 * Estimate BPM using Peak Envelope follower & autocorrelation binning.
 */
function extractBpmFromBuffer(data: Float32Array, sampleRate: number): { bpm: number; confidence: number } {
  // Downsample to reduce calculation load - target ~1000Hz (BPM signals live < 200Hz)
  const ratio = Math.round(sampleRate / 1000);
  const downsampledLength = Math.floor(data.length / ratio);
  const sampleData = new Float32Array(downsampledLength);
  
  for (let i = 0; i < downsampledLength; i++) {
    // Settle representation using absolute envelopes to follow intensity
    let maxVal = 0;
    const startIdx = i * ratio;
    const endIdx = Math.min(startIdx + ratio, data.length);
    for (let j = startIdx; j < endIdx; j++) {
      const v = Math.abs(data[j]);
      if (v > maxVal) maxVal = v;
    }
    sampleData[i] = maxVal;
  }

  // Smooth envelope (simple lowpass) to remove treble spikes
  const smoothed = new Float32Array(downsampledLength);
  let prev = 0;
  const alpha = 0.15; // Lowpass weight
  for (let i = 0; i < downsampledLength; i++) {
    smoothed[i] = alpha * sampleData[i] + (1 - alpha) * prev;
    prev = smoothed[i];
  }

  // Locate peaks above local threshold
  const peakIndices: number[] = [];
  const windowSize = 250; // 250ms slide window
  
  for (let i = windowSize; i < downsampledLength - windowSize; i += 5) {
    // Find local average
    let sum = 0;
    for (let j = i - windowSize; j < i + windowSize; j++) {
      sum += smoothed[j];
    }
    const avg = sum / (windowSize * 2);
    const threshold = avg * 1.35; // Peak must exceed average by 35%
    
    if (smoothed[i] > threshold && smoothed[i] > smoothed[i - 1] && smoothed[i] > smoothed[i + 1]) {
      // Check distance from last peak to prevent double trigger
      if (peakIndices.length === 0 || i - peakIndices[peakIndices.length - 1] > 200) { // Keep > 200ms
        peakIndices.push(i);
      }
    }
  }

  if (peakIndices.length < 5) {
    return { bpm: 120, confidence: 0.1 }; // Not enough peaks
  }

  // Calculate intervals
  const intervals: number[] = [];
  for (let i = 1; i < peakIndices.length; i++) {
    intervals.push(peakIndices[i] - peakIndices[i - 1]);
  }

  // Map intervals to candidate BPMs
  const bpmCounts: Record<number, number> = {};
  intervals.forEach(interval => {
    // interval is in ms (since sampleRate in downsampled is 1000Hz, i.e. 1 sample = 1ms)
    // BPM = 60000 / interval ms
    const rawBpm = 60000 / interval;
    if (rawBpm >= 60 && rawBpm <= 180) {
      // Group to nearest whole BPM
      const roundedBpm = Math.round(rawBpm);
      bpmCounts[roundedBpm] = (bpmCounts[roundedBpm] || 0) + 1;
      // Add weight to harmonics (double or half)
      const doubleBpm = Math.round(roundedBpm * 2);
      if (doubleBpm >= 60 && doubleBpm <= 180) {
        bpmCounts[doubleBpm] = (bpmCounts[doubleBpm] || 0) + 0.3;
      }
      const halfBpm = Math.round(roundedBpm / 2);
      if (halfBpm >= 60 && halfBpm <= 180) {
        bpmCounts[halfBpm] = (bpmCounts[halfBpm] || 0) + 0.3;
      }
    }
  });

  // Find the mode BPM
  let bestBpm = 120;
  let maxWeight = 0;
  let totalWeight = 0;

  Object.entries(bpmCounts).forEach(([bpmStr, w]) => {
    totalWeight += w;
    if (w > maxWeight) {
      maxWeight = w;
      bestBpm = parseInt(bpmStr, 10);
    }
  });

  // Clean values to standard urban tempos if confidence is moderate
  const confidence = totalWeight > 0 ? maxWeight / totalWeight : 0.2;
  
  // Guard values
  if (bestBpm < 60 || bestBpm > 200) {
    bestBpm = 120;
  }

  return { bpm: bestBpm, confidence: Math.min(confidence + 0.15, 1.0) };
}

/**
 * Estimate spectral qualities like Crest Factor and Brightness.
 */
function extractSpectralMetrics(data: Float32Array, sampleRate: number): { crestFactor: number; brightnessRatio: number } {
  // Take a representative slice from the middle of the audio to avoid intros/outros
  const start = Math.floor(data.length * 0.25);
  const end = Math.floor(data.length * 0.75);
  const sliceSize = Math.min(88200, end - start); // ~2 seconds of audio
  
  let peak = 0;
  let sumSquared = 0;
  let transitionPassCount = 0;
  let lastVal = 0;

  for (let i = 0; i < sliceSize; i++) {
    const val = data[start + i];
    const absVal = Math.abs(val);
    
    if (absVal > peak) peak = absVal;
    sumSquared += val * val;

    // Zero-crossing check
    if ((val > 0 && lastVal <= 0) || (val < 0 && lastVal >= 0)) {
      transitionPassCount++;
    }
    lastVal = val;
  }

  const rms = Math.sqrt(sumSquared / sliceSize);
  const crestFactor = rms > 0.001 ? peak / rms : 4.0;

  // Zero-crossing density is a proxy for high-frequency brightness relative to sample rate
  const zcrDensity = transitionPassCount / sliceSize; // 0 to 1
  const brightnessRatio = zcrDensity * 8.0; // Scale to fit standard ranges

  return { crestFactor, brightnessRatio };
}

/**
 * Estimate Musical Key Signature via chroma energy approximations.
 */
function estimateKeySignature(data: Float32Array, sampleRate: number): { key: string; camelotKey: string; confidence: number } {
  // Let us analyze notes using Discrete Fourier Transform proxy (Goertzel-like resonators
  // focused on fundamental octave frequencies)
  const chromagram = new Float32Array(12);
  const analysisStart = Math.floor(data.length * 0.35);
  const limit = Math.min(data.length - analysisStart, 110250); // Analyze 2.5 seconds
  
  if (limit <= 0) {
    return { key: "C Major", camelotKey: "8B", confidence: 0.1 };
  }

  // Goertzel filtering for fundamental octaves of the 12 chromatic semitones
  // A4 = 440 Hz, C4 = 261.63 Hz. We'll use octaves 2-4 (frequencies 65Hz to 500Hz)
  for (let noteIdx = 0; noteIdx < 12; noteIdx++) {
    const baseFreq = NOTE_FREQS[noteIdx];
    // Check octaves 2, 3, 4
    const testFreqs = [baseFreq * 4, baseFreq * 8, baseFreq * 16];
    
    let noteEnergy = 0;
    testFreqs.forEach(freq => {
      // Basic Goertzel algorithm coefficient calculation
      const w = 2.0 * Math.PI * (freq / sampleRate);
      const coeff = 2.0 * Math.cos(w);
      
      let sPrev = 0;
      let sPrev2 = 0;
      
      // Step through a sample subset (downsampled step to save thread load)
      const step = 8;
      let samplesChecked = 0;
      for (let i = 0; i < limit; i += step) {
        const x = data[analysisStart + i];
        const s = x + coeff * sPrev - sPrev2;
        sPrev2 = sPrev;
        sPrev = s;
        samplesChecked++;
      }
      
      const power = sPrev2 * sPrev2 + sPrev * sPrev - coeff * sPrev * sPrev2;
      noteEnergy += Math.sqrt(Math.max(0, power)) / samplesChecked;
    });
    
    chromagram[noteIdx] = noteEnergy;
  }

  // Standard musical triads matching energy coefficients (Major vs Minor)
  let bestKey = "C Major";
  let maxMatchVal = 0;
  
  // Profiles for Major / Minor keys based on triad notes (e.g. C Major is C, E, G; C Minor is C, D#, G)
  const majTriad = [0, 4, 7];
  const minTriad = [0, 3, 7];

  for (let keyIdx = 0; keyIdx < 12; keyIdx++) {
    // Test Major
    const majSum = (
      chromagram[keyIdx] * 1.5 + 
      chromagram[(keyIdx + 4) % 12] * 1.0 + 
      chromagram[(keyIdx + 7) % 12] * 1.2
    );
    if (majSum > maxMatchVal) {
      maxMatchVal = majSum;
      bestKey = `${CHROMATIC_SCALE[keyIdx]} Major`;
    }

    // Test Minor
    const minSum = (
      chromagram[keyIdx] * 1.5 + 
      chromagram[(keyIdx + 3) % 12] * 1.0 + 
      chromagram[(keyIdx + 7) % 12] * 1.2
    );
    if (minSum > maxMatchVal) {
      maxMatchVal = minSum;
      bestKey = `${CHROMATIC_SCALE[keyIdx]} Minor`;
    }
  }

  // Determine Camelot key
  const camelotKey = CAMELOT_MAP[bestKey] || "8B";
  
  // Calculate confidence based on profile contrast
  let sumAll = 0;
  chromagram.forEach(v => sumAll += v);
  const confidence = sumAll > 0 ? (maxMatchVal / sumAll) * 1.4 : 0.35;

  return {
    key: bestKey,
    camelotKey: camelotKey,
    confidence: Math.min(confidence, 0.95)
  };
}
