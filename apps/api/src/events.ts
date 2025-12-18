import type { Server } from 'socket.io';

export function emitToUser(io: Server, userId: string, event: string, payload: unknown) {
  io.to(`user:${userId}`).emit(event, payload);
}

export function emitToConversation(io: Server, conversationId: string, event: string, payload: unknown) {
  io.to(`conversation:${conversationId}`).emit(event, payload);
}
