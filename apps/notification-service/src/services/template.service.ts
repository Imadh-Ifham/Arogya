import { MessageTemplate, IMessageTemplate } from "../models/messageTemplate.model";
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  NotificationChannel,
  NotificationEventType,
} from "../types/notification.types";

export class NotificationError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "NotificationError";
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createTemplate = async (
  dto: CreateTemplateDto,
): Promise<IMessageTemplate> => {
  const existing = await MessageTemplate.findOne({ slug: dto.slug });
  if (existing) {
    throw new NotificationError(
      `Template with slug "${dto.slug}" already exists`,
      409,
    );
  }
  return MessageTemplate.create(dto);
};

export const listTemplates = async (filters: {
  channel?: NotificationChannel;
  eventType?: NotificationEventType;
  isActive?: boolean;
}): Promise<IMessageTemplate[]> => {
  const query: Record<string, unknown> = {};
  if (filters.channel) query.channel = filters.channel;
  if (filters.eventType) query.eventType = filters.eventType;
  if (filters.isActive !== undefined) query.isActive = filters.isActive;

  return MessageTemplate.find(query).sort({ createdAt: -1 });
};

export const getTemplateById = async (
  id: string,
): Promise<IMessageTemplate> => {
  const template = await MessageTemplate.findById(id);
  if (!template) throw new NotificationError("Template not found", 404);
  return template;
};

export const getTemplateBySlug = async (
  slug: string,
): Promise<IMessageTemplate> => {
  const template = await MessageTemplate.findOne({ slug });
  if (!template)
    throw new NotificationError(`Template "${slug}" not found`, 404);
  return template;
};

export const updateTemplate = async (
  id: string,
  dto: UpdateTemplateDto,
): Promise<IMessageTemplate> => {
  // If changing slug, ensure uniqueness
  if (dto.slug) {
    const conflict = await MessageTemplate.findOne({
      slug: dto.slug,
      _id: { $ne: id },
    });
    if (conflict) {
      throw new NotificationError(
        `Template with slug "${dto.slug}" already exists`,
        409,
      );
    }
  }

  const template = await MessageTemplate.findByIdAndUpdate(id, dto, {
    new: true,
    runValidators: true,
  });
  if (!template) throw new NotificationError("Template not found", 404);
  return template;
};

export const deleteTemplate = async (id: string): Promise<void> => {
  const result = await MessageTemplate.findByIdAndDelete(id);
  if (!result) throw new NotificationError("Template not found", 404);
};

// ─── Lookup helper used by notification dispatch ───────────────────────────────

export const findActiveTemplateForEvent = async (
  eventType: NotificationEventType,
  channel: NotificationChannel,
): Promise<IMessageTemplate | null> => {
  return MessageTemplate.findOne({ eventType, channel, isActive: true });
};
