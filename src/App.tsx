import React, { useState, useEffect } from 'react';
import { useMediaStore } from './context/MediaStoreContext';
import { useAudio } from './context/AudioContext';
import Shell from './components/Shell';
import SharePortal from './components/SharePortal';
import ClientPortal from './components/ClientPortal';

export default function App() {
  // 1. Initialize State (these are safe)
  const [activeView, setActiveView] = useState('dashboard');
  const [isClient, setIsClient] = useState(false);

  // 2. These hooks are now safely called within the useEffect/Client guard below
  // We use a "deferred" approach to prevent SSR build crashes
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [clientPortalUser, setClientPortalUser] = useState<any | null>(null);

  useEffect(() => {
    setIsClient(true);
    const params = new URLSearchParams(window.location.search);
    setShareToken(params.get('share') || params.get('token'));
  }, []);

  // 3. Early return for SSR (prevents hook mismatch)
  if (!isClient) {
    return <div className="h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  }

  return <AppContent activeView={activeView} setActiveView={setActiveView} shareToken={shareToken} />;
}

// Separate component for the actual app to ensure hooks run only in the browser
function AppContent({ activeView, setActiveView, shareToken }: any) {
  const mediaStore = useMediaStore();
  
  if (shareToken) return <SharePortal />;
  
  return (
    <Shell activeView={activeView} onViewChange={setActiveView}>
      <div className="p-8 text-white">
        {activeView === 'dashboard' && <h1>Dashboard</h1>}
        {activeView === 'tracks' && <h1>Library</h1>}
      </div>
    </Shell>
  );
}
