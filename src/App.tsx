import React, { useState, useEffect } from 'react';
import { useMediaStore } from './context/MediaStoreContext';
import { useAudio } from './context/AudioContext';
import Shell from './components/Shell';
import AudioPlayer from './components/AudioPlayer';
import SharePortal from './components/SharePortal';
import ClientPortal from './components/ClientPortal';
import { AnimatePresence } from 'motion/react';
// ... keep all your other original imports (Modals, etc)

export default function App() {
  // We use this to prevent SSR/Build-time execution of hooks
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  }

  return <AppContent />;
}

function AppContent() {
  // 1. ALL YOUR ORIGINAL HOOKS GO HERE
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [shareToken, setShareToken] = useState<string | null>(null);
  const { tracks, loading, getShareContent } = useMediaStore();
  
  // 2. Logic
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('share') || params.get('token');
    if (token) setShareToken(token);
  }, []);

  // 3. YOUR ORIGINAL RENDERING LOGIC
  if (shareToken) {
    return <SharePortal />;
  }

  return (
    <Shell activeView={activeView} onViewChange={setActiveView}>
      {/* PLACE YOUR ORIGINAL DASHBOARD/LIBRARY RENDER FUNCTIONS HERE */}
      <div className="p-8 text-white">
         {activeView === 'dashboard' && <h1>Dashboard Content</h1>}
         {activeView === 'tracks' && <h1>Library Content</h1>}
         {/* ... etc ... */}
      </div>
    </Shell>
  );

}
