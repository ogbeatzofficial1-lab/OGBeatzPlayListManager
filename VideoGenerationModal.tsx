import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Video, Sparkles, Wand2, Loader2, Play, Pause, Music, 
  CheckCircle2, AlertCircle, Share2, Download, Plus, Trash2, 
  Type, Image as ImageIcon, Film, Clock, Eye, SlidersHorizontal, Upload 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMediaStore } from '../context/MediaStoreContext';
import { Track, Playlist, PromoVideo } from '../types';

interface VideoGenerationModalProps {
  track?: Track;
  playlist?: Playlist;
  onClose: () => void;
}

interface LyricLine {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

interface MediaClip {
  id: string;
  name: string;
  type: 'image' | 'video' | 'gradient';
  url?: string;
  startTime: number;
  duration: number;
  gradientFrom?: string;
  gradientTo?: string;
  mediaElement?: HTMLImageElement | HTMLVideoElement;
}

export default function VideoGenerationModal({ track, playlist, onClose }: VideoGenerationModalProps) {
  const { addPromoVideo, tracks: allTracks } = useMediaStore();
  const [step, setStep] = useState<'config' | 'processing' | 'preview'>('config');
  const [activeTab, setActiveTab] = useState<'visual' | 'lyrics' | 'timeline'>('visual');
  const [progress, setProgress] = useState(0);
  const [generatedVideo, setGeneratedVideo] = useState<PromoVideo | null>(null);

  const name = track?.name || playlist?.name || 'Untitled';
  const artist = track?.artist || 'OGBeatz';
  const activeTrack = track || (playlist && allTracks ? allTracks.find(t => playlist.track_ids?.includes(t.id)) : null);

  // Aspect Ratio & Sizing (YouTube standard 16:9, Instagram Reels 9:16, Facebook style 1:1)
  const [aspectRatio, setAspectRatio] = useState<'horizontal' | 'vertical' | 'square'>('vertical');

  // Lyric Video Typography Settings
  const [selectedFont, setSelectedFont] = useState<'sans' | 'serif' | 'mono' | 'impact'>('sans');
  const [selectedPosition, setSelectedPosition] = useState<'top' | 'center' | 'bottom'>('bottom');
  const [fontSize, setFontSize] = useState<number>(26);
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [textBgOpacity, setTextBgOpacity] = useState<number>(0.35);
  const [showWaveform, setShowWaveform] = useState<boolean>(true);

  // Lyrics Track List Sizing & Syncer Default List
  const [lyrics, setLyrics] = useState<LyricLine[]>([
    { id: '1', text: `✨ "${name.toUpperCase()}" Official Lyric Video`, startTime: 0, endTime: 3.5 },
    { id: '2', text: `🎧 Produced by ${artist}`, startTime: 3.5, endTime: 7.0 },
    { id: '3', text: `🔥 This is a professional studio project`, startTime: 7.0, endTime: 11.5 },
    { id: '4', text: `⚡ Synced with real-time waveform elements`, startTime: 11.5, endTime: 16.0 },
    { id: '5', text: `🔊 Customize background clips & lyrics dynamically`, startTime: 16.0, endTime: 22.0 }
  ]);

  // Background Media clips timing list (Can contain custom uploaded video or image clips)
  const [clips, setClips] = useState<MediaClip[]>([
    { 
      id: 'default-gradient', 
      name: 'Cyber Orange Ambient Pulse', 
      type: 'gradient', 
      gradientFrom: '#f97316', 
      gradientTo: '#a855f7', 
      startTime: 0, 
      duration: 8 
    },
    { 
      id: 'coverart-img', 
      name: 'Track Artwork Ken-Burns', 
      type: 'image', 
      url: activeTrack?.image_url || '/input_file_2.png', 
      startTime: 8, 
      duration: 8 
    },
    { 
      id: 'moody-gradient', 
      name: 'Cosmic Blue Flow', 
      type: 'gradient', 
      gradientFrom: '#06b6d4', 
      gradientTo: '#3b82f6', 
      startTime: 16, 
      duration: 15 
    }
  ]);

  // Audio Playback & Real-time Web Audio API
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
  
  // HTML Element Caches for Canvas Rendering
  const elementsCacheRef = useRef<Record<string, HTMLImageElement | HTMLVideoElement>>({});

  // Trigger dynamic media pre-initialization on clips change
  useEffect(() => {
    clips.forEach(clip => {
      if (clip.url && !elementsCacheRef.current[clip.id]) {
        if (clip.type === 'image') {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = clip.url;
          elementsCacheRef.current[clip.id] = img;
        } else if (clip.type === 'video') {
          const video = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.src = clip.url;
          video.muted = true;
          video.loop = true;
          video.playsInline = true;
          video.className = 'hidden-pre-rendered-clip';
          elementsCacheRef.current[clip.id] = video;
        }
      }
    });
  }, [clips]);

  // Handle uploading custom background images or video clips
  const handleClipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);
      
      let calculatedStartTime = 0;
      if (clips.length > 0) {
        const lastClip = clips[clips.length - 1];
        calculatedStartTime = lastClip.startTime + lastClip.duration;
      }

      const newClipId = `custom-clip-${Math.random().toString()}`;

      // Create pre-rendered element
      if (isVideo) {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = url;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        elementsCacheRef.current[newClipId] = video;
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        elementsCacheRef.current[newClipId] = img;
      }

