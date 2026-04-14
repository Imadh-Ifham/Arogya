export type ChatRole = "doctor" | "patient";

export type ChatTriageTag = "symptom" | "vitals" | "medication" | "follow-up";

export type ChatAttachmentType = "image" | "report" | "file";

export type ConsentType = "data-sharing" | "treatment-consent" | "privacy-ack";

export interface ChatAttachmentInput {
  type: ChatAttachmentType;
  url: string;
  name?: string;
}

export interface ConsentMarkerInput {
  type: ConsentType;
  acknowledgedAt: Date;
}

export interface ChatSafetyFlagView {
  keyword: string;
  severity: "medium" | "high";
  guidance: string;
}

export interface ChatMessageView {
  id: string;
  roomId: string;
  senderId: string;
  senderRole: ChatRole;
  content: string;
  triageTags: ChatTriageTag[];
  attachments: ChatAttachmentInput[];
  consentMarker?: ConsentMarkerInput;
  safetyFlags: ChatSafetyFlagView[];
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatRoomStateView {
  roomId: string;
  pinnedSummary?: string;
  summaryUpdatedById?: string;
  summaryUpdatedByRole?: ChatRole;
  summaryUpdatedAt?: Date;
}

export interface ChatActor {
  id: string;
  role: ChatRole;
}

export interface CreateChatMessageInput {
  content: string;
  triageTags?: ChatTriageTag[];
  attachments?: ChatAttachmentInput[];
  consentMarker?: ConsentMarkerInput;
}

export interface UpdateChatMessageInput {
  content: string;
  triageTags?: ChatTriageTag[];
  attachments?: ChatAttachmentInput[];
  consentMarker?: ConsentMarkerInput;
}

export interface PatchChatSummaryInput {
  pinnedSummary: string;
}

export interface ChatCreateMessageResult {
  message: ChatMessageView;
  escalationGuidance?: string;
}
