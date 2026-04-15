import { io, type Socket } from "socket.io-client";
import type { ChatMessage } from "./rest";

// ─── Socket.IO URL ────────────────────────────────────────────────────────────
// In dev: Vite proxies /socket.io → localhost:8086
// In Docker/prod: connect directly to the exposed port via env var
const WS_URL =
  (import.meta as Record<string, unknown> & { env?: Record<string, string> }).env
    ?.VITE_TELEMEDICINE_WS_URL ?? "";

// ─── Socket.IO event names ────────────────────────────────────────────────────
export const CHAT_EVENTS = {
  JOIN:           "chat:room.join",
  SEND:           "chat:message.send",
  EDIT:           "chat:message.edit",
  DELETE:         "chat:message.delete",
  NEW:            "chat:message.new",
  UPDATED:        "chat:message.updated",
  DELETED:        "chat:message.deleted",
  SAFETY_FLAGGED: "chat:safety.flagged",
  ERROR:          "chat:error",
} as const;

export type ChatSocketEventResult = {
  message: ChatMessage;
  escalationGuidance?: string;
};

export type SafetyFlagEvent = {
  roomId: string;
  messageId: string;
  escalationGuidance: string;
};

// ─── Singleton socket instance ────────────────────────────────────────────────
let _socket: Socket | null = null;

/** Create (or reuse) a Socket.IO connection authenticated with user identity. */
export function getSocket(userId: string, role: "doctor" | "patient"): Socket {
  if (_socket && _socket.connected) {
    return _socket;
  }

  _socket = io(WS_URL || window.location.origin, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    extraHeaders: {
      "x-user-id": userId,
      "x-user-role": role,
    },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1500,
  });

  return _socket;
}

/** Disconnect and clear the socket singleton (call on logout / page unmount). */
export function disconnectSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

/** Join a chat room after socket connects. */
export function joinChatRoom(socket: Socket, roomId: string): void {
  socket.emit(CHAT_EVENTS.JOIN, { roomId });
}

/** Send a message via socket. */
export function emitChatMessage(
  socket: Socket,
  roomId: string,
  content: string,
  triageTags?: string[],
): void {
  socket.emit(CHAT_EVENTS.SEND, {
    roomId,
    message: { content, triageTags },
  });
}
