import React, { useState, useEffect } from 'react';
import { useMediaStore } from './context/MediaStoreContext';
import { useAudio } from './context/AudioContext';
import Shell from './components/Shell';
import SharePortal from './components/SharePortal';
import ClientPortal from './components/ClientPortal';
import { AnimatePresence } from 'motion/react';

export default function App() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  if (!isMounted) return <div className="h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  return <AppContent />;
}

function AppContent() {
  const [activeView, setActiveView] = useState('dashboard');
  const [shareToken, setShareToken] = useState(null);
  const { clients } = useMediaStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShareToken(params.get('share') || params.get('token'));
  }, []);

  if (shareToken) return <SharePortal />;

  return (
    <Shell activeView={activeView} onViewChange={setActiveView}>
      <div className="p-8 text-white">
        <h1>{activeView.toUpperCase()}</h1>
      </div>
    </Shell>
  );
}