      const newClip: MediaClip = {
        id: newClipId,
        name: file.name,
        type: isVideo ? 'video' : 'image',
        url: url,
        startTime: calculatedStartTime,
        duration: isVideo ? 10 : 8 // Default duration
      };

      setClips(prev => [...prev, newClip]);
    });
  };

  const handleAddGradient = () => {
    let calculatedStartTime = 0;
    if (clips.length > 0) {
      const lastClip = clips[clips.length - 1];
      calculatedStartTime = lastClip.startTime + lastClip.duration;
    }
    const colors = [
      { from: '#ec4899', to: '#f43f5e' },
      { from: '#10b981', to: '#059669' },
      { from: '#6366f1', to: '#4f46e5' },
      { from: '#14b8a6', to: '#0d9488' }
    ];
    const picked = colors[Math.floor(Math.random() * colors.length)];
    const newGradientClip: MediaClip = {
      id: `gen-grad-${Math.random().toString()}`,
      name: 'Dynamic Studio Laser',
      type: 'gradient',
      gradientFrom: picked.from,
      gradientTo: picked.to,
      startTime: calculatedStartTime,
      duration: 8
    };
    setClips(prev => [...prev, newGradientClip]);
  };

  const handleDeleteClip = (id: string) => {
    setClips(prev => prev.filter(c => c.id !== id));
  };

  // Synchronizer Action: Set timing matching current preview audio tick
  const syncLyricStartTime = (index: number) => {
    setLyrics(prev => {
      const updated = [...prev];
      updated[index].startTime = parseFloat(currentTime.toFixed(1));
      return updated;
    });
  };

  const syncLyricEndTime = (index: number) => {
    setLyrics(prev => {
      const updated = [...prev];
      updated[index].endTime = parseFloat(currentTime.toFixed(1));
      return updated;
    });
  };

  const handleAddLyricLine = () => {
    let calculatedStart = parseFloat(currentTime.toFixed(1));
    if (lyrics.length > 0) {
      calculatedStart = lyrics[lyrics.length - 1].endTime;
    }
    setLyrics(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        text: 'Enter lyric lyrics...',
        startTime: calculatedStart,
        endTime: calculatedStart + 3
      }
    ]);
  };

  const handleDeleteLyricLine = (id: string) => {
    setLyrics(prev => prev.filter(l => l.id !== id));
  };

  const handleUpdateLyricText = (index: number, text: string) => {
    setLyrics(prev => {
      const updated = [...prev];
      updated[index].text = text;
      return updated;
    });
  };

  const handleUpdateLyricTiming = (index: number, key: 'startTime' | 'endTime', val: string) => {
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      setLyrics(prev => {
        const updated = [...prev];
        updated[index][key] = Math.max(0, parsed);
        return updated;
      });
    }
  };

  // High Fidelity Rendering Draw Loop
  const drawMotionGraphicFrame = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    duration: number,
    freqData: Uint8Array
  ) => {
    // 1. Resolve Active Clip
    const activeClip = clips.find(c => time >= c.startTime && time <= (c.startTime + c.duration)) || clips[0];

    // Clear background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    if (activeClip) {
      if (activeClip.type === 'gradient') {
        // Render beautiful moving flowing gradient backplate
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, activeClip.gradientFrom || '#18181b');
        grad.addColorStop(1, activeClip.gradientTo || '#09090b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Add ambient concentric graphic rings reacting with time
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1.5;
        for (let ri = 1; ri <= 4; ri++) {
          const rad = Math.min(width, height) * 0.15 * ri + Math.sin(time * 0.8 + ri) * 15;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, Math.max(10, rad), 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        const cachedElement = elementsCacheRef.current[activeClip.id];
        if (cachedElement) {
          if (activeClip.type === 'image') {
            const img = cachedElement as HTMLImageElement;
            if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
              // Draw image background using polished Ken-Burns slow slow pacing
              ctx.save();
              const normC = img.width / img.height;
              const normCanvas = width / height;
              let renderW = width;
              let renderH = height;
              let dx = 0;
              let dy = 0;

              if (normC > normCanvas) {
                renderH = height;
                renderW = height * normC;
                dx = (width - renderW) / 2;
              } else {
                renderW = width;
                renderH = width / normC;
                dy = (height - renderH) / 2;
              }

              // Slow fluid drift Ken Burns
              const zoom = 1.05 + Math.sin(time * 0.08) * 0.04;
              const panX = Math.cos(time * 0.05) * 18;
              const panY = Math.sin(time * 0.05) * 10;

              ctx.translate(width / 2 + panX, height / 2 + panY);
              ctx.scale(zoom, zoom);
              ctx.drawImage(img, dx - width / 2, dy - height / 2, renderW, renderH);
              ctx.restore();
            }
          } else if (activeClip.type === 'video') {
            const video = cachedElement as HTMLVideoElement;
            
            // Seamless video timeline sync
            try {
              const clipOffset = (time - activeClip.startTime);
              // Handle safari seeking vs normal
              if (Math.abs(video.currentTime - clipOffset) > 0.4) {
                video.currentTime = clipOffset % (video.duration || 10);
              }
              if (isPlayingPreview && video.paused) {
                video.play().catch(() => {});
              } else if (!isPlayingPreview && !video.paused) {
                video.pause();
              }
            } catch (vErr) {}

            ctx.save();
            const normC = video.videoWidth / (video.videoHeight || 1);
            const normCanvas = width / height;
            let renderW = width;
            let renderH = height;
            let dx = 0;
            let dy = 0;

            if (normC > normCanvas) {
              renderH = height;
              renderW = height * normC;
              dx = (width - renderW) / 2;
            } else {
              renderW = width;
              renderH = width / normC;
              dy = (height - renderH) / 2;
            }

            ctx.translate(width / 2, height / 2);
            ctx.drawImage(video, dx - width / 2, dy - height / 2, renderW, renderH);
            ctx.restore();
          }
        }
      }
    }

    // Overlay elegant translucent screen blur
    ctx.fillStyle = 'rgba(9, 9, 11, 0.45)';
    ctx.fillRect(0, 0, width, height);

    // 2. Waveform Realtime Visualizer
    if (showWaveform) {
      // Draw professional horizontal floating waveform reactive spectrum lines at the bottom bounds
      ctx.save();
      const points = 32;
      const barSpacing = (width * 0.72) / points;
      const startX = width * 0.14;
      const baselineY = height * 0.88;

      ctx.fillStyle = 'rgba(249, 115, 22, 0.65)'; // Classic Cyber Orange
      for (let i = 0; i < points; i++) {
        const freqVal = freqData[Math.floor((i / points) * freqData.length)] || 0;
        const speed = isPlayingPreview ? 1.0 : 0;
        const waveOsc = Math.abs(Math.sin(time * 4.5 + i * 0.18)) * 12 * speed;
        const h = Math.max(3, (freqVal / 255) * 75 + waveOsc);
        
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(startX + i * barSpacing, baselineY - h / 2, barSpacing * 0.55, h, 3);
        } else {
          ctx.rect(startX + i * barSpacing, baselineY - h / 2, barSpacing * 0.55, h);
        }
        ctx.fill();
      }
      ctx.restore();
    }

    // 3. Render Synced Lyrics Subtitles
    const currentActiveLyric = lyrics.find(l => time >= l.startTime && time <= l.endTime);
    if (currentActiveLyric && currentActiveLyric.text.trim()) {
      ctx.save();

      // Configure font
      let fontName = 'sans-serif';
      if (selectedFont === 'serif') fontName = '"Playfair Display", Georgia, serif';
      else if (selectedFont === 'mono') fontName = '"JetBrains Mono", Fira Code, monospace';
      else if (selectedFont === 'impact') fontName = 'Impact, Arial Black, sans-serif';
      else fontName = '"Inter", system-ui, sans-serif';

      ctx.font = `600 ${fontSize}px ${fontName}`;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Placement details
      let targetY = height * 0.5;
      if (selectedPosition === 'top') {
        targetY = height * 0.22;
      } else if (selectedPosition === 'bottom') {
        targetY = height * 0.72;
      }

      // Drop shadow for crisp visual reading
      ctx.shadowColor = 'rgba(0, 0, 0, 1.0)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 1.5;
      ctx.shadowOffsetY = 2.0;

      const words = currentActiveLyric.text.split(' ');
      const textLines: string[] = [];
      let currentLine = '';
      const maxLineWidth = width * 0.76;

      // Simple Canvas text wrap routine
      for (let w = 0; w < words.length; w++) {
        const testLine = currentLine ? currentLine + ' ' + words[w] : words[w];
        const measure = ctx.measureText(testLine);
        if (measure.width > maxLineWidth && currentLine) {
          textLines.push(currentLine);
          currentLine = words[w];
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) textLines.push(currentLine);

      const leading = fontSize * 1.3;
      const totalBoxHeight = textLines.length * leading;

      // Render semitransparent bounding label box backing for high distinction
      if (textBgOpacity > 0.02) {
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = `rgba(0, 0, 0, ${textBgOpacity})`;

        // Measure widest line width
        let maxLineW = 0;
        textLines.forEach(ln => {
          const wMeasure = ctx.measureText(ln).width;
          if (wMeasure > maxLineW) maxLineW = wMeasure;
        });

        const boxW = maxLineW + 40;
        const boxH = totalBoxHeight + 24;

        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(width / 2 - boxW / 2, targetY - boxH / 2, boxW, boxH, 14);
          ctx.fill();
        } else {
          ctx.fillRect(width / 2 - boxW / 2, targetY - boxH / 2, boxW, boxH);
        }
        ctx.restore();
      }

      // Render actual string text lines
      textLines.forEach((textLine, lineIdx) => {
        const offsetMultiplier = lineIdx - (textLines.length - 1) / 2;
        const lineY = targetY + offsetMultiplier * leading;
        ctx.fillText(textLine, width / 2, lineY);
      });

      ctx.restore();
    }

    // Floating watermark metadata tags
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.font = '800 tracking-widest 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LYRIC GENERATOR MASTER PRO // STUDIO PREVIEW`, width / 2, height - (aspectRatio === 'vertical' ? 32 : 18));
    ctx.restore();
  };

  // Pre-load audio loop helper
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

        source.loop = true;
        const offset = pausedTimeRef.current % buffer.duration;
        source.start(0, offset);
        
        playbackStartRef.current = ctx.currentTime - offset;
        setIsPlayingPreview(true);
      } else {
        startProceduralBeat(ctx, analyser, gainNode);
        setIsPlayingPreview(true);
      }

      // Resume HTML5 video element playbacks inside timeline clips cache
      clips.forEach(clip => {
        const elm = elementsCacheRef.current[clip.id];
        if (elm instanceof HTMLVideoElement) {
          elm.play().catch(() => {});
        }
      });
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

    // Pause clip playback elements
    clips.forEach(clip => {
      const elm = elementsCacheRef.current[clip.id];
      if (elm instanceof HTMLVideoElement) {
        elm.pause();
      }
    });
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
    const totalDuration = activeTrack?.duration || 22;
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
      if (audioContextRef.current && isPlayingPreview) {
        playbackSecs = audioContextRef.current.currentTime - playbackStartRef.current;
      } else {
        playbackSecs = pausedTimeRef.current;
      }
      
      const totalDur = activeTrack?.duration || 22;
      if (playbackSecs >= totalDur) {
        playbackSecs = 0;
        pausedTimeRef.current = 0;
        playbackStartRef.current = audioContextRef.current ? audioContextRef.current.currentTime : 0;
      }
      setCurrentTime(playbackSecs);

      drawMotionGraphicFrame(
        ctx,
        activeCanvas.width,
        activeCanvas.height,
        playbackSecs,
        totalDur,
        freqs
      );

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
  }, [isPlayingPreview, lyrics, clips, aspectRatio, selectedFont, selectedPosition, fontSize, textColor, textBgOpacity, showWaveform]);

  // High Fidelity Video Rendering & Compilation Export to MP4
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!generatedVideo?.video_url) return;
    setIsExporting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const videoUrl = generatedVideo.video_url;
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const isMp4 = blob.type.toLowerCase().includes('mp4');
      const extension = isMp4 ? 'mp4' : 'webm';
      const fileName = `${name.replace(/\s+/g, '_')}_Lyrics_Video.${extension}`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setIsExporting(false);
      }, 100);
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
      const a = document.createElement('a');
      a.href = generatedVideo.video_url;
      a.download = `${name.replace(/\s+/g, '_')}_Lyrics_Video.mp4`;
      a.click();
    }
  };

  const handleGenerate = async () => {
    setStep('processing');
    setProgress(5);

    try {
      let finalDuration = activeTrack?.duration || 0;
      if (finalDuration === 0) {
        // Calculate length based on lyrics end range
        const maxEnd = lyrics.reduce((acc, l) => Math.max(acc, l.endTime), 0);
        finalDuration = maxEnd > 0 ? maxEnd + 2 : 22;
      }

      // Preload all dynamic clips
      await Promise.all(
        clips.map(c => {
          return new Promise<void>((resolve) => {
            if (!c.url) return resolve();
            const cacheElm = elementsCacheRef.current[c.id];
            if (c.type === 'image' && cacheElm instanceof HTMLImageElement) {
              if (cacheElm.complete) return resolve();
              cacheElm.onload = () => resolve();
              cacheElm.onerror = () => resolve();
            } else if (c.type === 'video' && cacheElm instanceof HTMLVideoElement) {
              if (cacheElm.readyState >= 3) return resolve();
              cacheElm.onloadeddata = () => resolve();
              cacheElm.onerror = () => resolve();
              // Force trigger load
              cacheElm.load();
            } else {
              resolve();
            }
          });
        })
      );

      setProgress(25);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');
      
      // Canvas aspect ratio profile
      if (aspectRatio === 'vertical') {
        canvas.width = 720;
        canvas.height = 1280;
      } else if (aspectRatio === 'square') {
        canvas.width = 1080;
        canvas.height = 1080;
      } else {
        canvas.width = 1280;
        canvas.height = 720;
      }

      const stream = canvas.captureStream(30);
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
          audioSource = audioCtx.createBufferSource();
          audioSource.buffer = audioBuffer;
          audioSource.loop = false;
          audioSource.connect(audioDest);
          
          audioTrack = audioDest.stream.getAudioTracks()[0];
        } catch (e) {
          console.warn("Failed to prepare audio track:", e);
        }
      }

      const combinedStream = new MediaStream([
        ...stream.getVideoTracks(),
        ...(audioTrack ? [audioTrack] : [])
      ]);
      
      let mimeType = 'video/mp4;codecs=avc1,mp4a.40.2'; 
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=h264';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = ''; 

      const mediaRecorder = new MediaRecorder(combinedStream, mimeType ? {
        mimeType: mimeType,
        videoBitsPerSecond: 6000000 // High 6Mbps bitrate
      } : {
        videoBitsPerSecond: 6000000
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const renderDuration = finalDuration * 1000;
      const startTime = performance.now();
      
      return new Promise<void>((resolve) => {
        mediaRecorder.onstop = async () => {
          if (audioCtx) {
            audioSource?.stop();
            audioCtx.close();
          }

          const finalMime = mediaRecorder.mimeType || 'video/webm';
          const blob = new Blob(chunks, { type: finalMime }); 
          const videoUrl = URL.createObjectURL(blob);
          
          const newVideo: Partial<PromoVideo> = {
            track_id: activeTrack?.id,
            playlist_id: playlist?.id,
            video_url: videoUrl,
            thumbnail_url: activeTrack?.image_url || '',
            video_data: blob,
            thumbnail_data: activeTrack?.image_data,
            style: 'lyrics-music-video',
            status: 'ready'
          };
          
          await addPromoVideo(newVideo);
          setGeneratedVideo({
            id: Math.random().toString(),
            ...newVideo,
            created_at: new Date().toISOString()
          } as PromoVideo);
          
          setProgress(100);
          setStep('preview');
          resolve();
        };

        mediaRecorder.start();
        if (audioSource) audioSource.start(0);

        const animate = (time: number) => {
          const elapsed = time - startTime;
          const p = Math.min(elapsed / renderDuration, 1);
          
          setProgress(25 + (p * 75));

          const mockFreqs = new Uint8Array(128);
          const bpmVal = activeTrack?.bpm || 120;
          const elapsedSeconds = elapsed / 1000;
          const pulseValue = Math.max(0, 1 - ((elapsedSeconds * bpmVal / 60) % 1) * 2.5);
          
          for (let fi = 0; fi < mockFreqs.length; fi++) {
            if (fi < 8) {
              mockFreqs[fi] = Math.max(15, pulseValue * 255);
            } else {
              mockFreqs[fi] = Math.max(10, Math.sin(elapsedSeconds * 4 + fi * 0.15) * 55 + 75);
            }
          }

          drawMotionGraphicFrame(
            ctx,
            canvas.width,
            canvas.height,
            elapsedSeconds,
            finalDuration,
            mockFreqs
          );

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/98 backdrop-blur-3xl"
      />
      
      <motion.div 
        initial={{ scale: 0.93, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 15 }}
        className={`relative w-full ${step === 'config' ? 'max-w-6xl' : 'max-w-xl'} bg-zinc-950 border border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-3xl text-zinc-100 my-auto`}
      >
        {/* Header bar */}
        <div className="p-5 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/15">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
              <Film className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <h2 className="text-md font-black italic uppercase tracking-tight text-white">
                HQ LYRICS & MUSIC VIDEO STUDIO
              </h2>
              <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest mt-0.5">
                Aspect layout renders synced with low-latency waveforms
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-xl transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 md:p-8 min-h-[500px] max-h-[80vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 'config' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
                
                {/* 1. Left Section (Canvas Preview Room) - 5 Cols */}
                <div className="lg:col-span-5 space-y-6 bg-zinc-900/20 border border-zinc-900 rounded-3xl p-5 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full">
                      📺 Dynamic Video Feed Preview
                    </span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white mt-4">{name}</h4>
                    <p className="text-zinc-500 text-[10px] font-mono tracking-wider">
                      {artist} • {activeTrack?.bpm || 120} BPM
                    </p>
                  </div>

                  {/* Aspect Ratio Sized Web Canvas container */}
                  <div className="flex flex-1 items-center justify-center p-3 my-4 bg-zinc-950/80 rounded-2xl border border-zinc-900/60 min-h-[300px]">
                    <div 
                      className={`relative overflow-hidden rounded-2xl bg-black border border-zinc-800 shadow-2xl flex items-center justify-center transition-all duration-300 ${
                        aspectRatio === 'vertical' 
                        ? 'h-[300px] aspect-[9/16]' 
                        : aspectRatio === 'square' 
                        ? 'h-[250px] aspect-square' 
                        : 'w-[320px] aspect-video'
                      }`}
                    >
                      <canvas 
                        ref={canvasRef} 
                        width={aspectRatio === 'vertical' ? 360 : aspectRatio === 'square' ? 360 : 480}
                        height={aspectRatio === 'vertical' ? 640 : aspectRatio === 'square' ? 360 : 270}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Low Latency Audio Player Bar */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div 
                        onClick={handleSeek}
                        className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden cursor-pointer relative"
                      >
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-amber-500 transition-all rounded-full"
                          style={{ width: `${((currentTime) / (activeTrack?.duration || 22)) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] font-black text-zinc-500 uppercase tracking-widest font-mono">
                        <span>{new Date(currentTime * 1000).toISOString().substring(14, 19)}</span>
                        <span>{new Date((activeTrack?.duration || 22) * 1000).toISOString().substring(14, 19)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-zinc-950 border border-zinc-900 p-3 rounded-2xl">
                      <button
                        onClick={isPlayingPreview ? pausePlayback : startPlayback}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                          isPlayingPreview 
                          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:scale-105' 
                          : 'bg-white text-black hover:scale-105 active:scale-95'
                        }`}
                      >
                        {isPlayingPreview ? <Pause className="w-3.5 h-3.5 fill-current text-orange-500" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-white uppercase tracking-tight truncate">
                          {isPlayingPreview ? "PLAYBACK LIVE PREVIEW" : "PREVIEW ENGINE IDLE"}
                        </p>
                        <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest truncate">
                          {audioDecoding ? "RESOLVING AUDIO BUFFER..." : audioDecoded ? "WEB AUDIO TRANSLATION ONLINE" : "USING SYNTH SEQUENCER TIMELINE"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Right Section (Tabs config parameters) - 7 Cols */}
                <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
                  
                  {/* Tabs select bar */}
                  <div className="flex border-b border-zinc-900 p-1 bg-zinc-900/10 rounded-2xl">
                    <button
                      onClick={() => setActiveTab('visual')}
                      className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'visual' 
                        ? 'bg-zinc-900 text-white border border-zinc-800' 
                        : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <SlidersHorizontal className="w-3 h-3 text-orange-500" /> Style & Layout
                    </button>
                    <button
                      onClick={() => setActiveTab('lyrics')}
                      className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'lyrics' 
                        ? 'bg-zinc-900 text-white border border-zinc-800' 
                        : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <Type className="w-3 h-3 text-orange-500" /> Lyric Syncer
                    </button>
                    <button
                      onClick={() => setActiveTab('timeline')}
                      className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'timeline' 
                        ? 'bg-zinc-900 text-white border border-zinc-800' 
                        : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <Film className="w-3 h-3 text-orange-500" /> Background Clips
                    </button>
                  </div>

                  {/* Panel content switcher */}
                  <div className="space-y-6 min-h-[280px]">
                    
                    {/* Active Tab: Visual Stylings */}
                    {activeTab === 'visual' && (
                      <div className="space-y-6">
                        {/* Aspect Ratio Selector */}
                        <div className="space-y-2.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Render Aspect Ratio Profile</label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { id: 'horizontal', name: 'YouTube Style', desc: '16:9 Landscape', icon: '📺' },
                              { id: 'vertical', name: 'Instagram Reel / TikTok', desc: '9:16 Vertical', icon: '📱' },
                              { id: 'square', name: 'Facebook Feed', desc: '1:1 Square', icon: '⬛' }
                            ].map(preset => (
                              <button
                                key={preset.id}
                                onClick={() => setAspectRatio(preset.id as any)}
                                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                                  aspectRatio === preset.id 
                                  ? 'bg-orange-500/10 border-orange-500 text-white shadow-xl shadow-orange-500/5' 
                                  : 'bg-zinc-900/40 border-zinc-900 text-zinc-500 hover:border-zinc-800'
                                }`}
                              >
                                <span className="text-md mb-2">{preset.icon}</span>
                                <div>
                                  <div className="text-[10px] font-black uppercase text-white">{preset.name}</div>
                                  <p className="text-[8px] font-bold opacity-60 mt-0.5">{preset.desc}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Lyric Subtitles Style Panel */}
                        <div className="bg-zinc-900/20 border border-zinc-900 rounded-3xl p-5 space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300">Subtitles Layout Config</h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {/* Font Selection */}
                            <div className="space-y-1.5">
                              <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Lyric Typography</label>
                              <select 
                                value={selectedFont}
                                onChange={(e) => setSelectedFont(e.target.value as any)}
                                className="w-full bg-zinc-950 border border-zinc-900 rounded-xl p-2.5 text-xs text-white uppercase tracking-wider font-mono outline-none"
                              >
                                <option value="sans">Sleek Sans (Inter)</option>
                                <option value="serif">Classic Serif (Georgia)</option>
                                <option value="mono">Retro Mono (JetBrains)</option>
                                <option value="impact">Bold Impact</option>
                              </select>
                            </div>

                            {/* Position Anchoring */}
                            <div className="space-y-1.5">
                              <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Caption Placement</label>
                              <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 border border-zinc-905 border-zinc-900 rounded-xl">
                                {['top', 'center', 'bottom'].map(pos => (
                                  <button
                                    key={pos}
                                    onClick={() => setSelectedPosition(pos as any)}
                                    className={`py-2 text-[8px] font-black uppercase rounded-lg ${
                                      selectedPosition === pos 
                                      ? 'bg-zinc-900 text-orange-500' 
                                      : 'text-zinc-500 hover:text-white'
                                    }`}
                                  >
                                    {pos}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-2">
                            {/* Font Size slider */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between">
                                <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Subtitle Size ({fontSize}px)</label>
                              </div>
                              <input 
                                type="range" 
                                min="16" 
                                max="44" 
                                value={fontSize}
                                onChange={(e) => setFontSize(parseInt(e.target.value))}
                                className="w-full accent-orange-500 bg-zinc-900 h-1.5 rounded-full outline-none"
                              />
                            </div>

                            {/* Backplate Opacity */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between">
                                <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Backing Opacity ({Math.round(textBgOpacity * 100)}%)</label>
                              </div>
                              <input 
                                type="range" 
                                min="0" 
                                max="85" 
                                value={textBgOpacity * 100}
                                onChange={(e) => setTextBgOpacity(parseFloat(e.target.value) / 100)}
                                className="w-full accent-orange-500 bg-zinc-900 h-1.5 rounded-full outline-none"
                              />
                            </div>
                          </div>

                          {/* Visualizer reactive switch */}
                          <div className="flex justify-between items-center bg-zinc-950/80 border border-zinc-900/60 p-3 rounded-2xl mt-2">
                            <div>
                              <p className="text-[9px] font-black tracking-wider uppercase text-white">Audio Waveform Visualizer Overlay</p>
                              <p className="text-[7px] text-zinc-500 italic">Renders high-frequency waveform elements at baseline</p>
                            </div>
                            <button
                              onClick={() => setShowWaveform(v => !v)}
                              className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase border transition-all ${
                                showWaveform 
                                ? 'bg-orange-500/10 border-orange-500 text-orange-500' 
                                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                              }`}
                            >
                              {showWaveform ? "ENABLED Overlay" : "DISABLED Overlay"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Active Tab: Lyrics Track Editor */}
                    {activeTab === 'lyrics' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-1 border-b border-zinc-900">
                          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Lyric Sync Editor ({lyrics.length} lines)</label>
                          <button
                            onClick={handleAddLyricLine}
                            className="text-[8px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-400 flex items-center gap-1 bg-orange-500/10 px-3 py-1.5 border border-orange-500/20 rounded-xl"
                          >
                            <Plus className="w-3 h-3Color fill-current" /> Add Lyric Line
                          </button>
                        </div>

                        {lyrics.length === 0 ? (
                          <div className="text-center py-10 border border-dashed border-zinc-900 rounded-3xl text-zinc-600">
                            <Clock className="w-8 h-8 mx-auto stroke-[1.5] text-zinc-700 mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No Subtitle Lines Configured</p>
                            <p className="text-[8px] mt-1 italic">Click add lyric line above to begin editing</p>
                          </div>
                        ) : (
                          <div className="space-y-3.5 max-h-[290px] overflow-y-auto pr-1">
                            {lyrics.map((line, idx) => {
                              const isActive = currentTime >= line.startTime && currentTime <= line.endTime;
                              return (
                                <motion.div 
                                  key={line.id} 
                                  className={`p-3 rounded-2xl border transition-all ${
                                    isActive 
                                    ? 'bg-orange-500/5 border-orange-500/40 shadow-xl' 
                                    : 'bg-zinc-950/40 border-zinc-900'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[9px] font-black font-mono">
                                      {idx + 1}
                                    </div>
                                    <input 
                                      type="text"
                                      value={line.text}
                                      onChange={(e) => handleUpdateLyricText(idx, e.target.value)}
                                      className="flex-1 bg-transparent border-b border-transparent hover:border-zinc-800 focus:border-orange-500 outline-none text-xs text-white"
                                      placeholder="Pinch/paste lyric text..."
                                    />
                                    <button 
                                      onClick={() => handleDeleteLyricLine(line.id)}
                                      className="p-1.5 hover:bg-zinc-900 text-zinc-600 hover:text-red-500 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-4 gap-2 items-center mt-3 pt-2.5 border-t border-zinc-900/40">
                                    {/* Start Bounds Input */}
                                    <div className="flex items-center gap-1.5 col-span-2">
                                      <span className="text-[7px] font-black uppercase text-zinc-500 font-mono">In</span>
                                      <input 
                                        type="number" 
                                        step="0.1"
                                        value={line.startTime}
                                        onChange={(e) => handleUpdateLyricTiming(idx, 'startTime', e.target.value)}
                                        className="w-12 bg-zinc-950 border border-zinc-900 rounded p-1 text-[9px] font-mono font-black outline-none text-orange-500 text-center"
                                      />
                                      <button 
                                        onClick={() => syncLyricStartTime(idx)}
                                        className="text-[7px] font-black bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-zinc-400 hover:text-orange-500 hover:border-orange-500/40 transition-all font-mono"
                                        title="Capture current track timestamp"
                                      >
                                        Use Current
                                      </button>
                                    </div>

                                    {/* End Bounds Input */}
                                    <div className="flex items-center gap-1.5 col-span-2 justify-end">
                                      <span className="text-[7px] font-black uppercase text-zinc-500 font-mono">Out</span>
                                      <input 
                                        type="number" 
                                        step="0.1"
                                        value={line.endTime}
                                        onChange={(e) => handleUpdateLyricTiming(idx, 'endTime', e.target.value)}
                                        className="w-12 bg-zinc-950 border border-zinc-900 rounded p-1 text-[9px] font-mono font-black outline-none text-orange-500 text-center"
                                      />
                                      <button 
                                        onClick={() => syncLyricEndTime(idx)}
                                        className="text-[7px] font-black bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-zinc-400 hover:text-orange-500 hover:border-orange-500/40 transition-all font-mono"
                                        title="Capture current track timestamp"
                                      >
                                        Use Current
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Active Tab: Timeline Background Media Clips */}
                    {activeTab === 'timeline' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-1 border-b border-zinc-900">
                          <div>
                            <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Background Video Clips & Slides</label>
                            <p className="text-[7px] text-zinc-600 mt-0.5 uppercase tracking-wide">Add, reorder or upload custom source clips</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleAddGradient}
                              className="text-[8px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-400 flex items-center gap-1 bg-orange-500/10 px-2.5 py-1.5 border border-orange-500/20 rounded-xl"
                            >
                              <Plus className="w-3 h-3" /> Gradient Loop
                            </button>
                            
                            <label className="text-[8px] font-black uppercase tracking-widest text-white hover:text-zinc-300 bg-white/5 px-3 py-1.5 border border-white/10 rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors">
                              <Upload className="w-3 h-3" /> Upload Files
                              <input 
                                type="file" 
                                multiple 
                                accept="image/*,video/*" 
                                onChange={handleClipUpload}
                                className="hidden" 
                              />
                            </label>
                          </div>
                        </div>

                        {clips.length === 0 ? (
                          <div className="text-center py-10 border border-dashed border-zinc-900 rounded-3xl text-zinc-600">
                            <Film className="w-8 h-8 mx-auto stroke-[1.5] text-zinc-700 mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No Media Clips Loaded</p>
                            <p className="text-[8px] mt-1 italic">Upload custom media or hit add Gradient loop above</p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                            {clips.map((clip, idx) => {
                              const isActive = currentTime >= clip.startTime && currentTime <= (clip.startTime + clip.duration);
                              return (
                                <div 
                                  key={clip.id}
                                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                                    isActive 
                                    ? 'bg-orange-500/5 border-orange-500/35' 
                                    : 'bg-zinc-950/40 border-zinc-900'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs">
                                      {clip.type === 'video' ? <Film className="w-4 h-4 text-orange-500" /> : clip.type === 'image' ? <ImageIcon className="w-4 h-4 text-orange-500" /> : <Sparkles className="w-4 h-4 text-orange-500" />}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-black uppercase text-white truncate max-w-[200px]">{clip.name}</p>
                                      <p className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                                        Type: {clip.type} • range: {clip.startTime.toFixed(1)}s - {(clip.startTime + clip.duration).toFixed(1)}s
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {/* Duration editor label */}
                                    <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-900">
                                      <span className="text-[7px] font-black text-zinc-500 uppercase tracking-wider">Dur:</span>
                                      <input 
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={clip.duration}
                                        onChange={(e) => {
                                          const dVal = parseInt(e.target.value);
                                          if (!isNaN(dVal)) {
                                            setClips(prev => {
                                              const updated = [...prev];
                                              updated[idx].duration = Math.max(1, dVal);
                                              // Recalculate timing timeline ranges sequentially
                                              let acc = 0;
                                              for (let i = 0; i < updated.length; i++) {
                                                updated[i].startTime = acc;
                                                acc += updated[i].duration;
                                              }
                                              return updated;
                                            });
                                          }
                                        }}
                                        className="bg-transparent text-[9px] font-black font-mono text-orange-500 w-6 outline-none text-center"
                                      />
                                      <span className="text-[7px] font-mono text-zinc-500">S</span>
                                    </div>

                                    {/* Trash deletion */}
                                    <button 
                                      onClick={() => handleDeleteClip(clip.id)}
                                      className="p-1.5 hover:bg-zinc-900 text-zinc-600 hover:text-red-500 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* 3. Render Trigger Synthesis Bottom bar */}
                  <div className="pt-4 border-t border-zinc-900">
                    <button
                      onClick={handleGenerate}
                      className="w-full bg-white text-black py-4 rounded-full font-black tracking-widest uppercase text-[10px] hover:bg-orange-500 hover:text-black transition-all shadow-xl flex items-center justify-center gap-3"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-black" /> Begin Music Video Compile
                    </button>
                    <p className="text-center text-[7.5px] font-black text-zinc-600 uppercase tracking-widest mt-2 px-1">
                      Processes timeline assets frame-by-frame. Syncs lyrics & custom background clips directly.
                    </p>
                  </div>

                </div>

              </div>
            )}

            {step === 'processing' && (
              <motion.div 
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center space-y-12 py-12"
              >
                 <div className="relative">
                    <div className="w-28 h-28 rounded-full border border-zinc-900 flex items-center justify-center">
                       <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                    </div>
                    <div className="absolute inset-0 rounded-full border border-orange-500/10 animate-ping" />
                 </div>

                 <div className="text-center space-y-5 w-full max-w-sm">
                    <div className="space-y-1.5">
                       <h3 className="text-md font-black uppercase tracking-tight text-white">
                          {progress < 30 ? 'Pre-loading Clip Assets...' : progress < 75 ? 'Compiling Video Frames...' : 'Writing Output Media Buffer...'}
                       </h3>
                       <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                          Integrating synchronized lyrics track with master audio stream
                       </p>
                       <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden mt-3">
                          <motion.div 
                            className="h-full bg-orange-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                          />
                       </div>
                       <div className="flex justify-between text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-1">
                          <span>Rendering Progress</span>
                          <span>{Math.floor(progress)}%</span>
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {step === 'preview' && (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center py-4"
              >
                  {/* Generated Video Canvas Render view */}
                  <div className={`bg-black rounded-3xl border border-zinc-900 overflow-hidden relative shadow-2xl ${
                    aspectRatio === 'vertical' ? 'aspect-[9/16] h-[360px] mx-auto' : aspectRatio === 'square' ? 'aspect-square h-[300px] mx-auto' : 'aspect-video w-full'
                  }`}>
                    {generatedVideo?.video_url ? (
                        <video 
                          src={generatedVideo.video_url} 
                          className="w-full h-full object-cover"
                          autoPlay
                          loop
                          playsInline
                          controls
                        />
                    ) : (
                       <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                         <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest">No preview available</span>
                       </div>
                    )}
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 border border-orange-500/30 bg-orange-500/10 backdrop-blur-md rounded-full text-[7.5px] font-black uppercase tracking-widest text-orange-500 pointer-events-none">
                       Compiling Complete // 1080p
                    </div>
                  </div>

                  {/* Complete actions review */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                       <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                       </div>
                       <h3 className="text-2xl font-black tracking-tight leading-none uppercase text-white">Music Video Perfect.</h3>
                       <p className="text-zinc-500 text-xs leading-relaxed">
                          Your synchronized lyric music video has been fully compiled! Visual timings, custom uploaded clips, and font parameters are rendered in standard HD quality.
                       </p>
                    </div>

                    <div className="space-y-3 pt-2">
                       <button 
                         onClick={handleExport}
                         disabled={isExporting}
                         className="w-full flex items-center justify-center gap-2 p-4 bg-orange-500 border border-orange-600 rounded-full text-[9px] font-black uppercase tracking-widest text-black hover:bg-orange-400 hover:border-orange-500 transition-all disabled:opacity-50"
                       >
                          {isExporting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-black" />
                              Exporting Master...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 text-black" /> Download video
                            </>
                          )}
                       </button>

                       <button 
                         onClick={onClose}
                         className="w-full p-4 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
                       >
                          Return to Hub
                       </button>
                    </div>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
