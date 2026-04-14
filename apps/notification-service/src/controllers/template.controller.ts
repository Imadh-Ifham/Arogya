import { Request, Response, NextFunction } from "express";
import * as templateService from "../services/template.service";
import { sendSuccess } from "../utils/apiResponse.util";
import { CreateTemplateDto, UpdateTemplateDto } from "../types/notification.types";

export const createTemplateController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: CreateTemplateDto = req.body;
    const template = await templateService.createTemplate(dto);
    sendSuccess(res, template, "Template created", 201);
  } catch (err) {
    next(err);
  }
};

export const listTemplatesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { channel, eventType, isActive } = req.query as Record<string, string>;
    const templates = await templateService.listTemplates({
      channel: channel as any,
      eventType: eventType as any,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
    });
    sendSuccess(res, templates, "Templates fetched");
  } catch (err) {
    next(err);
  }
};

export const getTemplateController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const template = await templateService.getTemplateById(req.params.id);
    sendSuccess(res, template, "Template fetched");
  } catch (err) {
    next(err);
  }
};

export const updateTemplateController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: UpdateTemplateDto = req.body;
    const template = await templateService.updateTemplate(req.params.id, dto);
    sendSuccess(res, template, "Template updated");
  } catch (err) {
    next(err);
  }
};

export const deleteTemplateController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await templateService.deleteTemplate(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
