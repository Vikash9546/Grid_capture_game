import prisma from './prismaClient.js';
import redisClient from './redisClient.js';

const GRID_SIZE = 100;
const COOLDOWN_SECONDS = 3;
const CAPTURE_POINTS = 10;
const TERRITORY_BONUS = 50;

// Helper to calculate territory size using BFS
async function calculateTerritorySize(tx, ownerId, startX, startY) {
  // We need to fetch all tiles owned by the user to do BFS efficiently
  const userTiles = await tx.tile.findMany({
    where: { ownerId },
    select: { x: true, y: true }
  });

  const grid = new Set(userTiles.map(t => `${t.x},${t.y}`));
  if (!grid.has(`${startX},${startY}`)) return 0;

  const visited = new Set();
  const queue = [{ x: startX, y: startY }];
  let size = 0;

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    const key = `${x},${y}`;

    if (visited.has(key)) continue;
    visited.add(key);
    size++;

    // Add neighbors
    const neighbors = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 }
    ];

    for (const n of neighbors) {
      if (grid.has(`${n.x},${n.y}`) && !visited.has(`${n.x},${n.y}`)) {
        queue.push(n);
      }
    }
  }

  return size;
}

async function updateLeaderboardCache() {
  const users = await prisma.user.findMany({
    orderBy: { score: 'desc' },
    take: 10,
  });
  await redisClient.set('leaderboard', JSON.stringify(users), 'EX', 10);
  return users;
}

export default function setupSockets(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join_world', async ({ username, color }) => {
      let user = await prisma.user.upsert({
        where: { username },
        update: { color },
        create: {
          username,
          color: color || '#3b82f6',
        }
      });

      socket.userId = user.id;
      socket.username = user.username;

      // Track online user
      await redisClient.hset('online_users', socket.id, JSON.stringify({
        userId: user.id,
        username: user.username,
        lastSeen: Date.now(),
        socketId: socket.id
      }));

      // Broadcast online count
      const onlineCount = await redisClient.hlen('online_users');
      io.emit('user_online', { count: onlineCount });
    });

    socket.on('capture_tile', async ({ x, y }) => {
      if (!socket.userId) return;
      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

      const cooldownKey = `cooldown:${socket.userId}`;
      const onCooldown = await redisClient.get(cooldownKey);
      if (onCooldown) {
        return socket.emit('error', { message: 'Cooldown active' });
      }

      try {
        // Set cooldown immediately to prevent spam
        await redisClient.set(cooldownKey, '1', 'EX', COOLDOWN_SECONDS);

        let territorySize = 0;
        let pointsEarned = CAPTURE_POINTS;

        const updatedTile = await prisma.$transaction(async (tx) => {
          // Row-level lock equivalent or atomic update via unique constraints
          const tile = await tx.tile.findUnique({ where: { x_y: { x, y } } });
          const previousOwnerId = tile ? tile.ownerId : null;
          
          if (previousOwnerId === socket.userId) {
            throw new Error('Already owned');
          }

          let updated;
          if (tile) {
            updated = await tx.tile.update({
              where: { id: tile.id },
              data: {
                ownerId: socket.userId,
                capturedAt: new Date(),
                version: { increment: 1 }
              },
              include: { owner: true }
            });
          } else {
            updated = await tx.tile.create({
              data: {
                x,
                y,
                ownerId: socket.userId,
                capturedAt: new Date(),
                version: 1
              },
              include: { owner: true }
            });
          }

          // Add history
          await tx.captureHistory.create({
            data: {
              tileId: updated.id,
              previousOwnerId,
              newOwnerId: socket.userId
            }
          });

          // Check territory size
          territorySize = await calculateTerritorySize(tx, socket.userId, x, y);
          
          // Apply bonus if territory size > threshold (e.g. 9)
          if (territorySize >= 9) {
            pointsEarned += TERRITORY_BONUS;
          }

          // Update user score
          await tx.user.update({
            where: { id: socket.userId },
            data: { score: { increment: pointsEarned } }
          });

          return updated;
        });

        // Update leaderboard cache
        await updateLeaderboardCache();

        io.emit('tile_updated', { tile: updatedTile, territorySize });
        io.emit('leaderboard_updated');

      } catch (error) {
        console.error('Capture error:', error.message);
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);
      if (socket.userId) {
        await redisClient.hdel('online_users', socket.id);
        const onlineCount = await redisClient.hlen('online_users');
        io.emit('user_online', { count: onlineCount });
      }
    });
  });
}
