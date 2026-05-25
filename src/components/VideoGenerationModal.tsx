import React, { useState, useEffect } from 'react';
import { X, Video, Sparkles, Wand2, Loader2, Play, CheckCircle2, AlertCircle, Share2, Download } from 'lucide-react';
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
  const { addPromoVideo, promoVideos } = useMediaStore();
  const [step, setStep] = useState<'config' | 'processing' | 'preview'>('config');
  const [style, setStyle] = useState('minimalist');
  const [aspectRatio, setAspectRatio] = useState<'vertical' | 'square' | 'horizontal'>('vertical');
  const [progress, setProgress] = useState(0);
  const [aesthetic, setAesthetic] = useState<any>(null);
  const [generatedVideo, setGeneratedVideo] = useState<PromoVideo | null>(null);

  const name = track?.name || playlist?.name || 'Untitled';
  const artist = track?.artist || 'OGBeatz';

  const styles = [
    { id: 'minimalist', name: 'Clean Chrome', icon: '✨' },
    { id: 'grunge', name: 'Distressed Metal', icon: '⛓️' },
    { id: 'vibrant', name: 'Neon Pulse', icon: '⚡' },
    { id: 'abstract', name: 'Ethereal Flow', icon: '🌫️' }
  ];

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
      let finalDuration = track?.duration || 0;
      if (finalDuration === 0 && track?.file_url) {
        try {
          const tempAudio = new Audio();
          tempAudio.src = track.file_url;
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
      const trackInfo = track || { name, artist, bpm: 120, key_signature: 'C' };
      const aes = await generateVideoAesthetic(trackInfo);
      setAesthetic(aes);
      setProgress(20);

      // 3. High-fidelity Video Generation (Canvas + MediaRecorder)
      // This creates a real MP4 in the browser
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
      img.src = track?.image_url || '/input_file_2.png';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const stream = canvas.captureStream(30);
      
      // Load Audio for the stream
      let audioTrack: MediaStreamTrack | null = null;
      let audioSource: AudioBufferSourceNode | null = null;
      let audioCtx: AudioContext | null = null;

      if (track?.file_url) {
        try {
          audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const audioResponse = await fetch(track.file_url);
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

      const renderDuration = finalDuration * 1000; // Track duration in ms
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
            track_id: track?.id,
            playlist_id: playlist?.id,
            video_url: videoUrl,
            thumbnail_url: track?.image_url || '',
            video_data: blob,
            thumbnail_data: track?.image_data,
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
        if (audioSource) audioSource.start(0);

        const animate = (time: number) => {
          const elapsed = time - startTime;
          const p = Math.min(elapsed / renderDuration, 1);
          
          setProgress(20 + (p * 75));

          // Draw "Video" Frame
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // 2. Draw Main Cover Art (Fill entire canvas according to aspect ratio - "Cover")
          const imgAR = img.width / img.height;
          const canvasAR = canvas.width / canvas.height;
          let renderW, renderH, x, y;

          if (imgAR > canvasAR) {
            // Image is wider than canvas
            renderH = canvas.height;
            renderW = canvas.height * imgAR;
            x = (canvas.width - renderW) / 2;
            y = 0;
          } else {
            // Image is taller than or same as canvas
            renderW = canvas.width;
            renderH = canvas.width / imgAR;
            x = 0;
            y = (canvas.height - renderH) / 2;
          }
          
          ctx.drawImage(img, x, y, renderW, renderH);

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
        className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl"
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
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full space-y-12"
              >
                <div className="text-center space-y-4">
                   <div className="w-20 h-20 rounded-[2rem] bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-orange-500" />
                   </div>
                   <h3 className="text-2xl font-black tracking-tight uppercase italic">Full Video Synthesis</h3>
                   <p className="text-zinc-500 text-xs max-w-sm mx-auto leading-relaxed">
                      Select your desired aspect ratio for {name}. High-fidelity export matching your track length.
                   </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'vertical', name: 'Vertical', ratio: '9:16', icon: '📱' },
                    { id: 'square', name: 'Square', ratio: '1:1', icon: '🟦' },
                    { id: 'horizontal', name: 'Wide', ratio: '16:9', icon: '📺' }
                  ].map(r => (
                    <button
                      key={r.id}
                      onClick={() => setAspectRatio(r.id as any)}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        aspectRatio === r.id 
                        ? 'bg-orange-500 border-orange-400 text-black shadow-lg shadow-orange-500/20' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-xl">{r.icon}</span>
                      <div className="text-center">
                        <div className="text-[10px] font-black uppercase tracking-widest">{r.name}</div>
                        <div className="text-[8px] font-bold opacity-60">{r.ratio}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="max-w-xs mx-auto w-full">
                  <button
                    onClick={handleGenerate}
                    className="w-full bg-white text-black py-5 rounded-2xl font-black tracking-[0.2em] uppercase text-[10px] hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3"
                  >
                    <Wand2 className="w-4 h-4" /> Start Generation
                  </button>
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
