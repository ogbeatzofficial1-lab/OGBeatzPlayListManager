import React, { useRef, useEffect } from 'react';
import { X, Download, Share2, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PromoVideo } from '../types';
import { useMediaStore } from '../context/MediaStoreContext';

interface VideoPreviewModalProps {
  video: PromoVideo;
  onClose: () => void;
}

export default function VideoPreviewModal({ video, onClose }: VideoPreviewModalProps) {
  const { deletePromoVideo, tracks, playlists } = useMediaStore();
  const videoRef = useRef<HTMLVideoElement>(null);

  const track = tracks.find(t => t.id === video.track_id);
  const playlist = playlists.find(p => p.id === video.playlist_id);
  const sourceName = track?.name || playlist?.name || 'Untitled Asset';

  useEffect(() => {
    if (videoRef.current && !video._brokenBlob) {
      // Try to play with sound first, if it fails, try muted
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          console.warn("Autoplay with sound blocked, trying muted...");
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play();
          }
        });
      }
    }
  }, [video.video_url, video._brokenBlob]);

  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleDownload = async () => {
    if (!video.video_url) return;
    setIsDownloading(true);

    try {
      const response = await fetch(video.video_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sourceName.replace(/\s+/g, '_')}_Promo_Master.mp4`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setIsDownloading(false);
      }, 100);
    } catch (error) {
      console.error('Download failed:', error);
      setIsDownloading(false);
      const a = document.createElement('a');
      a.href = video.video_url;
      a.download = `${sourceName.replace(/\s+/g, '_')}_Promo_Master.mp4`;
      a.click();
    }
  };

  const handleDelete = () => {
    if (confirm('Permanently delete this promo asset?')) {
      deletePromoVideo(video.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/95 backdrop-blur-3xl"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-3xl max-h-[85vh] bg-zinc-950 border border-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
      >
        {/* Video Player Side */}
        <div className="flex-1 bg-black min-h-[300px] aspect-video md:aspect-auto flex items-center justify-center relative group">
           {video._brokenBlob ? (
             <div className="flex flex-col items-center gap-4 text-center p-8">
               <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                 <AlertCircle className="w-8 h-8 text-rose-500" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-xl font-black uppercase tracking-widest text-rose-500">Asset Desynchronized</h3>
                 <p className="text-zinc-500 text-xs max-w-xs mx-auto">This neural render cache was tied to a volatile session buffer and is no longer available. Re-rendering required.</p>
               </div>
             </div>
           ) : (video.video_url?.match(/\.(mp4|webm|mov)$/i) || video.video_url?.startsWith('data:video') || video.video_url?.startsWith('blob:')) ? (
             <video 
               ref={videoRef}
               src={video.video_url} 
               controls 
               playsInline
               className="w-full h-full object-contain"
               poster={video.thumbnail_url}
               onLoadedData={() => {
                 console.log("Video metadata and first frame loaded");
               }}
               onError={(e) => {
                 const videoElement = e.currentTarget;
                 console.error("Video load error:", videoElement.error);
               }}
             />
           ) : (
             <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
               <motion.img 
                 src={video.video_url || 'https://images.unsplash.com/photo-1614113489855-66422ad300a4?w=800&q=80'}
                 className="w-full h-full object-contain"
                 initial={{ scale: 1 }}
                 animate={{ scale: 1.05 }}
                 transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
               />
               {track?.file_url && (
                 <audio 
                   src={track.file_url} 
                   autoPlay 
                   controls 
                   className="absolute bottom-8 w-3/4 max-w-md opacity-80 hover:opacity-100 transition-opacity z-10" 
                 />
               )}
               <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none flex items-center justify-center">
                  {/* Subtle indication that this is an image simulation */}
               </div>
             </div>
           )}
           <div className="absolute top-8 left-8">
              <div className="px-4 py-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-orange-500">
                PROMO MASTER // {video.style.toUpperCase()}
              </div>
           </div>
        </div>

        {/* Metadata Side */}
        <div className="w-full md:w-80 border-l border-zinc-900 p-8 flex flex-col justify-between bg-zinc-900/10">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-tight">{sourceName}</h2>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Neural Render Sequence</p>
            </div>

            <div className="space-y-4">
               <div className="p-4 bg-zinc-900/50 border border-zinc-900 rounded-3xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Created</p>
                  <p className="text-xs font-bold">{new Date(video.created_at).toLocaleDateString()} at {new Date(video.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
               </div>
               
               <div className="p-4 bg-zinc-900/50 border border-zinc-900 rounded-3xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Status</p>
                  <div className="flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                     <p className="text-xs font-bold uppercase tracking-widest">{video.status}</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="space-y-3 pt-8">
            <button 
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full py-4 bg-white text-black rounded-2xl font-black tracking-widest uppercase text-[10px] flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Download className="w-4 h-4 animate-bounce" /> Processing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Download Master
                </>
              )}
            </button>
            <button className="w-full py-4 bg-zinc-900 border border-zinc-800 text-white rounded-2xl font-black tracking-widest uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all">
              <Share2 className="w-4 h-4" /> Direct Share
            </button>
            <button 
              onClick={() => {
                if(confirm("DANGER: This will delete the generated asset. Proceed?")) {
                  deletePromoVideo(video.id);
                  onClose();
                }
              }}
              className="w-full py-4 text-zinc-600 hover:text-rose-500 text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3 h-3" /> Destroy Asset
            </button>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-3 bg-black/50 hover:bg-black rounded-2xl text-white transition-all backdrop-blur-xl border border-white/5"
        >
          <X className="w-6 h-6" />
        </button>
      </motion.div>
    </div>
  );
}
