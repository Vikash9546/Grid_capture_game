import jwt from 'jsonwebtoken';

export const verifyApiToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
    req.userId = payload.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const verifySocketToken = (socket, next) => {
  // Allow guest to bypass token verification for observing
  const isGuest = socket.handshake.auth.isGuest;
  if (isGuest) {
    socket.userId = 'guest';
    return next();
  }

  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
    socket.userId = payload.userId;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
};
