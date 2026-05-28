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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
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

// 1. SECURITY GATEKEEPER
export default function App() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  if (!isMounted) return <div className="h-screen bg-black w-full" />;
  return <AppContent />;
}

// 2. FULL LOGIC CONTAINER
function AppContent() {
  const [activeView, setActiveView] = useState('dashboard');
  const { tracks } = useMediaStore();

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex' }}>
      <Shell activeView={activeView} onViewChange={setActiveView}>
        <div style={{ padding: '40px', color: 'white' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 'bold' }}>SYSTEM ONLINE</h1>
          <p>Tracks loaded: {tracks.length}</p>
          <div style={{ marginTop: '20px', border: '1px solid #333', padding: '20px' }}>
            <h3>Testing Dashboard Logic:</h3>
            {/* If this prints, your data is fine */}
            <pre>{JSON.stringify(tracks.slice(0, 2), null, 2)}</pre>
          </div>
        </div>
      </Shell>
    </div>
  );
}
