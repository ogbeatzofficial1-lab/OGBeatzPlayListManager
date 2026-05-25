import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Play, Pause, Download, ThumbsUp, ThumbsDown, 
  MessageSquare, Send, Music, Clock, Lock, ChevronRight,
  Volume2, Globe, Sparkles, Check, ExternalLink, Shield,
  FileArchive, Share2, VolumeX, AlertCircle
} from 'lucide-react';
import { Client, Track, Playlist, Message, ShareLink } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useMediaStore } from '../context/MediaStoreContext';

export default function ClientPortal({ client }: { client: Client }) {
  const { 
    tracks, 
    playlists, 
    shareLinks, 
    messages, 
    sendMessage, 
    addActivity, 
    updateTrack, 
    addToast,
    loading
  } = useMediaStore();

  // Active review states
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  
  // Chat state
  const [chatMessage, setChatMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter messages for this client
  const clientMessages = useMemo(() => {
    if (!messages) return [];
    return messages
      .filter(m => m.client_id === client.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, client.id]);

  // Extract master delivery packages from chat history (messages from producer containing zip and links)
  const masterDeliveries = useMemo(() => {
    return clientMessages
      .filter(m => m.content.toLowerCase().includes("delivered:") || m.content.toLowerCase().includes(".zip"))
      .map(m => {
        const content = m.content;
        
        // Custom extractors to pull file details cleanly from the automated system template
        const nameMatch = content.match(/delivered:\s*([^\n\r]*)/i);
        const urlMatch = content.match(/Resource Path:\s*([^\n\r]*)/i);
        
        let filename = "Master_Delivery_Package.zip";
        if (nameMatch && nameMatch[1].trim()) {
          filename = nameMatch[1].trim();
        } else {
          // Fallback guess from any word ending in .zip
          const zipGuess = content.split(/\s+/).find(w => w.toLowerCase().includes(".zip"));
          if (zipGuess) {
            filename = zipGuess.replace(/[:"']/g, "").trim();
          }
        }
        
        let pathUrl = "";
        if (urlMatch && urlMatch[1].trim()) {
          pathUrl = urlMatch[1].trim();
        } else {
          // Try to extract any http URL
          const httpMatch = content.match(/(https?:\/\/[^\s]+)/);
          if (httpMatch) {
            pathUrl = httpMatch[1];
          }
        }

        return {
          id: m.id,
          name: filename,
          url: pathUrl || "#",
          timestamp: m.timestamp
        };
      })
      .reverse(); // Newest first
  }, [clientMessages]);

  // Find share links assigned specifically to this client
  const clientShareLinks = useMemo(() => {
    if (!shareLinks) return [];
    return shareLinks.filter(l => l.client_id === client.id);
  }, [shareLinks, client.id]);

  // Map share links to tracks or playlists
  const sharedItems = useMemo(() => {
    return clientShareLinks.map(link => {
      if (link.track_id) {
        const track = tracks.find(t => t.id === link.track_id);
        if (track) return { type: 'track' as const, track, link };
      } else if (link.playlist_id) {
        const playlist = playlists.find(p => p.id === link.playlist_id);
        if (playlist) {
          // Resolve list of tracks
          const subTracks = tracks.filter(t => playlist.track_ids.includes(t.id));
          return { type: 'playlist' as const, playlist, subTracks, link };
        }
      }
      return null;
    }).filter(Boolean) as any[];
  }, [clientShareLinks, tracks, playlists]);

  // Set initial review track if available and none selected yet
  useEffect(() => {
    if (sharedItems.length > 0 && !activeTrack) {
      const firstItem = sharedItems[0];
      if (firstItem.type === 'track') {
        setActiveTrack(firstItem.track);
      } else if (firstItem.type === 'playlist' && firstItem.subTracks?.length > 0) {
        setActiveTrack(firstItem.subTracks[0]);
      }
    }
  }, [sharedItems, activeTrack]);

  // Playback engine
  useEffect(() => {
    if (activeTrack?.file_url) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const newAudio = new Audio(activeTrack.file_url);
      audioRef.current = newAudio;
      
      const onTimeUpdate = () => setProgress(newAudio.currentTime);
      const onLoadedMetadata = () => setDuration(newAudio.duration);
      const onEnded = () => setIsPlaying(false);
      const onError = (e: any) => {
        console.error("Client portal playback error:", e);
        setIsPlaying(false);
      };

      newAudio.addEventListener('timeupdate', onTimeUpdate);
      newAudio.addEventListener('loadedmetadata', onLoadedMetadata);
      newAudio.addEventListener('ended', onEnded);
      newAudio.addEventListener('error', onError);

      if (isPlaying) {
        newAudio.play().catch(err => {
          console.warn("Autoplay block averted on switch:", err);
          setIsPlaying(false);
        });
      }

      return () => {
        newAudio.pause();
        newAudio.removeEventListener('timeupdate', onTimeUpdate);
        newAudio.removeEventListener('loadedmetadata', onLoadedMetadata);
        newAudio.removeEventListener('ended', onEnded);
        newAudio.removeEventListener('error', onError);
        audioRef.current = null;
      };
    }
  }, [activeTrack?.id]); // Only rebuild when switching track id

  const togglePlay = async () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Audio trigger rejection:", err);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    audioRef.current.currentTime = pct * duration;
    setProgress(pct * duration);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Scroll chat to bottom with spring physics hook
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [clientMessages]);

  // Inline feedback approval/revisions
  const handleRating = async (type: 'up' | 'down') => {
    if (!activeTrack) return;
    
    setRating(type);
    const activeShareLink = sharedItems.find(item => item.track?.id === activeTrack.id || item.subTracks?.some((st: any) => st.id === activeTrack.id))?.link;

    addActivity({
      type: type === 'up' ? 'social' : 'system',
      user: `Industry Client (${client.name})`,
      action: type === 'up' ? 'thumbs_up' : 'thumbs_down',
      target: activeTrack.name,
      details: type === 'up' ? 'Approved the reference mix.' : 'Requested revision enhancements.',
      client_id: client.id,
      track_id: activeTrack.id
    });

    const ratingMessage = type === 'up' 
      ? `[Mix Approval]: Approved the reference mix for "${activeTrack.name}" via Portal!` 
      : `[Revision Request]: Flagged "${activeTrack.name}" for custom revision adjustments.`;
    
    await sendMessage(client.id, ratingMessage, null, 'inbound');

    if (type === 'up') {
      await updateTrack(activeTrack.id, { likes: (activeTrack.likes || 0) + 1 });
      addToast("Designation approved! Syncing database metrics in background.", "success");
    } else {
       addToast("Revision ticket dispatched securely to the producer.", "info");
    }
  };

  const handleSendFeedbackNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewNote.trim() || !activeTrack) return;

    const formattedNote = `[Feedback on ${activeTrack.name}]: ${reviewNote.trim()}`;
    await sendMessage(client.id, formattedNote, null, 'inbound');

    addActivity({
      type: 'comment' as any,
      user: `Industry Client (${client.name})`,
      action: 'commented on',
      target: activeTrack.name,
      details: reviewNote.trim(),
      client_id: client.id,
      track_id: activeTrack.id
    });

    addToast("Timestamp notes synced to producer terminal!", "success");
    setReviewNote('');
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const textToSend = chatMessage.trim();
    setChatMessage('');

    await sendMessage(client.id, textToSend, null, 'inbound');
    
    addActivity({
      type: 'message' as any,
      user: `Industry Client (${client.name})`,
      action: 'sent secure message' as any,
      client_id: client.id
    });
  };

  // Determine active rating from message trail history for the currently selected track
  const activeTrackRatingInDb = useMemo(() => {
    if (!clientMessages || !activeTrack) return rating;
    const lastRatingMsg = [...clientMessages]
      .filter(m => m.content.includes(activeTrack.name))
      .filter(m => m.content.includes('[Mix Approval]') || m.content.includes('[Revision Request]'))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    if (lastRatingMsg) {
       return lastRatingMsg.content.includes('[Mix Approval]') ? 'up' : 'down';
    }
    return rating;
  }, [clientMessages, activeTrack, rating]);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500 selection:text-black overflow-x-hidden font-sans">
      
      {/* Immersive Audio Glow Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <AnimatePresence mode="wait">
          {activeTrack?.image_url && (
            <motion.div 
              key={activeTrack.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.25 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="absolute inset-0 grayscale blur-[140px] scale-150 transform"
              style={{ 
                backgroundImage: `url(${activeTrack.image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/95 to-black" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6 md:p-12">
        
        {/* Portal Header Cockpit */}
        <header id="client-portal-header" className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 border-b border-zinc-900 pb-12">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 rounded-3xl bg-zinc-950 border border-zinc-900 flex items-center justify-center text-orange-500 shadow-2xl relative">
               <Shield className="w-8 h-8 text-orange-500" />
               <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-4 border-black animate-ping" />
               <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-4 border-black" />
             </div>
             <div>
                <div className="flex items-center gap-2 text-[9px] font-mono tracking-[0.3em] uppercase leading-none mb-2 text-zinc-500">
                  <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Live Encrypted session
                </div>
                <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white">
                  OG BEATZ <span className="text-zinc-600 font-medium">VAULT</span>
                </h1>
                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mt-1">SECURED COMPASS PORTAL • CLIENT: {client.name.toUpperCase()}</p>
             </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="px-5 py-3 rounded-2xl bg-zinc-90 w-full md:w-auto bg-zinc-950 border border-zinc-900 flex items-center gap-3">
               <Globe className="w-4 h-4 text-orange-500 animate-spin" style={{ animationDuration: '8s' }} />
               <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest leading-none mb-1">Company Access</span>
                  <span className="text-xs font-bold text-white">{client.company || 'Universal Music Partner'}</span>
               </div>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-zinc-90 w-full md:w-auto bg-zinc-950 border border-zinc-900 flex items-center gap-3">
               <Clock className="w-4 h-4 text-orange-500" />
               <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest leading-none mb-1">Tunnel Status</span>
                  <span className="text-xs font-mono font-bold text-zinc-300">UP_TIME: 100% OK</span>
               </div>
            </div>
          </div>
        </header>

        {/* Dashboard Panels */}
        <div id="portal-cockpit-layout" className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Main Left Cockpit Area (8 Cols on large, holds Deliveries & Audio player review) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-12">
            
            {/* Playback Box / Waveform Review Terminal (Active review tracker) */}
            {activeTrack ? (
              <div id="portal-review-card" className="bg-zinc-950/40 border border-zinc-900 rounded-[3.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden backdrop-blur-3xl space-y-8">
                
                {/* Header indicators */}
                <div className="flex items-center justify-between border-b border-zinc-900/60 pb-6">
                  <div className="flex items-center gap-3">
                    <Sparkles className="text-orange-500 w-5 h-5 animate-pulse" />
                    <div>
                       <span className="text-[9px] font-mono uppercase tracking-widest block text-zinc-600">Active Reference Review</span>
                       <h3 className="text-base font-black text-white uppercase tracking-tight">{activeTrack.name}</h3>
                    </div>
                  </div>
                  {/* Download option (if explicit on one of active share links) */}
                  <button 
                    onClick={async () => {
                      if (activeTrack.file_url) {
                        try {
                          addToast("Requesting high-fidelity WAV master pipeline...", "info");
                          const res = await fetch(activeTrack.file_url);
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${activeTrack.name}_MASTER_HQ.wav`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                        } catch {
                          const a = document.createElement('a');
                          a.href = activeTrack.file_url!;
                          a.download = `${activeTrack.name}_MASTER.mp3`;
                          a.click();
                        }
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-orange-500" />
                    <span>Download WAV</span>
                  </button>
                </div>

                {/* Cover & General Metadata alignment */}
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start pt-2">
                   <div className="relative w-40 h-40 rounded-3xl overflow-hidden shrink-0 border border-zinc-800 shadow-xl group">
                      {activeTrack.image_url ? (
                        <img src={activeTrack.image_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                          <Music className="w-12 h-12 text-zinc-700" />
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                         <button 
                           onClick={togglePlay}
                           className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                         >
                           {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                         </button>
                      </div>
                   </div>

                   <div className="flex-1 space-y-6 text-center md:text-left py-2">
                     <div>
                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-500 text-[8px] font-mono tracking-widest uppercase rounded">WAV Master Reference</span>
                        <h2 className="text-3xl font-black uppercase tracking-tight text-white mt-2 leading-none">{activeTrack.name}</h2>
                        <p className="text-base text-zinc-400 font-bold mt-1">{activeTrack.artist || 'OGBeatz'}</p>
                     </div>

                     {/* Stats bar parameters */}
                     <div className="flex items-center justify-center md:justify-start gap-6 font-mono">
                        <div>
                          <p className="text-[8px] uppercase font-black text-zinc-600 block mb-1">Tempo</p>
                          <span className="text-sm font-black text-zinc-300">{activeTrack.bpm} BPM</span>
                        </div>
                        <div className="w-px h-6 bg-zinc-900" />
                        <div>
                          <p className="text-[8px] uppercase font-black text-zinc-600 block mb-1">Tonality</p>
                          <span className="text-sm font-black text-orange-500 uppercase">{activeTrack.key_signature}</span>
                        </div>
                        <div className="w-px h-6 bg-zinc-900" />
                        <div>
                          <p className="text-[8px] uppercase font-black text-zinc-600 block mb-1">Length</p>
                          <span className="text-sm font-black text-zinc-300">{formatTime(duration || activeTrack.duration)}</span>
                        </div>
                     </div>
                   </div>
                </div>

                {/* Interactive Waveform / Play Progress line bar */}
                <div className="space-y-3">
                   <div 
                     onClick={handleSeek}
                     className="relative h-12 w-full group cursor-pointer flex items-center"
                   >
                     {/* Back plate border */}
                     <div className="absolute inset-0 bg-zinc-950 rounded-2xl border border-zinc-900" />
                     {/* Visual micro waves lines */}
                     <div className="absolute inset-x-6 inset-y-3 flex items-center gap-0.5 overflow-hidden pointer-events-none">
                        {[...Array(48)].map((_, i) => {
                          const activeProgressPct = (progress / (duration || 1)) * 100;
                          const currentBarPct = (i / 48) * 100;
                          const activeLine = currentBarPct <= activeProgressPct;
                          const heightScale = Math.sin((i / 48) * Math.PI) * 100;

                          return (
                            <motion.div 
                              key={i}
                              animate={{ 
                                height: activeLine && isPlaying ? [12, 28, 12] : 10,
                                backgroundColor: activeLine ? '#f97316' : 'rgba(255,255,255,0.06)'
                              }}
                              transition={{ 
                                duration: 0.6, 
                                repeat: activeLine && isPlaying ? Infinity : 0, 
                                delay: i * 0.015 
                              }}
                              className="flex-1 rounded-sm"
                            />
                          );
                        })}
                     </div>
                     <div className="absolute inset-0 z-10" />
                   </div>
                   
                   <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 px-2 uppercase tracking-wider">
                      <span className="text-orange-500 font-bold">{formatTime(progress)}</span>
                      <span>{formatTime(duration || activeTrack.duration)}</span>
                   </div>
                </div>

                {/* Approval Review protocol */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-900/60 pt-6">
                   <button 
                     onClick={() => handleRating('up')}
                     className={cn(
                       "flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all duration-300 font-mono text-[10px] font-black uppercase tracking-widest",
                       activeTrackRatingInDb === 'up' 
                       ? "bg-[#10b981] border-[#10b981] text-black shadow-[0_0_40px_rgba(16,185,129,0.15)]" 
                       : "bg-zinc-950 border-zinc-900 text-[#10b981] hover:border-[#10b981]/40 hover:bg-[#10b981]/5"
                     )}
                   >
                     <ThumbsUp className="w-4 h-4" />
                     <span>{activeTrackRatingInDb === 'up' ? "APPROVED MASTER!" : "APPROVE MASTER"}</span>
                   </button>
                   <button 
                     onClick={() => handleRating('down')}
                     className={cn(
                       "flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all duration-300 font-mono text-[10px] font-black uppercase tracking-widest",
                       activeTrackRatingInDb === 'down' 
                       ? "bg-[#ef4444] border-[#ef4444] text-black shadow-[0_0_40px_rgba(239,68,68,0.15)]" 
                       : "bg-zinc-950 border-zinc-900 text-[#ef4444] hover:border-[#ef4444]/40 hover:bg-[#ef4444]/5"
                     )}
                   >
                     <ThumbsDown className="w-4 h-4" />
                     <span>{activeTrackRatingInDb === 'down' ? "REVISIONS REQUESTED!" : "REQUEST REVISIONS"}</span>
                   </button>
                </div>

                {/* Revision Note Feedback Submit Box */}
                <form onSubmit={handleSendFeedbackNote} className="space-y-3 pt-2">
                  <div className="relative">
                    <textarea 
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder={`Submit timestamped revision notes for ${activeTrack.name} (e.g. "@1:12 boost low end master synth")...`}
                      className="w-full bg-zinc-950 border border-zinc-900 focus:border-orange-500 rounded-2xl p-4 pr-16 text-xs text-zinc-300 focus:outline-none transition-all resize-none h-20 placeholder:text-zinc-700 font-mono leading-relaxed"
                    />
                    <button 
                      type="submit" 
                      disabled={!reviewNote.trim()}
                      className="absolute bottom-4 right-4 w-9 h-9 bg-white text-black hover:scale-105 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:scale-100"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>

              </div>
            ) : (
              <div className="bg-zinc-950/20 border border-zinc-900 border-dashed rounded-[3rem] p-12 text-center text-zinc-600">
                <Music className="w-12 h-12 mx-auto mb-4 text-zinc-800" />
                <p className="text-xs uppercase font-mono tracking-widest">No Active Audio Mix Selected for Review</p>
              </div>
            )}

            {/* Active deliverables / Review collection tab block */}
            <div className="space-y-6">
               <h3 className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500 flex items-center gap-2">
                 <Music className="w-4 h-4 text-orange-500" /> Allocated Review Stems ({sharedItems.length})
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sharedItems.map(item => {
                     if (item.type === 'track') {
                        const t = item.track;
                        const isCurrent = activeTrack?.id === t.id;
                        return (
                          <div 
                            key={t.id}
                            id={`shared-item-track-${t.id}`}
                            className={cn(
                              "p-5 rounded-[2rem] border transition-all duration-300 flex items-center justify-between group",
                              isCurrent 
                              ? "bg-zinc-900 border-zinc-700 shadow-xl" 
                              : "bg-zinc-950 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/50"
                            )}
                          >
                             <div className="flex items-center gap-4 overflow-hidden min-w-0">
                               <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-zinc-800 bg-zinc-900">
                                 {t.image_url ? <img src={t.image_url} className="w-full h-full object-cover" /> : <Music className="w-5 h-5 mx-auto" />}
                               </div>
                               <div className="min-w-0">
                                  <p className="text-xs font-bold text-white uppercase tracking-tight truncate">{t.name}</p>
                                  <p className="text-[9px] font-mono text-orange-500/80 mt-0.5">{t.bpm} BPM • {t.key_signature}</p>
                               </div>
                             </div>

                             <button 
                               onClick={() => {
                                 setActiveTrack(t);
                                 if (!isCurrent) {
                                   setIsPlaying(true);
                                 } else {
                                   togglePlay();
                                 }
                               }}
                               className={cn(
                                 "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                 isCurrent && isPlaying 
                                 ? "bg-orange-500 text-black shadow-lg" 
                                 : "bg-zinc-900 text-zinc-400 group-hover:bg-white group-hover:text-black"
                               )}
                             >
                               {isCurrent && isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                             </button>
                          </div>
                        );
                     } else if (item.type === 'playlist') {
                        const pl = item.playlist;
                        return (
                          <div 
                            key={pl.id}
                            id={`shared-item-playlist-${pl.id}`}
                            className="p-5 rounded-[2rem] border border-zinc-900 bg-zinc-950 hover:bg-zinc-900/30 hover:border-zinc-800 transition-all space-y-4 md:col-span-2"
                          >
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                   <div className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[8px] font-mono uppercase rounded-md tracking-widest">
                                      Collection
                                   </div>
                                   <h4 className="text-xs font-black uppercase tracking-wider text-white">{pl.name}</h4>
                                </div>
                                <span className="text-[9px] font-mono text-zinc-500">{item.subTracks?.length || 0} tracks uploaded</span>
                             </div>

                             <div className="divide-y divide-zinc-900/60 font-mono">
                                {item.subTracks?.map((st: Track, sIdx: number) => {
                                   const isCurrentSub = activeTrack?.id === st.id;
                                   return (
                                     <button 
                                       key={st.id}
                                       onClick={() => {
                                          setActiveTrack(st);
                                          if (!isCurrentSub) {
                                            setIsPlaying(true);
                                          } else {
                                            togglePlay();
                                          }
                                       }}
                                       className="w-full flex items-center justify-between py-3 group text-left"
                                     >
                                       <div className="flex items-center gap-3 overflow-hidden min-w-0">
                                         <span className="text-[10px] text-zinc-700">{(sIdx + 1).toString().padStart(2, '0')}</span>
                                         <span className={cn("text-xs truncate transition-colors", isCurrentSub ? "text-orange-500 font-bold" : "text-zinc-400 group-hover:text-white")}>
                                            {st.name}
                                         </span>
                                       </div>
                                       {isCurrentSub && isPlaying ? (
                                         <Pause className="w-3.5 h-3.5 text-orange-500 fill-current" />
                                       ) : (
                                         <Play className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white fill-current ml-0.5 opacity-0 group-hover:opacity-100 transition-all" />
                                       )}
                                     </button>
                                   );
                                })}
                             </div>
                          </div>
                        );
                     }
                     return null;
                  })}

                  {sharedItems.length === 0 && (
                     <div className="p-8 text-center bg-zinc-950/40 rounded-3xl border border-zinc-900 md:col-span-2">
                        <AlertCircle className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">No active audio review stems shared yet.</p>
                     </div>
                  )}
               </div>
            </div>

            {/* Downloader Packages vault deliveries section */}
            <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500 flex items-center gap-2">
                  <FileArchive className="w-4 h-4 text-orange-500" /> Vault Deliveries (Stems & Archives)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {masterDeliveries.map((pkg, pIdx) => (
                    <div 
                      key={pkg.id || pIdx}
                      id={`vault-delivery-${pkg.id || pIdx}`}
                      className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 p-6 rounded-[2rem] flex flex-col justify-between space-y-6 group shadow-lg"
                    >
                       <div className="space-y-2">
                         <div className="flex items-center gap-2">
                            <FileArchive className="w-4 h-4 text-orange-500" />
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Master Bundle</span>
                         </div>
                         <h4 className="text-xs font-bold text-white uppercase tracking-tight break-all leading-relaxed group-hover:text-orange-500 transition-colors">
                            {pkg.name}
                         </h4>
                         <span className="text-[9px] font-mono text-zinc-600 block pt-1">
                           Delivered: {new Date(pkg.timestamp).toLocaleDateString()}
                         </span>
                       </div>

                       <a 
                         href={pkg.url}
                         target="_blank"
                         rel="noopener noreferrer"
                         onClick={() => {
                            addActivity({
                              type: 'download',
                              user: `Industry Client (${client.name})`,
                              action: 'downloaded shared stems archive',
                              target: pkg.name,
                              client_id: client.id
                            });
                         }}
                         className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-900 hover:bg-white text-zinc-300 hover:text-black border border-zinc-850 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest transition-all"
                       >
                         <Download className="w-3.5 h-3.5" />
                         <span>Retrieve STEMS.zip</span>
                       </a>
                    </div>
                  ))}

                  {masterDeliveries.length === 0 && (
                     <div className="p-8 text-center bg-zinc-950/40 rounded-3xl border border-zinc-900 md:col-span-2">
                        <AlertCircle className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">No zip delivery files shipped to your vault yet.</p>
                     </div>
                  )}
                </div>
            </div>

          </div>

          {/* Secure Messaging Terminal Sidebar: 4 Cols */}
          <div className="lg:col-span-5 space-y-6">
            <div id="portal-chat-terminal" className="bg-zinc-950 border border-zinc-900 rounded-[3rem] p-6 md:p-8 flex flex-col h-[650px] shadow-2xl relative overflow-hidden">
               
               {/* Messaging status indicator */}
               <div className="flex items-center justify-between border-b border-zinc-900/60 pb-5 mb-5 shrink-0">
                  <div className="flex items-center gap-3">
                     <MessageSquare className="w-5 h-5 text-orange-500 animate-pulse" />
                     <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-white">Live Uplink</h3>
                        <p className="text-[9px] font-mono text-zinc-500 leading-none mt-0.5">SECURE CRYPTO CHANNEL</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full font-mono text-[8px] font-bold uppercase tracking-widest border border-emerald-500/20">
                     <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
                     <span>SECURED DISPATCH</span>
                  </div>
               </div>

               {/* Chat history list */}
               <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {clientMessages.map((msg, index) => {
                     const isProducer = msg.direction === 'outbound';
                     return (
                       <div 
                         key={msg.id || index}
                         className={cn(
                           "flex flex-col space-y-1.5 max-w-[85%] rounded-[2rem] p-4 font-sans text-xs",
                           isProducer 
                           ? "bg-zinc-900 border border-zinc-850 text-zinc-200 mr-auto rounded-tl-sm text-left" 
                           : "bg-orange-500 text-black font-medium ml-auto rounded-tr-sm text-left shadow-lg shadow-orange-500/10"
                         )}
                       >
                          {/* Sender title label */}
                          <span className={cn(
                            "text-[8px] font-mono uppercase tracking-widest block font-black mb-1", 
                            isProducer ? "text-orange-500" : "text-black/65"
                          )}>
                             {isProducer ? 'OG BEATZ (PRODUCER)' : `${client.name.toUpperCase()} (YOU)`}
                          </span>
                          
                          {/* Message content */}
                          <p className="leading-relaxed whitespace-pre-wrap break-words italic">
                            {msg.content}
                          </p>

                          {/* Image preview (if attachment present) */}
                          {msg.image_url && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-zinc-900">
                               <img src={msg.image_url} alt="Attachment" className="max-h-40 w-full object-cover" />
                            </div>
                          )}

                          {/* Timestamp tag */}
                          <span className={cn(
                            "text-[8px] font-mono uppercase tracking-widest block text-end pt-1 mt-0.5 leading-none",
                            isProducer ? "text-zinc-600" : "text-black/50"
                          )}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                       </div>
                     );
                  })}

                  {clientMessages.length === 0 && (
                     <div className="py-20 text-center text-zinc-600 space-y-3">
                        <MessageSquare className="w-10 h-10 text-zinc-800 mx-auto" />
                        <p className="text-[10px] font-mono uppercase tracking-widest">No previous dispatch logs securely written.</p>
                     </div>
                  )}

                  <div ref={chatEndRef} />
               </div>

               {/* Form box typing dispatch */}
               <form onSubmit={handleSendChatMessage} className="mt-5 shrink-0 border-t border-zinc-900 pt-5">
                  <div className="flex gap-2">
                     <input 
                       type="text"
                       value={chatMessage}
                       onChange={(e) => setChatMessage(e.target.value)}
                       placeholder="Dispatch secure note to producer..."
                       className="flex-1 bg-zinc-950 border border-zinc-900 focus:border-zinc-800 text-xs text-white rounded-2xl px-5 py-4 focus:outline-none transition-all placeholder:text-zinc-700"
                     />
                     <button 
                       type="submit"
                       disabled={!chatMessage.trim()}
                       className="w-12 h-12 bg-white text-black hover:bg-zinc-200 hover:scale-105 active:scale-95 text-xs rounded-2xl flex items-center justify-center transition-all shadow-xl disabled:opacity-30 disabled:scale-100"
                     >
                        <Send className="w-4 h-4" />
                     </button>
                  </div>
               </form>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
