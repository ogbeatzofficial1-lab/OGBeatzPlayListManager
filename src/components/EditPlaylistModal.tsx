import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Playlist } from '../types';
import { useMediaStore } from '../context/MediaStoreContext';

export default function EditPlaylistModal({ playlist, onClose, onSave, onDelete, isNew }: { 
  playlist: Partial<Playlist>; 
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onDelete?: (id: string) => void;
  isNew?: boolean;
}) {
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    ...playlist 
  });

  const handleSave = async () => {
    await onSave(formData);
    onClose();
  };

  const handleDelete = () => {
    if (onDelete && playlist.id && confirm('Are you sure you want to delete this playlist?')) {
      onDelete(playlist.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-zinc-900 flex items-center justify-between">
          <h2 className="text-xl font-black uppercase tracking-tight">Edit Collection</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full transition-colors"><X/></button>
        </div>
        <div className="p-8 space-y-6">
          <label className="block">
            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Playlist Name</span>
            <input 
              type="text" 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-orange-500"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Description</span>
            <textarea 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-orange-500 min-h-[100px]"
            />
          </label>
          <button 
            onClick={handleSave}
            className="w-full py-4 bg-white text-black rounded-full font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Collection
          </button>
        </div>
      </div>
    </div>
  );
}
