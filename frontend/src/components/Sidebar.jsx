import React from 'react';
import { useStore } from '../store/useStore';
import { socket } from '../socket';

export default function Sidebar() {
  const { user, toggleLeaderboard, setUser } = useStore();

  const handleLogout = () => {
    localStorage.removeItem('territory_user');
    socket.disconnect();
    setUser(null);
  };

  return (
    <div className="w-[260px] bg-[#101415] flex flex-col h-full shrink-0 border-r border-[#264191]/30">
      
      {/* Commander Profile */}
      <div className="px-6 py-8">
        <h2 className="font-mono text-[10px] font-bold tracking-[0.1em] text-[#8b919d] uppercase mb-1">COMMANDER</h2>
        <h1 className="font-sans text-[20px] leading-[1.2] font-bold text-[#d4e3ff] uppercase tracking-wide truncate">
          CDR. {user?.username || 'STARK'}
        </h1>
        <p className="font-mono text-[10px] font-bold text-[#e0e3e5] tracking-[0.1em] uppercase mt-2">
          LVL {Math.max(1, Math.floor((user?.score || 0) / 100))} OPERATOR
        </p>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 flex flex-col mt-2">
        <a href="#" className="flex items-center px-6 py-4 bg-[#264191]/30 text-[#e0e3e5] border-l-[3px] border-[#60a5fa]">
          <span className="material-symbols-outlined text-[18px] mr-4 opacity-80">map</span>
          <span className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase">MAP OVERVIEW</span>
        </a>
        
        <button onClick={toggleLeaderboard} className="flex w-full items-center px-6 py-4 text-[#8b919d] hover:text-[#e0e3e5] transition-colors border-l-[3px] border-transparent hover:bg-[#191c1e]">
          <span className="material-symbols-outlined text-[18px] mr-4 opacity-80">leaderboard</span>
          <span className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase">LEADERBOARD</span>
        </button>

      </nav>

      {/* Bottom Section */}
      <div className="p-6">
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full text-[#8b919d] hover:text-[#ef4444] transition-colors font-mono"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase">LOGOUT</span>
        </button>
      </div>

    </div>
  );
}
