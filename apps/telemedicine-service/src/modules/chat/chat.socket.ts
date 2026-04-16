import type { Server as SocketServer, Socket } from "socket.io";
import { logger } from "../../shared/logger.js";
import {
  createRoomChatMessage,
  deleteRoomChatMessage,
  editRoomChatMessage,
  ensureChatRoomAccess,
  getRoomChatState,
  pinRoomSummary,
} from "./chat.service.js";
import type {
  ChatActor,
  CreateChatMessageInput,
  PatchChatSummaryInput,
  UpdateChatMessageInput,
} from "./chat.types.js";
import { HttpError } from "../../shared/http/error-handler.js";

interface AckResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

function getActorFromSocket(socket: Socket): ChatActor {
  // Prefer headers (server-to-server / polling), fall back to auth object
  // (browser WebSocket upgrades block custom headers, so the client sends
  // credentials via socket.io's auth option instead).
  const headers = socket.handshake.headers;
  const auth = socket.handshake.auth as Record<string, unknown>;

  const userId = headers["x-user-id"] ?? auth["x-user-id"];
  const userRole = headers["x-user-role"] ?? auth["x-user-role"];

  const id = typeof userId === "string" ? userId : "";
  const role = typeof userRole === "string" ? userRole : "";

  if (!id || (role !== "doctor" && role !== "patient")) {
    throw new HttpError(401, "Socket auth requires x-user-id and x-user-role");
  }

  return { id, role };
}

function ackSuccess<T>(
  ack: ((value: AckResponse<T>) => void) | undefined,
  data: T,
): void {
  ack?.({ success: true, data });
}

function ackError<T>(
  ack: ((value: AckResponse<T>) => void) | undefined,
  err: unknown,
): void {
  if (err instanceof HttpError) {
    ack?.({ success: false, message: err.message });
    return;
  }

  ack?.({ success: false, message: "Internal server error" });
}

export function setupChatSocket(io: SocketServer): void {
  io.on("connection", (socket) => {
    let actor: ChatActor;

    try {
      actor = getActorFromSocket(socket);
    } catch (error) {
      socket.emit("chat:error", { success: false, message: "Unauthorized" });
      socket.disconnect(true);
      return;
    }

    socket.on(
      "chat:room.join",
      async (
        payload: { roomId: string },
        ack?: (value: AckResponse<{ roomId: string }>) => void,
      ) => {
        try {
          await ensureChatRoomAccess(payload.roomId, actor);
          await socket.join(payload.roomId);
          ackSuccess(ack, { roomId: payload.roomId });
        } catch (error) {
          ackError(ack, error);
        }
      },
    );

    socket.on(
      "chat:message.send",
      async (
        payload: { roomId: string; message: CreateChatMessageInput },
        ack?: (value: AckResponse) => void,
      ) => {
        try {
          const result = await createRoomChatMessage(
            payload.roomId,
            payload.message,
            actor,
          );
          io.to(payload.roomId).emit("chat:message.new", result);
          if (result.escalationGuidance) {
            io.to(payload.roomId).emit("chat:safety.flagged", {
              roomId: payload.roomId,
              messageId: result.message.id,
              escalationGuidance: result.escalationGuidance,
            });
          }
          ackSuccess(ack, result);
        } catch (error) {
          ackError(ack, error);
        }
      },
    );

    socket.on(
      "chat:message.edit",
      async (
        payload: {
          roomId: string;
          messageId: string;
          message: UpdateChatMessageInput;
        },
        ack?: (value: AckResponse) => void,
      ) => {
        try {
          const result = await editRoomChatMessage(
            payload.roomId,
            payload.messageId,
            payload.message,
            actor,
          );
          io.to(payload.roomId).emit("chat:message.updated", result);
          if (result.escalationGuidance) {
            io.to(payload.roomId).emit("chat:safety.flagged", {
              roomId: payload.roomId,
              messageId: result.message.id,
              escalationGuidance: result.escalationGuidance,
            });
          }
          ackSuccess(ack, result);
        } catch (error) {
          ackError(ack, error);
        }
      },
    );

    socket.on(
      "chat:message.delete",
      async (
        payload: { roomId: string; messageId: string },
        ack?: (value: AckResponse) => void,
      ) => {
        try {
          const result = await deleteRoomChatMessage(
            payload.roomId,
            payload.messageId,
            actor,
          );
          io.to(payload.roomId).emit("chat:message.deleted", result);
          ackSuccess(ack, result);
        } catch (error) {
          ackError(ack, error);
        }
      },
    );

    socket.on(
      "chat:summary.pin",
      async (
        payload: { roomId: string; summary: PatchChatSummaryInput },
        ack?: (value: AckResponse) => void,
      ) => {
        try {
          const result = await pinRoomSummary(
            payload.roomId,
            payload.summary,
            actor,
          );
          io.to(payload.roomId).emit("chat:summary.updated", result);
          ackSuccess(ack, result);
        } catch (error) {
          ackError(ack, error);
        }
      },
    );

    socket.on(
      "chat:room.state",
      async (
        payload: { roomId: string },
        ack?: (value: AckResponse) => void,
      ) => {
        try {
          const state = await getRoomChatState(payload.roomId, actor);
          ackSuccess(ack, state);
        } catch (error) {
          ackError(ack, error);
        }
      },
    );

    logger.info(
      { socketId: socket.id, actorId: actor.id, role: actor.role },
      "Chat socket connected",
    );
  });
}
