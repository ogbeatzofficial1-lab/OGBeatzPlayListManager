import React, { useState, useRef } from 'react';
import { X, Save, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Track } from '../types';
import { useMediaStore } from '../context/MediaStoreContext';

export default function EditTrackModal({ track, onClose, onSave, onDelete }: { 
  track: Track; 
  onClose: () => void;
  onSave?: (id: string, updates: Partial<Track>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [formData, setFormData] = useState({ ...track });
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (onSave) {
      await onSave(track.id, formData);
    }
    onClose();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFormData({ ...formData, image_url: url, image_data: file });
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
      <div className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-zinc-900 flex items-center justify-between">
          <h2 className="text-xl font-black uppercase tracking-tight">Edit Metadata</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full transition-colors"><X/></button>
        </div>
        <div className="p-8 flex gap-8">
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
            </div>
            <input 
              type="file" 
              ref={imageInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageChange} 
            />
            <p className="text-[9px] text-zinc-500 text-center font-medium leading-relaxed uppercase tracking-widest px-2">Square format recommended for streaming portals</p>
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
