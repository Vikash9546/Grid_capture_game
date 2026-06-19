import React from 'react';
import { useStore } from '../store/useStore';

export default function Header() {
  const user = useStore((state) => state.user);
  const onlineUsersCount = useStore((state) => state.onlineUsersCount);

  return (
    <header className="h-[60px] bg-[#101415] border-b border-[#264191]/50 flex items-center justify-between px-6 z-20 shrink-0">
      <div className="flex items-center space-x-12 h-full">
        <h1 className="text-[22px] font-bold text-[#d4e3ff] tracking-tight font-sans">
          TERRITORY
        </h1>

        <nav className="flex items-center space-x-8 h-full">
          <a href="#" className="font-mono text-[12px] font-bold text-[#d4e3ff] tracking-[0.05em] uppercase h-full flex items-center border-b-[3px] border-[#60a5fa] pt-[3px]">MAP</a>
        </nav>
      </div>

      <div className="flex items-center space-x-6 text-[#8b919d]">
        <div className="flex items-center gap-2 px-3 py-1 bg-[#191c1e] border border-[#414751]/50 mr-2" title="Live Operators">
          <div className="w-2 h-2 bg-[#10b981] rounded-full animate-[pulse_2s_ease-in-out_infinite]" />
          <span className="font-mono text-[10px] text-[#e0e3e5] font-bold tracking-[0.1em] mt-0.5">{onlineUsersCount} ACTIVE</span>
        </div>


        {user && (
          <div className="w-8 h-8 bg-[#191c1e] border border-[#60a5fa]/40 flex items-center justify-center overflow-hidden">
             <img src="https://api.dicebear.com/7.x/bottts/svg?seed=stark&backgroundColor=101415" alt="Avatar" className="w-full h-full object-cover opacity-80" />
          </div>
        )}
      </div>
    </header>
  );
}
