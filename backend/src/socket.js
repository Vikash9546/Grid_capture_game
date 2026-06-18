import prisma from './prismaClient.js';
import redisClient from './redisClient.js';
import { v4 as uuidv4 } from 'uuid';

const GRID_SIZE = 100;
const COOLDOWN_SECONDS = 3;

export default function setupSockets(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join_world', async ({ userId, username, color }) => {
      // Create or get user
      let user = null;
      if (userId) {
        user = await prisma.user.findUnique({ where: { id: userId } });
      }
      
      if (!user && username) {
        user = await prisma.user.upsert({
          where: { username },
          update: {},
          create: {
            username,
            color: color || '#ff0000',
          }
        });
      }

      if (user) {
        // Track online user
        socket.userId = user.id;
        await redisClient.hset('online_users', socket.id, JSON.stringify({
          userId: user.id,
          username: user.username,
          lastSeen: Date.now(),
          socketId: socket.id
        }));

        io.emit('user_online');
      }

      // Send initial data (could be optimized)
      // socket.emit('initial_state', await prisma.tile.findMany());
    });

    socket.on('capture_tile', async ({ tileId, x, y }) => {
      if (!socket.userId) return;

      const cooldownKey = `cooldown:${socket.userId}`;
      const onCooldown = await redisClient.get(cooldownKey);
      if (onCooldown) {
        return socket.emit('error', { message: 'Cooldown active' });
      }

      try {
        // Find tile or create
        let tile = null;
        if (tileId) {
           tile = await prisma.tile.findUnique({ where: { id: tileId } });
        } else if (x !== undefined && y !== undefined) {
           tile = await prisma.tile.findUnique({ where: { x_y: { x, y } } });
        }

        const newOwnerId = socket.userId;
        const previousOwnerId = tile ? tile.ownerId : null;

        // Set cooldown
        await redisClient.set(cooldownKey, '1', 'EX', COOLDOWN_SECONDS);

        // Transaction for update
        const updatedTile = await prisma.$transaction(async (tx) => {
          let updated;
          if (tile) {
            updated = await tx.tile.update({
              where: { id: tile.id },
              data: {
                ownerId: newOwnerId,
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
                ownerId: newOwnerId,
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
              newOwnerId
            }
          });

          // Update scores (simple +10 for now)
          await tx.user.update({
            where: { id: newOwnerId },
            data: { score: { increment: 10 } }
          });

          if (previousOwnerId && previousOwnerId !== newOwnerId) {
             // Could deduct points from previous owner
          }

          return updated;
        });

        io.emit('tile_updated', { tile: updatedTile });
        io.emit('leaderboard_updated');

      } catch (error) {
        console.error('Capture error:', error);
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);
      if (socket.userId) {
        await redisClient.hdel('online_users', socket.id);
        io.emit('user_online');
      }
    });
  });
}
