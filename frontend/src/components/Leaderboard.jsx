import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

export default function Leaderboard() {
  const { isLeaderboardOpen, toggleLeaderboard } = useStore();
  const [data, setData] = useState({ topScorers: [], topOwners: [], mostActiveDaily: [] });
  const [activeTab, setActiveTab] = useState('SCORERS'); // 'SCORERS', 'OWNERS', 'ACTIVE'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLeaderboardOpen) return;
    
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/leaderboard');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchLeaderboard();

    // Poll the backend every 3 seconds for real-time updates (hits Redis cache, so it's 0 latency)
    const interval = setInterval(fetchLeaderboard, 3000);
    return () => clearInterval(interval);
  }, [isLeaderboardOpen]);

  if (!isLeaderboardOpen) return null;

  const renderTab = () => {
    if (loading) return <div className="text-center py-10 text-[#8b919d]">GATHERING INTEL...</div>;

    if (activeTab === 'SCORERS') {
      return data.topScorers?.map((u, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-[#414751]/50">
          <div className="flex items-center space-x-3">
            <span className="text-[#60a5fa] font-bold w-4">{i + 1}.</span>
            <span style={{ color: u.color }}>{u.username}</span>
          </div>
          <span className="text-[#e0e3e5]">{u.score} PTS</span>
        </div>
      ));
    }

    if (activeTab === 'OWNERS') {
      return data.topOwners?.map((o, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-[#414751]/50">
          <div className="flex items-center space-x-3">
            <span className="text-[#60a5fa] font-bold w-4">{i + 1}.</span>
            <span style={{ color: o.user?.color }}>{o.user?.username || 'UNKNOWN'}</span>
          </div>
          <span className="text-[#e0e3e5]">{o.tilesOwned} TILES</span>
        </div>
      ));
    }

    if (activeTab === 'ACTIVE') {
      return data.mostActiveDaily?.map((a, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-[#414751]/50">
          <div className="flex items-center space-x-3">
            <span className="text-[#60a5fa] font-bold w-4">{i + 1}.</span>
            <span style={{ color: a.user?.color }}>{a.user?.username || 'UNKNOWN'}</span>
          </div>
          <span className="text-[#e0e3e5]">{a.dailyCaptures} CAPTURES</span>
        </div>
      ));
    }
  };

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] bg-[#191c1e]/95 border border-[#414751] shadow-2xl z-50 flex flex-col font-mono text-[11px] uppercase tracking-[0.1em]">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#414751] bg-[#101415]/80">
        <div className="flex items-center text-[#e0e3e5]">
          <span className="material-symbols-outlined text-[18px] mr-3 text-[#60a5fa]">leaderboard</span>
          <span className="font-bold tracking-[0.15em]">GLOBAL RANKINGS</span>
        </div>
        <button onClick={toggleLeaderboard} className="text-[#8b919d] hover:text-white transition-colors">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#414751] bg-[#101415]/40 text-[#8b919d] font-bold tracking-[0.15em] text-[10px]">
        <button 
          onClick={() => setActiveTab('SCORERS')}
          className={`flex-1 py-3 transition-colors ${activeTab === 'SCORERS' ? 'text-[#60a5fa] border-b-2 border-[#60a5fa] bg-[#191c1e]' : 'hover:text-[#e0e3e5] hover:bg-[#191c1e]/50'}`}
        >
          TOP SCORERS
        </button>
        <button 
          onClick={() => setActiveTab('OWNERS')}
          className={`flex-1 py-3 transition-colors ${activeTab === 'OWNERS' ? 'text-[#60a5fa] border-b-2 border-[#60a5fa] bg-[#191c1e]' : 'hover:text-[#e0e3e5] hover:bg-[#191c1e]/50'}`}
        >
          MOST TILES
        </button>
        <button 
          onClick={() => setActiveTab('ACTIVE')}
          className={`flex-1 py-3 transition-colors ${activeTab === 'ACTIVE' ? 'text-[#60a5fa] border-b-2 border-[#60a5fa] bg-[#191c1e]' : 'hover:text-[#e0e3e5] hover:bg-[#191c1e]/50'}`}
        >
          DAILY ACTIVE
        </button>
      </div>

      {/* Content */}
      <div className="p-6 h-[400px] overflow-y-auto">
        {renderTab()}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-[#414751] bg-[#101415]/80 text-[#8b919d] text-[9px] flex justify-between">
        <span className="flex items-center"><span className="w-1.5 h-1.5 bg-[#60a5fa] rounded-full mr-2 animate-pulse"></span> LIVE REDIS SYNC</span>
        <span>SYS_LATENCY: ~3.0s</span>
      </div>

    </div>
  );
}
