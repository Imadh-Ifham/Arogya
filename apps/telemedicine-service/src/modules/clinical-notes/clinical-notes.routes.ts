import { Router } from "express";
import {
  createClinicalNoteHandler,
  deleteClinicalNoteHandler,
  getClinicalNoteByIdHandler,
  listClinicalNotesHandler,
  releaseClinicalNoteHandler,
  updateClinicalNoteHandler,
} from "./clinical-notes.controller.js";

export const clinicalNotesRouter = Router();

clinicalNotesRouter.post("/:consultationId/notes", createClinicalNoteHandler);
clinicalNotesRouter.get("/:consultationId/notes", listClinicalNotesHandler);
clinicalNotesRouter.get(
  "/:consultationId/notes/:noteId",
  getClinicalNoteByIdHandler,
);
clinicalNotesRouter.patch(
  "/:consultationId/notes/:noteId",
  updateClinicalNoteHandler,
);
clinicalNotesRouter.delete(
  "/:consultationId/notes/:noteId",
  deleteClinicalNoteHandler,
);
clinicalNotesRouter.patch(
  "/:consultationId/notes/:noteId/release",
  releaseClinicalNoteHandler,
);
