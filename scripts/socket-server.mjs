import { createServer } from 'node:http';
import { Server } from 'socket.io';

const port = Number(process.env.SOCKET_PORT || 4001);
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || '*',
    methods: ['GET', 'POST'],
  },
});

const eventParticipants = new Map();

io.on('connection', socket => {
  socket.on('event:join', ({ eventCode }) => {
    if (!eventCode) return;
    socket.join(`event:${eventCode}`);
    const participants = eventParticipants.get(eventCode) || new Set();
    participants.add(socket.id);
    eventParticipants.set(eventCode, participants);
    io.to(`event:${eventCode}`).emit('participants:update', { eventCode, count: participants.size });
  });

  socket.on('presentation:slide-change', payload => {
    if (!payload?.eventCode) return;
    io.to(`event:${payload.eventCode}`).emit('presentation:slide-change', payload);
  });

  socket.on('interaction:launch', payload => {
    if (!payload?.eventCode) return;
    io.to(`event:${payload.eventCode}`).emit('interaction:launch', payload);
  });

  socket.on('reaction:send', payload => {
    if (!payload?.eventCode) return;
    io.to(`event:${payload.eventCode}`).emit('reaction:new', payload);
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (!room.startsWith('event:')) continue;
      const eventCode = room.replace('event:', '');
      const participants = eventParticipants.get(eventCode);
      if (!participants) continue;
      participants.delete(socket.id);
      io.to(room).emit('participants:update', { eventCode, count: participants.size });
    }
  });
});

httpServer.listen(port, () => {
  console.log(`SlideEngage Socket.io server listening on http://localhost:${port}`);
});
