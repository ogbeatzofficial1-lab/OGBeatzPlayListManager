import React, { useState, useEffect } from 'react';
// IMPORT ALL YOUR ORIGINAL IMPORTS HERE
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

  // This prevents the server crash. 
  // It shows a simple black screen while building, 
  // then instantly switches to your Shell.
  if (!isMounted) {
    return <div className="h-screen bg-black w-full" />;
  }

  return <AppContent />;
}

function AppContent() {
  // PASTE YOUR ORIGINAL HOOKS HERE
  // e.g., const [activeView, setActiveView] = useState('dashboard');
  // e.g., const { tracks, loading } = useMediaStore();
  
  const [activeView, setActiveView] = useState('dashboard');
  
  // PASTE YOUR ORIGINAL RENDER LOGIC HERE
  // This ensures the Shell and your content are ALWAYS rendered
  return (
    <Shell activeView={activeView} onViewChange={setActiveView}>
       <div className="h-full w-full bg-black text-white p-8">
         {/* THIS IS WHERE YOUR DASHBOARD/TRACKS CONTENT GOES */}
         <h1>DASHBOARD</h1>
         <p>If you see this, the Shell is working. Paste your original components here!</p>
       </div>
    </Shell>
  );
}
