import redisClient from '../redisClient.js';

export const setupUserSockets = (io, socket) => {
  // We use io.use middleware for authentication, so socket.userId is already verified
  // Track connections per user
  const trackConnection = async () => {
    if (socket.userId === 'guest') {
      const onlineCount = await redisClient.keys('online:*').then(keys => keys.length);
      socket.emit('user_online', { count: onlineCount });
      return;
    }
    
    // Increment reference count for tracking multiple tabs
    const count = await redisClient.incr(`online:${socket.userId}`);
    const onlineCount = await redisClient.keys('online:*').then(keys => keys.length);

    // Always tell the newly connected user how many people are online
    socket.emit('user_online', { count: onlineCount });

    if (count === 1) {
      // Broadcast to everyone else only if it's a new unique user
      socket.broadcast.emit('user_online', { count: onlineCount });
    }
  };

  const trackDisconnection = async () => {
    if (socket.userId === 'guest') return;
    const count = await redisClient.decr(`online:${socket.userId}`);
    if (count <= 0) {
      await redisClient.del(`online:${socket.userId}`);
      const onlineCount = await redisClient.keys('online:*').then(keys => keys.length);
      io.emit('user_online', { count: onlineCount });
    }
  };

  trackConnection();

  socket.on('disconnect', () => {
    trackDisconnection();
  });
};
