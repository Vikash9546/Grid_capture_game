import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import dotenv from 'dotenv';
import prisma from './src/prismaClient.js';
import redisClient from './src/redisClient.js';
import setupSockets from './src/socket.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // Adjust for production
    methods: ['GET', 'POST']
  }
});

// Configure Socket.io Redis Adapter for Event Coordination
const pubClient = redisClient;
const subClient = pubClient.duplicate();

subClient.connect().then(() => {
  io.adapter(createAdapter(pubClient, subClient));
}).catch(err => console.error('Redis Adapter connection failed:', err));

setupSockets(io);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// REST Endpoints
app.get('/api/tiles', async (req, res) => {
  try {
    const tiles = await prisma.tile.findMany({
      include: { owner: true }
    });
    res.json(tiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    // 1. Check Redis Cache
    const cachedLeaderboard = await redisClient.get('leaderboard:snapshot');
    if (cachedLeaderboard) {
      return res.json(JSON.parse(cachedLeaderboard));
    }
    // Top Scorers
    const topScorers = await prisma.user.findMany({
      orderBy: { score: 'desc' },
      take: 10,
    });

    // Top Owners (Most Tiles Owned)
    const ownersAgg = await prisma.tile.groupBy({
      by: ['ownerId'],
      _count: { id: true },
      where: { ownerId: { not: null } },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });
    
    // Most Active Daily (Most Captures today)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const activeAgg = await prisma.captureHistory.groupBy({
      by: ['newOwnerId'],
      _count: { id: true },
      where: { capturedAt: { gte: yesterday } },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

    // Fetch user details for the aggregations
    const allUserIds = [...new Set([
      ...ownersAgg.map(o => o.ownerId),
      ...activeAgg.map(a => a.newOwnerId)
    ])];
    
    const usersData = await prisma.user.findMany({
      where: { id: { in: allUserIds } }
    });
    const userMap = usersData.reduce((acc, user) => ({ ...acc, [user.id]: user }), {});

    const topOwners = ownersAgg.map(agg => ({
      user: userMap[agg.ownerId],
      tilesOwned: agg._count.id
    }));

    const mostActiveDaily = activeAgg.map(agg => ({
      user: userMap[agg.newOwnerId],
      dailyCaptures: agg._count.id
    }));

    const payload = { topScorers, topOwners, mostActiveDaily };
    
    // 3. Cache the result in Redis for 3 seconds to allow near real-time updates without DB hammering
    await redisClient.set('leaderboard:snapshot', JSON.stringify(payload), 'EX', 3);

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tiles/:id', async (req, res) => {
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
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { tiles: true, capturedTiles: true }
        }
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/check-username', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });
  
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (user) {
      return res.json({ available: false });
    }
    return res.json({ available: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, color } = req.body;
  try {
    const user = await prisma.user.upsert({
      where: { username },
      update: { color },
      create: {
        username,
        color: color || '#3b82f6',
      }
    });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
