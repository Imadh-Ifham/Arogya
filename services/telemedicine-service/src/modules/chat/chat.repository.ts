import { Types } from "mongoose";
import { ChatMessageModel, ChatRoomStateModel } from "./chat.model.js";
import type {
  ChatMessageView,
  ChatRoomStateView,
  CreateChatMessageInput,
  PatchChatSummaryInput,
  UpdateChatMessageInput,
} from "./chat.types.js";

interface ChatMessageDocumentView {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  senderId: string;
  senderRole: "doctor" | "patient";
  content: string;
  triageTags: Array<"symptom" | "vitals" | "medication" | "follow-up">;
  attachments: Array<{
    type: "image" | "report" | "file";
    url: string;
    name?: string;
  }>;
  consentMarker?: {
    type: "data-sharing" | "treatment-consent" | "privacy-ack";
    acknowledgedAt: Date;
  };
  safetyFlags: Array<{
    keyword: string;
    severity: "medium" | "high";
    guidance: string;
  }>;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatRoomStateDocumentView {
  roomId: Types.ObjectId;
  pinnedSummary?: string;
  summaryUpdatedById?: string;
  summaryUpdatedByRole?: "doctor" | "patient";
  summaryUpdatedAt?: Date;
}

function mapMessageToView(model: ChatMessageDocumentView): ChatMessageView {
  return {
    id: model._id.toString(),
    roomId: model.roomId.toString(),
    senderId: model.senderId,
    senderRole: model.senderRole,
    content: model.content,
    triageTags: model.triageTags,
    attachments: model.attachments,
    consentMarker: model.consentMarker,
    safetyFlags: model.safetyFlags,
    editedAt: model.editedAt,
    deletedAt: model.deletedAt,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

function mapStateToView(
  roomId: string,
  model: ChatRoomStateDocumentView | null,
): ChatRoomStateView {
  if (!model) {
    return { roomId };
  }

  return {
    roomId,
    pinnedSummary: model.pinnedSummary,
    summaryUpdatedById: model.summaryUpdatedById,
    summaryUpdatedByRole: model.summaryUpdatedByRole,
    summaryUpdatedAt: model.summaryUpdatedAt,
  };
}

export async function createChatMessage(
  roomId: string,
  senderId: string,
  senderRole: "doctor" | "patient",
  input: CreateChatMessageInput,
  safetyFlags: ChatMessageView["safetyFlags"],
): Promise<ChatMessageView> {
  const created = (await ChatMessageModel.create({
    roomId,
    senderId,
    senderRole,
    content: input.content,
    triageTags: input.triageTags ?? [],
    attachments: input.attachments ?? [],
    consentMarker: input.consentMarker,
    safetyFlags,
  })) as unknown as ChatMessageDocumentView;

  return mapMessageToView(created);
}

export async function listChatMessagesByRoom(
  roomId: string,
  limit: number,
  before?: Date,
): Promise<ChatMessageView[]> {
  const query: {
    roomId: string;
    createdAt?: { $lt: Date };
  } = { roomId };

  if (before) {
    query.createdAt = { $lt: before };
  }

  const messages = (await ChatMessageModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()) as ChatMessageDocumentView[];

  return messages.map(mapMessageToView);
}

export async function findChatMessageById(
  roomId: string,
  messageId: string,
): Promise<ChatMessageView | null> {
  const message = (await ChatMessageModel.findOne({
    _id: messageId,
    roomId,
  }).lean()) as ChatMessageDocumentView | null;

  return message ? mapMessageToView(message) : null;
}

export async function updateChatMessageById(
  roomId: string,
  messageId: string,
  input: UpdateChatMessageInput,
  safetyFlags: ChatMessageView["safetyFlags"],
): Promise<ChatMessageView | null> {
  const updated = (await ChatMessageModel.findOneAndUpdate(
    { _id: messageId, roomId },
    {
      content: input.content,
      triageTags: input.triageTags ?? [],
      attachments: input.attachments ?? [],
      consentMarker: input.consentMarker,
      safetyFlags,
      editedAt: new Date(),
    },
    { returnDocument: "after" },
  ).lean()) as ChatMessageDocumentView | null;

  return updated ? mapMessageToView(updated) : null;
}

export async function softDeleteChatMessageById(
  roomId: string,
  messageId: string,
): Promise<ChatMessageView | null> {
  const updated = (await ChatMessageModel.findOneAndUpdate(
    { _id: messageId, roomId },
    { deletedAt: new Date() },
    { returnDocument: "after" },
  ).lean()) as ChatMessageDocumentView | null;

  return updated ? mapMessageToView(updated) : null;
}

export async function getChatRoomStateByRoomId(
  roomId: string,
): Promise<ChatRoomStateView> {
  const state = (await ChatRoomStateModel.findOne({
    roomId,
  }).lean()) as ChatRoomStateDocumentView | null;

  return mapStateToView(roomId, state);
}

export async function upsertChatRoomSummary(
  roomId: string,
  summary: PatchChatSummaryInput,
  actor: { id: string; role: "doctor" | "patient" },
): Promise<ChatRoomStateView> {
  const state = (await ChatRoomStateModel.findOneAndUpdate(
    { roomId },
    {
      pinnedSummary: summary.pinnedSummary,
      summaryUpdatedById: actor.id,
      summaryUpdatedByRole: actor.role,
      summaryUpdatedAt: new Date(),
    },
    { upsert: true, returnDocument: "after" },
  ).lean()) as ChatRoomStateDocumentView | null;

  return mapStateToView(roomId, state);
}
