'use client';

import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSlideEngageSocket() {
  if (socket) return socket;

  const url = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  socket = io(url, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    autoConnect: false,
  });

  return socket;
}

export function joinRealtimeEvent(eventCode: string) {
  const client = getSlideEngageSocket();
  if (!client.connected) client.connect();
  client.emit('event:join', { eventCode });
  return client;
}

export function emitSlideChange(eventCode: string, slideIndex: number, slideTitle?: string) {
  const client = getSlideEngageSocket();
  if (!client.connected) client.connect();
  client.emit('presentation:slide-change', { eventCode, slideIndex, slideTitle });
}

export function launchInteraction(eventCode: string, interactionId: string) {
  const client = getSlideEngageSocket();
  if (!client.connected) client.connect();
  client.emit('interaction:launch', { eventCode, interactionId });
}
