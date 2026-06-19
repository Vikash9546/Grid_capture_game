import prisma from '../utils/prisma.js';

export const getTiles = async (req, res) => {
  try {
    const { startX, endX, startY, endY } = req.query;
    
    let whereClause = {};
    if (startX !== undefined && endX !== undefined && startY !== undefined && endY !== undefined) {
      whereClause = {
        x: { gte: parseInt(startX), lte: parseInt(endX) },
        y: { gte: parseInt(startY), lte: parseInt(endY) }
      };
    }
    
    const tiles = await prisma.tile.findMany({
      where: whereClause,
      include: { owner: { select: { id: true, username: true, color: true } } }
    });
    res.json(tiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTileById = async (req, res) => {
  try {
    const tile = await prisma.tile.findUnique({
      where: { id: req.params.id },
      include: { owner: true }
    });
    if (!tile) return res.status(404).json({ error: 'Tile not found' });
    res.json(tile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
