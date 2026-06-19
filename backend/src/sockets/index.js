import { setupUserSockets } from './user.socket.js';
import { setupCaptureSockets } from './capture.socket.js';
import { verifySocketToken } from '../middlewares/auth.middleware.js';

export default function setupSockets(io) {
  io.use(verifySocketToken);
  
  io.on('connection', (socket) => {
    setupUserSockets(io, socket);
    setupCaptureSockets(io, socket);
  });
}
