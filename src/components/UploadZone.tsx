import React, { useState, useRef } from 'react';
import { Upload, X, FileAudio, Music, Image as ImageIcon } from 'lucide-react';
import { useMediaStore } from '../context/MediaStoreContext';

export default function UploadZone({ onSuccess }: { onSuccess: () => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [artwork, setArtwork] = useState<File | null>(null);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const artworkInputRef = useRef<HTMLInputElement>(null);
  const { addTrack, analyzeTrack, uploadFile } = useMediaStore();

  const handleFile = async (f: File) => {
    if (f.type.startsWith('image/')) {
      setArtwork(f);
      setArtworkUrl(URL.createObjectURL(f));
      return;
    }
    
    if (f.type.startsWith('audio/')) {
      setFile(f);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploadStatus("Extracting master duration...");
      // Get actual audio duration
      const audioForDuration = new Audio();
      const audioUrlForDuration = URL.createObjectURL(file);
      audioForDuration.src = audioUrlForDuration;
      
      const duration = await new Promise<number>((resolve) => {
        audioForDuration.onloadedmetadata = () => {
          resolve(audioForDuration.duration);
          URL.revokeObjectURL(audioUrlForDuration);
        };
        // Fallback if metadata fails
        setTimeout(() => resolve(0), 2000);
      });

      setUploadStatus("Analyzing BPM and key characteristics...");
      const analysis = await analyzeTrack(file.name);

      setUploadStatus("Uploading high-fidelity audio master...");
      const finalAudioUrl = await uploadFile('tracks', file);
      
      let finalArtworkUrl = artworkUrl;
      if (artwork) {
        setUploadStatus("Uploading artwork cover...");
        const uploadedArtUrl = await uploadFile('artwork', artwork);
        if (uploadedArtUrl) {
          finalArtworkUrl = uploadedArtUrl;
        }
      }
      
      setUploadStatus("Committing meta handshake to Supabase...");
      await addTrack({
        name: file.name.replace(/\.[^/.]+$/, ""),
        size: file.size,
        type: file.type,
        file_url: finalAudioUrl || URL.createObjectURL(file), // Fallback if upload fails
        file_data: file, // For local cache
        duration: duration,
        bpm: analysis.bpm,
        key_signature: analysis.key,
        tags: analysis.tags || [],
        image_url: finalArtworkUrl,
        image_data: artwork || undefined,
      });
      
      setUploadStatus(null);
      onSuccess();
    } catch (e) {
      console.error("Upload process failed:", e);
      setUploadStatus(null);
      alert("Asset shipment aborted. Check network configuration or permissions.");
    }
  };

  return (
    <div className="space-y-6">
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const droppedFiles = Array.from(e.dataTransfer.files);
          droppedFiles.forEach(handleFile);
        }}
        className={`border-2 border-dashed rounded-[2rem] p-12 transition-all flex flex-col items-center justify-center space-y-6 ${
          isDragging ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700'
        }`}
      >
        {!file ? (
          <>
            <div className="w-20 h-20 rounded-3xl bg-zinc-900 flex items-center justify-center text-zinc-500">
              <Upload className="w-10 h-10" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black uppercase tracking-tight">Post your high-fidelity masters</h3>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-2">WAV, MP3 and Artwork accepted</p>
            </div>
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              multiple
              onChange={(e) => {
                const selectedFiles = Array.from(e.target.files || []);
                selectedFiles.forEach(handleFile);
              }} 
            />
            <label 
              htmlFor="file-upload"
              className="px-8 py-3 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer hover:scale-105 transition-transform"
            >
              Select Files
            </label>
          </>
        ) : (
          <div className="w-full max-w-md space-y-8 py-4">
             <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Music className="text-black w-6 h-6" />
                   </div>
                   <div className="min-w-0">
                      <h4 className="text-xs font-black uppercase tracking-tight truncate">{file.name}</h4>
                      <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{(file.size / 1024 / 1024).toFixed(1)} MB • Audio Ready</p>
                   </div>
                </div>
                <button onClick={() => setFile(null)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500"><X className="w-4 h-4"/></button>
             </div>

             <div className="flex gap-4">
                <div 
                  onClick={() => artworkInputRef.current?.click()}
                  className="w-32 aspect-square bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 group overflow-hidden relative"
                >
                  {artworkUrl ? (
                    <img src={artworkUrl} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <ImageIcon className="text-zinc-500 w-8 h-8 group-hover:text-orange-500 transition-colors" />
                      <span className="text-[8px] font-black text-zinc-600 mt-2">ADD ART</span>
                    </>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-center">
                   <h4 className="text-xs font-black uppercase tracking-widest">Master Cover Art</h4>
                   <p className="text-[9px] text-zinc-500 mt-2 leading-relaxed uppercase">Drop an image or click the box to add a visual layer to your reference.</p>
                </div>
             </div>

             <input type="file" ref={artworkInputRef} accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files![0])} />

             <button 
                onClick={handleUpload} disabled={!!uploadStatus}
                className="w-full py-4 bg-orange-500 text-black rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-lg shadow-orange-500/20"
             >
                {uploadStatus || "Commit Master to Hub"}
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
