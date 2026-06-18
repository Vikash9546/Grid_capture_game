import React from 'react';
import { useStore } from '../store/useStore';
import { Users, Map as MapIcon, Bell } from 'lucide-react';

export default function Header() {
  const user = useStore((state) => state.user);
  const onlineUsersCount = useStore((state) => state.onlineUsersCount);

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shadow-sm z-10 relative">
      <div className="flex items-center space-x-3">
        <MapIcon className="w-6 h-6 text-blue-500" />
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          GridCapture
        </h1>
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center text-slate-300 space-x-2">
          <Users className="w-5 h-5 text-emerald-400" />
          <span className="font-medium">{onlineUsersCount} Online</span>
        </div>
        
        {user && (
          <div className="flex items-center space-x-3 pl-6 border-l border-slate-700">
            <div 
              className="w-8 h-8 rounded-full shadow-inner border-2 border-slate-600"
              style={{ backgroundColor: user.color }}
            />
            <span className="font-medium text-slate-200">{user.username}</span>
          </div>
        )}
      </div>
    </header>
  );
}
