import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import dotenv from 'dotenv';
import redisClient from './src/redisClient.js';
import setupSockets from './src/sockets/index.js';
import routes from './src/routes/index.js';
import { apiLimiter } from './src/middlewares/rateLimiter.js';
import prisma from './src/utils/prisma.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', apiLimiter);

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
subClient.on('error', (err) => console.error('Redis SubClient Error:', err.message));

// DO NOT call connect() explicitly, ioredis connects automatically
io.adapter(createAdapter(pubClient, subClient));

setupSockets(io);

// Mount API routes
app.use('/api', routes);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful Shutdown
const shutdown = async () => {
  console.log('Gracefully shutting down...');
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    await redisClient.quit();
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
