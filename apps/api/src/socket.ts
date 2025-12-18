import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from './env.js';
import { verifyToken } from './auth/jwt.js';

export type AuthedSocketData = {
  userId: string;
  email: string;
};

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.WEB_ORIGIN,
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('missing_token'));
    try {
      const claims = verifyToken(token);
      (socket.data as AuthedSocketData).userId = claims.sub;
      (socket.data as AuthedSocketData).email = claims.email;
      return next();
    } catch {
      return next(new Error('invalid_token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket.data as AuthedSocketData;
    socket.join(`user:${userId}`);

    socket.on('join:conversation', (conversationId: string) => {
      if (typeof conversationId === 'string' && conversationId.length > 0) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on('leave:conversation', (conversationId: string) => {
      if (typeof conversationId === 'string' && conversationId.length > 0) {
        socket.leave(`conversation:${conversationId}`);
      }
    });
  });

  return io;
}
