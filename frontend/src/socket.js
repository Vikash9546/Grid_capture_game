import { io } from 'socket.io-client';
import { BACKEND_URL } from './config';
import { useStore } from './store/useStore';

export const socket = io(BACKEND_URL, {
  autoConnect: false,
});

export const connectSocket = () => {
  const token = useStore.getState().token;
  const isGuest = useStore.getState().user?.isGuest || false;
  socket.auth = { token, isGuest };
  socket.connect();
};
