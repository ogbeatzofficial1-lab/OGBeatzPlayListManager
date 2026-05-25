import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Sparkles, RefreshCw, Mail, Youtube, Instagram, Tag } from 'lucide-react';
import { Track } from '../types';
import { generatePromoPack } from '../services/geminiService';
import { getSupabaseClient } from '../lib/supabase';

// High-fidelity type definition for local state
interface PromoPackType {
  id?: string;
  track_id: string;
  youtube_copy?: string;
  instagram_copy?: string;
  generic_copy?: string;
}

export default function PromoPackModal({ track, onClose }: { track: Track; onClose: () => void }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [promoPack, setPromoPack] = useState<PromoPackType | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<boolean>(false);

  // Load existing promo pack from Supabase or generate a new one
  const fetchOrGeneratePromo = async (forceRegenerate = false) => {
    if (forceRegenerate) {
      setRegenerating(true);
    } else {
      setLoading(true);
    }

    try {
      let existingPack: PromoPackType | null = null;
      const activeSupabase = await getSupabaseClient().catch(() => null);

      // 1. Check Supabase first if available
      if (activeSupabase && !forceRegenerate) {
        const { data, error } = await activeSupabase
          .from('promo_packs')
          .select('*')
          .eq('track_id', track.id)
          .maybeSingle();

        if (data && !error) {
          existingPack = data;
        }
      }

      // 2. If existing pack found, set it, else generate with Gemini
      if (existingPack && !forceRegenerate) {
        setPromoPack(existingPack);
      } else {
        // High fidelity generator call targeting the server API
        const generated = await generatePromoPack({
          name: track.name,
          artist: track.artist,
          bpm: track.bpm,
          key_signature: track.key_signature,
          tags: track.tags || []
        });

        const formattedPack: PromoPackType = {
          track_id: track.id,
          youtube_copy: JSON.stringify(generated.youtube),
          instagram_copy: generated.instagram || "",
          generic_copy: JSON.stringify({
            pitch: generated.generic || "",
            analysis: generated.analysis || null
          })
        };

        // If connected to Supabase, update or insert in the database
        if (activeSupabase) {
          if (existingPack?.id) {
            // Update
            await activeSupabase
              .from('promo_packs')
              .update({
                youtube_copy: formattedPack.youtube_copy,
                instagram_copy: formattedPack.instagram_copy,
                generic_copy: formattedPack.generic_copy
              })
              .eq('id', existingPack.id);
            formattedPack.id = existingPack.id;
          } else {
            // Insert
            const { data: inserted, error: insertError } = await activeSupabase
              .from('promo_packs')
              .insert({
                track_id: track.id,
                youtube_copy: formattedPack.youtube_copy,
                instagram_copy: formattedPack.instagram_copy,
                generic_copy: formattedPack.generic_copy
              })
              .select()
              .single();

            if (inserted && !insertError) {
              formattedPack.id = inserted.id;
            }
          }
        }

        setPromoPack(formattedPack);
      }
    } catch (err) {
      console.error("Promo pack load/generate error:", err);
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    fetchOrGeneratePromo();
  }, [track.id]);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Safe JSON extraction for YouTube metadata
  const getYoutubeData = () => {
    if (!promoPack?.youtube_copy) return null;
    try {
      return JSON.parse(promoPack.youtube_copy);
    } catch {
      // Handle legacy format string gracefully
      return {
        title: `🎹 ${track.name} [Reference Mix] - Prod. ${track.artist}`,
        description: promoPack.youtube_copy
      };
    }
  };

  // Safe extraction for Generic / Pitch and AI Analysis
  const getGenericData = () => {
    if (!promoPack?.generic_copy) return null;
    try {
      const parsed = JSON.parse(promoPack.generic_copy);
      if (parsed && typeof parsed === 'object' && ('pitch' in parsed || 'analysis' in parsed)) {
        return {
          pitch: parsed.pitch || "",
          analysis: parsed.analysis || null
        };
      }
    } catch {}
    
    // Heuristic fallbacks for legacy/unserialized entries
    const isInstrumental = track.tags?.some(t => t.toLowerCase().includes('instrumental')) ?? true;
    return {
      pitch: promoPack.generic_copy,
      analysis: {
        instrument_status: isInstrumental ? "Instrumental" : "Vocal / Song",
        seo_keywords: track.tags && track.tags.length > 0 ? track.tags : ["free type beat", `${track.name.toLowerCase()} beat`, "rap instrumental"],
        beatstars_tags: ["trap", "hiphop", "melodic"],
        youtube_tags: ["free type beat 2026", "melancholic instrumental", "dark trap beat", "ambient type beat", "ogbeatz reference mix"],
        mood_tags: ["Melancholic", "Chill", "Atmospheric"],
        mood: "Atmospheric & Deep",
        energy: "Medium Flow",
        target_audience: "Independent filmmakers, Hip Hop Artists, Sync Supervisors",
        instruments: ["Spitfire piano", "Heavy sub-bass", "Glitch percussion"]
      }
    };
  };

  const ytData = getYoutubeData();
  const genericData = getGenericData();
  const pitchText = genericData?.pitch || "";
  const rawAnalysis = genericData?.analysis || null;
  const analysisData = rawAnalysis ? {
    ...rawAnalysis,
    beatstars_tags: rawAnalysis.beatstars_tags || ["trap", "hiphop", "beats"],
    youtube_tags: rawAnalysis.youtube_tags || rawAnalysis.seo_keywords || ["free type beat", "trap instrumental", "rap beats 2026"],
    mood_tags: rawAnalysis.mood_tags || [rawAnalysis.mood || "Chill", "Elevated", "Atmospheric"]
  } : null;

  return (
    <div id="promo-pack-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div id="promo-pack-modal-card" className="bg-zinc-950 border border-zinc-900 rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="text-orange-500 w-6 h-6 animate-pulse" />
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white">Marketing Portal</h2>
              <p className="text-[10px] font-mono text-zinc-500 mt-0.5">GEMINI PROMO KIT GENERATOR • {track.name.toUpperCase()}</p>
            </div>
          </div>
          <button 
            id="close-promo-modal-btn"
            onClick={onClose} 
            className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <RefreshCw className="w-10 h-10 text-orange-500 animate-spin" />
              <p className="mt-4 text-zinc-400 text-sm font-medium">Assembled intelligence consulting sound catalog...</p>
              <p className="text-[11px] font-mono text-zinc-600 mt-2">GENERATING CUSTOM MARKETING COPY VIA GEMINI 3.5</p>
            </div>
          ) : (
            <>
              {/* YouTube Metadata Section */}
              {ytData && (
                <div id="promo-section-youtube" className="p-6 bg-zinc-90 w-full bg-zinc-900/40 rounded-2xl border border-zinc-900 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4 border-b border-zinc-900/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Youtube className="text-red-500 w-5 h-5" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-[#FF0000]">YouTube Hype Metadata</span>
                    </div>
                    <button 
                      onClick={() => handleCopy(`${ytData.title}\n\n${ytData.description}`, 'youtube')}
                      className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      {copiedSection === 'youtube' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-green-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Stencil</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Optimized Title</span>
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 font-mono text-xs text-zinc-300">
                        {ytData.title}
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Interactive Description</span>
                      <pre className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 font-mono text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {ytData.description}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Instagram Promo Caption */}
              {promoPack?.instagram_copy && (
                <div id="promo-section-instagram" className="p-6 bg-zinc-90 w-full bg-zinc-900/40 rounded-2xl border border-zinc-900">
                  <div className="flex items-center justify-between mb-4 border-b border-zinc-900/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Instagram className="text-pink-500 w-5 h-5" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-[#E1306C]">Instagram Caption</span>
                    </div>
                    <button 
                      onClick={() => handleCopy(promoPack.instagram_copy || "", 'instagram')}
                      className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      {copiedSection === 'instagram' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-green-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Caption</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                    {promoPack.instagram_copy}
                  </pre>
                </div>
              )}

              {/* Email / Pitch Pitch Delivery */}
              {pitchText && (
                <div id="promo-section-pitch" className="p-6 w-full bg-zinc-900/40 rounded-2xl border border-zinc-900">
                  <div className="flex items-center justify-between mb-4 border-b border-zinc-900/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="text-[#3b82f6] w-5 h-5" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-blue-500">Pitch & Delivery Letter</span>
                    </div>
                    <button 
                      onClick={() => handleCopy(pitchText, 'pitch')}
                      className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      {copiedSection === 'pitch' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-green-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Letter</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                    {pitchText}
                  </pre>
                </div>
              )}

              {/* AI Strategic Music Insights & SEO Core */}
              {analysisData && (
                <div id="promo-section-analysis" className="p-6 w-full bg-zinc-900/40 rounded-2xl border border-zinc-900 space-y-6">
                  <div className="flex items-center justify-between border-b border-zinc-900/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-orange-500 w-5 h-5 animate-pulse" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-orange-500">AI Sound Analytics & SEO Cloud</span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[9px] font-black uppercase tracking-widest text-orange-400">
                      {analysisData.instrument_status || "Instrumental"}
                    </span>
                  </div>

                  {/* Insights Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900 space-y-1">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Vibe & Emotional Mood</span>
                      <p className="text-xs font-bold text-zinc-300">{analysisData.mood || "Energetic / Cinematic"}</p>
                    </div>
                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900 space-y-1">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Energy Flow Quotient</span>
                      <p className="text-xs font-bold text-zinc-300">{analysisData.energy || "High Energy"}</p>
                    </div>
                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900 space-y-1">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Target Audience & Placement</span>
                      <p className="text-xs font-bold text-zinc-300">{analysisData.target_audience || "Hip Hop Artists, Vloggers, Sports Synch"}</p>
                    </div>
                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900 space-y-1">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Core Instrumentation Heard</span>
                      <p className="text-xs font-mono text-zinc-400">
                        {Array.isArray(analysisData.instruments) ? analysisData.instruments.join(", ") : "Analog synths, heavy percussion"}
                      </p>
                    </div>
                  </div>

                  {/* BeatStars Metadata Section */}
                  <div className="space-y-4 border-t border-zinc-900/80 pt-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">BeatStars Catalog Tags (3 Tag Limit)</span>
                        <p className="text-[9px] font-mono text-zinc-600">Strict 3 tag upload requirement on BeatStars website</p>
                      </div>
                      <button
                        onClick={() => handleCopy(analysisData.beatstars_tags.join(", "), 'beatstars-all-tags')}
                        className="self-start sm:self-center px-4 py-1.5 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 rounded-xl text-[10px] font-mono text-zinc-400 transition-all flex items-center gap-1.5"
                      >
                        {copiedSection === 'beatstars-all-tags' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-green-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-orange-500" />
                            <span>Copy Comma Separated Pack</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(analysisData.beatstars_tags) && analysisData.beatstars_tags.map((tagRef: string) => {
                        const tag = tagRef.trim().toLowerCase();
                        const isCopied = copiedSection === `bstag-${tag}`;
                        return (
                          <button
                            key={tag}
                            onClick={() => handleCopy(tag, `bstag-${tag}`)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
                              isCopied
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : "bg-zinc-950 border-zinc-900 hover:border-zinc-850 text-orange-500/80 hover:text-orange-400"
                            }`}
                          >
                            <span className="text-[10px] font-black opacity-80">#</span>
                            <span>{tag}</span>
                            {isCopied ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 opacity-40 text-zinc-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* BeatStars Mood Tags Section */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">BeatStars Mood Target Attributes</span>
                        <p className="text-[9px] font-mono text-zinc-600">Select matching moods for search refinement</p>
                      </div>
                      <button
                        onClick={() => handleCopy(analysisData.mood_tags.join(", "), 'beatstars-all-moods')}
                        className="self-start sm:self-center px-4 py-1.5 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 rounded-xl text-[10px] font-mono text-zinc-400 transition-all flex items-center gap-1.5"
                      >
                        {copiedSection === 'beatstars-all-moods' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-green-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-blue-400" />
                            <span>Copy All Moods</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(analysisData.mood_tags) && analysisData.mood_tags.map((moodRef: string) => {
                        const mTag = moodRef.trim();
                        const isCopied = copiedSection === `moodtag-${mTag}`;
                        return (
                          <button
                            key={mTag}
                            onClick={() => handleCopy(mTag, `moodtag-${mTag}`)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
                              isCopied
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : "bg-zinc-950 border-zinc-900 hover:border-zinc-850 text-blue-400/80 hover:text-blue-400"
                            }`}
                          >
                            <span>✨ {mTag}</span>
                            {isCopied ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 opacity-40 text-zinc-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* YouTube Tags / Keywords Section */}
                  <div className="space-y-4 border-t border-zinc-900/80 pt-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">YouTube Specific Search Tags</span>
                        <p className="text-[9px] font-mono text-zinc-600">Optimized for high CTR, discovery indexing, and algorithmic relevance</p>
                      </div>
                      <button
                        onClick={() => handleCopy(analysisData.youtube_tags.join(", "), 'yt-all-tags')}
                        className="self-start sm:self-center px-4 py-1.5 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 rounded-xl text-[10px] font-mono text-zinc-400 transition-all flex items-center gap-1.5"
                      >
                        {copiedSection === 'yt-all-tags' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-green-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-red-500" />
                            <span>Copy Comma Separated Pack</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(analysisData.youtube_tags) && analysisData.youtube_tags.map((tagRef: string) => {
                        const tag = tagRef.trim();
                        const isCopied = copiedSection === `yttag-${tag}`;
                        return (
                          <button
                            key={tag}
                            onClick={() => handleCopy(tag, `yttag-${tag}`)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
                              isCopied
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : "bg-zinc-950 border-zinc-900 hover:border-zinc-850 text-zinc-400 hover:text-white"
                            }`}
                          >
                            <span>{tag}</span>
                            {isCopied ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 opacity-40 text-zinc-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-zinc-900 bg-zinc-950/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-mono text-zinc-500">
            {track.bpm} BPM • {track.key_signature} • GENERATED USING GEMINI-3.5-FLASH
          </p>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              id="refresh-promo-btn"
              disabled={loading || regenerating}
              onClick={() => fetchOrGeneratePromo(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/50 text-xs font-mono font-bold uppercase tracking-widest text-zinc-300 disabled:opacity-50 transition-all hover:text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              <span>{regenerating ? 'Regenerating...' : 'Regenerate copy'}</span>
            </button>
            <button
              id="diminish-promo-modal-btn"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-orange-500 text-black hover:bg-orange-400 text-xs font-mono font-bold uppercase tracking-widest transition-all shadow-lg hover:shadow-orange-500/20"
            >
              Done
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
