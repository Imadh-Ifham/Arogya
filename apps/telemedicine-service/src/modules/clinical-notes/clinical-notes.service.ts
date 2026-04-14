import { HttpError } from "../../shared/http/error-handler.js";
import { findConsultationById } from "../consultation/consultation.repository.js";
import type { ConsultationView } from "../consultation/consultation.types.js";
import {
  createClinicalNote,
  getClinicalNoteById,
  listClinicalNotesByConsultation,
  releaseClinicalNoteToPatient,
  softDeleteClinicalNote,
  updateClinicalNote,
} from "./clinical-notes.repository.js";
import type {
  ClinicalNoteActor,
  ClinicalNoteView,
  CreateClinicalNoteInput,
  SoapNote,
  UpdateClinicalNoteInput,
} from "./clinical-notes.types.js";

function validateActor(actor: ClinicalNoteActor): void {
  if (!actor.id || actor.id.trim().length === 0) {
    throw new HttpError(401, "Missing actor id");
  }

  if (actor.role !== "doctor" && actor.role !== "patient") {
    throw new HttpError(401, "Invalid actor role");
  }
}

async function getValidatedConsultationForActor(
  consultationId: string,
  actor: ClinicalNoteActor,
): Promise<ConsultationView> {
  validateActor(actor);

  const consultation = await findConsultationById(consultationId);
  if (!consultation) {
    throw new HttpError(404, "Consultation not found");
  }

  if (actor.role === "doctor" && actor.id !== consultation.doctorId) {
    throw new HttpError(
      403,
      "Doctor is not a participant of this consultation",
    );
  }

  if (actor.role === "patient" && actor.id !== consultation.patientId) {
    throw new HttpError(
      403,
      "Patient is not a participant of this consultation",
    );
  }

  return consultation;
}

function ensureDoctor(actor: ClinicalNoteActor): void {
  if (actor.role !== "doctor") {
    throw new HttpError(403, "Only doctor can perform this action");
  }
}

function isNonEmptyString(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function validateSoap(soap: SoapNote): void {
  if (!isNonEmptyString(soap.subjective?.chiefComplaint)) {
    throw new HttpError(400, "SOAP subjective.chiefComplaint is required");
  }

  if (!isNonEmptyString(soap.assessment?.diagnosis)) {
    throw new HttpError(400, "SOAP assessment.diagnosis is required");
  }

  if (!isNonEmptyString(soap.plan?.treatmentPlan)) {
    throw new HttpError(400, "SOAP plan.treatmentPlan is required");
  }
}

function validatePatientSummary(patientSummary: string | undefined): void {
  if (patientSummary !== undefined && patientSummary.length > 3000) {
    throw new HttpError(400, "patientSummary exceeds 3000 characters");
  }
}

function assertPatientReadVisibility(
  actor: ClinicalNoteActor,
  consultation: ConsultationView,
  note: ClinicalNoteView,
): void {
  if (actor.role !== "patient") {
    return;
  }

  if (consultation.status !== "ended") {
    throw new HttpError(
      403,
      "Clinical notes are available to patient only after consultation ends",
    );
  }

  if (note.status !== "final") {
    throw new HttpError(403, "Only final notes are visible to patient");
  }
}

export async function createConsultationClinicalNote(
  consultationId: string,
  input: CreateClinicalNoteInput,
  actor: ClinicalNoteActor,
): Promise<ClinicalNoteView> {
  const consultation = await getValidatedConsultationForActor(
    consultationId,
    actor,
  );

  ensureDoctor(actor);
  validateSoap(input.soap);
  validatePatientSummary(input.patientSummary);

  if (input.status && input.status !== "draft" && input.status !== "final") {
    throw new HttpError(400, "Invalid status");
  }

  return createClinicalNote(
    consultation.id,
    consultation.room.id,
    consultation.doctorId,
    input,
  );
}

export async function listConsultationClinicalNotes(
  consultationId: string,
  actor: ClinicalNoteActor,
  limit: number,
  before?: Date,
): Promise<ClinicalNoteView[]> {
  const consultation = await getValidatedConsultationForActor(
    consultationId,
    actor,
  );

  const notes = await listClinicalNotesByConsultation(
    consultation.id,
    limit,
    before,
  );

  if (actor.role !== "patient") {
    return notes;
  }

  if (consultation.status !== "ended") {
    throw new HttpError(
      403,
      "Clinical notes are available to patient only after consultation ends",
    );
  }

  return notes.filter((note) => note.status === "final");
}

export async function getConsultationClinicalNoteById(
  consultationId: string,
  noteId: string,
  actor: ClinicalNoteActor,
): Promise<ClinicalNoteView> {
  const consultation = await getValidatedConsultationForActor(
    consultationId,
    actor,
  );

  const note = await getClinicalNoteById(consultation.id, noteId);
  if (!note || note.deletedAt) {
    throw new HttpError(404, "Clinical note not found");
  }

  assertPatientReadVisibility(actor, consultation, note);

  return note;
}

export async function updateConsultationClinicalNote(
  consultationId: string,
  noteId: string,
  input: UpdateClinicalNoteInput,
  actor: ClinicalNoteActor,
): Promise<ClinicalNoteView> {
  const consultation = await getValidatedConsultationForActor(
    consultationId,
    actor,
  );

  ensureDoctor(actor);

  if (input.soap) {
    validateSoap(input.soap);
  }

  validatePatientSummary(input.patientSummary);

  if (input.status && input.status !== "draft" && input.status !== "final") {
    throw new HttpError(400, "Invalid status");
  }

  const updated = await updateClinicalNote(consultation.id, noteId, input);
  if (!updated) {
    throw new HttpError(404, "Clinical note not found");
  }

  return updated;
}

export async function deleteConsultationClinicalNote(
  consultationId: string,
  noteId: string,
  actor: ClinicalNoteActor,
): Promise<ClinicalNoteView> {
  const consultation = await getValidatedConsultationForActor(
    consultationId,
    actor,
  );

  ensureDoctor(actor);

  const deleted = await softDeleteClinicalNote(consultation.id, noteId);
  if (!deleted) {
    throw new HttpError(404, "Clinical note not found");
  }

  return deleted;
}

export async function releaseConsultationClinicalNote(
  consultationId: string,
  noteId: string,
  actor: ClinicalNoteActor,
): Promise<ClinicalNoteView> {
  const consultation = await getValidatedConsultationForActor(
    consultationId,
    actor,
  );

  ensureDoctor(actor);

  const note = await getClinicalNoteById(consultation.id, noteId);
  if (!note || note.deletedAt) {
    throw new HttpError(404, "Clinical note not found");
  }

  if (note.status !== "final") {
    throw new HttpError(409, "Only final notes can be released");
  }

  const released = await releaseClinicalNoteToPatient(consultation.id, noteId);
  if (!released) {
    throw new HttpError(404, "Clinical note not found");
  }

  return released;
}
