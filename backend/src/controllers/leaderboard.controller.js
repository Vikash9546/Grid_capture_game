import redisClient from '../redisClient.js';
import prisma from '../utils/prisma.js';

export const getLeaderboard = async (req, res) => {
  try {
    // Top Scorers from Redis
    const redisScores = await redisClient.zrevrange('leaderboard:scores', 0, 9, 'WITHSCORES');
    const topScorers = [];
    for (let i = 0; i < redisScores.length; i += 2) {
      const userId = redisScores[i];
      const score = parseInt(redisScores[i + 1], 10);
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, color: true, score: true } });
      if (user) {
        user.score = score;
        topScorers.push(user);
      }
    }

    // Top Owners from Redis
    const redisOwners = await redisClient.zrevrange('leaderboard:owners', 0, 9, 'WITHSCORES');
    const topOwners = [];
    for (let i = 0; i < redisOwners.length; i += 2) {
      const userId = redisOwners[i];
      const count = parseInt(redisOwners[i + 1], 10);
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, color: true } });
      if (user) topOwners.push({ user, tilesOwned: count });
    }

    // Most Active Daily from Redis
    const dailyKey = `leaderboard:active:${new Date().toISOString().split('T')[0]}`;
    const redisActive = await redisClient.zrevrange(dailyKey, 0, 9, 'WITHSCORES');
    const mostActiveDaily = [];
    for (let i = 0; i < redisActive.length; i += 2) {
      const userId = redisActive[i];
      const count = parseInt(redisActive[i + 1], 10);
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, color: true } });
      if (user) mostActiveDaily.push({ user, dailyCaptures: count });
    }

    res.json({ topScorers, topOwners, mostActiveDaily });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
