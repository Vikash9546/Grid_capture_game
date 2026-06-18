import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  
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
  }))
}));
