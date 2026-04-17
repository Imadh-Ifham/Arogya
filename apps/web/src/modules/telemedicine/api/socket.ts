import { io, type Socket } from "socket.io-client";
import type { ChatMessage } from "./rest";

// ─── Socket.IO URL ────────────────────────────────────────────────────────────
// In dev: Vite proxies /socket.io → localhost:8086
// In Docker/prod: connect directly to the exposed port via env var
const WS_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_TELEMEDICINE_WS_URL ?? "";

// ─── Socket.IO event names ────────────────────────────────────────────────────
export const CHAT_EVENTS = {
  JOIN: "chat:room.join",
  SEND: "chat:message.send",
  EDIT: "chat:message.edit",
  DELETE: "chat:message.delete",
  NEW: "chat:message.new",
  UPDATED: "chat:message.updated",
  DELETED: "chat:message.deleted",
  SAFETY_FLAGGED: "chat:safety.flagged",
  ERROR: "chat:error",
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

/**
 * Create (or reuse) a Socket.IO connection authenticated with user identity.
 * Reuses the existing socket even while it is still connecting — only creates
 * a new one if no socket exists at all or if it was explicitly disconnected.
 */
export function getSocket(userId: string, role: "doctor" | "patient"): Socket {
  // Reuse any live socket (connected or still connecting) for the same identity.
  if (_socket && !_socket.disconnected) {
    return _socket;
  }

  // Clean up a dead socket before creating a fresh one.
  if (_socket) {
    _socket.removeAllListeners();
    _socket = null;
  }

  _socket = io(WS_URL || window.location.origin, {
    path: "/socket.io",
    // Polling first: HTTP handshake carries custom headers through the Vite proxy.
    // After the session is established it upgrades to WebSocket automatically.
    transports: ["polling", "websocket"],
    auth: {
      "x-user-id": userId,
      "x-user-role": role,
    },
    extraHeaders: {
      "x-user-id": userId,
      "x-user-role": role,
    },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return _socket;
}

/** Disconnect and clear the socket singleton. Only call on full page teardown. */
export function disconnectSocket(): void {
  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket = null;
  }
}

/** Join a chat room after socket connects. Retries up to 3 times on failure. */
export function joinChatRoom(
  socket: Socket,
  roomId: string,
  onJoined?: () => void,
  onError?: (msg: string) => void,
  attempt = 0,
): void {
  socket.emit(
    CHAT_EVENTS.JOIN,
    { roomId },
    (ack: { success: boolean; message?: string }) => {
      if (ack?.success) {
        onJoined?.();
      } else if (attempt < 3) {
        // Retry after a short back-off
        setTimeout(
          () => joinChatRoom(socket, roomId, onJoined, onError, attempt + 1),
          500 * (attempt + 1),
        );
      } else {
        onError?.(ack?.message ?? "Failed to join chat room");
      }
    },
  );
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
