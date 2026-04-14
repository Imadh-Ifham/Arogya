import { Types } from "mongoose";
import { ClinicalNoteModel } from "./clinical-notes.model.js";
import type {
  ClinicalNoteStatus,
  ClinicalNoteView,
  CreateClinicalNoteInput,
  SoapNote,
  UpdateClinicalNoteInput,
} from "./clinical-notes.types.js";

interface ClinicalNoteDocumentView {
  _id: Types.ObjectId;
  consultationId: Types.ObjectId;
  roomId: Types.ObjectId;
  doctorId: string;
  soap: SoapNote;
  patientSummary?: string;
  status: ClinicalNoteStatus;
  releasedToPatientAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

function mapNoteToView(model: ClinicalNoteDocumentView): ClinicalNoteView {
  return {
    id: model._id.toString(),
    consultationId: model.consultationId.toString(),
    roomId: model.roomId.toString(),
    doctorId: model.doctorId,
    soap: model.soap,
    patientSummary: model.patientSummary,
    status: model.status,
    releasedToPatientAt: model.releasedToPatientAt,
    deletedAt: model.deletedAt,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

export async function createClinicalNote(
  consultationId: string,
  roomId: string,
  doctorId: string,
  input: CreateClinicalNoteInput,
): Promise<ClinicalNoteView> {
  const created = (await ClinicalNoteModel.create({
    consultationId,
    roomId,
    doctorId,
    soap: input.soap,
    patientSummary: input.patientSummary,
    status: input.status ?? "draft",
  })) as unknown as ClinicalNoteDocumentView;

  return mapNoteToView(created);
}

export async function getClinicalNoteById(
  consultationId: string,
  noteId: string,
): Promise<ClinicalNoteView | null> {
  const note = (await ClinicalNoteModel.findOne({
    _id: noteId,
    consultationId,
  }).lean()) as ClinicalNoteDocumentView | null;

  return note ? mapNoteToView(note) : null;
}

export async function listClinicalNotesByConsultation(
  consultationId: string,
  limit: number,
  before?: Date,
): Promise<ClinicalNoteView[]> {
  const query: {
    consultationId: string;
    deletedAt: null;
    createdAt?: { $lt: Date };
  } = {
    consultationId,
    deletedAt: null,
  };

  if (before) {
    query.createdAt = { $lt: before };
  }

  const notes = (await ClinicalNoteModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()) as ClinicalNoteDocumentView[];

  return notes.map(mapNoteToView);
}

export async function updateClinicalNote(
  consultationId: string,
  noteId: string,
  input: UpdateClinicalNoteInput,
): Promise<ClinicalNoteView | null> {
  const updates: {
    soap?: SoapNote;
    patientSummary?: string;
    status?: ClinicalNoteStatus;
  } = {};

  if (input.soap) {
    updates.soap = input.soap;
  }

  if (input.patientSummary !== undefined) {
    updates.patientSummary = input.patientSummary;
  }

  if (input.status) {
    updates.status = input.status;
  }

  const updated = (await ClinicalNoteModel.findOneAndUpdate(
    {
      _id: noteId,
      consultationId,
      deletedAt: null,
    },
    updates,
    { returnDocument: "after" },
  ).lean()) as ClinicalNoteDocumentView | null;

  return updated ? mapNoteToView(updated) : null;
}

export async function softDeleteClinicalNote(
  consultationId: string,
  noteId: string,
): Promise<ClinicalNoteView | null> {
  const deleted = (await ClinicalNoteModel.findOneAndUpdate(
    {
      _id: noteId,
      consultationId,
      deletedAt: null,
    },
    { deletedAt: new Date() },
    { returnDocument: "after" },
  ).lean()) as ClinicalNoteDocumentView | null;

  return deleted ? mapNoteToView(deleted) : null;
}

export async function releaseClinicalNoteToPatient(
  consultationId: string,
  noteId: string,
): Promise<ClinicalNoteView | null> {
  const released = (await ClinicalNoteModel.findOneAndUpdate(
    {
      _id: noteId,
      consultationId,
      deletedAt: null,
    },
    { releasedToPatientAt: new Date() },
    { returnDocument: "after" },
  ).lean()) as ClinicalNoteDocumentView | null;

  return released ? mapNoteToView(released) : null;
}
