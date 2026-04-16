import type { Request, Response } from "express";
import { HttpError } from "../../shared/http/error-handler.js";
import type { ApiResponse } from "../../shared/types/api-response.js";
import { getIo } from "../../shared/socket-io.js";
import {
  createRoomChatMessage,
  deleteRoomChatMessage,
  editRoomChatMessage,
  getRoomChatMessages,
  getRoomChatState,
  pinRoomSummary,
} from "./chat.service.js";
import type {
  ChatActor,
  ChatMessageView,
  ChatRoomStateView,
  ChatRole,
  ChatTriageTag,
  CreateChatMessageInput,
  PatchChatSummaryInput,
  UpdateChatMessageInput,
} from "./chat.types.js";

function requiredParam(
  value: string | string[] | undefined,
  name: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError(400, `${name} is required`);
  }
  return value;
}

function parseIsoDate(value: string, name: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, `${name} must be a valid ISO date`);
  }
  return parsed;
}

function parseActorFromRequest(req: Request): ChatActor {
  const id = req.header("x-user-id");
  const role = req.header("x-user-role") as ChatRole | undefined;

  if (!id || !role) {
    throw new HttpError(401, "Missing x-user-id or x-user-role header");
  }

  if (role !== "doctor" && role !== "patient") {
    throw new HttpError(401, "Invalid x-user-role header");
  }

  return { id, role };
}

function validateTriageTags(
  triageTags: CreateChatMessageInput["triageTags"],
): ChatTriageTag[] | undefined {
  if (!triageTags) {
    return undefined;
  }

  const allowed = new Set(["symptom", "vitals", "medication", "follow-up"]);

  for (const tag of triageTags) {
    if (!allowed.has(tag)) {
      throw new HttpError(400, `Invalid triage tag: ${tag}`);
    }
  }

  return triageTags;
}

export async function createChatMessageHandler(
  req: Request,
  res: Response<
    ApiResponse<{ message: ChatMessageView; escalationGuidance?: string }>
  >,
): Promise<void> {
  const roomId = requiredParam(req.params.roomId, "roomId");
  const actor = parseActorFromRequest(req);

  const body = req.body as Partial<CreateChatMessageInput>;
  const payload: CreateChatMessageInput = {
    content: body.content ?? "",
    triageTags: validateTriageTags(body.triageTags),
    attachments: body.attachments,
    consentMarker: body.consentMarker
      ? {
          type: body.consentMarker.type,
          acknowledgedAt: body.consentMarker.acknowledgedAt
            ? new Date(body.consentMarker.acknowledgedAt)
            : new Date(),
        }
      : undefined,
  };

  const result = await createRoomChatMessage(roomId, payload, actor);

  // Broadcast to the Socket.IO room so all connected participants see the message
  // in real time, even when the sender used the REST path (e.g. socket fallback).
  const io = getIo();
  if (io) {
    io.to(roomId).emit("chat:message.new", result);
    if (result.escalationGuidance) {
      io.to(roomId).emit("chat:safety.flagged", {
        roomId,
        messageId: result.message.id,
        escalationGuidance: result.escalationGuidance,
      });
    }
  }

  res.status(201).json({ success: true, data: result });
}

export async function listChatMessagesHandler(
  req: Request,
  res: Response<ApiResponse<ChatMessageView[]>>,
): Promise<void> {
  const roomId = requiredParam(req.params.roomId, "roomId");
  const actor = parseActorFromRequest(req);

  const rawLimit = req.query.limit;
  const rawBefore = req.query.before;

  const limit =
    typeof rawLimit === "string" && Number.isFinite(Number(rawLimit))
      ? Math.min(Math.max(Number(rawLimit), 1), 100)
      : 50;

  const before =
    typeof rawBefore === "string"
      ? parseIsoDate(rawBefore, "before")
      : undefined;

  const messages = await getRoomChatMessages(roomId, actor, limit, before);
  res.status(200).json({ success: true, data: messages });
}

export async function editChatMessageHandler(
  req: Request,
  res: Response<
    ApiResponse<{ message: ChatMessageView; escalationGuidance?: string }>
  >,
): Promise<void> {
  const roomId = requiredParam(req.params.roomId, "roomId");
  const messageId = requiredParam(req.params.messageId, "messageId");
  const actor = parseActorFromRequest(req);

  const body = req.body as Partial<UpdateChatMessageInput>;
  const payload: UpdateChatMessageInput = {
    content: body.content ?? "",
    triageTags: validateTriageTags(body.triageTags),
    attachments: body.attachments,
    consentMarker: body.consentMarker
      ? {
          type: body.consentMarker.type,
          acknowledgedAt: body.consentMarker.acknowledgedAt
            ? new Date(body.consentMarker.acknowledgedAt)
            : new Date(),
        }
      : undefined,
  };

  const result = await editRoomChatMessage(roomId, messageId, payload, actor);
  res.status(200).json({ success: true, data: result });
}

export async function deleteChatMessageHandler(
  req: Request,
  res: Response<ApiResponse<ChatMessageView>>,
): Promise<void> {
  const roomId = requiredParam(req.params.roomId, "roomId");
  const messageId = requiredParam(req.params.messageId, "messageId");
  const actor = parseActorFromRequest(req);

  const deleted = await deleteRoomChatMessage(roomId, messageId, actor);
  res.status(200).json({ success: true, data: deleted });
}

export async function getChatRoomStateHandler(
  req: Request,
  res: Response<ApiResponse<ChatRoomStateView>>,
): Promise<void> {
  const roomId = requiredParam(req.params.roomId, "roomId");
  const actor = parseActorFromRequest(req);

  const state = await getRoomChatState(roomId, actor);
  res.status(200).json({ success: true, data: state });
}

export async function patchChatRoomSummaryHandler(
  req: Request,
  res: Response<ApiResponse<ChatRoomStateView>>,
): Promise<void> {
  const roomId = requiredParam(req.params.roomId, "roomId");
  const actor = parseActorFromRequest(req);

  const body = req.body as Partial<PatchChatSummaryInput>;
  const payload: PatchChatSummaryInput = {
    pinnedSummary: body.pinnedSummary ?? "",
  };

  const state = await pinRoomSummary(roomId, payload, actor);
  res.status(200).json({ success: true, data: state });
}
