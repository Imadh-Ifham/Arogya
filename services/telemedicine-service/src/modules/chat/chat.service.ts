import { HttpError } from "../../shared/http/error-handler.js";
import { logger } from "../../shared/logger.js";
import {
  createChatMessage,
  findChatMessageById,
  getChatRoomStateByRoomId,
  listChatMessagesByRoom,
  softDeleteChatMessageById,
  updateChatMessageById,
  upsertChatRoomSummary,
} from "./chat.repository.js";
import type {
  ChatActor,
  ChatCreateMessageResult,
  ChatMessageView,
  ChatRoomStateView,
  CreateChatMessageInput,
  PatchChatSummaryInput,
  UpdateChatMessageInput,
} from "./chat.types.js";
import {
  findConsultationRoomById,
  markRoomAsExpiredIfNeeded,
} from "../rooms/room.repository.js";

const EDIT_WINDOW_MS = 5 * 60 * 1000;
const CHAT_POST_CLOSE_GRACE_HOURS = 24;

const SAFETY_KEYWORDS: Array<{
  keyword: string;
  severity: "medium" | "high";
  guidance: string;
}> = [
  {
    keyword: "chest pain",
    severity: "high",
    guidance:
      "Severe chest pain may require emergency care. Please call emergency services immediately.",
  },
  {
    keyword: "shortness of breath",
    severity: "high",
    guidance:
      "Breathing difficulty can be urgent. Seek immediate emergency assistance.",
  },
  {
    keyword: "suicidal",
    severity: "high",
    guidance:
      "If you are in immediate danger, contact your local emergency helpline now.",
  },
  {
    keyword: "fainted",
    severity: "medium",
    guidance:
      "Recent fainting should be clinically reviewed quickly. Contact your doctor now.",
  },
];

function validateActor(actor: ChatActor): void {
  if (!actor.id || actor.id.trim().length === 0) {
    throw new HttpError(401, "Missing actor id");
  }

  if (actor.role !== "doctor" && actor.role !== "patient") {
    throw new HttpError(401, "Invalid actor role");
  }
}

async function getValidatedRoomForActor(roomId: string, actor: ChatActor) {
  validateActor(actor);

  const room = await findConsultationRoomById(roomId);
  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  const normalizedRoom = await markRoomAsExpiredIfNeeded(room);

  if (actor.role === "doctor" && actor.id !== normalizedRoom.doctorId) {
    throw new HttpError(403, "Doctor is not a participant of this room");
  }

  if (actor.role === "patient" && actor.id !== normalizedRoom.patientId) {
    throw new HttpError(403, "Patient is not a participant of this room");
  }

  return normalizedRoom;
}

function canWriteToRoom(
  room: {
    status: "open" | "expired" | "closed";
    expiresAt: Date;
    updatedAt: Date;
  },
  now: Date,
): boolean {
  if (room.status === "open") {
    return true;
  }

  const graceMs = CHAT_POST_CLOSE_GRACE_HOURS * 60 * 60 * 1000;
  const referenceTime =
    room.status === "expired"
      ? room.expiresAt.getTime()
      : room.updatedAt.getTime();

  return now.getTime() <= referenceTime + graceMs;
}

function detectSafetyFlags(content: string): ChatMessageView["safetyFlags"] {
  const normalized = content.toLowerCase();

  return SAFETY_KEYWORDS.filter((entry) =>
    normalized.includes(entry.keyword),
  ).map((entry) => ({
    keyword: entry.keyword,
    severity: entry.severity,
    guidance: entry.guidance,
  }));
}

function buildEscalationGuidance(
  safetyFlags: ChatMessageView["safetyFlags"],
): string | undefined {
  if (safetyFlags.length === 0) {
    return undefined;
  }

  return [
    "Potentially urgent symptoms detected.",
    ...safetyFlags.map((flag) => `- ${flag.guidance}`),
  ].join(" ");
}

function validateMessageContent(content: string): void {
  if (!content || content.trim().length === 0) {
    throw new HttpError(400, "Message content is required");
  }

  if (content.length > 2000) {
    throw new HttpError(400, "Message content exceeds 2000 characters");
  }
}

export async function ensureChatRoomAccess(
  roomId: string,
  actor: ChatActor,
): Promise<void> {
  await getValidatedRoomForActor(roomId, actor);
}

