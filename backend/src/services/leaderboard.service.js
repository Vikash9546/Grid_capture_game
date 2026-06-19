import redisClient from '../redisClient.js';

export const incrementLeaderboards = async (userId, points, isCapture = false, previousOwnerId = null) => {
  try {
    await redisClient.zincrby('leaderboard:scores', points, userId);
    
    if (isCapture) {
      await redisClient.zincrby('leaderboard:owners', 1, userId);
      const dailyKey = `leaderboard:active:${new Date().toISOString().split('T')[0]}`;
      await redisClient.zincrby(dailyKey, 1, userId);
      
      if (previousOwnerId) {
        await redisClient.zincrby('leaderboard:owners', -1, previousOwnerId);
      }
    }
  } catch (error) {
    console.error('Failed to update leaderboards:', error);
  }
};
