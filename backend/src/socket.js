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

// updateLeaderboardCache removed: caching is now handled on-demand in index.js via /api/leaderboard

export default function setupSockets(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join_world', async (payload) => {
      const userId = payload?.userId;
      if (!userId) return;

      let user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return;

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

    socket.on('capture_tile', async ({ tileId }) => {
      if (!socket.userId || !tileId) return;

      let x, y;
      if (tileId.includes(',')) {
        // Unclaimed tile formatted as "x,y"
        [x, y] = tileId.split(',').map(Number);
      } else {
        // Existing tile ID lookup
        const existingTile = await prisma.tile.findUnique({ where: { id: tileId } });
        if (!existingTile) return;
        x = existingTile.x;
        y = existingTile.y;
      }

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
          let tile;
          
          if (tileId.includes(',')) {
            // Unclaimed: lock by coordinate to prevent simultaneous inserts
            await tx.$executeRaw`SELECT * FROM "tiles" WHERE "x" = ${x} AND "y" = ${y} FOR UPDATE`;
            tile = await tx.tile.findUnique({ where: { x_y: { x, y } } });
          } else {
            // Claimed: lock row specifically by ID
            // PostgreSQL requires casting the UUID string via ::uuid
            const lockedRows = await tx.$queryRaw`SELECT * FROM "tiles" WHERE "id" = ${tileId}::uuid FOR UPDATE`;
            // Map the raw SQL result back to the expected model keys
            tile = lockedRows[0] ? {
              id: lockedRows[0].id,
              x: lockedRows[0].x,
              y: lockedRows[0].y,
              ownerId: lockedRows[0].owner_id,
              capturedAt: lockedRows[0].captured_at,
              version: lockedRows[0].version
            } : null;
          }
          
          if (tile) {
            // Protected state check (5000ms)
            if (tile.capturedAt && (Date.now() - new Date(tile.capturedAt).getTime() < 5000)) {
              throw new Error('Tile is protected');
            }
          }

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

          return updated;
        }, {
          maxWait: 10000, // 10s wait for lock
          timeout: 15000  // 15s to finish transaction
        });

        // Emit INSTANTLY for true 0ms latency.
        io.emit('tile_updated', { tile: updatedTile, territorySize: null });
        io.emit('leaderboard_updated');

        // OFF-LOADED HEAVY WORK: Process territory size completely in the background without blocking the socket response
        calculateTerritorySize(prisma, socket.userId, x, y).then(size => {
          let pointsEarned = CAPTURE_POINTS;
          if (size >= 9) {
            pointsEarned += TERRITORY_BONUS;
          }
          prisma.user.update({
            where: { id: socket.userId },
            data: { score: { increment: pointsEarned } }
          }).catch(err => console.error('Score update failed:', err));
        }).catch(err => console.error('Territory calc failed:', err));

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
