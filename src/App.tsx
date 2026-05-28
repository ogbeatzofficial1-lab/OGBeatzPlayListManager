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

// --- THE MOUNTING GUARD ---
export default function App() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  
  // This prevents the server build from executing your hooks/logic
  if (!isMounted) return <div className="h-screen bg-black w-full" />;
  
  return <AppContent />;
}

// --- YOUR ORIGINAL CODE ---
function AppContent() {
  // All your original state, useEffects, and render functions go here
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ogbeatz-theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('ogbeatz-theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('theme-light');
    } else {
      root.classList.remove('theme-light');
    }
  }, [theme]);

  // [PASTE THE REST OF YOUR ORIGINAL CODE STARTING FROM 'activeView' HERE]
  // ... (All your original useState hooks, logic, and render functions) ...
  
  // Ensure your return statement at the bottom is:
  // return (
  //   <Shell activeView={activeView} onViewChange={(v) => setActiveView(v)}>
  //     ... (Your original routing logic: {activeView === 'dashboard' && renderDashboard()} etc.)
  //   </Shell>
  // );
}
