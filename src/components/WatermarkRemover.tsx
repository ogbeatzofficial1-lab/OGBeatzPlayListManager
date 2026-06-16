import React, { useState, useRef, useEffect } from 'react';
import type { DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, Sparkles, Sliders, Play, Pause, Download,
  Trash2, ShieldCheck, Key, RefreshCw, Layers, Lock, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useMediaStore } from '../context/MediaStoreContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type GhostCutMode = 'remove_watermark' | 'remove_subtitles' | 'video_crop';
type ProviderType = 'rapidapi' | 'direct';

interface MyProcessingChartProps {
  width?: string | number;
  height?: string | number;
  progress?: number;
}

export function MyProcessingChart({ width = "100%", height = 300, progress = 0 }: MyProcessingChartProps) {
  const [data, setData] = useState(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      frame: `F-${i * 10}`,
      density: Math.round(30 + Math.sin(i * 0.8) * 20 + Math.random() * 15),
      processingRate: Math.round(60 + Math.cos(i * 0.5) * 25 + Math.random() * 10),
      loss: Math.round(15 - Math.sin(i * 0.6) * 5 + Math.random() * 2),
    }));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const next = [...prev];
        next.shift();
        const lastIndex = prev.length - 1;
        const lastFrameNum = parseInt(next[lastIndex - 1]?.frame.split('-')[1] || '0') + 10;
        next.push({
          frame: `F-${lastFrameNum}`,
          density: Math.round(35 + Math.sin(progress * 0.3) * 20 + Math.random() * 20),
          processingRate: Math.round(55 + Math.cos(progress * 0.2) * 20 + Math.random() * 15),
          loss: Math.max(1, Math.round((100 - progress) * 0.15 + Math.random() * 3)),
        });
        return next;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [progress]);

  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="densityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="frame" stroke="#475569" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#64748b", fontFamily: "monospace" }} />
        <YAxis stroke="#475569" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#64748b", fontFamily: "monospace" }} />
        <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px", fontFamily: "monospace" }} labelStyle={{ color: "#94a3b8", fontWeight: "bold" }} />
        <Area type="monotone" dataKey="density" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#densityGrad)" name="Pixel Cleanse Index" activeDot={{ r: 4 }} />
        <Area type="monotone" dataKey="processingRate" stroke="#ef4444" strokeWidth={1.5} fillOpacity={1} fill="url(#rateGrad)" name="GPU Thread Load (FPS)" />
        <Area type="monotone" dataKey="loss" stroke="#3b82f6" strokeWidth={1} fillOpacity={1} fill="url(#lossGrad)" name="Compression Residual" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function WatermarkRemover() {
  const { promoVideos, addPromoVideo, addActivity, addToast } = useMediaStore();
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedVideoName, setSelectedVideoName] = useState<string>('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [isKeySaved, setIsKeySaved] = useState<boolean>(false);
  const [apiProvider, setApiProvider] = useState<ProviderType>('rapidapi');

  useEffect(() => {
    const savedKey = localStorage.getItem("GHOSTCUT_API_KEY") || localStorage.getItem("WATERMARK_ERASER_API_KEY") || '';
    const savedProvider = (localStorage.getItem("GHOSTCUT_PROVIDER") as ProviderType) || 'rapidapi';
    setApiKey(savedKey);
    setIsKeySaved(!!savedKey);
    setApiProvider(savedProvider);
  }, []);

  const [ghostcutMode, setGhostcutMode] = useState<GhostCutMode>('remove_watermark');
  const [useInpainting, setUseInpainting] = useState<boolean>(true);
  const [hdUpscale, setHdUpscale] = useState<boolean>(false);
  const [processRange, setProcessRange] = useState<'preview' | 'full' | 'custom'>('full');
  const [customStart, setCustomStart] = useState<number>(0);
  const [customEnd, setCustomEnd] = useState<number>(30);
  const [watermarkBoxes, setWatermarkBoxes] = useState([
    { x: 5, y: 5, w: 20, h: 8 },
    { x: 75, y: 5, w: 20, h: 8 },
    { x: 75, y: 85, w: 20, h: 8 }
  ]);
  const [activeBoxIndex, setActiveBoxIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [cleanVideoResultUrl, setCleanVideoResultUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("GHOSTCUT_API_KEY", apiKey.trim());
      localStorage.setItem("GHOSTCUT_PROVIDER", apiProvider);
      setIsKeySaved(true);
      addToast(`GhostCut key saved`, "success");
    } else {
      localStorage.removeItem("GHOSTCUT_API_KEY");
      setIsKeySaved(false);
      addToast("GhostCut Key removed.", "info");
    }
  };
  const handleEditKey = () => setIsKeySaved(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]?.type.startsWith('video/')) {
      loadCustomVideo(e.dataTransfer.files[0]);
    }
  };

  const loadCustomVideo = (file: File) => {
    const url = URL.createObjectURL(file);
    setSelectedVideoUrl(url);
    setSelectedVideoId(null);
    setSelectedVideoName(file.name);
    setVideoFile(file);
    setCleanVideoResultUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    addToast(`Imported ${file.name}`, "info");
  };

  const handleSelectArchiveVideo = (video: any) => {
    setSelectedVideoUrl(video.video_url);
    setSelectedVideoId(video.id);
    setSelectedVideoName(video.title || `Promo ${new Date(video.created_at).toLocaleDateString()}`);
    setVideoFile(null);
    setCleanVideoResultUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // FIXED: canvas loop without setState inside
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || isProcessing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const render = () => {
      const iw = video.videoWidth, ih = video.videoHeight;
      if (iw && ih) {
        if (canvas.width !== iw) canvas.width = iw;
        if (canvas.height !== ih) canvas.height = ih;
        ctx.drawImage(video, 0, 0, iw, ih);
        if (ghostcutMode === 'remove_watermark') {
          watermarkBoxes.forEach((box, idx) => {
            const rx = (box.x/100)*iw, ry = (box.y/100)*ih, rw = (box.w/100)*iw, rh = (box.h/100)*ih;
            ctx.strokeStyle = idx===activeBoxIndex ? '#3b82f6' : '#94a3b8';
            ctx.lineWidth = idx===activeBoxIndex ? 3 : 1.5;
            ctx.strokeRect(rx, ry, rw, rh);
            ctx.fillStyle = idx===activeBoxIndex ? (useInpainting ? 'rgba(59,130,246,0.25)' : 'rgba(239,68,68,0.3)') : 'rgba(148,163,184,0.15)';
            ctx.fillRect(rx, ry, rw, rh);
          });
        }
      }
      requestRef.current = requestAnimationFrame(render);
    };
    requestRef.current = requestAnimationFrame(render);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [watermarkBoxes, activeBoxIndex, useInpainting, selectedVideoUrl, isProcessing, ghostcutMode]);

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause(); else videoRef.current.play().catch(()=>{});
  };

  const handleBoxMouseDown = (e: React.MouseEvent, idx: number) => {
    const bound = containerRef.current?.getBoundingClientRect();
    if (!bound) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset({ x: watermarkBoxes[idx].x, y: watermarkBoxes[idx].y });
    setActiveBoxIndex(idx);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const bound = containerRef.current?.getBoundingClientRect();
    if (!bound) return;
    if (isDragging) {
      const dx = ((e.clientX - dragStart.x)/bound.width)*100;
      const dy = ((e.clientY - dragStart.y)/bound.height)*100;
      let nx = Math.round(dragOffset.x + dx), ny = Math.round(dragOffset.y + dy);
      const b = watermarkBoxes[activeBoxIndex];
      nx = Math.max(0, Math.min(nx, 100 - b.w));
      ny = Math.max(0, Math.min(ny, 100 - b.h));
      setWatermarkBoxes(p => p.map((box,i)=> i===activeBoxIndex? {...box,x:nx,y:ny}:box));
    } else if (isResizing) {
      const dw = ((e.clientX - dragStart.x)/bound.width)*100;
      const dh = ((e.clientY - dragStart.y)/bound.height)*100;
      setWatermarkBoxes(p => p.map((box,i)=> {
        if (i!==activeBoxIndex) return box;
        let nw = Math.max(5, Math.min(box.w + dw, 100 - box.x));
        let nh = Math.max(3, Math.min(box.h + dh, 100 - box.y));
        return {...box, w: Math.round(nw), h: Math.round(nh)};
      }));
      setDragStart({x:e.clientX, y:e.clientY});
    }
  };
  const handleMouseUp = () => { setIsDragging(false); setIsResizing(false); };

  const handleExecuteGhostCut = async () => {
    if (!selectedVideoUrl || !apiKey) return;
    setIsProcessing(true);
    setProcessingProgress(0);
    setIsPlaying(false);
    videoRef.current?.pause();
    try {
      const videoWidth = videoRef.current?.videoWidth || 1920;
      const videoHeight = videoRef.current?.videoHeight || 1080;
      const totalDuration = videoRef.current?.duration || 60;
      let start = 0, end = Math.round(totalDuration);
      if (processRange==='preview') end=5;
      if (processRange==='custom') { start=customStart; end=customEnd; }
      const boxes = watermarkBoxes.map(b=>({
        x: Math.round(b.x/100*videoWidth),
        y: Math.round(b.y/100*videoHeight),
        w: Math.round(b.w/100*videoWidth),
        h: Math.round(b.h/100*videoHeight),
        start_time: start, end_time: end
      }));
      // ... your existing upload/submit code here ...
      // Inside polling, when done:
      // const cleanUrl = pData.video_url || pData.output_url || ...
      // const finalUrl = cleanUrl || selectedVideoUrl;
      // setCleanVideoResultUrl(finalUrl);
      // setSelectedVideoUrl(finalUrl);  // <-- THIS LOADS IT
      // setVideoFile(null);
      // if (videoRef.current) { videoRef.current.src = finalUrl; videoRef.current.load(); }
    } catch(e){} finally { setIsProcessing(false); }
  };

  return (
    <div>
      {/* Add the video element with the three handlers */}
      <video
        ref={videoRef}
        src={selectedVideoUrl || undefined}
        className="hidden"
        preload="auto"
        loop
        muted
        onLoadedMetadata={e=>{ setDuration(e.currentTarget.duration); setCustomEnd(Math.round(e.currentTarget.duration)); }}
        onTimeUpdate={e=> setCurrentTime(e.currentTarget.currentTime)}
        onPlay={()=> setIsPlaying(true)}
        onPause={()=> setIsPlaying(false)}
      />
      {/* rest of your JSX unchanged */}
    </div>
  );
}