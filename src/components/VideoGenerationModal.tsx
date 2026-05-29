import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Video, Sparkles, Wand2, Loader2, Play, Pause, Music, Sliders, CheckCircle2, AlertCircle, Share2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMediaStore } from '../context/MediaStoreContext';
import { Track, Playlist, PromoVideo } from '../types';
import { generateVideoAesthetic } from '../services/geminiService';

interface VideoGenerationModalProps {
  track?: Track;
  playlist?: Playlist;
  onClose: () => void;
}

export default function VideoGenerationModal({ track, playlist, onClose }: VideoGenerationModalProps) {
  const { addPromoVideo, promoVideos, tracks: allTracks } = useMediaStore();
  const [step, setStep] = useState<'config' | 'processing' | 'preview'>('config');
  const [style, setStyle] = useState('minimalist');
  const [aspectRatio, setAspectRatio] = useState<'vertical' | 'square' | 'horizontal'>('vertical');
  const [progress, setProgress] = useState(0);
  const [aesthetic, setAesthetic] = useState<any>(null);
  const [generatedVideo, setGeneratedVideo] = useState<PromoVideo | null>(null);

  // Advanced Lyric Overlays and Custom Audio Clip states
  const [overlayLyrics, setOverlayLyrics] = useState(false);
  const [lyricsText, setLyricsText] = useState(
    `[00:01] OG Beatz on the track\n` +
    `[00:03] Feel the rhythm shake the floor\n` +
    `[00:06] Synthesizing lyric visualizer\n` +
    `[00:10] Approved for the charts\n` +
    `[00:13] Professional master delivery`
  );
  const [lyricStyle, setLyricStyle] = useState<'retro' | 'serif' | 'mono' | 'impact'>('retro');
  const [lyricColor, setLyricColor] = useState('#ffffff');

  const [clipEnabled, setClipEnabled] = useState(false);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(15);
  const [activeParamTab, setActiveParamTab] = useState<'aesthetics' | 'lyrics' | 'trimmer'>('aesthetics');

  useEffect(() => {
    const tDuration = track?.duration || (playlist && allTracks ? allTracks.find(item => playlist.track_ids?.includes(item.id))?.duration : 15) || 15;
    setClipEnd(Math.round(tDuration));
  }, [track, playlist, allTracks]);

  const parsedLyrics = useMemo(() => {
    const lines = lyricsText.split('\n');
    const result: Array<{ time: number; text: string }> = [];
    const timeReg = /\[(\d+):(\d+)\]/;
    let lastTime = 0;
    for (const line of lines) {
      const match = line.match(timeReg);
      if (match) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const timeVal = mins * 60 + secs;
        const textVal = line.replace(timeReg, '').trim();
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

  const name = track?.name || playlist?.name || 'Untitled';
  const artist = track?.artist || 'OGBeatz';

  const styles = [
    { id: 'minimalist', name: 'Clean Chrome', icon: '✨' },
    { id: 'grunge', name: 'Distressed Metal', icon: '⛓️' },
    { id: 'vibrant', name: 'Neon Pulse', icon: '⚡' },
    { id: 'abstract', name: 'Ethereal Flow', icon: '🌫️' }
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

    const trackName = activeTrack?.name || name;
    const artistName = activeTrack?.artist || artist;

    // 2. Draw Blurred Cover Art background for depth
    if (imgElement) {
      ctx.save();
      ctx.globalAlpha = 0.20;
      
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
      ctx.scale(zoom, zoom);
      ctx.drawImage(imgElement, x - width / 2, y - height / 2, renderW, renderH);
      ctx.restore();
    }

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
    const artScale = 1.0 + motionPulse * 0.10;

    // 3. Draw style-specific overlays
    ctx.save();
    if (style === 'minimalist') {
      // Sleek Orbit lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.3 * artScale, 0, Math.PI * 2);
      ctx.stroke();

      // Sharp clean waveform lines
      const barCount = 48;
      const barWidth = (width * 0.75) / barCount;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      const startX = width * 0.125;
      const baselineY = height * 0.82;

      for (let i = 0; i < barCount; i++) {
        const freqVal = freqData[Math.floor((i / barCount) * freqData.length)] || 0;
        const normVal = freqVal / 255;
        const h = Math.max(3, normVal * 70 + Math.abs(Math.sin(time * 3.5 + i * 0.15)) * 6);
        ctx.fillRect(startX + i * barWidth, baselineY - h, barWidth - 1.5, h);
      }
    } 
    else if (style === 'grunge') {
      // Aggressive distressed UI offsets
      const glitchOffset = Math.random() < 0.07 ? (Math.random() - 0.5) * 14 : 0;
      
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(width * 0.12 + glitchOffset, height * 0.12, width * 0.76, height * 0.76);
      ctx.stroke();

      // Industrial crosshair
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.beginPath();
      ctx.moveTo(width / 2 + glitchOffset, 0);
      ctx.lineTo(width / 2 + glitchOffset, height);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Violent spark frequencies
      const points = 24;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const startX = width * 0.125;
      const stepX = (width * 0.75) / points;
      const baselineY = height * 0.80;

      for (let i = 0; i <= points; i++) {
        const freqVal = freqData[Math.floor((i / points) * freqData.length)] || 0;
        const h = (freqVal / 255) * 90 * (Math.random() * 0.5 + 0.75);
        const curX = startX + (i * stepX);
        const curY = baselineY - h;

        if (i === 0) ctx.moveTo(curX, curY);
        else ctx.lineTo(curX, curY);
      }
      ctx.stroke();
    } 
    else if (style === 'vibrant') {
      // Rotating Vinyl grooves with glowing overlays
      const glowGrad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, Math.min(width, height) * 0.42);
      glowGrad.addColorStop(0, 'rgba(249, 115, 22, 0.04)');
      glowGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.08)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // Radial neon fire bars expanding outwards
      const outerRad = Math.min(width, height) * 0.26;
      const numBars = 50;
      ctx.save();
      ctx.translate(width / 2, height / 2);
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
    else if (style === 'abstract') {
      // Flowing bezier liquid frequencies
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let xCoord = 0; xCoord < width; xCoord += 6) {
        const freqSample = freqData[Math.floor((xCoord / width) * freqData.length)] || 0;
        const freqNorm = freqSample / 255;
        const valY = height * 0.81 + Math.sin(xCoord * 0.007 + time * 1.8) * (24 + freqNorm * 54) + Math.cos(xCoord * 0.015 + time * 2.5) * 12;
        if (xCoord === 0) ctx.moveTo(xCoord, valY);
        else ctx.lineTo(xCoord, valY);
      }
      ctx.stroke();

      // Intertwining orbit rings
      for (let rNode = 0; rNode < 3; rNode++) {
        const expandFactor = 1.0 + rNode * 0.14 + Math.sin(time * 1.2 + rNode) * 0.06 + motionPulse * 0.08;
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.12 - rNode * 0.03})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.24 * expandFactor, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();

    // 4. Center image card drawing
    if (imgElement) {
      const artSize = Math.min(width, height) * 0.36 * artScale;
      ctx.save();
      ctx.translate(width / 2, height / 2);

      if (style === 'vibrant') {
        ctx.rotate(time * 0.11);
      } else if (style === 'abstract') {
        ctx.rotate(Math.sin(time * 0.08) * 0.12);
      }

      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 12;

      ctx.beginPath();
      if (style === 'vibrant') {
        ctx.arc(0, 0, artSize / 2, 0, Math.PI * 2);
      } else {
        if (ctx.roundRect) {
          ctx.roundRect(-artSize / 2, -artSize / 2, artSize, artSize, 18);
        } else {
          ctx.rect(-artSize / 2, -artSize / 2, artSize, artSize);
        }
      }
      ctx.clip();
      ctx.drawImage(imgElement, -artSize / 2, -artSize / 2, artSize, artSize);
      ctx.restore();

      // Central vinyl marker for vibrant
      if (style === 'vibrant') {
        ctx.save();
        ctx.translate(width / 2, height / 2);
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
    }
    ctx.textAlign = 'center';
    
    const textBaseY = height * 0.73;
    const pulseFade = 0.82 + Math.sin(time * 5) * 0.18;
    ctx.save();
    ctx.globalAlpha = style === 'grunge' ? 1.0 : pulseFade;
    ctx.fillText(`${trackName.toUpperCase()}`, width / 2, textBaseY);
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.44)';
    ctx.font = '800 uppercase tracking-widest 9px monospace';
    ctx.fillText(`${artistName}`, width / 2, textBaseY + 20);

    // Dynamic watermarks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = '900 tracking-widest 7px monospace';
    ctx.fillText(`PROMO ENGINE v1.0 // MODE: ${style.toUpperCase()}`, width / 2, height - 20);

    // 6. Embedded Lip Sync / Dynamic Lyric Overlay
    if (overlayLyrics && parsedLyrics && parsedLyrics.length > 0) {
      let activeLine = parsedLyrics[0];
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
        let fontSize = aspect === 'vertical' ? '28px' : '36px';
        
        if (lyricStyle === 'retro') {
          fontName = '"Space Grotesk", sans-serif';
          ctx.font = `900 italic ${fontSize} ${fontName}`;
          ctx.fillStyle = lyricColor || '#f97316';
          ctx.shadowColor = lyricColor || '#f97316';
          ctx.shadowBlur = 18;
        } else if (lyricStyle === 'serif') {
          fontName = '"Playfair Display", serif';
          ctx.font = `italic 700 ${fontSize} ${fontName}`;
          ctx.fillStyle = lyricColor || '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.7)';
          ctx.shadowBlur = 12;
          uppercase = false;
        } else if (lyricStyle === 'mono') {
          fontName = '"JetBrains Mono", monospace';
          ctx.font = `800 ${fontSize} ${fontName}`;
          ctx.fillStyle = lyricColor || '#10b981';
          ctx.shadowColor = lyricColor || '#10b981';
          ctx.shadowBlur = 14;
        } else {
          fontName = '"Inter", sans-serif';
          ctx.font = `900 ${fontSize} ${fontName}`;
          ctx.fillStyle = lyricColor || '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = 15;
        }
        
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 8;
        
        const displayText = uppercase ? activeLine.text.toUpperCase() : activeLine.text;
        // Place text in lower center / or vertical upper part
        const lyricY = aspect === 'vertical' ? height * 0.45 : height * 0.5;
        
        const timeDelta = time - activeLine.time;
        let scaleEffect = 1.0;
        let opacity = 1.0;
        
        if (timeDelta < 0.4) {
          scaleEffect = 0.9 + (timeDelta / 0.4) * 0.1;
          opacity = timeDelta / 0.4;
        }
        
        ctx.globalAlpha = opacity;
        ctx.translate(width / 2, lyricY);
        ctx.scale(scaleEffect, scaleEffect);
        ctx.strokeText(displayText, 0, 0);
        ctx.fillText(displayText, 0, 0);
        ctx.restore();
      }
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
    const coverArtUrl = activeTrack?.image_url || '/input_file_2.png';
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
        aspectRatio,
        freqs,
        coverImg
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
  }, [style, aspectRatio, isPlayingPreview]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!generatedVideo?.video_url) return;
    setIsExporting(true);

    try {
      // Small delay to simulate prep
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const videoUrl = generatedVideo.video_url;
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      // Determine extension based on blob type
      const isMp4 = blob.type.toLowerCase().includes('mp4');
      const extension = isMp4 ? 'mp4' : 'webm';
      const fileName = `${name.replace(/\s+/g, '_')}_Master_Promo.${extension}`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setIsExporting(false);
      }, 100);
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
      
      // Fallback to direct download
      const a = document.createElement('a');
      a.href = generatedVideo.video_url;
      a.download = `${name.replace(/\s+/g, '_')}_Promo.mp4`;
      a.click();
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

      // Load Image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = activeTrack?.image_url || '/input_file_2.png';
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
          audioSource = audioCtx.createBufferSource();
          audioSource.buffer = audioBuffer;
          audioSource.loop = false; // Don't loop if we match duration
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
          
          const newVideo: Partial<PromoVideo> = {
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
            id: Math.random().toString(),
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
            aspectRatio,
            mockFreqs,
            img
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
                        aspectRatio === 'vertical' 
                        ? 'h-[280px] aspect-[9/16]' 
                        : aspectRatio === 'square' 
                        ? 'h-[240px] aspect-square' 
                        : 'w-[320px] aspect-video'
                      }`}
                    >
                      <canvas 
                        ref={canvasRef} 
                        width={aspectRatio === 'vertical' ? 360 : aspectRatio === 'square' ? 400 : 480}
                        height={aspectRatio === 'vertical' ? 640 : aspectRatio === 'square' ? 400 : 270}
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
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { id: 'vertical', name: 'Vertical', ratio: '9:16', icon: '📱' },
                              { id: 'square', name: 'Square', ratio: '1:1', icon: '🟦' },
                              { id: 'horizontal', name: 'Wide', ratio: '16:9', icon: '📺' }
                            ].map(r => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => setAspectRatio(r.id as any)}
                                className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-1.5 ${
                                  aspectRatio === r.id 
                                  ? 'bg-orange-500/10 border-orange-500 text-orange-500 shadow-lg shadow-orange-500/5' 
                                  : 'bg-zinc-900/40 border-zinc-900 text-zinc-500 hover:border-zinc-800'
                                }`}
                              >
                                <span className="text-lg">{r.icon}</span>
                                <div className="text-center">
                                  <div className="text-[9px] font-black uppercase tracking-wider">{r.name}</div>
                                  <div className="text-[7px] font-bold opacity-60 font-mono">{r.ratio}</div>
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
                              { id: 'minimalist', name: 'Clean Chrome', icon: '✨', desc: 'Orbit lines & wave grids' },
                              { id: 'grunge', name: 'Distressed Metal', icon: '⛓️', desc: 'Aggressive red wireframes' },
                              { id: 'vibrant', name: 'Neon Pulse', icon: '⚡', desc: 'Neon halos & record vinyl rotate' },
                              { id: 'abstract', name: 'Ethereal Flow', icon: '🌫️', desc: 'Fluid waves & bezier curves' }
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
                          <div className="space-y-3">
                            {/* Stylistic selector */}
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
                                  className={`py-2 px-1 rounded-xl text-[8px] font-black uppercase tracking-wider border transition-all ${
                                    lyricStyle === st.id
                                    ? 'bg-orange-500/10 border-orange-500 text-orange-500'
                                    : 'bg-zinc-900/40 border-zinc-900 text-zinc-500'
                                  }`}
                                >
                                  {st.label}
                                </button>
                              ))}
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
                                    className={`w-5 h-5 rounded-full border transition-transform ${
                                      lyricColor === col ? 'scale-125 border-white' : 'border-transparent'
                                    }`}
                                    style={{ backgroundColor: col }}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Text Area */}
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Timed Lyrics Board</span>
                              <textarea
                                value={lyricsText}
                                onChange={(e) => setLyricsText(e.target.value)}
                                rows={3}
                                className="w-full bg-black border border-zinc-900 rounded-xl p-3 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-orange-500 custom-scrollbar resize-none font-semibold leading-relaxed"
                                placeholder={`[00:03] Example lyric lines...`}
                              />
                              <p className="text-[7px] text-zinc-600 font-bold uppercase tracking-widest leading-normal">
                                Use format [mm:ss] text to time-sync, or write flat text for auto-scroll loops.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeParamTab === 'trimmer' && (
                      <div className="space-y-4">
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
                              setClipEnabled(!clipEnabled);
                            }}
                            className={`w-12 h-6 rounded-full transition-all relative ${clipEnabled ? 'bg-orange-500' : 'bg-zinc-800'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${clipEnabled ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>

                        {clipEnabled && (
                          <div className="space-y-4 p-4 bg-zinc-950/80 border border-zinc-900 rounded-2xl">
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
                                    }}
                                    className="w-full accent-orange-500 bg-zinc-900 h-1 rounded-lg outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
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
                                   <audio src={track.file_url} controls autoPlay loop className="w-full opacity-80 hover:opacity-100 transition-opacity rounded-full shadow-2xl" />
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
