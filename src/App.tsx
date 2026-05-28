import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, Filter, Play, Music, Activity as ActivityIcon,
  MessageSquare, Mail, Zap, ChevronRight, TrendingUp, TrendingDown,
  Download, Share2, Users, LayoutDashboard, Bell, User,
  ArrowUpRight, Settings, ChevronLeft, Lock, ThumbsUp,
  ThumbsDown, Paperclip, Send, X, Trash2, Edit3, Video,
  AlertCircle, Eye, BarChart3, GripVertical, Sun, Moon, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import { useMediaStore } from './context/MediaStoreContext';
import { useAudio } from './context/AudioContext';
import Shell from './components/Shell';
import AudioPlayer from './components/AudioPlayer';
import UploadZone from './components/UploadZone';
import TrackOptionsMenu from './components/TrackOptionsMenu';
import PromoPackModal from './components/PromoPackModal';
import EditTrackModal from './components/EditTrackModal';
import EditPlaylistModal from './components/EditPlaylistModal';
import AddTrackToPlaylistModal from './components/AddTrackToPlaylistModal';
import AddClientModal from './components/AddClientModal';
import EditClientModal from './components/EditClientModal';
import VideoGenerationModal from './components/VideoGenerationModal';
import VideoPreviewModal from './components/VideoPreviewModal';
import UploadVideoModal from './components/UploadVideoModal';
import SharePortal from './components/SharePortal';
import ClientPortal from './components/ClientPortal';
import ShareModal from './components/ShareModal';
import { Track, ShareLink, Client, Playlist } from './types';
import { cn } from './lib/utils';
import { getSupabaseClient, supabaseUrl } from './lib/supabase';


export default function App() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  if (!isMounted) return <div className="h-screen bg-black w-full" />;
  return <AppContent />;
}

function AppContent() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('ogbeatz-theme') as 'dark' | 'light') || 'dark');
  const [activeView, setActiveView] = useState<'dashboard' | 'tracks' | 'playlists' | 'clients' | 'messages' | 'sharing' | 'activity' | 'settings' | 'profile' | 'client-detail' | 'videos'>('dashboard');
  


  return (
    <Shell activeView={activeView} onViewChange={(v) => setActiveView(v as any)}>
      <div className="pb-24">
        {/* Your original routing logic remains here */}
        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'tracks' && renderTracks()}
        {activeView === 'playlists' && renderPlaylists()}
        {activeView === 'clients' && renderClients()}
        {activeView === 'messages' && renderMessages()}
        {activeView === 'videos' && renderVideos()}
        {activeView === 'activity' && renderActivity()}
        {activeView === 'sharing' && renderSharing()}
        {activeView === 'profile' && renderProfile()}
        {activeView === 'client-detail' && renderClientDetail()}
        {activeView === 'settings' && (
           <div className="p-8 text-white">
             {/* Your original settings code */}
           </div>
        )}
      </div>
      <AudioPlayer />
    </Shell>
  );
}