export async function createRoomChatMessage(
  roomId: string,
  input: CreateChatMessageInput,
  actor: ChatActor,
): Promise<ChatCreateMessageResult> {
  const room = await getValidatedRoomForActor(roomId, actor);
  const now = new Date();

  if (!canWriteToRoom(room, now)) {
    throw new HttpError(
      409,
      "Chat is read-only for this room. Write window has expired.",
    );
  }

  validateMessageContent(input.content);
  const safetyFlags = detectSafetyFlags(input.content);
  const message = await createChatMessage(
    roomId,
    actor.id,
    actor.role,
    input,
    safetyFlags,
  );

  if (safetyFlags.length > 0) {
    logger.warn(
      {
        roomId,
        messageId: message.id,
        actorId: actor.id,
        safetyFlags,
      },
      "Chat safety triggers detected",
    );
  }

  return {
    message,
    escalationGuidance: buildEscalationGuidance(safetyFlags),
  };
}

export async function getRoomChatMessages(
  roomId: string,
  actor: ChatActor,
  limit: number,
  before?: Date,
): Promise<ChatMessageView[]> {
  await getValidatedRoomForActor(roomId, actor);

  return listChatMessagesByRoom(roomId, limit, before);
}

export async function editRoomChatMessage(
  roomId: string,
  messageId: string,
  input: UpdateChatMessageInput,
  actor: ChatActor,
): Promise<ChatCreateMessageResult> {
  const room = await getValidatedRoomForActor(roomId, actor);
  const now = new Date();

  if (!canWriteToRoom(room, now)) {
    throw new HttpError(
      409,
      "Chat is read-only for this room. Write window has expired.",
    );
  }

  validateMessageContent(input.content);

  const existing = await findChatMessageById(roomId, messageId);
  if (!existing) {
    throw new HttpError(404, "Message not found");
  }

  if (existing.senderId !== actor.id) {
    throw new HttpError(403, "You can only edit your own messages");
  }

  if (existing.deletedAt) {
    throw new HttpError(409, "Deleted messages cannot be edited");
  }

  const editDeadline = existing.createdAt.getTime() + EDIT_WINDOW_MS;
  if (now.getTime() > editDeadline) {
    throw new HttpError(409, "Message edit window has expired");
  }

  const safetyFlags = detectSafetyFlags(input.content);
  const updated = await updateChatMessageById(
    roomId,
    messageId,
    input,
    safetyFlags,
  );
  if (!updated) {
    throw new HttpError(500, "Failed to update chat message");
  }

  if (safetyFlags.length > 0) {
    logger.warn(
      {
        roomId,
        messageId: updated.id,
        actorId: actor.id,
        safetyFlags,
      },
      "Chat safety triggers detected on message edit",
    );
  }

  return {
    message: updated,
    escalationGuidance: buildEscalationGuidance(safetyFlags),
  };
}

export async function deleteRoomChatMessage(
  roomId: string,
  messageId: string,
  actor: ChatActor,
): Promise<ChatMessageView> {
  const room = await getValidatedRoomForActor(roomId, actor);
  const now = new Date();

  if (!canWriteToRoom(room, now)) {
    throw new HttpError(
      409,
      "Chat is read-only for this room. Write window has expired.",
    );
  }

  const existing = await findChatMessageById(roomId, messageId);
  if (!existing) {
    throw new HttpError(404, "Message not found");
  }

  if (existing.senderId !== actor.id) {
    throw new HttpError(403, "You can only delete your own messages");
  }

  if (existing.deletedAt) {
    return existing;
  }

  const deleted = await softDeleteChatMessageById(roomId, messageId);
  if (!deleted) {
    throw new HttpError(500, "Failed to delete chat message");
  }

  return deleted;
}

export async function getRoomChatState(
  roomId: string,
  actor: ChatActor,
): Promise<ChatRoomStateView> {
  await getValidatedRoomForActor(roomId, actor);
  return getChatRoomStateByRoomId(roomId);
}

export async function pinRoomSummary(
  roomId: string,
  input: PatchChatSummaryInput,
  actor: ChatActor,
): Promise<ChatRoomStateView> {
  const room = await getValidatedRoomForActor(roomId, actor);
  const now = new Date();

  if (actor.role !== "doctor") {
    throw new HttpError(403, "Only doctor can update pinned summary");
  }

  if (!canWriteToRoom(room, now)) {
    throw new HttpError(
      409,
      "Summary is read-only for this room. Write window has expired.",
    );
  }

  const summaryText = input.pinnedSummary.trim();
  if (summaryText.length === 0) {
    throw new HttpError(400, "Pinned summary is required");
  }

  if (summaryText.length > 3000) {
    throw new HttpError(400, "Pinned summary exceeds 3000 characters");
  }

  return upsertChatRoomSummary(roomId, { pinnedSummary: summaryText }, actor);
}
