import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
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

setupSockets(io);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// REST Endpoints
app.get('/api/tiles', async (req, res) => {
  try {
    const tiles = await prisma.tile.findMany();
    res.json(tiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { score: 'desc' },
      take: 10,
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/check-username', async (req, res) => {
  const { username } = req.body;
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

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
