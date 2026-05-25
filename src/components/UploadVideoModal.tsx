import React, { useState, useRef } from 'react';
import { X, Video, Upload, Trash2, Image as ImageIcon, Sparkles, Film, Music, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMediaStore } from '../context/MediaStoreContext';

export default function UploadVideoModal({ onClose }: { onClose: () => void }) {
  const { tracks, playlists, uploadFile, addPromoVideo, addActivity } = useMediaStore();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isDraggingThumb, setIsDraggingThumb] = useState(false);

  const [stylePreset, setStylePreset] = useState('Cyberpunk');
  const [customStyle, setCustomStyle] = useState('');
  const [associatedType, setAssociatedType] = useState<'none' | 'track' | 'playlist'>('none');
  const [associatedId, setAssociatedId] = useState('');

  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const handleVideoFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert("Please upload a valid video file.");
      return;
    }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleThumbFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Please upload a valid image file.");
      return;
    }
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleDragOverVideo = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingVideo(true);
  };

  const handleDragLeaveVideo = () => {
    setIsDraggingVideo(false);
  };

  const handleDropVideo = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingVideo(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleVideoFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOverThumb = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingThumb(true);
  };

  const handleDragLeaveThumb = () => {
    setIsDraggingThumb(false);
  };

  const handleDropThumb = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingThumb(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleThumbFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!videoFile) return;

    try {
      setUploadStatus("Transmitting master video file...");
      // Upload the video file using existing uploadFile implementation
      const finalVideoUrl = await uploadFile('promo_videos', videoFile);
      if (!finalVideoUrl) {
        throw new Error("Failed to upload video to storage bucket.");
      }

      let finalThumbnailUrl = thumbnailPreview;

      // Check if custom thumbnail was uploaded
      if (thumbnailFile) {
        setUploadStatus("Uploading social cover thumbnail...");
        const uploadedThumbUrl = await uploadFile('promo_videos_thumbnails', thumbnailFile);
        if (uploadedThumbUrl) {
          finalThumbnailUrl = uploadedThumbUrl;
        }
      } else {
        // Fallback: If track is associated, use the track art, or playlist art
        if (associatedType === 'track' && associatedId) {
          const matchedTrack = tracks.find(t => t.id === associatedId);
          if (matchedTrack && matchedTrack.image_url) {
            finalThumbnailUrl = matchedTrack.image_url;
          }
        } else if (associatedType === 'playlist' && associatedId) {
          const matchedPlaylist = playlists.find(p => p.id === associatedId);
          if (matchedPlaylist && matchedPlaylist.image_url) {
            finalThumbnailUrl = matchedPlaylist.image_url;
          }
        }
      }

      // If absolutely no thumbnail exists, use a standard cinematic fallback
      if (!finalThumbnailUrl) {
        finalThumbnailUrl = "https://images.unsplash.com/photo-1614113489855-66422ad300a4?w=800&q=80";
      }

      setUploadStatus("Publishing metadata coordinates...");

      const finalStyle = customStyle.trim() || stylePreset;

      await addPromoVideo({
        video_url: finalVideoUrl,
        thumbnail_url: finalThumbnailUrl,
        style: finalStyle,
        status: 'ready',
        track_id: associatedType === 'track' ? associatedId : undefined,
        playlist_id: associatedType === 'playlist' ? associatedId : undefined,
      });

      // Track source name for system activity logs
      let sourceName = 'Standalone Promo';
      if (associatedType === 'track') {
        sourceName = tracks.find(t => t.id === associatedId)?.name || 'Track Promo';
      } else if (associatedType === 'playlist') {
        sourceName = playlists.find(p => p.id === associatedId)?.name || 'Compilation Promo';
      }

      addActivity({
        type: 'upload',
        user: 'OGBeatz',
        action: 'Uploaded social promo video',
        target: `${sourceName} [${finalStyle}]`
      });

      setUploadStatus(null);
      onClose();
    } catch (err: any) {
      console.error(err);
      setUploadStatus(null);
      alert(err.message || "Shipped transfer failed. Verify connection status.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="p-8 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Upload Promo Video</h2>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-0.5">Archive customized social and visual assets</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Main Drag/Drop Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Video File Dropper */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Master Video File</span>
              {!videoFile ? (
                <div 
                  onDragOver={handleDragOverVideo}
                  onDragLeave={handleDragLeaveVideo}
                  onDrop={handleDropVideo}
                  onClick={() => videoInputRef.current?.click()}
                  className={`aspect-video cursor-pointer border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-6 text-center transition-all ${
                    isDraggingVideo ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                  }`}
                >
                  <Upload className="w-10 h-10 text-zinc-600 mb-3" />
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Drag video file here</p>
                  <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-600 mt-1">MP4, WEBM, MOV</p>
                  <input 
                    type="file" 
                    ref={videoInputRef}
                    accept="video/*" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleVideoFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="aspect-video relative rounded-3xl overflow-hidden border border-zinc-800 bg-black">
                  <video 
                    src={videoPreview || undefined} 
                    className="w-full h-full object-cover" 
                    muted 
                    loop 
                    autoPlay 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                    <p className="text-[10px] font-mono text-zinc-400 truncate w-4/12 flex-1 pr-4">{videoFile.name}</p>
                    <button 
                      type="button"
                      onClick={() => {
                        setVideoFile(null);
                        setVideoPreview(null);
                      }}
                      className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail Dropper (Optional) */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Cover Artwork / Thumbnail (Optional)</span>
              {!thumbnailFile ? (
                <div 
                  onDragOver={handleDragOverThumb}
                  onDragLeave={handleDragLeaveThumb}
                  onDrop={handleDropThumb}
                  onClick={() => thumbInputRef.current?.click()}
                  className={`aspect-video cursor-pointer border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-6 text-center transition-all ${
                    isDraggingThumb ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                  }`}
                >
                  <ImageIcon className="w-10 h-10 text-zinc-600 mb-3" />
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Drag image here</p>
                  <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-600 mt-1">PNG, JPG, WEBP</p>
                  <input 
                    type="file" 
                    ref={thumbInputRef}
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleThumbFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="aspect-video relative rounded-3xl overflow-hidden border border-zinc-800 bg-black">
                  <img src={thumbnailPreview || undefined} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                    <p className="text-[10px] font-mono text-zinc-400 truncate w-4/12 flex-1 pr-4">{thumbnailFile.name}</p>
                    <button 
                      type="button"
                      onClick={() => {
                        setThumbnailFile(null);
                        setThumbnailPreview(null);
                      }}
                      className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Association Pickers */}
            <div>
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-1.5 mb-2">
                <Layers className="w-3 h-3 text-orange-500" /> Catalog Connection
              </span>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => { setAssociatedType('none'); setAssociatedId(''); }}
                  className={`p-3 rounded-2xl border text-center font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                    associatedType === 'none' 
                      ? 'bg-zinc-900 border-orange-500 text-orange-500' 
                      : 'bg-zinc-900/40 border-zinc-850 text-zinc-500 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  Standalone
                </button>
                <button
                  type="button"
                  onClick={() => { setAssociatedType('track'); setAssociatedId(tracks[0]?.id || ''); }}
                  disabled={tracks.length === 0}
                  className={`p-3 rounded-2xl border text-center font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer disabled:opacity-30 ${
                    associatedType === 'track' 
                      ? 'bg-zinc-900 border-orange-500 text-orange-500' 
                      : 'bg-zinc-900/40 border-zinc-850 text-zinc-500 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  Link Track
                </button>
                <button
                  type="button"
                  onClick={() => { setAssociatedType('playlist'); setAssociatedId(playlists[0]?.id || ''); }}
                  disabled={playlists.length === 0}
                  className={`p-3 rounded-2xl border text-center font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer disabled:opacity-30 ${
                    associatedType === 'playlist' 
                      ? 'bg-zinc-900 border-orange-500 text-orange-500' 
                      : 'bg-zinc-900/40 border-zinc-850 text-zinc-500 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  Link Playlist
                </button>
              </div>

              {associatedType === 'track' && tracks.length > 0 && (
                <div className="mt-3">
                  <select 
                    value={associatedId} 
                    onChange={(e) => setAssociatedId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 text-zinc-300 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500 font-bold uppercase tracking-wider"
                  >
                    {tracks.map(t => (
                      <option key={t.id} value={t.id}>{t.name} — {t.artist}</option>
                    ))}
                  </select>
                </div>
              )}

              {associatedType === 'playlist' && playlists.length > 0 && (
                <div className="mt-3">
                  <select 
                    value={associatedId} 
                    onChange={(e) => setAssociatedId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 text-zinc-300 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500 font-bold uppercase tracking-wider"
                  >
                    {playlists.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Aesthetic Style Settings */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-orange-500" /> Aesthetic Palette / Style
              </span>
              <div className="flex flex-wrap gap-2">
                {['Cyberpunk', 'Minimalist', 'Vaporwave', 'Cinematic', 'TikTok Hype'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setStylePreset(preset);
                      setCustomStyle('');
                    }}
                    className={`px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                      stylePreset === preset && !customStyle
                        ? 'bg-orange-500 border-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.15)]'
                        : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input 
                type="text"
                placeholder="Or define custom creative style..."
                value={customStyle}
                onChange={(e) => {
                  setCustomStyle(e.target.value);
                  setStylePreset('');
                }}
                className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Action Trigger */}
          <button 
            type="button"
            onClick={handleUpload}
            disabled={!videoFile || !!uploadStatus}
            className="w-full py-4 bg-white text-black rounded-full font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" /> {uploadStatus || "Publish Social Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}
