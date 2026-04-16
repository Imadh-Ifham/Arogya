import type { Server as SocketServer } from "socket.io";

/**
 * Module-level Socket.IO server singleton.
 * Set once in server.ts before any request handling begins.
 * Imported by REST controllers that need to emit events (e.g. chat REST fallback).
 */
let _io: SocketServer | null = null;

export function setIo(io: SocketServer): void {
  _io = io;
}

export function getIo(): SocketServer | null {
  return _io;
}
