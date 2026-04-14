import type { Request, Response } from "express";
import { HttpError } from "../../shared/http/error-handler.js";
import type { ApiResponse } from "../../shared/types/api-response.js";
import {
  createConsultationClinicalNote,
  deleteConsultationClinicalNote,
  getConsultationClinicalNoteById,
  listConsultationClinicalNotes,
  releaseConsultationClinicalNote,
  updateConsultationClinicalNote,
} from "./clinical-notes.service.js";
import type {
  ClinicalNoteActor,
  ClinicalNoteView,
  ClinicalNoteRole,
  ClinicalNoteStatus,
  CreateClinicalNoteInput,
  SoapNote,
  UpdateClinicalNoteInput,
} from "./clinical-notes.types.js";

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

function parseActorFromRequest(req: Request): ClinicalNoteActor {
  const id = req.header("x-user-id");
  const role = req.header("x-user-role") as ClinicalNoteRole | undefined;

  if (!id || !role) {
    throw new HttpError(401, "Missing x-user-id or x-user-role header");
  }

  if (role !== "doctor" && role !== "patient") {
    throw new HttpError(401, "Invalid x-user-role header");
  }

  return { id, role };
}

function parseStatus(
  status: unknown,
  name: string,
): ClinicalNoteStatus | undefined {
  if (status === undefined) {
    return undefined;
  }

  if (status !== "draft" && status !== "final") {
    throw new HttpError(400, `${name} must be one of draft, final`);
  }

  return status;
}

function parseSoap(soap: unknown, name: string): SoapNote | undefined {
  if (soap === undefined) {
    return undefined;
  }

  if (typeof soap !== "object" || soap === null) {
    throw new HttpError(400, `${name} must be an object`);
  }

  return soap as SoapNote;
}

export async function createClinicalNoteHandler(
  req: Request,
  res: Response<ApiResponse<ClinicalNoteView>>,
): Promise<void> {
  const consultationId = requiredParam(
    req.params.consultationId,
    "consultationId",
  );
  const actor = parseActorFromRequest(req);

  const body = req.body as Partial<CreateClinicalNoteInput>;
  const soap = parseSoap(body.soap, "soap");

  if (!soap) {
    throw new HttpError(400, "soap is required");
  }

  const payload: CreateClinicalNoteInput = {
    soap,
    patientSummary: body.patientSummary,
    status: parseStatus(body.status, "status"),
  };

  const created = await createConsultationClinicalNote(
    consultationId,
    payload,
    actor,
  );

  res.status(201).json({ success: true, data: created });
}

export async function listClinicalNotesHandler(
  req: Request,
  res: Response<ApiResponse<ClinicalNoteView[]>>,
): Promise<void> {
  const consultationId = requiredParam(
    req.params.consultationId,
    "consultationId",
  );
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

  const notes = await listConsultationClinicalNotes(
    consultationId,
    actor,
    limit,
    before,
  );

  res.status(200).json({ success: true, data: notes });
}

export async function getClinicalNoteByIdHandler(
  req: Request,
  res: Response<ApiResponse<ClinicalNoteView>>,
): Promise<void> {
  const consultationId = requiredParam(
    req.params.consultationId,
    "consultationId",
  );
  const noteId = requiredParam(req.params.noteId, "noteId");
  const actor = parseActorFromRequest(req);

  const note = await getConsultationClinicalNoteById(
    consultationId,
    noteId,
    actor,
  );

  res.status(200).json({ success: true, data: note });
}

export async function updateClinicalNoteHandler(
  req: Request,
  res: Response<ApiResponse<ClinicalNoteView>>,
): Promise<void> {
  const consultationId = requiredParam(
    req.params.consultationId,
    "consultationId",
  );
  const noteId = requiredParam(req.params.noteId, "noteId");
  const actor = parseActorFromRequest(req);

  const body = req.body as Partial<UpdateClinicalNoteInput>;
  const payload: UpdateClinicalNoteInput = {
    soap: parseSoap(body.soap, "soap"),
    patientSummary: body.patientSummary,
    status: parseStatus(body.status, "status"),
  };

  if (
    payload.soap === undefined &&
    payload.patientSummary === undefined &&
    payload.status === undefined
  ) {
    throw new HttpError(
      400,
      "At least one field must be provided: soap, patientSummary, or status",
    );
  }

  const updated = await updateConsultationClinicalNote(
    consultationId,
    noteId,
    payload,
    actor,
  );

  res.status(200).json({ success: true, data: updated });
}

export async function deleteClinicalNoteHandler(
  req: Request,
  res: Response<ApiResponse<ClinicalNoteView>>,
): Promise<void> {
  const consultationId = requiredParam(
    req.params.consultationId,
    "consultationId",
  );
  const noteId = requiredParam(req.params.noteId, "noteId");
  const actor = parseActorFromRequest(req);

  const deleted = await deleteConsultationClinicalNote(
    consultationId,
    noteId,
    actor,
  );

  res.status(200).json({ success: true, data: deleted });
}

export async function releaseClinicalNoteHandler(
  req: Request,
  res: Response<ApiResponse<ClinicalNoteView>>,
): Promise<void> {
  const consultationId = requiredParam(
    req.params.consultationId,
    "consultationId",
  );
  const noteId = requiredParam(req.params.noteId, "noteId");
  const actor = parseActorFromRequest(req);

  const released = await releaseConsultationClinicalNote(
    consultationId,
    noteId,
    actor,
  );

  res.status(200).json({ success: true, data: released });
}
