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

  // If activeView is dashboard, render your ORIGINAL function here
  return (
    <div style={{ width: '100vw', height: '100vh', background: 'black', color: 'white' }}>
      <Shell activeView={activeView} onViewChange={setActiveView}>
        {activeView === 'dashboard' ? (
           <div className="p-8">
             <h1 className="text-3xl font-black uppercase">Dashboard</h1>
             {/* Replace this with the actual content of your original renderDashboard() */}
             <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="p-6 bg-zinc-900 rounded-2xl">
                 <h2 className="text-sm font-black uppercase text-zinc-500">Total Library</h2>
                 <p className="text-4xl font-black mt-2">{tracks?.length || 0} Tracks</p>
               </div>
             </div>
           </div>
        ) : (
           <div className="p-8"><h1>Please select a view.</h1></div>
        )}
      </Shell>
    </div>
  );
}
