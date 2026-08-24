import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../../config/env';
import { tokenStorage } from '../api/tokenStorage';

const SOCKET_URL = API_BASE_URL.replace('/api/v1', '');

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  // Always start fresh — don't risk reusing a connection authenticated as a different user
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const token = await tokenStorage.getAccessToken();

  socket = io(`${SOCKET_URL}/chat`, {
    auth: { token },
    transports: ['websocket'],
  });

  return new Promise((resolve, reject) => {
    socket!.on('connect', () => resolve(socket!));
    socket!.on('connect_error', (err) => reject(err));
  });
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}