import prisma from '../utils/prisma.js';
import { captureTileSchema } from '../validators/socket.validator.js';
import { processTileCapture } from '../services/tile.service.js';

export const setupCaptureSockets = (io, socket) => {
  socket.on('capture_tile', async (payload) => {
    try {
      if (socket.userId === 'guest') return;

      const { tileId } = captureTileSchema.parse(payload);
      
      let x, y;
      if (tileId.includes(',')) {
        [x, y] = tileId.split(',').map(Number);
      } else {
        const existing = await prisma.tile.findUnique({ where: { id: tileId } });
        if (existing) {
          x = existing.x;
          y = existing.y;
        } else {
          return;
        }
      }

      // Upsert tile within a transaction to avoid race conditions
      const result = await prisma.$transaction(async (tx) => {
        let currentTile = await tx.tile.findUnique({ where: { x_y: { x, y } } });
        
        if (currentTile) {
          // If trying to capture own tile or locked tile
          if (currentTile.ownerId === socket.userId) return null;
          
          if (currentTile.capturedAt) {
            const timeSinceCapture = Date.now() - new Date(currentTile.capturedAt).getTime();
            if (timeSinceCapture < 5000) return null; // 5s lock
          }

          const updatedTile = await tx.tile.update({
            where: { id: currentTile.id },
            data: { 
              ownerId: socket.userId, 
              capturedAt: new Date(), 
              version: { increment: 1 }
            },
            include: { owner: true }
          });

          await tx.captureHistory.create({
            data: {
              tileId: updatedTile.id,
              previousOwnerId: currentTile.ownerId,
              newOwnerId: socket.userId,
            }
          });

          return { updatedTile, previousOwnerId: currentTile.ownerId };
        } else {
          // Unclaimed tile
          const newTile = await tx.tile.create({
            data: { x, y, ownerId: socket.userId, capturedAt: new Date() },
            include: { owner: true }
          });

          await tx.captureHistory.create({
            data: {
              tileId: newTile.id,
              newOwnerId: socket.userId,
            }
          });

          return { updatedTile: newTile, previousOwnerId: null };
        }
      });

      if (result) {
        // Emit INSTANTLY for true 0ms latency.
        io.emit('tile_updated', { tile: result.updatedTile });
        
        // OFF-LOADED HEAVY CALCULATION (Redis Leaderboard and Bounded BFS Territory check)
        processTileCapture(socket.userId, x, y, result.previousOwnerId);
      }
    } catch (error) {
      console.error('Socket capture error:', error.message);
    }
  });
};
