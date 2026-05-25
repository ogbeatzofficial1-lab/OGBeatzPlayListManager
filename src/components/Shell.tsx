import React from 'react';
import { 
  LayoutDashboard, 
  Music, 
  Users, 
  MessageSquare, 
  Settings, 
  Activity,
  Share2,
  Video
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ShellProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: any) => void;
}

export default function Shell({ children, activeView, onViewChange }: ShellProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tracks', label: 'Tracks', icon: Music },
    { id: 'playlists', label: 'Playlists', icon: LayoutDashboard }, // Using LayoutDashboard for playlists for now
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'videos', label: 'Videos', icon: Video },
    { id: 'sharing', label: 'Sharing', icon: Share2 },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-900 flex flex-col p-6 space-y-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Music className="text-black w-5 h-5" />
          </div>
          <span className="font-black tracking-tighter text-xl uppercase italic">OG BEATZ</span>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeView === item.id 
                  ? "bg-zinc-900 text-orange-500 border border-zinc-800" 
                  : "text-zinc-500 hover:text-white hover:bg-zinc-900/50"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-black">
        {children}
      </main>
    </div>
  );
}
