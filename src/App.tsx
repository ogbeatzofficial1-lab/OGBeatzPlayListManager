import React, { useState, useEffect } from 'react';
import { useMediaStore } from './context/MediaStoreContext';
import Shell from './components/Shell';

export default function App() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  
  if (!isMounted) return <div className="h-screen bg-black w-full" />;
  return <AppContent />;
}

function AppContent() {
  const [activeView, setActiveView] = useState('dashboard');
  const { tracks } = useMediaStore();

  // If the Shell is black, we force a simple div test
  return (
    <div style={{ width: '100vw', height: '100vh', background: 'black', color: 'white' }}>
      <Shell activeView={activeView} onViewChange={setActiveView}>
        <div style={{ padding: '50px' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '900' }}>TEST MODE: ACTIVE</h1>
          <p>If you see this, the Shell is working and the database is connected.</p>
          <div style={{ marginTop: '20px' }}>
            <p>Total Tracks: {tracks?.length || 0}</p>
          </div>
        </div>
      </Shell>
    </div>
  );
}
