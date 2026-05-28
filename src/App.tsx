import React, { useState, useEffect } from 'react';
import React, { useState, useEffect } from 'react';
import { useMediaStore } from './context/MediaStoreContext';
import { useAudio } from './context/AudioContext';
import Shell from './components/Shell';
import SharePortal from './components/SharePortal';
import ClientPortal from './components/ClientPortal';
import { AnimatePresence } from 'motion/react';

export default function App() {
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
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [clientPortalUser, setClientPortalUser] = useState<any | null>(null);
  
  const { tracks, playlists, clients, loading, getShareContent } = useMediaStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('share') || params.get('token');
    const portalClient = params.get('client_portal');
    if (token) setShareToken(token);
    if (portalClient && clients.length > 0) {
      const client = clients.find(c => c.id === portalClient);
      if (client) setClientPortalUser(client);
    }
  }, [clients]);

  // RENDER BLOCKS
  const renderDashboard = () => (
    <div className="p-8">
      <h1 className="text-3xl font-black uppercase mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button onClick={() => setActiveView('tracks')} className="p-8 bg-zinc-900 rounded-3xl">Manage Library</button>
        <button onClick={() => setActiveView('clients')} className="p-8 bg-zinc-900 rounded-3xl">View Partners</button>
      </div>
    </div>
  );

  const renderTracks = () => (
    <div className="p-8">
      <h1 className="text-3xl font-black uppercase mb-6">Library</h1>
      {/* Add your original table/list logic here */}
    </div>
  );

  const renderClients = () => (
    <div className="p-8">
      <h1 className="text-3xl font-black uppercase mb-6">Partners</h1>
      {/* Add your original client list logic here */}
    </div>
  );

  // LOGIC ROUTER
  if (shareToken) return <SharePortal />;
  if (clientPortalUser) return <ClientPortal client={clientPortalUser} />;

  return (
    <Shell activeView={activeView} onViewChange={setActiveView}>
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'tracks' && renderTracks()}
      {activeView === 'clients' && renderClients()}
      {/* Add other views here */}
    </Shell>
  );
} { useMediaStore } from './context/MediaStoreContext';
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
