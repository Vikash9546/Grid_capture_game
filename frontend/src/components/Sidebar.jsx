import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Trophy, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar() {
  const { user, leaderboard } = useStore();

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-300">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-sm uppercase tracking-wider font-semibold text-slate-500 mb-4">Your Stats</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span>Score</span>
            </div>
            <span className="font-bold text-white">{user?.score || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <span>Territory</span>
            </div>
            <span className="font-bold text-white">0</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="text-sm uppercase tracking-wider font-semibold text-slate-500 mb-4">Leaderboard</h2>
        <div className="space-y-3">
          {leaderboard.map((player, index) => (
            <motion.div 
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
            >
              <div className="flex items-center space-x-3">
                <span className="text-slate-500 font-medium w-4">{index + 1}.</span>
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: player.color }}
                />
                <span className="font-medium text-slate-200">{player.username}</span>
              </div>
              <span className="font-bold text-blue-400">{player.score}</span>
            </motion.div>
          ))}
          
          {leaderboard.length === 0 && (
            <div className="text-center text-slate-500 text-sm italic">
              No players yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
