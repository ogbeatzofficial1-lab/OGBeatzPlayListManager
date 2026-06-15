import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Video, Sparkles, Wand2, Loader2, Play, Pause, Music, Sliders, CheckCircle2, AlertCircle, Share2, Download, Mic, Key, LogIn, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { useMediaStore } from '../context/MediaStoreContext';
import { Track, Playlist, PromoVideo } from '../types';
import { generateVideoAesthetic } from '../services/geminiService';

interface VideoGenerationModalProps {
  track?: Track;
  playlist?: Playlist;
  onClose: () => void;
  key?: string | number;
}

export default function VideoGenerationModal({ track, playlist, onClose }: VideoGenerationModalProps) {
  const { addPromoVideo, promoVideos, tracks: allTracks, updateTrack, addToast } = useMediaStore();
  const [step, setStep] = useState<'config' | 'processing' | 'preview'>('config');
  const [style, setStyle] = useState('cyber_organic');
  const [aspectRatio, setAspectRatio] = useState<'vertical' | 'square' | 'horizontal' | 'auto'>('auto');
  const [resolvedAspectRatio, setResolvedAspectRatio] = useState<'vertical' | 'square' | 'horizontal'>('vertical');
  const [progress, setProgress] = useState(0);
  const [aesthetic, setAesthetic] = useState<any>(null);
  const [generatedVideo, setGeneratedVideo] = useState<PromoVideo | null>(null);

  // Advanced Lyric Overlays and Custom Audio Clip states
  const [overlayLyrics, setOverlayLyrics] = useState(true);
  const [lyricsText, setLyricsText] = useState("");
  const [lyricStyle, setLyricStyle] = useState<'retro' | 'serif' | 'mono' | 'impact'>('retro');
  const [lyricColor, setLyricColor] = useState('#ffffff');
  const [lyricFontSize, setLyricFontSize] = useState<number>(36);
  const [lyricLineHeight, setLyricLineHeight] = useState<number>(1.35);
  const [lyricFontWeight, setLyricFontWeight] = useState<string>('900');
  const [lyricFormat, setLyricFormat] = useState<'bounce' | 'slide' | 'fade' | 'zoom' | 'word'>('bounce');

  // AI-powered timestamp lyrics extraction/handling states
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [isAligningLyrics, setIsAligningLyrics] = useState(false);
  const [lyricsSaveStatus, setLyricsSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [lyricsStatusMsg, setLyricsStatusMsg] = useState('');
  const [pollinationsKeyConnected, setPollinationsKeyConnected] = useState(() => !!localStorage.getItem("POLLINATIONS_USER_KEY"));

  const connectPollinations = () => {
    // Generate simple redirect URI back to the application parent window route or custom callback on render
    const origin = window.location.origin;
    const isRender = origin.includes("onrender.com") || origin.includes("ogbeatzplaylistmanager");
    const targetUrl = isRender ? "https://ogbeatzplaylistmanager.onrender.com/auth/callback" : window.location.href;
    const redirectUrl = encodeURIComponent(targetUrl);
    const clientId = (import.meta as any).env.VITE_POLLINATIONS_CLIENT_ID || "pk_UkifqMuyjH77QPxB";
    const authUrl = `https://enter.pollinations.ai/authorize?redirect_uri=${redirectUrl}&client_id=${clientId}`;
    
    addToast?.("Redirecting to Pollinations for secure login...", "info");
    setTimeout(() => {
      window.location.href = authUrl;
    }, 1200);
  };

  const disconnectPollinations = () => {
    localStorage.removeItem("POLLINATIONS_USER_KEY");
    setPollinationsKeyConnected(false);
    addToast?.("Disconnected your Pollinations account.", "info");
  };

  const [clipEnabled, setClipEnabled] = useState(false);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(15);
  const [promoDuration, setPromoDuration] = useState<'full' | '15' | '30' | '60' | 'custom'>('full');
  const [activeParamTab, setActiveParamTab] = useState<'aesthetics' | 'lyrics' | 'trimmer'>('aesthetics');

  // Templar CC & Transition States
  const [ccPreset, setCcPreset] = useState<'templar' | 'cyber' | 'noir' | 'gold' | 'vhs' | 'none'>('templar');
  const [contrast, setContrast] = useState<number>(1.4);
  const [saturation, setSaturation] = useState<number>(1.1);
  const [vignetteStrength, setVignetteStrength] = useState<number>(0.65);
  const [grainStrength, setGrainStrength] = useState<number>(0.15);
  const [strobeBeat, setStrobeBeat] = useState<boolean>(true);
  const [shakeBeat, setShakeBeat] = useState<boolean>(true);
  const [chromaticOffset, setChromaticOffset] = useState<number>(4.0);
  const [strobeBeatIntensity, setStrobeBeatIntensity] = useState<number>(0.35);
  const [shakeBeatIntensity, setShakeBeatIntensity] = useState<number>(0.6);

  // 100% Premium non-generic Template Controls for Complete User Overrides
  const [showBgBlur, setShowBgBlur] = useState<boolean>(true);
  const [showOrbitRings, setShowOrbitRings] = useState<boolean>(false);
  const [showSpectralBars, setShowSpectralBars] = useState<boolean>(true);
  const [showGridOverlay, setShowGridOverlay] = useState<boolean>(false);
  const [showWatermarks, setShowWatermarks] = useState<boolean>(false);
  const [albumArtShape, setAlbumArtShape] = useState<'square' | 'circle' | 'hidden'>('square');
  const [shadowStrength, setShadowStrength] = useState<number>(0.6);
  const [pureCoverFit, setPureCoverFit] = useState<boolean>(false);

  // Fade-in / Fade-out states
  const [fadeInEnabled, setFadeInEnabled] = useState(true);
  const [fadeOutEnabled, setFadeOutEnabled] = useState(true);
  const [fadeInDuration, setFadeInDuration] = useState(2);
  const [fadeOutDuration, setFadeOutDuration] = useState(2);

  const handleDurationChange = (value: 'full' | '15' | '30' | '60' | 'custom') => {
    setPromoDuration(value);
    stopPlaybackSources();
    setIsPlayingPreview(false);
    
    const maxDur = Math.round(track?.duration || (playlist && allTracks ? allTracks.find(item => playlist.track_ids?.includes(item.id))?.duration : 15) || 15);
    
    if (value === 'full') {
      setClipEnabled(false);
    } else if (value === '15') {
      setClipEnabled(true);
      setClipStart(0);
      setClipEnd(Math.min(15, maxDur));
    } else if (value === '30') {
      setClipEnabled(true);
      setClipStart(0);
      setClipEnd(Math.min(30, maxDur));
    } else if (value === '60') {
      setClipEnabled(true);
      setClipStart(0);
      setClipEnd(Math.min(60, maxDur));
    } else if (value === 'custom') {
      setClipEnabled(true);
    }
  };

  useEffect(() => {
    const tDuration = track?.duration || (playlist && allTracks ? allTracks.find(item => playlist.track_ids?.includes(item.id))?.duration : 15) || 15;
    setClipEnd(Math.round(tDuration));
  }, [track, playlist, allTracks]);

  const name = track?.name || playlist?.name || 'Untitled';
  const artist = track?.artist || 'OGBeatz';

  const styles = [
    { id: 'minimalist', name: 'Clean Chrome', icon: '✨' },
    { id: 'grunge', name: 'Distressed Metal', icon: '⛓️' },
    { id: 'vibrant', name: 'Neon Pulse', icon: '⚡' },
    { id: 'abstract', name: 'Ethereal Flow', icon: '🌫️' },
    { id: 'cyber_organic', name: 'Cyber-Organic', icon: '🔥' }
  ];

  // Automated Web Audio API Preview Settings
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDecoding, setAudioDecoding] = useState(false);
  const [audioDecoded, setAudioDecoded] = useState(false);
  const [decodedBuffer, setDecodedBuffer] = useState<AudioBuffer | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const proceduralTimerRef = useRef<any>(null);
  const playbackStartRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  const activeTrack = track || (playlist && allTracks ? allTracks.find(t => playlist.track_ids?.includes(t.id)) : null);
  const hasAudioSource = !!activeTrack?.file_url;

  useEffect(() => {
    if (activeTrack && activeTrack.lyrics) {
      setLyricsText(activeTrack.lyrics);
    }
  }, [activeTrack]);

  useEffect(() => {
    if (aspectRatio !== 'auto') {
      setResolvedAspectRatio(aspectRatio);
      return;
    }

    const coverArtUrl = activeTrack?.image_url || '/ogbeatz_logo.svg';
    if (!coverArtUrl) {
      setResolvedAspectRatio('vertical');
      return;
    }

    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.onload = () => {
      if (tempImg.width > 0 && tempImg.height > 0) {
        const ar = tempImg.width / tempImg.height;
        if (ar > 1.25) {
          setResolvedAspectRatio('horizontal');
        } else if (ar < 0.8) {
          setResolvedAspectRatio('vertical');
        } else {
          setResolvedAspectRatio('square');
        }
      }
    };
    tempImg.onerror = () => {
      setResolvedAspectRatio('vertical');
    };
    tempImg.src = coverArtUrl;
  }, [aspectRatio, activeTrack?.image_url]);

  const handleGenerateLyrics = async () => {
    setIsGeneratingLyrics(true);
    setLyricsStatusMsg("Loading track file for analysis...");
    
    let audioData: string | null = null;
    let audioMimeType: string | null = null;

    if (activeTrack?.file_url) {
      try {
        setLyricsStatusMsg("Processing audio file waves...");
        const response = await fetch(activeTrack.file_url);
        const blob = await response.blob();
        audioMimeType = blob.type || "audio/mpeg";
        
        // Convert to base64
        audioData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        setLyricsStatusMsg("Transcribing vocals from track audio...");
      } catch (audioErr) {
        console.warn("Could not load track audio for direct Speech-to-Text, resorting to thematic generation:", audioErr);
        setLyricsStatusMsg("Thematic creative writing (no audio link)...");
      }
    } else {
      setLyricsStatusMsg("Writing thematic lyrics directly...");
    }

    try {
      const res = await fetch("/api/generate-lyrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackInfo: activeTrack || { name, artist, bpm: 120, key_signature: 'C' },
          audioData,
          audioMimeType
        }),
      });
      if (!res.ok) throw new Error("Server returned error status");
      const data = await res.json();
      if (data.lyrics) {
        setLyricsText(data.lyrics);
        setLyricsStatusMsg(`Lyrics output: ${data.description}`);
        if (data.isFallback) {
          addToast?.("Gemini rate limits active. Offline high-fidelity generator deployed.", "info");
        }
      } else {
        throw new Error("No lyrics returned in response");
      }
    } catch (err: any) {
      console.error(err);
      setLyricsStatusMsg("Failed to generate lyrics. Please try again.");
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const handleTranscribeLyricsPollinations = async () => {
    setIsGeneratingLyrics(true);
    setLyricsStatusMsg("Extracting vocal audio from track...");
    addToast?.("Extracting vocal audio from track...", "info");
    
    let audioData: string | null = null;
    let audioMimeType = "audio/mpeg";

    if (activeTrack?.file_url) {
      try {
        const response = await fetch(activeTrack.file_url);
        const blob = await response.blob();
        audioMimeType = blob.type || "audio/mpeg";
        
        // Convert to base64
        audioData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        setLyricsStatusMsg("Transcribing with Pollinations Whispering Neural Net...");
      } catch (audioErr) {
        console.warn("Could not load track audio for direct Speech-to-Text:", audioErr);
      }
    }

    try {
      const res = await fetch("/api/transcribe-lyrics-pollinations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackInfo: activeTrack || { name, artist, bpm: 120, key_signature: 'C' },
          audioData,
          audioMimeType,
          pollinationsUserKey: localStorage.getItem("POLLINATIONS_USER_KEY") || ""
        }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Server returned error status");
      }
      
      if (data.lyrics) {
        setLyricsText(data.lyrics);
        setLyricsStatusMsg(`Lyrics output: ${data.description}`);
        addToast?.("Speech-to-Text complete! Vocals transcribed and synced successfully.", "success");
      } else {
        throw new Error("No transcribed text returned in response");
      }
    } catch (err: any) {
      console.error(err);
      setLyricsStatusMsg(`Pollinations Transcription failed: ${err.message || err}`);
      addToast?.(`Transcription Failed: ${err.message || err}`, "error");
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const handleAlignLyrics = async () => {
    if (!lyricsText.trim()) {
      setLyricsStatusMsg("Please write some flat line lyrics first.");
      return;
    }
    setIsAligningLyrics(true);
    setLyricsStatusMsg("Distributing timestamps logically across track duration...");
    try {
      const res = await fetch("/api/align-lyrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plainTextLyrics: lyricsText,
          duration: activeTrack?.duration || 120
        }),
      });
      if (!res.ok) throw new Error("Server returned error status");
      const data = await res.json();
      if (data.lyrics) {
        setLyricsText(data.lyrics);
        setLyricsStatusMsg(`Successfully aligned ${data.alignedCount} lines to timestamps!`);
      } else {
        throw new Error("No lyrics returned in response");
      }
    } catch (err: any) {
      console.error(err);
      setLyricsStatusMsg("Failed to align lyrics automatically.");
    } finally {
      setIsAligningLyrics(false);
    }
  };

  const handleSaveLyrics = async () => {
    if (!activeTrack?.id) {
      setLyricsStatusMsg("No active song found to save lyrics under.");
      return;
    }
    setLyricsSaveStatus('saving');
    try {
      await updateTrack(activeTrack.id, { lyrics: lyricsText });
      setLyricsSaveStatus('success');
      setLyricsStatusMsg("Stored lyrics safely in song databases!");
      setTimeout(() => setLyricsSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setLyricsSaveStatus('error');
      setLyricsStatusMsg("Error saving track lyrics.");
    }
  };

  const handleExportLRC = () => {
    if (!lyricsText) return;
    const blob = new Blob([lyricsText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeTrack?.name || 'vocals'}_lyrics.lrc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setLyricsStatusMsg("LRC Synchronized Lyrics file downloaded!");
  };

  const handleExportJSON = () => {
    if (!parsedLyrics || parsedLyrics.length === 0) {
      setLyricsStatusMsg("No parsed lyrics to export to JSON.");
      return;
    }
    const jsonString = JSON.stringify(parsedLyrics, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeTrack?.name || 'vocals'}_lyrics.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setLyricsStatusMsg("JSON Timing coordinates file downloaded!");
  };

  const parsedLyrics = useMemo(() => {
    const lines = lyricsText.split('\n');
    const result: Array<{ time: number; text: string }> = [];
    const timeRegGlobal = /\[(\d+):(\d+)(?:\.(\d+))?\]/g;
    let lastTime = 0;
    for (const line of lines) {
      const matches: RegExpExecArray[] = [];
      let match: RegExpExecArray | null;
      timeRegGlobal.lastIndex = 0;
      while ((match = timeRegGlobal.exec(line)) !== null) {
        matches.push(match);
      }

      if (matches.length > 0) {
        // Always use the first/earliest timestamp representing the absolute timeline position (e.g., [00:26] over [00:00])
        const chosenMatch = matches[0];
        const mins = parseInt(chosenMatch[1], 10);
        const secs = parseInt(chosenMatch[2], 10);
        const ms = chosenMatch[3] ? parseInt(chosenMatch[3], 10) / 100 : 0;
        const timeVal = mins * 60 + secs + ms;
        
        // Strip out all bracketed timestamps from the lyric line text
        const textVal = line.replace(timeRegGlobal, '').trim();
        result.push({ time: timeVal, text: textVal });
        lastTime = timeVal;
      } else {
        const cleanLine = line.trim();
        if (cleanLine) {
          result.push({ time: lastTime, text: cleanLine });
          lastTime += 3;
        }
      }
    }
    return result.sort((a, b) => a.time - b.time);
  }, [lyricsText]);

  // Real-time Waveform drawing
  const drawMotionGraphicFrame = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    duration: number,
    style: string,
    aspect: string,
    freqData: Uint8Array,
    imgElement: HTMLImageElement | null
  ) => {
    // 1. Clear background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    if (pureCoverFit) {
      if ('filter' in ctx) {
        ctx.filter = 'none';
      }
      
      // Draw Cover Art background with perfect cover-fit aspect ratio
      if (imgElement && imgElement.width > 0 && imgElement.height > 0) {
        ctx.save();
        const imgAR = imgElement.width / imgElement.height;
        const canvasAR = width / height;
        let renderW = width;
        let renderH = height;
        let x = 0;
        let y = 0;

        if (imgAR > canvasAR) {
          renderH = height;
          renderW = height * imgAR;
          x = (width - renderW) / 2;
        } else {
          renderW = width;
          renderH = width / imgAR;
          y = (height - renderH) / 2;
        }
        
        ctx.drawImage(imgElement, x, y, renderW, renderH);
        ctx.restore();
      } else {
        // Fallback charcoal black minimalist grid background
        ctx.save();
        ctx.fillStyle = '#0f0f12';
        ctx.fillRect(0, 0, width, height);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        const step = Math.min(width, height) / 10;
        for (let ix = 0; ix < width; ix += step) {
          ctx.beginPath();
          ctx.moveTo(ix, 0);
          ctx.lineTo(ix, height);
          ctx.stroke();
        }
        for (let iy = 0; iy < height; iy += step) {
          ctx.beginPath();
          ctx.moveTo(0, iy);
          ctx.lineTo(width, iy);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Drawing only the Embedded Lip Sync / Dynamic Lyric Overlay for absolute purity
      if (overlayLyrics && parsedLyrics && parsedLyrics.length > 0) {
        let activeLine = null;
        for (let i = 0; i < parsedLyrics.length; i++) {
          if (time >= parsedLyrics[i].time) {
            activeLine = parsedLyrics[i];
          }
        }
        
        if (activeLine) {
          ctx.save();
          // Set styling typography parameters based on choice (retro, serif, mono, impact)
          let fontName = '"Inter", sans-serif';
          const fontScaleFactor = width / 640;
          const fontSizePx = Math.max(12, Math.round(lyricFontSize * fontScaleFactor));
          const fontSize = `${fontSizePx}px`;
          const uppercase = lyricStyle === 'retro' || lyricStyle === 'impact';
          
          if (lyricStyle === 'retro') {
            fontName = '"Space Grotesk", sans-serif';
            ctx.font = `${lyricFontWeight} italic ${fontSize} ${fontName}`;
            ctx.fillStyle = lyricColor || '#f97316';
            ctx.shadowColor = lyricColor || '#f97316';
            ctx.shadowBlur = Math.round(18 * fontScaleFactor);
          } else if (lyricStyle === 'serif') {
            fontName = '"Playfair Display", serif';
            ctx.font = `italic ${lyricFontWeight} ${fontSize} ${fontName}`;
            ctx.fillStyle = lyricColor || '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.7)';
            ctx.shadowBlur = Math.round(12 * fontScaleFactor);
          } else if (lyricStyle === 'mono') {
            fontName = '"JetBrains Mono", monospace';
            ctx.font = `${lyricFontWeight} ${fontSize} ${fontName}`;
            ctx.fillStyle = lyricColor || '#10b981';
            ctx.shadowColor = lyricColor || '#10b981';
            ctx.shadowBlur = Math.round(14 * fontScaleFactor);
          } else {
            fontName = '"Inter", sans-serif';
            ctx.font = `${lyricFontWeight} ${fontSize} ${fontName}`;
            ctx.fillStyle = lyricColor || '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.9)';
            ctx.shadowBlur = Math.round(15 * fontScaleFactor);
          }
          
          ctx.textAlign = 'center';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = Math.max(3, Math.round(8 * fontScaleFactor));
          
          let displayText = uppercase ? activeLine.text.toUpperCase() : activeLine.text;
          
          let scaleEffect = 1.0;
          let opacity = 1.0;
          let translateY = 0;
          const timeDelta = time - activeLine.time;
          let drawTextLines: string[] = [];

          // Dynamic formatting transitions
          if (lyricFormat === 'word') {
            const rawWords = activeLine.text.split(/\s+/).filter(Boolean);
            if (rawWords.length > 0) {
              let lineDuration = 4.0;
              const activeIndex = parsedLyrics.indexOf(activeLine);
              if (activeIndex !== -1 && activeIndex < parsedLyrics.length - 1) {
                lineDuration = Math.max(1.0, parsedLyrics[activeIndex + 1].time - activeLine.time);
              }
              
              // Highlight active word
              const wordRatio = Math.min(0.99, timeDelta / lineDuration);
              const wordIndex = Math.min(rawWords.length - 1, Math.floor(wordRatio * rawWords.length));
              const activeWord = uppercase ? rawWords[wordIndex].toUpperCase() : rawWords[wordIndex];
              
              // Pop transition for individual flashing word
              const wordDuration = lineDuration / rawWords.length;
              const wordTimeDelta = timeDelta % wordDuration;
              const t = Math.min(1.0, wordTimeDelta / Math.min(0.18, wordDuration));
              scaleEffect = 0.85 + Math.sin(t * Math.PI * 0.5) * 0.22;
              opacity = 1.0;
              drawTextLines = [activeWord];
            } else {
              drawTextLines = [''];
            }
          } else {
            // Bounded multi-line wrapping layer to prevent closed captions from bleeding off-canvas
            const maxWidth = width * 0.82;
            const words = displayText.split(' ');
            let currentLine = '';

            for (let i = 0; i < words.length; i++) {
              const word = words[i];
              const testLine = currentLine ? currentLine + ' ' + word : word;
              const testWidth = ctx.measureText(testLine).width;
              if (testWidth > maxWidth && i > 0) {
                drawTextLines.push(currentLine);
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            }
            if (currentLine) {
              drawTextLines.push(currentLine);
            }

            if (lyricFormat === 'slide') {
              const slideDuration = 0.45;
              if (timeDelta < slideDuration) {
                const t = timeDelta / slideDuration;
                const ease = 1 - Math.pow(1 - t, 3); // Cubic ease out
                translateY = (1 - ease) * (fontSizePx * 1.0);
                opacity = Math.min(1.0, t * 1.5);
              } else {
                translateY = 0;
                opacity = 1.0;
              }
              scaleEffect = 1.0;
            } else if (lyricFormat === 'fade') {
              const fadeDuration = 0.35;
              if (timeDelta < fadeDuration) {
                opacity = timeDelta / fadeDuration;
              } else {
                opacity = 1.0;
              }
              scaleEffect = 1.0;
            } else if (lyricFormat === 'zoom') {
              const zoomDuration = 0.5;
              if (timeDelta < zoomDuration) {
                const t = timeDelta / zoomDuration;
                scaleEffect = 1.35 - t * 0.35;
                opacity = t;
              } else {
                const drift = timeDelta - zoomDuration;
                scaleEffect = 1.0 + Math.min(0.04, drift * 0.003);
                opacity = 1.0;
              }
            } else {
              // Default: 'bounce' Style
              const bounceDuration = 0.5;
              if (timeDelta < bounceDuration) {
                const t = timeDelta / bounceDuration;
                scaleEffect = 0.70 + Math.sin(t * Math.PI * 1.4) * 0.35 * (1 - t);
                opacity = Math.min(1.0, t * 1.5);
              } else {
                scaleEffect = 1.0;
                opacity = 1.0;
              }
            }
          }

          // Place text in precise dynamic quadrant
          const lyricY = aspect === 'vertical' ? height * 0.58 : height * 0.60;
          
          ctx.globalAlpha = opacity;
          ctx.translate(width / 2, lyricY + translateY);
          ctx.scale(scaleEffect, scaleEffect);

          const lineHeight = fontSizePx * lyricLineHeight; // Comfortable leading for multi-line subtitles
          const totalHeight = (drawTextLines.length - 1) * lineHeight;
          const startY = -totalHeight / 2; // Harmonious balance: center lines on the target vertical coordinate

          for (let i = 0; i < drawTextLines.length; i++) {
            const lineY = startY + i * lineHeight;
            ctx.strokeText(drawTextLines[i], 0, lineY);
            ctx.fillText(drawTextLines[i], 0, lineY);
          }
          
          ctx.restore();
        }
        return;
      }
    }

    // Aspect-ratio layout adaptive coordinates and sizes to make sure it adjusts to ratio perfectly
    let albumArtX = width / 2;
    let albumArtY = height * 0.38;
    let textBaseX = width / 2;
    let textBaseY = height * 0.72;
    let waveBaselineY = height * 0.85;
    let albumArtSize = Math.min(width, height) * 0.36;
    let lyricX = width / 2;
    let lyricY = height * 0.58;
    let textAlignment: CanvasTextAlign = 'center';

    let spectralStartX = width * 0.14;
    let spectralEndX = width * 0.86;

    if (aspect === 'square') {
      albumArtX = width / 2;
      albumArtY = height * 0.40;
      textBaseX = width / 2;
      textBaseY = height * 0.76;
      waveBaselineY = height * 0.88;
      albumArtSize = Math.min(width, height) * 0.42;
      lyricX = width / 2;
      lyricY = height * 0.60;
      textAlignment = 'center';
      
      spectralStartX = width * 0.12;
      spectralEndX = width * 0.88;
    } else if (aspect === 'horizontal') {
      // Split side-by-side bento layout for cinematic landscape videos
      albumArtX = width * 0.30;
      albumArtY = height * 0.48;
      textBaseX = width * 0.70;
      textBaseY = height * 0.36;
      waveBaselineY = height * 0.88;
      albumArtSize = Math.min(width, height) * 0.52;
      lyricX = width * 0.70;
      lyricY = height * 0.62;
      textAlignment = 'center';
      
      spectralStartX = width * 0.52;
      spectralEndX = width * 0.88;
    } else { // vertical
      albumArtX = width / 2;
      albumArtY = height * 0.35;
      textBaseX = width / 2;
      textBaseY = height * 0.74;
      waveBaselineY = height * 0.88;
      albumArtSize = Math.min(width, height) * 0.45;
      lyricX = width / 2;
      lyricY = height * 0.58;
      textAlignment = 'center';
      
      spectralStartX = width * 0.14;
      spectralEndX = width * 0.86;
    }

    const trackName = activeTrack?.name || name;
    const artistName = activeTrack?.artist || artist;

    // Solve average energy (bass)
    let rawBass = 0;
    const bassLength = Math.min(8, freqData.length);
    for (let i = 0; i < bassLength; i++) {
      rawBass += freqData[i];
    }
    const bassAverage = bassLength > 0 ? (rawBass / bassLength) : 0;
    const bassNormalized = bassAverage / 255;

    // Add rhythmic movement
    const bpmVal = activeTrack?.bpm || 120;
    const motionPulse = isPlayingPreview ? (bassNormalized) : (Math.max(0, Math.sin(time * Math.PI * 2 * bpmVal / 60) * 0.12));
    const artScale = 1.0 + motionPulse * 0.12;

    // Calculate lens shake and translation offsets for transition spikes
    let shiftX = 0;
    let shiftY = 0;
    let globalScale = 1.0;
    if (shakeBeat && motionPulse > 0.12) {
      const shakeAmt = motionPulse * chromaticOffset;
      shiftX = (Math.random() - 0.5) * shakeAmt;
      shiftY = (Math.random() - 0.5) * shakeAmt;
      globalScale = 1.0 + motionPulse * 0.04;
    }

    // Apply Hardware-Accelerated Color Correction (CC/Color Grading Presets)
    let filterString = 'none';
    if ('filter' in ctx) {
      const contrastPct = Math.round(contrast * 100);
      const saturatePct = Math.round(saturation * 100);
      
      if (ccPreset === 'templar') {
        // High contrast, deep obsidian dark aesthetic with cold metallic details
        filterString = `contrast(${Math.max(145, contrastPct + 35)}%) saturate(${Math.max(50, saturatePct - 25)}%) brightness(92%)`;
      } else if (ccPreset === 'cyber') {
        // Stark blue shadows with blazing neon cyan and pinks
        filterString = `contrast(${Math.max(115, contrastPct + 10)}%) saturate(${Math.max(125, saturatePct + 25)}%) hue-rotate(140deg)`;
      } else if (ccPreset === 'noir') {
        // Gritty, intense black & white monochrome slate with micro-contrast
        filterString = `grayscale(100%) contrast(${Math.max(150, contrastPct + 40)}%) brightness(90%)`;
      } else if (ccPreset === 'gold') {
        // Golden embers
        filterString = `contrast(${contrastPct}%) saturate(${Math.max(110, saturatePct + 20)}%) sepia(35%) brightness(95%)`;
      } else if (ccPreset === 'vhs') {
        // Warm nostalgic CRT glow
        filterString = `contrast(${Math.max(80, contrastPct - 15)}%) saturate(${Math.max(115, saturatePct + 25)}%) sepia(12%) hue-rotate(-15deg)`;
      } else {
        filterString = `contrast(${contrastPct}%) saturate(${saturatePct}%)`;
      }
      ctx.filter = filterString;
    }

    // 2. Draw Blurred Cover Art background for depth (complete control: showBgBlur)
    if (imgElement && showBgBlur) {
      ctx.save();
      ctx.globalAlpha = ccPreset === 'templar' ? 0.12 : 0.20;
      
      const imgAR = imgElement.width / imgElement.height;
      const canvasAR = width / height;
      let renderW = width;
      let renderH = height;
      let x = 0;
      let y = 0;

      if (imgAR > canvasAR) {
        renderH = height;
        renderW = height * imgAR;
        x = (width - renderW) / 2;
      } else {
        renderW = width;
        renderH = width / imgAR;
        y = (height - renderH) / 2;
      }
      
      const zoom = 1.0 + Math.sin(time * 0.15) * 0.04;
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom * globalScale, zoom * globalScale);
      ctx.drawImage(imgElement, x - width / 2, y - height / 2, renderW, renderH);
      ctx.restore();
    }

    // Dynamic grid overlay if enabled for professional layout alignment
    if (showGridOverlay) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let gx = 0; gx < width; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Main coordinates jolt effect for organic beat transition moves
    ctx.save();
    if (shakeBeat && (shiftX !== 0 || shiftY !== 0 || globalScale !== 1.0)) {
      ctx.translate(width / 2, height / 2);
      ctx.scale(globalScale, globalScale);
      ctx.translate(-width / 2 + shiftX, -height / 2 + shiftY);
    }

    // 3. Draw style-specific overlays
    ctx.save();
    if (style === 'minimalist') {
      // Tech orbit rings (completely controllable)
      if (showOrbitRings) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(albumArtX, albumArtY, albumArtSize * 0.6 * artScale, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Sharp clean waveform lines
      if (showSpectralBars) {
        const barCount = 48;
        const totalW = spectralEndX - spectralStartX;
        const barWidth = totalW / barCount;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        const startX = spectralStartX;

        for (let i = 0; i < barCount; i++) {
          const freqVal = freqData[Math.floor((i / barCount) * freqData.length)] || 0;
          const normVal = freqVal / 255;
          const h = Math.max(3, normVal * 70 + Math.abs(Math.sin(time * 3.5 + i * 0.15)) * 6);
          ctx.fillRect(startX + i * barWidth, waveBaselineY - h, barWidth - 1.5, h);
        }
      }
    } 
    else if (style === 'grunge') {
      // Clean up aggressive red generic details if they set borders off
      if (showOrbitRings || showGridOverlay) {
        const glitchOffset = Math.random() < 0.07 ? (Math.random() - 0.5) * 14 : 0;
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(albumArtX - albumArtSize * 1.1 + glitchOffset, albumArtY - albumArtSize * 1.1, albumArtSize * 2.2, albumArtSize * 2.2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.beginPath();
        ctx.moveTo(albumArtX + glitchOffset, 0);
        ctx.lineTo(albumArtX + glitchOffset, height);
        ctx.moveTo(0, albumArtY);
        ctx.lineTo(width, albumArtY);
        ctx.stroke();
      }

      // Dark spark frequencies
      if (showSpectralBars) {
        const points = 24;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const startX = spectralStartX;
        const stepX = (spectralEndX - spectralStartX) / points;

        for (let i = 0; i <= points; i++) {
          const freqVal = freqData[Math.floor((i / points) * freqData.length)] || 0;
          const h = (freqVal / 255) * 90 * (Math.random() * 0.5 + 0.75);
          const curX = startX + (i * stepX);
          const curY = waveBaselineY - h;

          if (i === 0) ctx.moveTo(curX, curY);
          else ctx.lineTo(curX, curY);
        }
        ctx.stroke();
      }
    } 
    else if (style === 'vibrant') {
      // Glowing ambient overlay
      const glowGrad = ctx.createRadialGradient(albumArtX, albumArtY, 20, albumArtX, albumArtY, albumArtSize * 1.1);
      glowGrad.addColorStop(0, 'rgba(249, 115, 22, 0.04)');
      glowGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.08)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // Radial neon fire bars expanding outwards
      if (showSpectralBars) {
        const outerRad = albumArtSize * 0.65;
        const numBars = 50;
        ctx.save();
        ctx.translate(albumArtX, albumArtY);
        ctx.rotate(time * 0.05);
        
        for (let i = 0; i < numBars; i++) {
          const angle = (i / numBars) * Math.PI * 2;
          const freqVal = freqData[Math.floor((i / numBars) * freqData.length)] || 0;
          const normVal = freqVal / 255;
          const length = 4 + normVal * 75 + Math.abs(Math.sin(time * 4.5 + i * 0.4)) * 8;

          ctx.rotate(angle);
          const barGrad = ctx.createLinearGradient(0, outerRad, 0, outerRad + length);
          barGrad.addColorStop(0, '#f97316');
          barGrad.addColorStop(1, '#a855f7');
          ctx.fillStyle = barGrad;

          ctx.fillRect(-1.5, outerRad, 3, length);
          ctx.rotate(-angle);
        }
        ctx.restore();
      }
    } 
    else if (style === 'abstract') {
      if (showSpectralBars) {
        // Flowing bezier liquid frequencies
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const totalW = spectralEndX - spectralStartX;
        for (let xCoord = spectralStartX; xCoord < spectralEndX; xCoord += 6) {
          const progress = (xCoord - spectralStartX) / totalW;
          const freqSample = freqData[Math.floor(progress * freqData.length)] || 0;
          const freqNorm = freqSample / 255;
          const valY = waveBaselineY + Math.sin(progress * Math.PI * 3 + time * 1.8) * (24 + freqNorm * 54) + Math.cos(progress * Math.PI * 6 + time * 2.5) * 12;
          if (xCoord === spectralStartX) ctx.moveTo(xCoord, valY);
          else ctx.lineTo(xCoord, valY);
        }
        ctx.stroke();
      }

      // Intertwining orbit rings centering on adaptive dynamic art
      if (showOrbitRings) {
        for (let rNode = 0; rNode < 3; rNode++) {
          const expandFactor = 1.0 + rNode * 0.14 + Math.sin(time * 1.2 + rNode) * 0.06 + motionPulse * 0.08;
          ctx.strokeStyle = `rgba(59, 130, 246, ${0.12 - rNode * 0.03})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(albumArtX, albumArtY, albumArtSize * 0.65 * expandFactor, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    } 
    else if (style === 'cyber_organic') {
      // 1. Draw elegant concentric metallic silver rings with technical tics around the album art
      if (showOrbitRings) {
        ctx.strokeStyle = 'rgba(220, 225, 230, 0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(albumArtX, albumArtY, albumArtSize * 0.62 * artScale, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(220, 225, 230, 0.05)';
        ctx.beginPath();
        ctx.arc(albumArtX, albumArtY, albumArtSize * 0.78 * artScale, 0, Math.PI * 2);
        ctx.stroke();

        // Technical rotating cursor ticks matching high-fashion branding
        ctx.save();
        ctx.translate(albumArtX, albumArtY);
        ctx.rotate(time * 0.35);
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.45)'; // Amber
        ctx.lineWidth = 2.5;
        for (let tIdx = 0; tIdx < 4; tIdx++) {
          const angle = (tIdx / 4) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(0, 0, albumArtSize * 0.62 * artScale, angle - 0.08, angle + 0.08);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. Intense Amber/Fire particle stream pulsing to the rhythmic bounce & BPM
      ctx.save();
      const sparkCount = 20;
      for (let sIdx = 0; sIdx < sparkCount; sIdx++) {
        const seedVal = Math.sin(sIdx * 291.55) * 0.5 + 0.5;
        const drift = (time * (0.6 + seedVal * 1.4) + seedVal * 200) % 1;
        const radius = albumArtSize * (0.55 + seedVal * 1.0) * artScale;
        const theta = (sIdx / sparkCount) * Math.PI * 2 + Math.sin(time * 0.4 + seedVal * 15) * 0.5;
        
        const sparkX = albumArtX + Math.cos(theta) * radius * (1 - drift * 0.15);
        const sparkY = albumArtY + Math.sin(theta) * radius * (1 - drift * 0.15) - drift * 60;
        
        const size = (4.0 * (1 - drift)) * (1.0 + motionPulse * 1.3);
        
        // Custom neon-noir amber glow circle
        const sparkGrad = ctx.createRadialGradient(sparkX, sparkY, 0, sparkX, sparkY, size * 2.2);
        sparkGrad.addColorStop(0, 'rgba(251, 146, 60, 1.0)'); // Stark Amber
        sparkGrad.addColorStop(0.35, 'rgba(239, 68, 68, 0.85)'); // Fiery Red
        sparkGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = sparkGrad;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, size * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 3. Dense Obsidian Vignette Overlay
      const obsidianGrad = ctx.createRadialGradient(albumArtX, albumArtY, albumArtSize * 0.4, albumArtX, albumArtY, albumArtSize * 1.4);
      obsidianGrad.addColorStop(0, 'rgba(0,0,0,0)');
      obsidianGrad.addColorStop(0.5, 'rgba(9,9,11,0.55)');
      obsidianGrad.addColorStop(1, '#09090b');
      ctx.fillStyle = obsidianGrad;
      ctx.fillRect(0, 0, width, height);

      // 4. Double-sided reactive spectral frequency bars
      if (showSpectralBars) {
        const barCount = 44;
        const startX = spectralStartX;
        const endX = spectralEndX;
        const usableWidth = endX - startX;
        const barWidth = usableWidth / barCount;
        
        for (let i = 0; i < barCount; i++) {
          const freqVal = freqData[Math.floor((i / barCount) * freqData.length)] || 0;
          const normVal = freqVal / 255;
          const h = Math.max(3, normVal * 95 + Math.sin(time * 5.5 + i * 0.25) * 6);
          const drawX = startX + i * barWidth;
          
          const isAmber = i % 2 === 0;
          const barGrad = ctx.createLinearGradient(drawX, waveBaselineY - h/2, drawX, waveBaselineY + h/2);
          if (isAmber) {
            barGrad.addColorStop(0, 'rgba(239, 68, 68, 0.1)');
            barGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.95)'); // High brightness warm amber
            barGrad.addColorStop(1, 'rgba(239, 68, 68, 0.1)');
          } else {
            barGrad.addColorStop(0, 'rgba(100, 116, 139, 0.1)');
            barGrad.addColorStop(0.5, 'rgba(226, 232, 240, 0.9)'); // Stark metallic silver
            barGrad.addColorStop(1, 'rgba(100, 116, 139, 0.1)');
          }
          
          ctx.fillStyle = barGrad;
          ctx.fillRect(drawX, waveBaselineY - h / 2, barWidth - 1.8, h);
        }
      }
    }
    ctx.restore();

    // 4. Center image card drawing
    if (imgElement && albumArtShape !== 'hidden') {
      const artSize = albumArtSize * artScale;
      ctx.save();
      ctx.translate(albumArtX, albumArtY);

      if (style === 'vibrant' || albumArtShape === 'circle') {
        ctx.rotate(time * 0.11);
      } else if (style === 'abstract') {
        ctx.rotate(Math.sin(time * 0.08) * 0.12);
      } else if (style === 'cyber_organic') {
        ctx.rotate(Math.sin(time * 0.14) * 0.04 + Math.cos(time * 0.06) * 0.02);
      }

      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 32 * shadowStrength;
      ctx.shadowOffsetY = 12 * shadowStrength;

      ctx.beginPath();
      if (albumArtShape === 'circle') {
        ctx.arc(0, 0, artSize / 2, 0, Math.PI * 2);
      } else {
        if (ctx.roundRect) {
          ctx.roundRect(-artSize / 2, -artSize / 2, artSize, artSize, 18);
        } else {
          ctx.rect(-artSize / 2, -artSize / 2, artSize, artSize);
        }
      }
      ctx.clip();

      // Non-distortion auto cover fit formatting for non-square album art
      if (imgElement.width > 0 && imgElement.height > 0) {
        const imgAR = imgElement.width / imgElement.height;
        let sWidth = imgElement.width;
        let sHeight = imgElement.height;
        let sx = 0;
        let sy = 0;

        if (imgAR > 1) {
          // Landscape cover: crop details on left/right to fill the square box beautifully
          sWidth = imgElement.height;
          sx = (imgElement.width - sWidth) / 2;
        } else {
          // Portrait cover: crop details on top/bottom to fill the square box beautifully
          sHeight = imgElement.width;
          sy = (imgElement.height - sHeight) / 2;
        }
        ctx.drawImage(imgElement, sx, sy, sWidth, sHeight, -artSize / 2, -artSize / 2, artSize, artSize);
      } else {
        ctx.drawImage(imgElement, -artSize / 2, -artSize / 2, artSize, artSize);
      }
      ctx.restore();

      // Central record vinyl marker for vibrant/circular art styles
      if (style === 'vibrant' || albumArtShape === 'circle') {
        ctx.save();
        ctx.translate(albumArtX, albumArtY);
        ctx.fillStyle = '#18181b';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // 5. Stylistic metadata captions
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 italic 15px "Inter", sans-serif';
    if (style === 'grunge') {
      ctx.font = '900 italic 13px monospace';
      ctx.fillStyle = '#ef4444';
    } else if (style === 'cyber_organic') {
      ctx.font = '900 italic 14px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#fb923c';
    }
    ctx.textAlign = 'center';
    
    const pulseFade = 0.82 + Math.sin(time * 5) * 0.18;
    ctx.save();
    ctx.globalAlpha = style === 'grunge' ? 1.0 : pulseFade;
    ctx.fillText(`${trackName.toUpperCase()}`, textBaseX, textBaseY);
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.44)';
    ctx.font = '800 uppercase tracking-widest 9px monospace';
    ctx.fillText(`${artistName}`, textBaseX, textBaseY + 20);

    // Dynamic watermarks
    if (showWatermarks) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.font = '900 tracking-widest 7px monospace';
      ctx.fillText(`PROMO ENGINE v1.1 // ASPECT: ${aspect.toUpperCase()} // CC: ${ccPreset.toUpperCase()}`, width / 2, height - 20);
    }

    // 6. Embedded Lip Sync / Dynamic Lyric Overlay
    if (overlayLyrics && parsedLyrics && parsedLyrics.length > 0) {
      let activeLine = null;
      for (let i = 0; i < parsedLyrics.length; i++) {
        if (time >= parsedLyrics[i].time) {
          activeLine = parsedLyrics[i];
        } else {
          break;
        }
      }
      
      if (activeLine && activeLine.text.trim()) {
        ctx.save();
        let fontName = '"Inter", sans-serif';
        let uppercase = true;
        // Dynamic auto-scaling font size in proportion to actual canvas dimension
        const baseWidth = aspect === 'vertical' ? 360 : aspect === 'square' ? 400 : 480;
        const fontScaleFactor = width / baseWidth;
        const fontSizePx = Math.max(12, Math.round(lyricFontSize * fontScaleFactor));
        const fontSize = `${fontSizePx}px`;
        
        if (lyricStyle === 'retro') {
          fontName = '"Space Grotesk", sans-serif';
          ctx.font = `${lyricFontWeight} italic ${fontSize} ${fontName}`;
          ctx.fillStyle = lyricColor || '#f97316';
          ctx.shadowColor = lyricColor || '#f97316';
          ctx.shadowBlur = Math.round(18 * fontScaleFactor);
        } else if (lyricStyle === 'serif') {
          fontName = '"Playfair Display", serif';
          ctx.font = `italic ${lyricFontWeight} ${fontSize} ${fontName}`;
          ctx.fillStyle = lyricColor || '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.7)';
          ctx.shadowBlur = Math.round(12 * fontScaleFactor);
          uppercase = false;
        } else if (lyricStyle === 'mono') {
          fontName = '"JetBrains Mono", monospace';
          ctx.font = `${lyricFontWeight} ${fontSize} ${fontName}`;
          ctx.fillStyle = lyricColor || '#10b981';
          ctx.shadowColor = lyricColor || '#10b981';
          ctx.shadowBlur = Math.round(14 * fontScaleFactor);
        } else {
          fontName = '"Inter", sans-serif';
          ctx.font = `${lyricFontWeight} ${fontSize} ${fontName}`;
          ctx.fillStyle = lyricColor || '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = Math.round(15 * fontScaleFactor);
        }
        
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(3, Math.round(8 * fontScaleFactor));
        
        let displayText = uppercase ? activeLine.text.toUpperCase() : activeLine.text;
        
        let scaleEffect = 1.0;
        let opacity = 1.0;
        let translateY = 0;
        const timeDelta = time - activeLine.time;
        let drawTextLines: string[] = [];

        // Dynamic formatting transitions
        if (lyricFormat === 'word') {
          const rawWords = activeLine.text.split(/\s+/).filter(Boolean);
          if (rawWords.length > 0) {
            let lineDuration = 4.0;
            const activeIndex = parsedLyrics.indexOf(activeLine);
            if (activeIndex !== -1 && activeIndex < parsedLyrics.length - 1) {
              lineDuration = Math.max(1.0, parsedLyrics[activeIndex + 1].time - activeLine.time);
            }
            
            // Highlight active word
            const wordRatio = Math.min(0.99, timeDelta / lineDuration);
            const wordIndex = Math.min(rawWords.length - 1, Math.floor(wordRatio * rawWords.length));
            const activeWord = uppercase ? rawWords[wordIndex].toUpperCase() : rawWords[wordIndex];
            
            // Pop transition for individual flashing word
            const wordDuration = lineDuration / rawWords.length;
            const wordTimeDelta = timeDelta % wordDuration;
            const t = Math.min(1.0, wordTimeDelta / Math.min(0.18, wordDuration));
            scaleEffect = 0.85 + Math.sin(t * Math.PI * 0.5) * 0.22;
            opacity = 1.0;
            drawTextLines = [activeWord];
          } else {
            drawTextLines = [''];
          }
        } else {
          // Bounded multi-line wrapping layer to prevent closed captions from bleeding off-canvas
          const maxWidth = width * 0.82;
          const words = displayText.split(' ');
          let currentLine = '';

          for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const testWidth = ctx.measureText(testLine).width;
            if (testWidth > maxWidth && i > 0) {
              drawTextLines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) {
            drawTextLines.push(currentLine);
          }

          if (lyricFormat === 'slide') {
            const slideDuration = 0.45;
            if (timeDelta < slideDuration) {
              const t = timeDelta / slideDuration;
              const ease = 1 - Math.pow(1 - t, 3); // Cubic ease out
              translateY = (1 - ease) * (fontSizePx * 1.0);
              opacity = Math.min(1.0, t * 1.5);
            } else {
              translateY = 0;
              opacity = 1.0;
            }
            scaleEffect = 1.0;
          } else if (lyricFormat === 'fade') {
            const fadeDuration = 0.35;
            if (timeDelta < fadeDuration) {
              opacity = timeDelta / fadeDuration;
            } else {
              opacity = 1.0;
            }
            scaleEffect = 1.0;
          } else if (lyricFormat === 'zoom') {
            const zoomDuration = 0.5;
            if (timeDelta < zoomDuration) {
              const t = timeDelta / zoomDuration;
              scaleEffect = 1.35 - t * 0.35;
              opacity = t;
            } else {
              const drift = timeDelta - zoomDuration;
              scaleEffect = 1.0 + Math.min(0.04, drift * 0.003);
              opacity = 1.0;
            }
          } else {
            // Default: 'bounce' Style
            const bounceDuration = 0.5;
            if (timeDelta < bounceDuration) {
              const t = timeDelta / bounceDuration;
              scaleEffect = 0.70 + Math.sin(t * Math.PI * 1.4) * 0.35 * (1 - t);
              opacity = Math.min(1.0, t * 1.5);
            } else {
              scaleEffect = 1.0;
              opacity = 1.0;
            }
          }
        }

        // Place text in precise dynamic quadrant
        const lyricYCoord = lyricY;
        
        ctx.globalAlpha = opacity;
        ctx.translate(lyricX, lyricYCoord + translateY);
        ctx.scale(scaleEffect, scaleEffect);

        const lineHeight = fontSizePx * lyricLineHeight; // Comfortable leading for multi-line subtitles
        const totalHeight = (drawTextLines.length - 1) * lineHeight;
        const startY = -totalHeight / 2; // Harmonious balance: center lines on the target vertical coordinate

        for (let i = 0; i < drawTextLines.length; i++) {
          const lineY = startY + i * lineHeight;
          ctx.strokeText(drawTextLines[i], 0, lineY);
          ctx.fillText(drawTextLines[i], 0, lineY);
        }
        
        ctx.restore();
      }
    }

    ctx.restore(); // Restore main coordinates translate jolt

    // Reset filter for subsequent graphic pass overlays
    if ('filter' in ctx) {
      ctx.filter = 'none';
    }

    // 7. Dynamic Strobe Beat Flash Transition Overlay
    if (strobeBeat && motionPulse > 0.15) {
      ctx.save();
      ctx.globalAlpha = motionPulse * strobeBeatIntensity; // Reactive opacity based on peak energy
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 8. Cinematic Vignette Frame Shading overlay
    if (vignetteStrength > 0) {
      ctx.save();
      const vigGrad = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.35,
        width / 2, height / 2, Math.max(width, height) * 0.75
      );
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vigGrad.addColorStop(1, `rgba(4,4,6,${vignetteStrength})`);
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 9. Filmic analog noise grain overlay
    if (grainStrength > 0) {
      ctx.save();
      ctx.globalAlpha = grainStrength;
      for (let gi = 0; gi < 280; gi++) {
        const gx = Math.random() * width;
        const gy = Math.random() * height;
        const gSize = Math.random() * 1.5 + 0.5;
        ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
        ctx.fillRect(gx, gy, gSize, gSize);
      }
      ctx.restore();
    }
  };

  // Pre-load audio track for low-latency Web Audio API action
  const loadAudio = async (): Promise<AudioBuffer | null> => {
    if (decodedBuffer) return decodedBuffer;
    if (!activeTrack?.file_url) return null;
    
    setAudioDecoding(true);
    try {
      let activeCtx = audioContextRef.current;
      if (!activeCtx || activeCtx.state === 'closed') {
        activeCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = activeCtx;
      }
      
      const response = await fetch(activeTrack.file_url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await activeCtx.decodeAudioData(arrayBuffer);
      setDecodedBuffer(buffer);
      setAudioDecoded(true);
      setAudioDecoding(false);
      return buffer;
    } catch (err) {
      console.error("Web Audio API decode error:", err);
      setAudioDecoding(false);
      return null;
    }
  };

  const startPlayback = async () => {
    try {
      let ctx = audioContextRef.current;
      if (!ctx || ctx.state === 'closed') {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;
      }
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      let buffer = decodedBuffer;
      if (!buffer && activeTrack?.file_url) {
        buffer = await loadAudio();
      }

      stopPlaybackSources();

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.8, ctx.currentTime);

      analyserNodeRef.current = analyser;
      gainNodeRef.current = gainNode;

      if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(analyser);
        analyser.connect(gainNode);
        gainNode.connect(ctx.destination);
        sourceNodeRef.current = source;

        if (clipEnabled) {
          source.loop = true;
          source.loopStart = clipStart;
          source.loopEnd = clipEnd;

          let offset = pausedTimeRef.current;
          if (offset < clipStart || offset > clipEnd) {
            offset = clipStart;
          }

          source.start(0, offset, clipEnd - offset);
          playbackStartRef.current = ctx.currentTime - (offset - clipStart);
        } else {
          source.loop = true;
          const offset = pausedTimeRef.current % buffer.duration;
          source.start(0, offset);
          playbackStartRef.current = ctx.currentTime - offset;
        }
        
        setIsPlayingPreview(true);
      } else {
        // Fallback procedural visual sequencer synth
        startProceduralBeat(ctx, analyser, gainNode);
        setIsPlayingPreview(true);
      }
    } catch (e) {
      console.error("Failed starting Web Audio:", e);
    }
  };

  const stopPlaybackSources = () => {
    try {
      sourceNodeRef.current?.stop();
    } catch (e) {}
    sourceNodeRef.current = null;

    if (proceduralTimerRef.current) {
      clearInterval(proceduralTimerRef.current);
      proceduralTimerRef.current = null;
    }
  };

  const pausePlayback = () => {
    if (audioContextRef.current && isPlayingPreview) {
      pausedTimeRef.current = audioContextRef.current.currentTime - playbackStartRef.current;
      stopPlaybackSources();
      setIsPlayingPreview(false);
    }
  };

  const startProceduralBeat = (ctx: AudioContext, analyser: AnalyserNode, gainNode: GainNode) => {
    const trackBpm = activeTrack?.bpm || 120;
    const intervalMs = (60 / trackBpm) * 1000;
    let seqStep = 0;

    analyser.connect(gainNode);
    gainNode.connect(ctx.destination);

    playbackStartRef.current = ctx.currentTime - pausedTimeRef.current;

    const playStep = () => {
      if (ctx.state === 'suspended') return;
      const time = ctx.currentTime;
      
      // Kick drum synthesized node
      if (seqStep % 2 === 0) {
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.connect(amp);
        amp.connect(analyser);

        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.16);
        amp.gain.setValueAtTime(1.0, time);
        amp.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        osc.start(time);
        osc.stop(time + 0.2);
      }

      // High register pluck synth
      if (seqStep % 4 !== 0) {
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.connect(amp);
        amp.connect(analyser);

        const pentatonicScale = [261.63, 293.66, 329.63, 392.00, 440.00];
        const freq = pentatonicScale[(seqStep * 3) % pentatonicScale.length];

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        amp.gain.setValueAtTime(0.35, time);
        amp.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

        osc.start(time);
        osc.stop(time + 0.142);
      }

      seqStep = (seqStep + 1) % 16;
    };

    playStep();
    proceduralTimerRef.current = setInterval(playStep, intervalMs);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const totalDuration = activeTrack?.duration || 15;
    const targetSeconds = percentage * totalDuration;

    pausedTimeRef.current = targetSeconds;
    setCurrentTime(targetSeconds);

    if (isPlayingPreview) {
      startPlayback(); 
    }
  };

  const startPreviewLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    let coverImg: HTMLImageElement | null = null;
    const coverArtUrl = activeTrack?.image_url || '/ogbeatz_logo.svg';
    if (coverArtUrl) {
      coverImg = new Image();
      coverImg.crossOrigin = 'anonymous';
      coverImg.src = coverArtUrl;
    }

    const runLoop = () => {
      const activeCanvas = canvasRef.current;
      if (!activeCanvas) {
        animationFrameRef.current = requestAnimationFrame(runLoop);
        return;
      }

      const ctx = activeCanvas.getContext('2d');
      if (!ctx) return;

      const freqs = new Uint8Array(128);
      if (analyserNodeRef.current && isPlayingPreview) {
        analyserNodeRef.current.getByteFrequencyData(freqs);
      }

      let playbackSecs = 0;
      const totalDur = clipEnabled ? (clipEnd - clipStart) : (activeTrack?.duration || 15);
      
      if (audioContextRef.current && isPlayingPreview) {
        playbackSecs = audioContextRef.current.currentTime - playbackStartRef.current;
        if (clipEnabled) {
          playbackSecs = clipStart + (playbackSecs % Math.max(0.1, totalDur));
        } else if (playbackSecs >= totalDur) {
          playbackSecs = playbackSecs % totalDur;
        }
      } else {
        playbackSecs = pausedTimeRef.current;
        if (clipEnabled && (playbackSecs < clipStart || playbackSecs > clipEnd)) {
          playbackSecs = clipStart;
        }
      }
      
      setCurrentTime(playbackSecs);

      drawMotionGraphicFrame(
        ctx,
        activeCanvas.width,
        activeCanvas.height,
        playbackSecs,
        clipEnabled ? (clipEnd - clipStart) : totalDur,
        style,
        resolvedAspectRatio,
        freqs,
        coverImg
      );

      // Render interactive visual fades in live preview
      const relativeElapsed = clipEnabled ? Math.max(0, playbackSecs - clipStart) : playbackSecs;
      
      if (fadeInEnabled && relativeElapsed < fadeInDuration) {
        const alpha = Math.max(0, Math.min(1, 1.0 - (relativeElapsed / fadeInDuration)));
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, activeCanvas.width, activeCanvas.height);
      } else if (fadeOutEnabled && relativeElapsed > (totalDur - fadeOutDuration)) {
        const alpha = Math.max(0, Math.min(1, (relativeElapsed - (totalDur - fadeOutDuration)) / fadeOutDuration));
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, activeCanvas.width, activeCanvas.height);
      }

      animationFrameRef.current = requestAnimationFrame(runLoop);
    };

    animationFrameRef.current = requestAnimationFrame(runLoop);
  };

  useEffect(() => {
    loadAudio();
    return () => {
      try {
        sourceNodeRef.current?.stop();
      } catch (e) {}
      if (proceduralTimerRef.current) {
        clearInterval(proceduralTimerRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    startPreviewLoop();
  }, [style, resolvedAspectRatio, isPlayingPreview]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!generatedVideo) return;
    setIsExporting(true);

    try {
      // Small progress Toast to reassure the user
      addToast("Preparing premium high-fidelity file transfer...", "info");
      
      // Small delay to simulate file prep and assembly packaging
      await new Promise(resolve => setTimeout(resolve, 850));
      
      // 1. Primary Local Retrieval: Use raw in-memory Blob directly if present.
      // This completely bypasses network fetching, CORS, and cross-origin sandboxed iframe errors!
      let blob = generatedVideo.video_data;
      
      // 2. Secondary Fallback: Fetch only if the raw blob is missing but we have a valid video_url
      if (!blob && generatedVideo.video_url) {
        try {
          const response = await fetch(generatedVideo.video_url);
          blob = await response.blob();
        } catch (fetchErr) {
          console.warn("Could not fetch video Blob from URL directly:", fetchErr);
        }
      }

      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const isMp4 = blob.type.toLowerCase().includes('mp4');
        const extension = isMp4 ? 'mp4' : 'webm';
        const fileName = `${name.replace(/\s+/g, '_')}_Master_Promo.${extension}`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          try {
            document.body.removeChild(a);
          } catch (remErr) {}
          setIsExporting(false);
          addToast("Master Promo Video exported successfully!", "success");
        }, 150);
        return;
      }

      // 3. Last-resort fallback: Direct Anchor URL Click download
      if (generatedVideo.video_url) {
        const a = document.createElement('a');
        a.href = generatedVideo.video_url;
        a.target = "_blank";
        a.download = `${name.replace(/\s+/g, '_')}_Promo.mp4`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try {
            document.body.removeChild(a);
          } catch (e) {}
          setIsExporting(false);
        }, 150);
      } else {
        throw new Error("No video URL or video binary found to export.");
      }
    } catch (error: any) {
      console.error('Export failed:', error);
      setIsExporting(false);
      addToast("Failed to auto-download. Click 'Open in New Tab' above to download without restrictions.", "error");
      
      // Open in new window if possible as absolute emergency fallback
      if (generatedVideo?.video_url) {
        window.open(generatedVideo.video_url, '_blank');
      }
    }
  };

  const handleGenerate = async () => {
    setStep('processing');
    setProgress(5);

    try {
      // 1. Resolve actual duration if missing
      let finalDuration = activeTrack?.duration || 0;
      if (finalDuration === 0 && activeTrack?.file_url) {
        try {
          const tempAudio = new Audio();
          tempAudio.src = activeTrack.file_url;
          finalDuration = await new Promise((resolve) => {
            tempAudio.onloadedmetadata = () => resolve(tempAudio.duration);
            tempAudio.onerror = () => resolve(15); // Fallback on error
            setTimeout(() => resolve(15), 3000); // Fallback to 15s if slow
          });
        } catch (e) {
          finalDuration = 15;
        }
      } else if (finalDuration === 0) {
        finalDuration = 15; // Default if no file
      }

      // 2. Analyze aesthetic with Gemini
      const trackInfo = activeTrack || { name, artist, bpm: 120, key_signature: 'C' };
      const aes = await generateVideoAesthetic(trackInfo);
      setAesthetic(aes);
      setProgress(20);

      // 3. High-fidelity Video Generation (Canvas + MediaRecorder)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');
      
      // Dynamic Sizing based on Aspect Ratio
      if (resolvedAspectRatio === 'vertical') {
        canvas.width = 720;
        canvas.height = 1280;
      } else if (resolvedAspectRatio === 'square') {
        canvas.width = 1080;
        canvas.height = 1080;
      } else {
        canvas.width = 1280;
        canvas.height = 720;
      }

      // Load Image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = activeTrack?.image_url || '/ogbeatz_logo.svg';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const stream = canvas.captureStream(30);
      
      // Load Audio for the stream
      let audioTrack: MediaStreamTrack | null = null;
      let audioSource: AudioBufferSourceNode | null = null;
      let audioCtx: AudioContext | null = null;

      if (activeTrack?.file_url) {
        try {
          audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const audioResponse = await fetch(activeTrack.file_url);
          const audioData = await audioResponse.arrayBuffer();
          const audioBuffer = await audioCtx.decodeAudioData(audioData);
          
          const audioDest = audioCtx.createMediaStreamDestination();
          const renderGain = audioCtx.createGain();
          
          audioSource = audioCtx.createBufferSource();
          audioSource.buffer = audioBuffer;
          audioSource.loop = false; // Don't loop if we match duration
          
          audioSource.connect(renderGain);
          renderGain.connect(audioDest);

          const totalDuration = clipEnabled ? (clipEnd - clipStart) : finalDuration;
          const curTime = audioCtx.currentTime;

          if (fadeInEnabled) {
            renderGain.gain.setValueAtTime(0, curTime);
            renderGain.gain.linearRampToValueAtTime(1, curTime + fadeInDuration);
          } else {
            renderGain.gain.setValueAtTime(1, curTime);
          }

          if (fadeOutEnabled) {
            renderGain.gain.setValueAtTime(1, curTime + totalDuration - fadeOutDuration);
            renderGain.gain.linearRampToValueAtTime(0, curTime + totalDuration);
          }
          
          audioTrack = audioDest.stream.getAudioTracks()[0];
        } catch (e) {
          console.warn("Failed to prepare audio track:", e);
        }
      }

      const combinedStream = new MediaStream([
        ...stream.getVideoTracks(),
        ...(audioTrack ? [audioTrack] : [])
      ]);
      
      // Prioritize MP4 for QuickTime/Apple compatibility if supported
      let mimeType = 'video/mp4;codecs=avc1,mp4a.40.2'; 
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp9,opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=h264'; // Experimental in some browsers
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = ''; // Default browser choice
      }

      const mediaRecorder = new MediaRecorder(combinedStream, mimeType ? {
        mimeType: mimeType,
        videoBitsPerSecond: 5000000 // 5Mbps for HQ
      } : {
        videoBitsPerSecond: 5000000
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const renderDuration = (clipEnabled ? (clipEnd - clipStart) : finalDuration) * 1000; // Track duration in ms
      const startTime = performance.now();
      
      return new Promise<void>((resolve) => {
        mediaRecorder.onstop = async () => {
          if (audioCtx) {
            audioSource?.stop();
            audioCtx.close();
          }

          // Use the actual mimeType produced by the recorder
          const finalMime = mediaRecorder.mimeType || 'video/webm';
          const blob = new Blob(chunks, { type: finalMime }); 
          const videoUrl = URL.createObjectURL(blob);
          const generatedId = uuidv4();
          
          const newVideo: Partial<PromoVideo> = {
            id: generatedId,
            track_id: activeTrack?.id,
            playlist_id: playlist?.id,
            video_url: videoUrl,
            thumbnail_url: activeTrack?.image_url || '',
            video_data: blob,
            thumbnail_data: activeTrack?.image_data,
            style: style,
            status: 'ready'
          };
          
          await addPromoVideo(newVideo);
          setGeneratedVideo({
            ...newVideo,
            created_at: new Date().toISOString()
          } as PromoVideo);
          
          setProgress(100);
          setStep('preview');
          resolve();
        };

        mediaRecorder.start();
        if (audioSource) {
          if (clipEnabled) {
            audioSource.start(0, clipStart, clipEnd - clipStart);
          } else {
            audioSource.start(0);
          }
        }

        const animate = (time: number) => {
          const elapsed = time - startTime;
          const p = Math.min(elapsed / renderDuration, 1);
          
          setProgress(20 + (p * 75));

          // Draw dynamic simulated frequencies based on progress pacing
          const mockFreqs = new Uint8Array(128);
          const bpmVal = activeTrack?.bpm || 120;
          const timelineSecs = (elapsed / 1000) + (clipEnabled ? clipStart : 0);
          const pulseValue = Math.max(0, 1 - ((timelineSecs * bpmVal / 60) % 1) * 2.5);
          
          for (let fi = 0; fi < mockFreqs.length; fi++) {
            if (fi < 8) {
              mockFreqs[fi] = Math.max(15, pulseValue * 255);
            } else {
              mockFreqs[fi] = Math.max(10, Math.sin(timelineSecs * 4 + fi * 0.15) * 55 + 75);
            }
          }

          drawMotionGraphicFrame(
            ctx,
            canvas.width,
            canvas.height,
            timelineSecs,
            clipEnabled ? (clipEnd - clipStart) : finalDuration,
            style,
            resolvedAspectRatio,
            mockFreqs,
            img
          );

          // Render visual fades to output recording
          const relativeSecs = elapsed / 1000;
          const totalSecs = clipEnabled ? (clipEnd - clipStart) : finalDuration;

          if (fadeInEnabled && relativeSecs < fadeInDuration) {
            const alpha = Math.max(0, Math.min(1, 1.0 - (relativeSecs / fadeInDuration)));
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          } else if (fadeOutEnabled && relativeSecs > (totalSecs - fadeOutDuration)) {
            const alpha = Math.max(0, Math.min(1, (relativeSecs - (totalSecs - fadeOutDuration)) / fadeOutDuration));
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          if (p < 1) {
            requestAnimationFrame(animate);
          } else {
            mediaRecorder.stop();
          }
        };

        requestAnimationFrame(animate);
      });

    } catch (error) {
      console.error('Generation failed:', error);
      setStep('config');
      alert('Video synthesis failed. Please check your image format and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className={`relative w-full ${step === 'config' ? 'max-w-4xl' : 'max-w-2xl'} bg-zinc-950 border border-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl transition-all duration-300`}
      >
        <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/20">
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
               <Video className="w-5 h-5 text-orange-500" />
               Promo Engine v1.0
            </h2>
            <p className="text-zinc-500 text-[8px] font-black uppercase tracking-[0.2em] mt-1">Generate high-fidelity motion assets for {name}.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-10 min-h-[500px] max-h-[85vh] overflow-y-auto flex flex-col">
          <AnimatePresence mode="wait">
            {step === 'config' && (
              <motion.div 
                key="config"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch w-full"
              >
                {/* Left Panel: High Fidelity Performance Monitor */}
                <div className="flex flex-col justify-between space-y-6 bg-zinc-900/10 border border-zinc-900 rounded-[2.5rem] p-6">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-500 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-full inline-block">
                      📺 Live Performance Monitor
                    </span>
                    <h4 className="text-sm font-black uppercase tracking-tight text-white mt-4">Real-Time Sync Canvas</h4>
                    <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-1">
                      Web Audio low-latency stream synced to {activeTrack?.bpm || 120} BPM
                    </p>
                  </div>

                  {/* Aspect Ratio Sized Preview Frame */}
                  <div className="flex-1 flex items-center justify-center p-4 min-h-[280px]">
                    <div 
                      className={`relative overflow-hidden rounded-2xl bg-black border border-zinc-900 shadow-xl flex items-center justify-center transition-all duration-300 ${
                        resolvedAspectRatio === 'vertical' 
                        ? 'h-[280px] aspect-[9/16]' 
                        : resolvedAspectRatio === 'square' 
                        ? 'h-[240px] aspect-square' 
                        : 'w-[320px] aspect-video'
                      }`}
                    >
                      <canvas 
                        ref={canvasRef} 
                        width={resolvedAspectRatio === 'vertical' ? 360 : resolvedAspectRatio === 'square' ? 400 : 480}
                        height={resolvedAspectRatio === 'vertical' ? 640 : resolvedAspectRatio === 'square' ? 400 : 270}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Unified Low-Latency Audio Controller */}
                  <div className="space-y-4">
                    {/* Progress seeking bar */}
                    <div className="space-y-1.5">
                      <div 
                        onClick={handleSeek}
                        className="h-2 w-full bg-zinc-1000 bg-zinc-900 rounded-full overflow-hidden cursor-pointer relative group"
                      >
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-amber-500 transition-all rounded-full group-hover:from-orange-400 group-hover:to-amber-400"
                          style={{ width: `${((currentTime) / (activeTrack?.duration || 15)) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-black text-zinc-500 uppercase tracking-widest font-mono">
                        <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
                        <span>{new Date((activeTrack?.duration || 15) * 1000).toISOString().substr(14, 5)}</span>
                      </div>
                    </div>

                    {/* Controls & Sync details */}
                    <div className="flex items-center gap-4 bg-zinc-950/80 border border-zinc-900 p-3 rounded-2xl">
                      <button
                        onClick={isPlayingPreview ? pausePlayback : startPlayback}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isPlayingPreview 
                          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:scale-105' 
                          : 'bg-white text-black hover:scale-105 active:scale-95'
                        }`}
                      >
                        {isPlayingPreview ? <Pause className="w-4 h-4 fill-current text-orange-500" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-white uppercase tracking-tight truncate">
                          {isPlayingPreview ? "PLAYING PREVIEW" : "PREVIEW PAUSED"}
                        </p>
                        <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest truncate">
                          {audioDecoding ? "DECODING AUDIO BUFFER..." : audioDecoded ? "WEB AUDIO DECODED & READY" : "USING SEQUENCER SYNTH FALLBACK"}
                        </p>
                      </div>

                      <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Right Panel: Aesthetic parameters */}
                <div className="flex flex-col justify-between space-y-6">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight italic">Synthesis Parameters</h3>
                    <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
                      Configure high-fidelity dimensions, custom clip limits, and timed lyric typography.
                    </p>
                    
                    {/* Tiny Elegant sub tab controls */}
                    <div className="flex gap-1.5 p-1 bg-zinc-900/50 border border-zinc-900 rounded-2xl mt-4">
                      {[
                        { id: 'aesthetics', label: '🎨 Aesthetics' },
                        { id: 'lyrics', label: '💬 Lyrics' },
                        { id: 'trimmer', label: '✂️ Trimmer' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveParamTab(tab.id as any)}
                          className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                            activeParamTab === tab.id
                            ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                            : 'text-zinc-500 hover:text-white bg-transparent'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rendering active Tab components */}
                  <div className="flex-1 min-h-[250px] space-y-4">
                    {activeParamTab === 'aesthetics' && (
                      <div className="space-y-4">
                        {/* 1. Aspect Ratios Selection */}
                        <div className="space-y-3">
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Select Dimensions</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { id: 'auto', name: 'Auto Fit', ratio: 'Match Art', icon: '🎯' },
                              { id: 'vertical', name: 'Vertical', ratio: '9:16', icon: '📱' },
                              { id: 'square', name: 'Square', ratio: '1:1', icon: '🟦' },
                              { id: 'horizontal', name: 'Wide', ratio: '16:9', icon: '📺' }
                            ].map(r => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => setAspectRatio(r.id as any)}
                                className={`p-2 rounded-2xl border transition-all flex flex-col items-center gap-1.5 ${
                                  aspectRatio === r.id 
                                  ? 'bg-orange-500/10 border-orange-500 text-orange-500 shadow-lg shadow-orange-500/5' 
                                  : 'bg-zinc-900/40 border-zinc-900 text-zinc-500 hover:border-zinc-800'
                                }`}
                              >
                                <span className="text-base">{r.icon}</span>
                                <div className="text-center">
                                  <div className="text-[8px] font-black uppercase tracking-wider">{r.name}</div>
                                  <div className="text-[6px] font-bold opacity-60 font-mono">{r.ratio}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 2. Creative Styles Grid Selector */}
                        <div className="space-y-3">
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Select Creative Style</label>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { id: 'cyber_organic', name: 'Cyber-Organic 4K', icon: '🔥', desc: 'Obsidian, silver & amber' },
                              { id: 'minimalist', name: 'Clean Chrome', icon: '✨', desc: 'Orbit lines & wave grids' },
                              { id: 'vibrant', name: 'Neon Pulse', icon: '⚡', desc: 'Halos & record vinyl spin' },
                              { id: 'abstract', name: 'Ethereal Flow', icon: '🌫️', desc: 'Fluid wave bezier curves' },
                              { id: 'grunge', name: 'Distressed Metal', icon: '⛓️', desc: 'Red industrial wireframe' }
                            ].map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setStyle(s.id)}
                                className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                                  style === s.id 
                                  ? 'bg-orange-500/10 border-orange-500 text-white shadow-lg shadow-orange-500/5' 
                                  : 'bg-zinc-900/40 border-zinc-900 text-zinc-500 hover:border-zinc-805'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">{s.icon}</span>
                                  <span className="text-[9px] font-black uppercase tracking-wider text-white truncate">{s.name}</span>
                                </div>
                                <p className="text-[8px] font-bold opacity-60 leading-normal line-clamp-1">{s.desc}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 3. Color Grading & Cinematic CC Presets */}
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Cinematic CC Preset</label>
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 font-mono font-black uppercase tracking-wider">TEMPLAR READY</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'templar', name: 'Templar CC', icon: '🕶️' },
                              { id: 'cyber', name: 'Neo Cyber', icon: '🪐' },
                              { id: 'noir', name: 'Slate B&W', icon: '🎬' },
                              { id: 'gold', name: 'Fire Gold', icon: '🔥' },
                              { id: 'vhs', name: 'CRT VHS', icon: '📼' },
                              { id: 'none', name: 'Standard', icon: '📺' }
                            ].map(grade => (
                              <button
                                key={grade.id}
                                type="button"
                                onClick={() => {
                                  setCcPreset(grade.id as any);
                                  // Auto-adjust default multipliers for cinematic vibe fast
                                  if (grade.id === 'templar') {
                                    setContrast(1.5);
                                    setSaturation(0.75);
                                    setVignetteStrength(0.75);
                                    setGrainStrength(0.18);
                                  } else if (grade.id === 'cyber') {
                                    setContrast(1.2);
                                    setSaturation(1.4);
                                    setVignetteStrength(0.5);
                                    setGrainStrength(0.1);
                                  } else if (grade.id === 'noir') {
                                    setContrast(1.6);
                                    setSaturation(0.0);
                                    setVignetteStrength(0.8);
                                    setGrainStrength(0.24);
                                  } else if (grade.id === 'gold') {
                                    setContrast(1.3);
                                    setSaturation(1.2);
                                    setVignetteStrength(0.6);
                                    setGrainStrength(0.12);
                                  } else if (grade.id === 'vhs') {
                                    setContrast(0.95);
                                    setSaturation(1.15);
                                    setVignetteStrength(0.45);
                                    setGrainStrength(0.3);
                                  } else {
                                    setContrast(1.0);
                                    setSaturation(1.0);
                                    setVignetteStrength(0.0);
                                    setGrainStrength(0.0);
                                  }
                                }}
                                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                                  ccPreset === grade.id 
                                  ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/5' 
                                  : 'bg-zinc-900/40 border-zinc-900 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300'
                                }`}
                              >
                                <span className="text-sm">{grade.icon}</span>
                                <span className="text-[8px] font-black uppercase tracking-wider">{grade.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 4. Audio-Synced High-Energy Transitions */}
                        <div className="space-y-3 pt-2">
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Beat Transitions & Strobe FX</label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center justify-between p-2.5 bg-zinc-900/40 border border-zinc-900 rounded-xl">
                              <div className="min-w-0">
                                <p className="text-[9px] font-black text-white uppercase tracking-tight">Strobe Flash</p>
                                <p className="text-[7px] font-semibold text-zinc-500 uppercase tracking-wider">Dynamic beat flash</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setStrobeBeat(!strobeBeat)}
                                className={`w-8 h-4 rounded-full transition-all relative ${strobeBeat ? 'bg-orange-500' : 'bg-zinc-800'}`}
                              >
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${strobeBeat ? 'right-0.5' : 'left-0.5'}`} />
                              </button>
                            </div>

                            <div className="flex items-center justify-between p-2.5 bg-zinc-900/40 border border-zinc-900 rounded-xl">
                              <div className="min-w-0">
                                <p className="text-[9px] font-black text-white uppercase tracking-tight">Lens Jolt / Shake</p>
                                <p className="text-[7px] font-semibold text-zinc-500 uppercase tracking-wider">Rhythmic translation</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShakeBeat(!shakeBeat)}
                                className={`w-8 h-4 rounded-full transition-all relative ${shakeBeat ? 'bg-orange-500' : 'bg-zinc-800'}`}
                              >
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${shakeBeat ? 'right-0.5' : 'left-0.5'}`} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 5. Custom Color Correction & FX Sliders */}
                        <div className="bg-zinc-900/10 border border-zinc-900 p-3 rounded-2xl space-y-4 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Tactile FX Controls</span>
                            <span className="text-[8px] font-mono text-zinc-600">CC ENGINES ADVANCED</span>
                          </div>

                          {/* Contrast Slider */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-wider text-zinc-400">
                              <span>Contrast Multiplier</span>
                              <span className="font-mono text-orange-500">{contrast.toFixed(2)}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.8"
                              max="2.0"
                              step="0.05"
                              value={contrast}
                              onChange={(e) => setContrast(parseFloat(e.target.value))}
                              className="w-full accent-orange-500 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                            />
                          </div>

                          {/* Saturation Slider */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-wider text-zinc-400">
                              <span>Color Saturation</span>
                              <span className="font-mono text-orange-500">{(saturation * 100).toFixed(0)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.0"
                              max="2.0"
                              step="0.05"
                              value={saturation}
                              onChange={(e) => setSaturation(parseFloat(e.target.value))}
                              className="w-full accent-orange-500 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                            />
                          </div>

                          {/* Vignette Slider */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-wider text-zinc-400">
                              <span>Cinematic Vignette Focus</span>
                              <span className="font-mono text-orange-500">{(vignetteStrength * 100).toFixed(0)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.0"
                              max="1.0"
                              step="0.05"
                              value={vignetteStrength}
                              onChange={(e) => setVignetteStrength(parseFloat(e.target.value))}
                              className="w-full accent-orange-500 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                            />
                          </div>

                          {/* Grain Slider */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-wider text-zinc-400">
                              <span>Filmic Paper Grain</span>
                              <span className="font-mono text-orange-500">{(grainStrength * 100).toFixed(0)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.0"
                              max="0.5"
                              step="0.02"
                              value={grainStrength}
                              onChange={(e) => setGrainStrength(parseFloat(e.target.value))}
                              className="w-full accent-orange-500 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                            />
                          </div>

                          {/* Chromatic Shake Offset Slider */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-wider text-zinc-400">
                              <span>Lens Jolt Shake Amplitude</span>
                              <span className="font-mono text-orange-500">{chromaticOffset.toFixed(1)}px</span>
                            </div>
                            <input
                              type="range"
                              min="1.0"
                              max="10.0"
                              step="0.5"
                              value={chromaticOffset}
                              onChange={(e) => setChromaticOffset(parseFloat(e.target.value))}
                              className="w-full accent-orange-500 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                            />
                          </div>

                          <div className="border-t border-zinc-800/60 my-2 pt-2" />

                          {/* PRO TEMPLATE OVERRIDES PANEL */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Pro Template Tweaks & Clutter Stripping</span>
                              <span className="text-[7px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono font-black uppercase">FULL ACCESS</span>
                            </div>

                            {/* Toggles Grid */}
                            <div className="grid grid-cols-2 gap-2 text-[8px]">
                              {/* Pure Cover Fit (No Effects) Toggle */}
                              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/40 border border-zinc-900 col-span-2">
                                <div className="space-y-0.5">
                                  <span className="font-black text-orange-500 uppercase tracking-wider block">Pure Cover Fit (No Effects)</span>
                                  <span className="text-zinc-600 block">Fills the video ratio block with just the artwork background and overlays dynamic closed captions purely</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setPureCoverFit(!pureCoverFit)}
                                  className={`w-7 h-4 rounded-full transition-all relative ${pureCoverFit ? 'bg-orange-500' : 'bg-zinc-800'}`}
                                >
                                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${pureCoverFit ? 'right-0.5' : 'left-0.5'}`} />
                                </button>
                              </div>

                              {/* Background Blur Toggle */}
                              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/40 border border-zinc-900">
                                <div className="space-y-0.5">
                                  <span className="font-black text-zinc-300 uppercase tracking-wider block">Backdrop Blur</span>
                                  <span className="text-zinc-600 block">Atmospheric depth</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowBgBlur(!showBgBlur)}
                                  className={`w-7 h-4 rounded-full transition-all relative ${showBgBlur ? 'bg-orange-500' : 'bg-zinc-800'}`}
                                >
                                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showBgBlur ? 'right-0.5' : 'left-0.5'}`} />
                                </button>
                              </div>

                              {/* Tech Orbit Rings Toggle */}
                              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/40 border border-zinc-900">
                                <div className="space-y-0.5">
                                  <span className="font-black text-zinc-300 uppercase tracking-wider block">Orbit Rings</span>
                                  <span className="text-zinc-600 block">Generic rings</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowOrbitRings(!showOrbitRings)}
                                  className={`w-7 h-4 rounded-full transition-all relative ${showOrbitRings ? 'bg-orange-500' : 'bg-zinc-800'}`}
                                >
                                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showOrbitRings ? 'right-0.5' : 'left-0.5'}`} />
                                </button>
                              </div>

                              {/* Spectrum Waveform Bars Toggle */}
                              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/40 border border-zinc-900">
                                <div className="space-y-0.5">
                                  <span className="font-black text-zinc-300 uppercase tracking-wider block">Spectrum Bars</span>
                                  <span className="text-zinc-600 block">Rhythmic baseline</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowSpectralBars(!showSpectralBars)}
                                  className={`w-7 h-4 rounded-full transition-all relative ${showSpectralBars ? 'bg-orange-500' : 'bg-zinc-800'}`}
                                >
                                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showSpectralBars ? 'right-0.5' : 'left-0.5'}`} />
                                </button>
                              </div>

                              {/* Watermark/HUD Logs Toggle */}
                              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/40 border border-zinc-900">
                                <div className="space-y-0.5">
                                  <span className="font-black text-zinc-300 uppercase tracking-wider block">Bottom HUD Text</span>
                                  <span className="text-zinc-600 block">Technical watermark</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowWatermarks(!showWatermarks)}
                                  className={`w-7 h-4 rounded-full transition-all relative ${showWatermarks ? 'bg-orange-500' : 'bg-zinc-800'}`}
                                >
                                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showWatermarks ? 'right-0.5' : 'left-0.5'}`} />
                                </button>
                              </div>

                              {/* Alignment Grid Overlay */}
                              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/40 border border-zinc-900 col-span-2">
                                <div className="space-y-0.5">
                                  <span className="font-black text-zinc-300 uppercase tracking-wider block">Micro alignments grid layout</span>
                                  <span className="text-zinc-600 block">Draws delicate design measurement grids across canvas</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowGridOverlay(!showGridOverlay)}
                                  className={`w-7 h-4 rounded-full transition-all relative ${showGridOverlay ? 'bg-orange-500' : 'bg-zinc-800'}`}
                                >
                                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showGridOverlay ? 'right-0.5' : 'left-0.5'}`} />
                                </button>
                              </div>
                            </div>

                            {/* Album Art Placement Control */}
                            <div className="space-y-2">
                              <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 block">Album Art Presenter Shape</span>
                              <div className="grid grid-cols-3 gap-1 px-1 py-1 rounded-xl bg-zinc-950/60 border border-zinc-900 text-[8px] font-bold text-center">
                                {[
                                  { id: 'square', label: 'Premium Square' },
                                  { id: 'circle', label: 'Retro Vinyl Circle' },
                                  { id: 'hidden', label: 'None (Typography Focus)' }
                                ].map(opt => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setAlbumArtShape(opt.id as any)}
                                    className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                                      albumArtShape === opt.id 
                                      ? 'bg-orange-500/15 border border-orange-500/20 text-orange-400' 
                                      : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Shadow/Glow Multiplier */}
                            {albumArtShape !== 'hidden' && (
                              <div className="space-y-1.5 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-900/40">
                                <div className="flex justify-between text-[8px] font-black uppercase tracking-wider text-zinc-400">
                                  <span>Cover Art Glow & shadow depth</span>
                                  <span className="font-mono text-orange-500">{(shadowStrength * 100).toFixed(0)}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0.0"
                                  max="1.5"
                                  step="0.1"
                                  value={shadowStrength}
                                  onChange={(e) => setShadowStrength(parseFloat(e.target.value))}
                                  className="w-full accent-orange-500 bg-zinc-850 h-1 rounded cursor-pointer"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeParamTab === 'lyrics' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-900 rounded-2xl">
                          <div>
                            <p className="text-[10px] font-black text-white uppercase tracking-tight">Overlay Karaokes / Lyrics</p>
                            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Stitch active visual typography tags</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setOverlayLyrics(!overlayLyrics)}
                            className={`w-12 h-6 rounded-full transition-all relative ${overlayLyrics ? 'bg-orange-500' : 'bg-zinc-800'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${overlayLyrics ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>

                        {overlayLyrics && (
                          <div className="caption-element space-y-4">
                            {/* Stylistic selector */}
                            <div className="space-y-2">
                              <label className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 block">Typography Font Vibe</label>
                              <div className="grid grid-cols-4 gap-1.5">
                                {[
                                  { id: 'retro', label: 'Space' },
                                  { id: 'serif', label: 'Serif' },
                                  { id: 'mono', label: 'Neon' },
                                  { id: 'impact', label: 'Impact' }
                                ].map(st => (
                                  <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => setLyricStyle(st.id as any)}
                                    className={`py-2 px-1 rounded-xl text-[8px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                                      lyricStyle === st.id
                                      ? 'bg-orange-500/10 border-orange-500 text-orange-500'
                                      : 'bg-zinc-900/40 border-zinc-900 text-zinc-500 hover:border-zinc-805 hover:text-zinc-300'
                                    }`}
                                  >
                                    {st.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Color Picker */}
                            <div className="flex items-center justify-between bg-zinc-900/20 p-2.5 border border-zinc-900 rounded-xl">
                              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Typography Color</span>
                              <div className="flex gap-1.5">
                                {['#ffffff', '#f97316', '#10b981', '#3b82f6', '#f43f5e'].map(col => (
                                  <button
                                    key={col}
                                    type="button"
                                    onClick={() => setLyricColor(col)}
                                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer hover:scale-110 ${
                                      lyricColor === col ? 'scale-125 border-white' : 'border-transparent'
                                    }`}
                                    style={{ backgroundColor: col }}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Font Size Slider */}
                            <div className="bg-zinc-900/20 p-3 border border-zinc-900 rounded-xl space-y-2">
                              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                <span>Typography Size</span>
                                <span className="font-mono text-orange-500 font-bold">{lyricFontSize}px</span>
                              </div>
                              <input
                                type="range"
                                min={16}
                                max={80}
                                step={1}
                                value={lyricFontSize}
                                onChange={(e) => setLyricFontSize(Number(e.target.value))}
                                className="w-full accent-orange-500 bg-zinc-950 h-1 rounded-lg outline-none cursor-pointer"
                              />
                              <p className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest leading-normal">
                                Auto-scaling: Adjusts dynamically to maintain proportion on final renders
                              </p>
                            </div>

                            {/* Caption Line Height Slider */}
                            <div className="bg-zinc-900/20 p-3 border border-zinc-900 rounded-xl space-y-2">
                              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                <span>Line Height Leading</span>
                                <span className="font-mono text-orange-500 font-bold">{lyricLineHeight.toFixed(2)}x</span>
                              </div>
                              <input
                                type="range"
                                min={1.0}
                                max={2.2}
                                step={0.05}
                                value={lyricLineHeight}
                                onChange={(e) => setLyricLineHeight(Number(e.target.value))}
                                className="w-full accent-orange-500 bg-zinc-950 h-1 rounded-lg outline-none cursor-pointer"
                              />
                              <p className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest leading-normal">
                                Controls subtitle/lyric vertical spacing for multi-line wrapping
                              </p>
                            </div>

                            {/* Caption Font Weight Selector */}
                            <div className="bg-zinc-900/20 p-3 border border-zinc-900 rounded-xl space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 block pb-1">Font Weight</label>
                              <div className="grid grid-cols-4 gap-1.5 font-sans">
                                {[
                                  { id: '300', label: 'Light' },
                                  { id: '400', label: 'Regular' },
                                  { id: '500', label: 'Medium' },
                                  { id: '600', label: 'Semi' },
                                  { id: '700', label: 'Bold' },
                                  { id: '800', label: 'Extra' },
                                  { id: '900', label: 'Black' }
                                ].map((w) => (
                                  <button
                                    key={w.id}
                                    type="button"
                                    onClick={() => setLyricFontWeight(w.id)}
                                    className={`py-1.5 px-1 rounded-xl text-[8px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                                      lyricFontWeight === w.id
                                        ? 'bg-orange-500/10 border-orange-500 text-orange-500'
                                        : 'bg-zinc-900/40 border-zinc-900 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300'
                                    }`}
                                  >
                                    {w.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Caption Animation Format selection option */}
                            <div className="space-y-2">
                              <label className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 block">Caption Style Format</label>
                              <div className="grid grid-cols-5 gap-1.5 font-sans">
                                {[
                                  { id: 'bounce', label: 'Bounce' },
                                  { id: 'slide', label: 'Slide' },
                                  { id: 'fade', label: 'Fade' },
                                  { id: 'zoom', label: 'Zoom' },
                                  { id: 'word', label: '1 Word' }
                                ].map(format => (
                                  <button
                                    key={format.id}
                                    type="button"
                                    onClick={() => setLyricFormat(format.id as any)}
                                    className={`py-2 px-1 rounded-xl text-[8px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                                      lyricFormat === format.id
                                      ? 'bg-orange-500/10 border-orange-500 text-orange-500'
                                      : 'bg-zinc-900/40 border-zinc-900 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300'
                                    }`}
                                  >
                                    {format.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Lyrics workspace console */}
                            <div className="space-y-2 p-3.5 bg-zinc-950/80 border border-zinc-900/80 rounded-2xl font-sans">
                              {/* Console Header */}
                              <div className="flex items-center justify-between border-b border-zinc-900/55 pb-2">
                                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400 font-mono font-bold flex items-center gap-1.5">Timed Lyrics Console</span>
                                <div className="flex flex-wrap items-center gap-1.5 justify-end">

                                  {/* Pollinations BYOP Status and Connection Action */}
                                  <button
                                    type="button"
                                    onClick={pollinationsKeyConnected ? disconnectPollinations : connectPollinations}
                                    className={`flex items-center gap-1 py-1 px-2 border rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 font-bold ${
                                      pollinationsKeyConnected
                                        ? "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                                        : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-750"
                                    }`}
                                    title={pollinationsKeyConnected ? "Authenticated with custom Pollinations account. Click to disconnect." : "Authenticate via Pollinations BYOP (Bring Your Own Pollen)"}
                                  >
                                    <Key className="w-2.5 h-2.5" />
                                    <span>{pollinationsKeyConnected ? "Pollin Sync'd" : "Link Pollin"}</span>
                                  </button>

                                  {/* Pollinations Speech-To-Text Whisper button */}
                                  <button
                                    type="button"
                                    onClick={handleTranscribeLyricsPollinations}
                                    disabled={isGeneratingLyrics || isAligningLyrics}
                                    className="flex items-center gap-1 py-1 px-2.5 bg-orange-500 hover:bg-orange-600 text-black rounded-lg text-[8px] font-black uppercase tracking-wider transition-all disabled:bg-zinc-900 disabled:text-zinc-500 cursor-pointer active:scale-95 disabled:scale-100 font-bold"
                                    title="Transcribe audio vocals using Pollinations high-fidelity Whisper voice API"
                                  >
                                    {isGeneratingLyrics ? (
                                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    ) : (
                                      <Mic className="w-2.5 h-2.5" />
                                    )}
                                    <span>Whisper STT</span>
                                  </button>

                                  {/* AI lyrics writer button */}
                                  <button
                                    type="button"
                                    onClick={handleGenerateLyrics}
                                    disabled={isGeneratingLyrics || isAligningLyrics}
                                    className="flex items-center gap-1 py-1 px-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all disabled:opacity-45 cursor-pointer"
                                  >
                                    {isGeneratingLyrics ? (
                                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-2.5 h-2.5" />
                                    )}
                                    <span>AI Gen</span>
                                  </button>

                                  {/* AI timestamp aligner button */}
                                  <button
                                    type="button"
                                    onClick={handleAlignLyrics}
                                    disabled={isGeneratingLyrics || isAligningLyrics}
                                    className="flex items-center gap-1 py-1 px-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all disabled:opacity-45 cursor-pointer"
                                  >
                                    {isAligningLyrics ? (
                                      <Loader2 className="w-2.5 h-2.5 animate-spin text-orange-400" />
                                    ) : (
                                      <Wand2 className="w-2.5 h-2.5 text-zinc-400" />
                                    )}
                                    <span>Align Stamps</span>
                                  </button>
                                </div>
                              </div>

                              {/* Editor textarea */}
                              <div className="relative">
                                <textarea
                                  value={lyricsText}
                                  onChange={(e) => setLyricsText(e.target.value)}
                                  rows={5}
                                  className="w-full bg-black/90 border border-zinc-950 rounded-xl p-3 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-orange-500/60 custom-scrollbar resize-none font-semibold leading-relaxed"
                                  placeholder={`[00:00] Intro\n[00:08] Lyric line 1\n[00:15] Lyric line 2...\n\nOr write flat text lines and click "Align Stamps" to distribute!`}
                                />
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-900/30">
                                <p className="text-[7px] text-zinc-500 font-bold uppercase tracking-wide max-w-[200px]">
                                  [mm:ss] format creates custom dynamic text popups on sync.
                                </p>
                                <div className="flex items-center gap-1.5 font-mono">
                                  {/* Save to track db button */}
                                  <button
                                    type="button"
                                    onClick={handleSaveLyrics}
                                    disabled={lyricsSaveStatus === 'saving'}
                                    className={`flex items-center gap-1 py-1 px-2.5 rounded-lg text-[8px] font-black tracking-wider uppercase border transition-all cursor-pointer ${
                                      lyricsSaveStatus === 'success'
                                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                      : lyricsSaveStatus === 'error'
                                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                      : 'bg-zinc-900 text-orange-400 border-zinc-800 hover:border-orange-500/30'
                                    }`}
                                  >
                                    {lyricsSaveStatus === 'saving' ? (
                                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    ) : lyricsSaveStatus === 'success' ? (
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                    ) : (
                                      <Sliders className="w-2.5 h-2.5" />
                                    )}
                                    <span>{lyricsSaveStatus === 'success' ? 'Saved' : 'Save Track'}</span>
                                  </button>

                                  {/* Export dropdown / button combo */}
                                  <button
                                    type="button"
                                    onClick={handleExportLRC}
                                    title="Download LRC Lyrics file"
                                    className="flex items-center gap-1 py-1 px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-lg text-[8px] font-bold uppercase cursor-pointer"
                                  >
                                    <Download className="w-2.5 h-2.5" />
                                    <span>.LRC</span>
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={handleExportJSON}
                                    title="Download JSON Lyrics coordinates"
                                    className="flex items-center gap-1 py-1 px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-lg text-[8px] font-bold uppercase cursor-pointer"
                                  >
                                    <Download className="w-2.5 h-2.5" />
                                    <span>.JSON</span>
                                  </button>
                                </div>
                              </div>

                              {/* Dynamic Activity message logger */}
                              {lyricsStatusMsg && (
                                <motion.div
                                  initial={{ opacity: 0, y: 3 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="p-2.5 bg-orange-500/10 border border-orange-500/15 rounded-xl flex items-center gap-2 mt-2"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse flex-shrink-0" />
                                  <span className="text-[8px] font-black uppercase tracking-wider text-orange-300 font-mono leading-relaxed truncate">
                                    {lyricsStatusMsg}
                                  </span>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeParamTab === 'trimmer' && (
                      <div className="space-y-4">
                        {/* Video Duration Preset Select Dropdown */}
                        <div className="space-y-2 bg-zinc-900/40 border border-zinc-900 p-4 rounded-2xl">
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 block font-mono">
                            Promo Video Length Preset
                          </label>
                          <div className="relative">
                            <select
                              value={promoDuration}
                              onChange={(e) => handleDurationChange(e.target.value as any)}
                              className="w-full bg-black border border-zinc-900 rounded-xl px-3 py-3 text-xs font-mono text-white focus:outline-none focus:border-orange-500 cursor-pointer appearance-none uppercase font-bold tracking-wider"
                            >
                              <option value="full">Full Track ({Math.round(activeTrack?.duration || 15)}s)</option>
                              <option value="15">15 Seconds (Story / YouTube Short)</option>
                              <option value="30">30 Seconds (Instagram Reel / Ad)</option>
                              <option value="60">60 Seconds (Full Promo Clip)</option>
                              <option value="custom">Custom Trim Range (Manual Slider)</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-500">
                              <span className="text-[10px]">▼</span>
                            </div>
                          </div>
                          <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mt-1 leading-normal">
                            {promoDuration === 'full' && "Renders the video across the complete duration of your music track"}
                            {promoDuration === '15' && "A quick preview optimized for micro-video and YouTube Shorts content"}
                            {promoDuration === '30' && "Standard high-engagement length for Reels, TikTok, and advertising"}
                            {promoDuration === '60' && "Full-form promo video suitable for main feeds and previews"}
                            {promoDuration === 'custom' && "Fine-tune precise start and end loop coordinates using manual sliders"}
                          </p>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-900 rounded-2xl">
                          <div>
                            <p className="text-[10px] font-black text-white uppercase tracking-tight">Audio Trimming Enabled</p>
                            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Crop and loop specialized custom clips</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              stopPlaybackSources();
                              setIsPlayingPreview(false);
                              const isEn = !clipEnabled;
                              setClipEnabled(isEn);
                              setPromoDuration(isEn ? 'custom' : 'full');
                            }}
                            className={`w-12 h-6 rounded-full transition-all relative ${clipEnabled ? 'bg-orange-500' : 'bg-zinc-800'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${clipEnabled ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>

                        {clipEnabled && (
                          <div className="space-y-4 p-4 bg-zinc-950/80 border border-zinc-900 rounded-2xl">
                            {/* Choose Track Section Segment Presets */}
                            <div className="space-y-2 pb-3 border-b border-zinc-900/40">
                              <label className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 block font-mono">
                                Jump to Track Section Preset
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                  { id: 'intro', label: '🎬 Intro', desc: '0s - 15s' },
                                  { id: 'verse', label: '🎙️ Verse', desc: `${Math.round((activeTrack?.duration || 180) * 0.15)}s - ${Math.round((activeTrack?.duration || 180) * 0.15) + 30}s` },
                                  { id: 'hook', label: '🎯 Chorus/Drop', desc: `${Math.round((activeTrack?.duration || 180) * 0.4)}s - ${Math.round((activeTrack?.duration || 180) * 0.4) + 30}s` },
                                  { id: 'outro', label: '👋 Outro', desc: `Last 30s` }
                                ].map((sect) => {
                                  const duration = activeTrack?.duration || 180;
                                  let sectStart = 0;
                                  let sectEnd = 15;
                                  
                                  if (sect.id === 'intro') {
                                    sectStart = 0;
                                    sectEnd = Math.min(15, Math.round(duration));
                                  } else if (sect.id === 'verse') {
                                    sectStart = Math.min(Math.round(duration * 0.15), Math.max(0, Math.round(duration) - 30));
                                    sectEnd = Math.min(sectStart + 30, Math.round(duration));
                                  } else if (sect.id === 'hook') {
                                    sectStart = Math.min(Math.round(duration * 0.4), Math.max(0, Math.round(duration) - 30));
                                    sectEnd = Math.min(sectStart + 30, Math.round(duration));
                                  } else if (sect.id === 'outro') {
                                    sectStart = Math.max(0, Math.round(duration - 30));
                                    sectEnd = Math.round(duration);
                                  }
                                  
                                  const isCurrentSection = clipEnabled && clipStart === sectStart && clipEnd === sectEnd;
                                  
                                  return (
                                    <button
                                      key={sect.id}
                                      type="button"
                                      onClick={() => {
                                        stopPlaybackSources();
                                        setIsPlayingPreview(false);
                                        setClipEnabled(true);
                                        setClipStart(sectStart);
                                        setClipEnd(sectEnd);
                                        setPromoDuration('custom');
                                      }}
                                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                        isCurrentSection 
                                          ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' 
                                          : 'bg-black border-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-800'
                                      }`}
                                    >
                                      <span className="text-[9px] font-black uppercase tracking-tight">{sect.label}</span>
                                      <span className="text-[7px] font-mono opacity-65 mt-0.5">{sect.desc}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Trim bounds slider control */}
                            <div className="space-y-3">
                              <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-zinc-400">
                                <span>Clip Boundary Range</span>
                                <span className="text-orange-500 font-mono">
                                  {clipStart}s - {clipEnd}s ({clipEnd - clipStart}s Clip)
                                </span>
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <label className="text-[8px] text-zinc-500 uppercase font-black block mb-1">Start Timeline Offset</label>
                                  <input
                                    type="range"
                                    min={0}
                                    max={Math.max(0, clipEnd - 2)}
                                    value={clipStart}
                                    onChange={(e) => {
                                      stopPlaybackSources();
                                      setIsPlayingPreview(false);
                                      setClipStart(Number(e.target.value));
                                      setPromoDuration('custom');
                                    }}
                                    className="w-full accent-orange-500 bg-zinc-900 h-1 rounded-lg outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="text-[8px] text-zinc-500 uppercase font-black block mb-1">End Timeline Limit</label>
                                  <input
                                    type="range"
                                    min={clipStart + 2}
                                    max={Math.round(activeTrack?.duration || 15)}
                                    value={clipEnd}
                                    onChange={(e) => {
                                      stopPlaybackSources();
                                      setIsPlayingPreview(false);
                                      setClipEnd(Number(e.target.value));
                                      setPromoDuration('custom');
                                    }}
                                    className="w-full accent-orange-500 bg-zinc-900 h-1 rounded-lg outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Audio & Video Transition Fades */}
                        <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-2xl space-y-4">
                          <div>
                            <p className="text-[10px] font-black text-white uppercase tracking-tight">Audio & Video Transition Fades</p>
                            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Smooth transitions for start & end boundaries</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-900/40">
                            {/* Fade-in block */}
                            <div className="p-3 bg-zinc-950/50 border border-zinc-900 rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-300">👋 Fade-In Effect</span>
                                <button
                                  type="button"
                                  onClick={() => setFadeInEnabled(!fadeInEnabled)}
                                  className={`w-10 h-5 rounded-full transition-all relative ${fadeInEnabled ? 'bg-orange-500' : 'bg-zinc-800'}`}
                                >
                                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${fadeInEnabled ? 'right-0.5' : 'left-0.5'}`} />
                                </button>
                              </div>
                              {fadeInEnabled && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[8px] font-bold text-zinc-500 font-mono">
                                    <span>FADE TIME:</span>
                                    <span className="text-orange-400">{fadeInDuration}s</span>
                                  </div>
                                  <input
                                    type="range"
                                    min={0.5}
                                    max={10}
                                    step={0.5}
                                    value={fadeInDuration}
                                    onChange={(e) => setFadeInDuration(Number(e.target.value))}
                                    className="w-full accent-orange-500 bg-zinc-900 h-1 rounded-lg outline-none"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Fade-out block */}
                            <div className="p-3 bg-zinc-950/50 border border-zinc-900 rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-300">🎬 Fade-Out Effect</span>
                                <button
                                  type="button"
                                  onClick={() => setFadeOutEnabled(!fadeOutEnabled)}
                                  className={`w-10 h-5 rounded-full transition-all relative ${fadeOutEnabled ? 'bg-orange-500' : 'bg-zinc-800'}`}
                                >
                                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${fadeOutEnabled ? 'right-0.5' : 'left-0.5'}`} />
                                </button>
                              </div>
                              {fadeOutEnabled && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[8px] font-bold text-zinc-500 font-mono">
                                    <span>FADE TIME:</span>
                                    <span className="text-orange-400">{fadeOutDuration}s</span>
                                  </div>
                                  <input
                                    type="range"
                                    min={0.5}
                                    max={10}
                                    step={0.5}
                                    value={fadeOutDuration}
                                    onChange={(e) => setFadeOutDuration(Number(e.target.value))}
                                    className="w-full accent-orange-500 bg-zinc-900 h-1 rounded-lg outline-none"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Synthesis CTA Button */}
                  <div className="pt-4 border-t border-zinc-900">
                    <button
                      onClick={handleGenerate}
                      className="w-full bg-white text-black py-4.5 rounded-[2rem] font-black tracking-[0.25em] uppercase text-[10px] hover:bg-orange-500 hover:text-black transition-all shadow-2xl flex items-center justify-center gap-3.5"
                    >
                      <Wand2 className="w-4 h-4" /> Start Video Generation
                    </button>
                    <p className="text-center text-[8px] font-black text-zinc-600 uppercase tracking-widest mt-3">
                      Takes ~10 seconds. Synthesizes full motion clip with master audio track.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div 
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center space-y-12"
              >
                 <div className="relative">
                    <div className="w-32 h-32 rounded-full border border-zinc-900 flex items-center justify-center">
                       <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                    </div>
                    {/* Pulsing rings */}
                    <div className="absolute inset-0 rounded-full border border-orange-500/20 animate-ping" />
                    <div className="absolute inset-0 rounded-full border border-orange-500/10 animate-ping delay-75" />
                 </div>

                 <div className="text-center space-y-6 w-full max-w-md">
                    <div className="space-y-2">
                       <h3 className="text-xl font-black uppercase tracking-tighter">
                          {progress < 40 ? 'Neural Aesthetic Mapping...' : progress < 80 ? 'Synthesizing Motion Frames...' : 'Finalizing Output Buffer...'}
                       </h3>
                       <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                          />
                       </div>
                       <div className="flex justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                          <span>Progress</span>
                          <span>{Math.floor(progress)}%</span>
                       </div>
                    </div>

                    <div className="p-6 bg-zinc-900/50 border border-zinc-900 rounded-[2rem] text-left">
                       <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <AlertCircle className="w-3 h-3" /> System Dispatch
                       </p>
                       <p className="text-xs text-zinc-400 leading-relaxed font-mono italic">
                          {aesthetic?.imagePrompt || 'Waiting for Gemini logic initialization...'}
                       </p>
                    </div>
                 </div>
              </motion.div>
            )}

            {step === 'preview' && (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
              >
                  <div className={`bg-black rounded-[3rem] border border-zinc-900 overflow-hidden relative shadow-2xl group ${
                    aspectRatio === 'vertical' ? 'aspect-[9/16]' : aspectRatio === 'square' ? 'aspect-square' : 'aspect-video'
                  }`}>
                    {(generatedVideo?.video_url?.match(/\.(mp4|webm|mov)$/i) || generatedVideo?.video_url?.startsWith('data:video') || generatedVideo?.video_url?.startsWith('blob:')) ? (
                        <video 
                          src={generatedVideo?.video_url} 
                          className="w-full h-full object-cover opacity-60"
                          autoPlay
                          loop
                          playsInline
                          controls={true}
                          onCanPlay={(e) => e.currentTarget.play()}
                        />
                    ) : (
                       <div className="w-full h-full relative overflow-hidden bg-zinc-900">
                          {generatedVideo?.video_url ? (
                             <>
                               <motion.img src={generatedVideo?.video_url} className="w-full h-full object-cover opacity-60" initial={{ scale: 1 }} animate={{ scale: 1.15 }} transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "linear" }} />
                               {track?.file_url && (
                                 <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 w-3/4 max-w-sm">
                                   <audio 
                                     src={track.file_url} 
                                     controls 
                                     autoPlay 
                                     loop 
                                     onError={(e) => {
                                       console.warn("Audio element failed to load preview source:", track.file_url);
                                       addToast?.("The preview audio file is currently unreachable. Previewing video element only.", "info");
                                     }}
                                     className="w-full opacity-80 hover:opacity-100 transition-opacity rounded-full shadow-2xl" 
                                   />
                                 </div>
                               )}
                             </>
                          ) : (
                             <div className="w-full h-full bg-gradient-to-br from-orange-500/20 to-purple-500/20 opacity-60" />
                          )}
                       </div>
                    )}
                    
                    <div className="absolute inset-0 p-8 flex flex-col justify-end pointer-events-none">
                       <div className="space-y-4">
                          <div className="h-0.5 w-full bg-white/20 rounded-full overflow-hidden">
                             <div className="h-full bg-orange-500 w-1/3" />
                          </div>
                          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                             <span>Full Track</span>
                             <span>{Math.floor(track?.duration || 0)}S</span>
                          </div>
                       </div>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-16 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-white">
                          <Play className="w-6 h-6 fill-current ml-1" />
                       </div>
                    </div>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 border border-orange-500/30 bg-orange-500/10 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest text-orange-500">
                       Rendering Complete
                    </div>
                 </div>

                 <div className="space-y-8">
                    <div className="space-y-4">
                       <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                       </div>
                       <h3 className="text-4xl font-black tracking-tight leading-none">Export complete.</h3>
                       <p className="text-zinc-500 text-sm leading-relaxed">
                          The high-fidelity video has been rendered at full track length. Total video bit-rate is optimized for Instagram and TikTok.
                       </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <button 
                         onClick={handleExport}
                         disabled={isExporting}
                         className="flex items-center justify-center gap-2 p-5 bg-zinc-900 border border-zinc-800 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:border-zinc-700 transition-all disabled:opacity-50 disabled:cursor-wait"
                       >
                          {isExporting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                              Exporting...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" /> Export HQ
                            </>
                          )}
                       </button>
                       <button className="flex items-center justify-center gap-2 p-5 bg-zinc-900 border border-zinc-800 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:border-zinc-700 transition-all">
                          <Share2 className="w-4 h-4" /> Share Asset
                       </button>
                    </div>

                    <button 
                      onClick={onClose}
                      className="w-full p-5 bg-white text-black rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                    >
                       Return to Hub
                    </button>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
