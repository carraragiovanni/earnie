import { io, type Socket } from 'socket.io-client';
import { getToken } from './api';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(API_BASE, {
    autoConnect: true,
    auth: { token: getToken() }
  });
  return socket;
}

export function resetSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
