import React, { useState, useRef } from 'react';
import { X, Save, Image as ImageIcon, Trash2, Loader2, Sparkles, Key, LogIn, LogOut } from 'lucide-react';
import { Track } from '../types';
import { useMediaStore } from '../context/MediaStoreContext';

export default function EditTrackModal({ track, onClose, onSave, onDelete }: { 
  track: Track; 
  onClose: () => void;
  onSave?: (id: string, updates: Partial<Track>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  key?: string | number;
}) {
  const { uploadFile, analyzeTrack, addToast } = useMediaStore();
  const [formData, setFormData] = useState({ ...track });
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [isDraggingLyrics, setIsDraggingLyrics] = useState(false);
  const [lyricsFilename, setLyricsFilename] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const lyricsInputRef = useRef<HTMLInputElement>(null);

  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingArt, setGeneratingArt] = useState(false);
  const [pollinationsKeyConnected, setPollinationsKeyConnected] = useState(() => !!localStorage.getItem("POLLINATIONS_USER_KEY"));

  const connectPollinations = () => {
    // Generate simple redirect URI back to the application parent window route or custom callback on render
    const origin = window.location.origin;
    const isRender = origin.includes("onrender.com") || origin.includes("ogbeatzplaylistmanager");
    const targetUrl = isRender ? "https://ogbeatzplaylistmanager.onrender.com/auth/callback" : window.location.href;
    const redirectUrl = encodeURIComponent(targetUrl);
    const clientId = (import.meta as any).env.VITE_POLLINATIONS_CLIENT_ID || "pk_UkifqMuyjH77QPxB";
    const authUrl = `https://enter.pollinations.ai/authorize?redirect_uri=${redirectUrl}&client_id=${clientId}`;
    
    addToast("Redirecting to Pollinations for secure login...", "info");
    setTimeout(() => {
      window.location.href = authUrl;
    }, 1200);
  };

  const disconnectPollinations = () => {
    localStorage.removeItem("POLLINATIONS_USER_KEY");
    setPollinationsKeyConnected(false);
    addToast("Disconnected your Pollinations account.", "info");
  };

  const handleSuggestPrompt = () => {
    const name = formData.name || 'Electronic Beat';
    const artist = formData.artist || 'OG Beatz';
    setAiPrompt(`Professional high-fashion album cover art, premium layout for "${name}" by ${artist}, neon dark cyber-organic style, deep obsidian blacks, matte silver finish, intense amber glow accents, tech-forward geometric patterns, 8k resolution, cinematic lighting, ultra detailed.`);
  };

  const handleGenerateAiArt = async () => {
    if (!aiPrompt.trim()) {
      addToast("Please enter a visual design prompt first", "error");
      return;
    }
    
    setGeneratingArt(true);
    addToast("Generating premium artwork with Pollinations Flux AI...", "info");
    
    try {
      const userKey = localStorage.getItem("POLLINATIONS_USER_KEY") || "";
      const seed = Math.floor(Math.random() * 1000000);
      let url = `https://gen.pollinations.ai/image/${encodeURIComponent(aiPrompt)}?model=flux&width=1024&height=1024&seed=${seed}`;
      if (userKey) {
        url += `&key=${encodeURIComponent(userKey)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Aesthetic engine unresponsive or rate limited");
      
      const blob = await response.blob();
      const file = new File([blob], `ai_art_${Date.now()}.png`, { type: 'image/png' });
      
      setUploading(true);
      const publicUrl = await uploadFile('artwork', file);
      if (publicUrl) {
        setFormData(prev => ({ ...prev, image_url: publicUrl }));
        addToast("AI Cover Art generated and uploaded successfully!", "success");
      } else {
        throw new Error("Local upload failed");
      }
    } catch (err: any) {
      console.error("AI Art generation failed:", err);
      addToast(`Artwork generation failed: ${err.message || err}`, "error");
    } finally {
      setGeneratingArt(false);
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (onSave) {
      await onSave(track.id, formData);
    }
    onClose();
  };

  const handleLyricsFile = (f: File) => {
    if (!f) return;
    if (f.name.endsWith('.txt') || f.name.endsWith('.lrc') || f.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          setFormData(prev => ({ ...prev, lyrics: text }));
          setLyricsFilename(f.name);
        }
      };
      reader.readAsText(f);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, image_url: localUrl }));
      setUploading(true);

      try {
        const publicUrl = await uploadFile('artwork', file);
        if (publicUrl) {
          setFormData(prev => ({ ...prev, image_url: publicUrl }));
        }
      } catch (err) {
        console.error('Error uploading track artwork:', err);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDelete = async () => {
    if (onDelete && confirm('Are you sure you want to delete this track?')) {
      await onDelete(track.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingLyrics(true);
        }}
        onDragLeave={() => setIsDraggingLyrics(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingLyrics(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleLyricsFile(file);
        }}
        className={`bg-zinc-950 border rounded-[2.5rem] w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl transition-all duration-300 ${
          isDraggingLyrics ? 'border-orange-500 bg-zinc-950/90 scale-[1.01]' : 'border-zinc-900'
        }`}
      >
        <div className="p-8 border-b border-zinc-900 flex items-center justify-between sticky top-0 bg-zinc-950 z-10">
          <h2 className="text-xl font-black uppercase tracking-tight">Edit Metadata</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full transition-colors"><X/></button>
        </div>
        <div className="p-8 flex flex-col md:flex-row gap-8">
          {/* Artwork Upload */}
          <div className="w-48 space-y-4">
            <div 
              onClick={() => imageInputRef.current?.click()}
              className="aspect-square bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 group overflow-hidden relative"
            >
              {formData.image_url ? (
                <>
                  <img src={formData.image_url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ImageIcon className="text-white w-8 h-8" />
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="text-zinc-500 w-10 h-10 group-hover:text-orange-500 transition-colors" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mt-2">ADD ARTWORK</span>
                </>
              )}

              {uploading && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10">
                  <Loader2 className="w-6 h-6 text-orange-500 animate-spin mb-1" />
                  <span className="text-[7px] font-mono text-zinc-400 uppercase tracking-widest text-center px-2">Uploading art...</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={imageInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageChange} 
            />
            <p className="text-[9px] text-zinc-500 text-center font-medium leading-relaxed uppercase tracking-widest px-2 pb-2">Square format recommended for streaming portals</p>

            {/* AI Cover Art Generator Widget */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-900 rounded-2xl space-y-3">
              <div className="flex items-center gap-1.5 justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-orange-500 animate-pulse" /> AI Cover Generator
                </span>
                <span className="text-[7px] font-mono bg-orange-500/10 border border-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">
                  Flux Engine
                </span>
              </div>
              <p className="text-[8px] text-zinc-500 leading-normal">
                Generate highly polished, production-ready release visuals automatically.
              </p>

              {/* Pollinations BYOP Authentication section */}
              <div className="flex items-center justify-between bg-zinc-950/60 p-2 border border-zinc-850 rounded-xl text-[9px]">
                <div className="flex items-center gap-1">
                  <Key className={`w-3 h-3 ${pollinationsKeyConnected ? 'text-green-400' : 'text-zinc-500'}`} />
                  <span className="font-mono text-[8px] text-zinc-400">
                    {pollinationsKeyConnected ? "Pollinations Sync'd" : "No Account Linked"}
                  </span>
                </div>
                {pollinationsKeyConnected ? (
                  <button
                    type="button"
                    onClick={disconnectPollinations}
                    className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-2.5 h-2.5" /> Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={connectPollinations}
                    className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
                  >
                    <LogIn className="w-2.5 h-2.5" /> Login / BYOP
                  </button>
                )}
              </div>

              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe your design concept (e.g., Cybernetic mixer board in obsidian smoke with safety orange cords...)"
                className="w-full h-16 bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 outline-none focus:border-orange-500 text-[10px] font-mono leading-relaxed resize-none text-zinc-300 placeholder:text-zinc-650"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSuggestPrompt}
                  className="flex-1 py-1 px-1 border border-zinc-850 hover:border-zinc-700 text-[8px] font-black uppercase tracking-wider text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  Suggest Vibe
                </button>
                <button
                  type="button"
                  disabled={generatingArt || uploading}
                  onClick={handleGenerateAiArt}
                  className="flex-1 py-1 px-1 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-900 text-black disabled:text-zinc-500 text-[8px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95 disabled:scale-100"
                >
                  {generatingArt ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                  {generatingArt ? "Designing..." : "Generate"}
                </button>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex-1 space-y-6">
            <div className="space-y-4">
              <label className="block">
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Track Name</span>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-orange-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label>
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">BPM</span>
                  <input 
                    type="number" 
                    value={formData.bpm} 
                    onChange={(e) => setFormData({ ...formData, bpm: parseInt(e.target.value) || 0 })}
                    className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-orange-500"
                  />
                </label>
                <label>
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Key</span>
                  <input 
                    type="text" 
                    value={formData.key_signature} 
                    onChange={(e) => setFormData({ ...formData, key_signature: e.target.value })}
                    className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-orange-500"
                  />
                </label>
              </div>

              {/* Dynamic Reanalyze Track Button */}
              <button
                type="button"
                disabled={analyzing}
                onClick={async () => {
                  setAnalyzing(true);
                  addToast(`Initiating high-precision AI diagnostics for "${formData.name}"...`, "info");
                  try {
                    const result = await analyzeTrack(formData.name, formData.duration);
                    if (result) {
                      setFormData(prev => ({
                        ...prev,
                        bpm: result.bpm,
                        key_signature: result.key,
                        tags: result.tags || prev.tags
                      }));
                      addToast("AI Analysis succeeded! Fields updated.", "success");
                    }
                  } catch (err: any) {
                    console.error("AI Analysis failed:", err);
                    addToast(`Diagnostics failed: ${err.message || err}`, "error");
                  } finally {
                    setAnalyzing(false);
                  }
                }}
                className={`w-full py-2.5 border rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  analyzing 
                  ? 'bg-zinc-900/50 text-zinc-500 border-zinc-800 cursor-not-allowed' 
                  : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/25 active:scale-95'
                }`}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Running High-Precision Diagnostics...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                    Reanalyze Track with Gemini AI
                  </>
                )}
              </button>

              {/* Lyrics Editing & Drop zone inside form */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">📝 Lyrics</span>
                    {lyricsFilename && (
                      <span className="text-[8px] font-mono bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800 uppercase max-w-[120px] truncate" title={lyricsFilename}>
                        File: {lyricsFilename}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => lyricsInputRef.current?.click()}
                      className="text-[9px] font-black uppercase tracking-widest text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
                    >
                      Browse TXT
                    </button>
                    {formData.lyrics && (
                      <button 
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, lyrics: '' }));
                          setLyricsFilename(null);
                        }}
                        className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                
                <textarea
                  value={formData.lyrics || ''}
                  onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                  placeholder="Drop a lyric text sheet anywhere here, or click Browse to load, or type lyrics manually..."
                  className="w-full h-28 bg-zinc-900 border border-zinc-800 rounded-xl p-3 outline-none focus:border-orange-500 text-[11px] font-mono leading-relaxed resize-none text-zinc-300 placeholder:text-zinc-600"
                />

                <input 
                  type="file" 
                  ref={lyricsInputRef} 
                  accept=".txt,.lrc,text/plain" 
                  className="hidden" 
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) handleLyricsFile(selectedFile);
                  }} 
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={handleDelete}
                className="flex-1 py-4 border border-zinc-900 text-rose-500 rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Purge
              </button>
              <button 
                onClick={handleSave}
                className="flex-[2] py-4 bg-white text-black rounded-full font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:scale-105 transition-transform"
              >
                <Save className="w-4 h-4" /> Commit Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
