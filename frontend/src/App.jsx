import React from 'react';
import { useStore } from './store/useStore';
import { socket } from './socket';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import Login from './components/Login';
import Leaderboard from './components/Leaderboard';

function App() {
  const { user, setUser, setTiles, updateTile, setLeaderboard, setOnlineUsersCount, addLog } = useStore();

  React.useEffect(() => {
    // Restore session
    const stored = localStorage.getItem('territory_user');
    if (stored && !user) {
      try {
        const sessionUser = JSON.parse(stored);
        if (!sessionUser.id) throw new Error('Legacy session without ID');
        
        socket.connect();
        socket.emit('join_world', { userId: sessionUser.id });
        setUser(sessionUser);
      } catch (e) {
        localStorage.removeItem('territory_user');
      }
    }

    if (user) {
      fetch('http://localhost:4000/api/tiles')
        .then(res => res.json())
        .then(data => setTiles(data))
        .catch(console.error);
        
      fetch('http://localhost:4000/api/leaderboard')
        .then(res => res.json())
        .then(data => setLeaderboard(data))
        .catch(console.error);

      socket.on('tile_updated', ({ tile }) => {
        updateTile(tile);
        if (tile && tile.owner) {
          addLog(`COMMANDER_${tile.owner.username.toUpperCase()} SECURED\nGRID_${tile.x}_${tile.y}`);
        }
      });

      socket.on('leaderboard_updated', () => {
        fetch('http://localhost:4000/api/leaderboard')
          .then(res => res.json())
          .then(data => setLeaderboard(data));
      });

      socket.on('user_online', (data) => {
         if (data?.count) {
           setOnlineUsersCount(data.count);
           addLog(`UPLINK SECURED:\n${data.count} OPERATORS ACTIVE`);
         }
      });

      return () => {
        socket.off('tile_updated');
        socket.off('leaderboard_updated');
        socket.off('user_online');
      };
    }
  }, [user]);

  if (!user) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <div className="h-screen w-screen bg-[#101415] text-[#e0e3e5] overflow-hidden flex flex-col font-sans selection:bg-[#60a5fa] selection:text-[#003a6b] border-[3px] border-[#60a5fa]">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 relative border-l border-[#264191]">
          <Map />
          <Leaderboard />
        </main>
      </div>
    </div>
  );
}

export default App;
