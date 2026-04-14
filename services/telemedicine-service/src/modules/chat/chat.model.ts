import { Schema, model, type Types } from "mongoose";
import type {
  ChatAttachmentType,
  ChatRole,
  ChatTriageTag,
  ConsentType,
} from "./chat.types.js";

export interface ChatAttachmentDocument {
  type: ChatAttachmentType;
  url: string;
  name?: string;
}

export interface ConsentMarkerDocument {
  type: ConsentType;
  acknowledgedAt: Date;
}

export interface ChatSafetyFlagDocument {
  keyword: string;
  severity: "medium" | "high";
  guidance: string;
}

export interface ChatMessageDocument {
  roomId: Types.ObjectId;
  senderId: string;
  senderRole: ChatRole;
  content: string;
  triageTags: ChatTriageTag[];
  attachments: ChatAttachmentDocument[];
  consentMarker?: ConsentMarkerDocument;
  safetyFlags: ChatSafetyFlagDocument[];
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatRoomStateDocument {
  roomId: Types.ObjectId;
  pinnedSummary?: string;
  summaryUpdatedById?: string;
  summaryUpdatedByRole?: ChatRole;
  summaryUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const chatAttachmentSchema = new Schema<ChatAttachmentDocument>(
  {
    type: {
      type: String,
      enum: ["image", "report", "file"],
      required: true,
    },
    url: { type: String, required: true },
    name: { type: String, required: false },
  },
  { _id: false },
);

const consentMarkerSchema = new Schema<ConsentMarkerDocument>(
  {
    type: {
      type: String,
      enum: ["data-sharing", "treatment-consent", "privacy-ack"],
      required: true,
    },
    acknowledgedAt: { type: Date, required: true },
  },
  { _id: false },
);

const chatSafetyFlagSchema = new Schema<ChatSafetyFlagDocument>(
  {
    keyword: { type: String, required: true },
    severity: {
      type: String,
      enum: ["medium", "high"],
      required: true,
    },
    guidance: { type: String, required: true },
  },
  { _id: false },
);

const chatMessageSchema = new Schema<ChatMessageDocument>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "ConsultationRoom",
      required: true,
      index: true,
    },
    senderId: { type: String, required: true, index: true },
    senderRole: {
      type: String,
      enum: ["doctor", "patient"],
      required: true,
    },
    content: { type: String, required: true, maxlength: 2000 },
    triageTags: {
      type: [
        {
          type: String,
          enum: ["symptom", "vitals", "medication", "follow-up"],
        },
      ],
      default: [],
    },
    attachments: {
      type: [chatAttachmentSchema],
      default: [],
    },
    consentMarker: { type: consentMarkerSchema, required: false },
    safetyFlags: {
      type: [chatSafetyFlagSchema],
      default: [],
    },
    editedAt: { type: Date, required: false },
    deletedAt: { type: Date, required: false, index: true },
  },
  {
    timestamps: true,
  },
);

chatMessageSchema.index({ roomId: 1, createdAt: -1 });
chatMessageSchema.index({ roomId: 1, deletedAt: 1 });

const chatRoomStateSchema = new Schema<ChatRoomStateDocument>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "ConsultationRoom",
      required: true,
      unique: true,
      index: true,
    },
    pinnedSummary: { type: String, required: false, maxlength: 3000 },
    summaryUpdatedById: { type: String, required: false },
    summaryUpdatedByRole: {
      type: String,
      enum: ["doctor", "patient"],
      required: false,
    },
    summaryUpdatedAt: { type: Date, required: false },
  },
  {
    timestamps: true,
  },
);

export const ChatMessageModel = model<ChatMessageDocument>(
  "ChatMessage",
  chatMessageSchema,
);

export const ChatRoomStateModel = model<ChatRoomStateDocument>(
  "ChatRoomState",
  chatRoomStateSchema,
);
