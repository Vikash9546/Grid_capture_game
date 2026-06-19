import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
  
  onlineUsersCount: 0,
  setOnlineUsersCount: (count) => set({ onlineUsersCount: count }),

  leaderboard: [],
  setLeaderboard: (leaderboard) => set({ leaderboard }),

  tiles: {}, // Map of 'x,y' -> tile object
  setTiles: (tilesArray) => {
    const tilesMap = {};
    tilesArray.forEach(t => {
      tilesMap[`${t.x},${t.y}`] = t;
    });
    set({ tiles: tilesMap });
  },
  
  updateTile: (tile) => set((state) => ({
    tiles: {
      ...state.tiles,
      [`${tile.x},${tile.y}`]: tile
    }
  })),

  isLeaderboardOpen: false,
  toggleLeaderboard: () => set((state) => ({ isLeaderboardOpen: !state.isLeaderboardOpen })),

  logs: JSON.parse(localStorage.getItem('territory_logs')) || [],
  addLog: (text) => set((state) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newLog = { time, text };
    // Keep only the last 6 logs to match the UI aesthetic
    const updatedLogs = [newLog, ...state.logs].slice(0, 6);
    localStorage.setItem('territory_logs', JSON.stringify(updatedLogs));
    return { logs: updatedLogs };
  })
}));
