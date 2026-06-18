import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import { useStore } from './store/useStore';
import { socket } from './socket';

function App() {
  const { user, setTiles, updateTile, setLeaderboard, setOnlineUsersCount } = useStore();

  useEffect(() => {
    // Initial fetch
    if (user) {
      fetch('http://localhost:4000/api/tiles')
        .then(res => res.json())
        .then(data => setTiles(data))
        .catch(console.error);
        
      fetch('http://localhost:4000/api/leaderboard')
        .then(res => res.json())
        .then(data => setLeaderboard(data))
        .catch(console.error);

      // Socket Listeners
      socket.on('tile_updated', ({ tile }) => {
        updateTile(tile);
      });

      socket.on('leaderboard_updated', () => {
        fetch('http://localhost:4000/api/leaderboard')
          .then(res => res.json())
          .then(data => setLeaderboard(data));
      });

      socket.on('user_online', () => {
         // Optionally fetch online count if we had an endpoint
      });

      socket.on('error', (err) => {
        console.error('Socket error:', err.message);
        // Could show a toast notification here
      });

      return () => {
        socket.off('tile_updated');
        socket.off('leaderboard_updated');
        socket.off('user_online');
        socket.off('error');
      };
    }
  }, [user]);

  if (!user) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 relative">
          <Map />
        </main>
      </div>
    </div>
  );
}

export default App;
