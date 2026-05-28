import React, { useState, useEffect } from 'react';
import { useMediaStore } from './context/MediaStoreContext';
import { useAudio } from './context/AudioContext';
import Shell from './components/Shell';
import SharePortal from './components/SharePortal';
import ClientPortal from './components/ClientPortal';

export default function App() {
  // 1. ALL HOOKS CALLED UNCONDITIONALLY
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [clientPortalUser, setClientPortalUser] = useState<any | null>(null);
  
  const mediaStore = useMediaStore();
  const audio = useAudio();

  // 2. LOGIC (Only after hooks)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShareToken(params.get('share') || params.get('token'));
  }, []);

  // 3. RENDER CONTENT
  // We return early ONLY IF hooks are finished. 
  // This is safe because all hooks were already called above.
  if (shareToken) return <SharePortal />;
  if (clientPortalUser) return <ClientPortal client={clientPortalUser} />;

  return (
    <Shell activeView={activeView} onViewChange={setActiveView}>
       <div className="p-8">
         {activeView === 'dashboard' && <div>Dashboard</div>}
         {activeView === 'tracks' && <div>Library</div>}
       </div>
    </Shell>
  );
}}
