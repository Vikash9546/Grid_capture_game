import prisma from '../utils/prisma.js';
import { incrementLeaderboards } from './leaderboard.service.js';

export const CAPTURE_POINTS = 10;
export const TERRITORY_BONUS = 50;

export const processTileCapture = async (userId, x, y, previousOwnerId) => {
  try {
    // Increment basic capture scores in Redis
    await incrementLeaderboards(userId, CAPTURE_POINTS, true, previousOwnerId);
    
    // Bounded BFS: Only fetch tiles within a 10x10 radius to prevent O(N) memory explosion
    const boundingTiles = await prisma.tile.findMany({
      where: {
        ownerId: userId,
        x: { gte: Math.max(0, x - 10), lte: x + 10 },
        y: { gte: Math.max(0, y - 10), lte: y + 10 }
      }
    });

    const grid = {};
    boundingTiles.forEach(t => grid[`${t.x},${t.y}`] = true);

    let territorySize = 0;
    const queue = [[x, y]];
    const visited = new Set([`${x},${y}`]);

    while (queue.length > 0) {
      const [cx, cy] = queue.shift();
      territorySize++;

      const neighbors = [
        [cx + 1, cy], [cx - 1, cy],
        [cx, cy + 1], [cx, cy - 1]
      ];

      for (const [nx, ny] of neighbors) {
        const key = `${nx},${ny}`;
        if (grid[key] && !visited.has(key)) {
          visited.add(key);
          queue.push([nx, ny]);
        }
      }
    }

    if (territorySize >= 9) {
      await incrementLeaderboards(userId, TERRITORY_BONUS, false, null);
      await prisma.user.update({
        where: { id: userId },
        data: { score: { increment: CAPTURE_POINTS + TERRITORY_BONUS }, territoryCount: { increment: 1 } }
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { score: { increment: CAPTURE_POINTS } }
      });
    }
  } catch (error) {
    console.error('Error in processTileCapture:', error);
  }
};
