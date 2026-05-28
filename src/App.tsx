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
  const [activeView, setActiveView] = useState<string>('dashboard');
  
  // This function decides what to show based on the activeView state
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <div className="p-8 text-white"><h1>DASHBOARD CONTENT</h1></div>;
      case 'tracks': return <div className="p-8 text-white"><h1>TRACKS LIBRARY</h1></div>;
      case 'playlists': return <div className="p-8 text-white"><h1>PLAYLISTS</h1></div>;
      case 'clients': return <div className="p-8 text-white"><h1>CLIENT MANAGEMENT</h1></div>;
      case 'messages': return <div className="p-8 text-white"><h1>MESSAGES</h1></div>;
      case 'videos': return <div className="p-8 text-white"><h1>VIDEO PORTAL</h1></div>;
      case 'sharing': return <div className="p-8 text-white"><h1>SHARING DASHBOARD</h1></div>;
      case 'activity': return <div className="p-8 text-white"><h1>SYSTEM ACTIVITY</h1></div>;
      case 'settings': return <div className="p-8 text-white"><h1>SETTINGS</h1></div>;
      default: return <div className="p-8 text-white">Select a view</div>;
    }
  };

  return (
    <Shell activeView={activeView} onViewChange={setActiveView}>
      {renderContent()}
    </Shell>
  );
}
