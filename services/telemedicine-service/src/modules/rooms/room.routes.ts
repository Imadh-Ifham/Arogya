import { Router } from "express";
import {
  closeRoomByIdHandler,
  createRoomHandler,
  getRoomByIdHandler,
  getRoomsByDoctorIdHandler,
  getRoomsByPatientIdHandler,
  patchRoomByIdHandler,
  reopenRoomHandler,
} from "./room.controller.js";

export const roomRouter = Router();

roomRouter.post("/", createRoomHandler);
roomRouter.get("/doctor/:doctorId", getRoomsByDoctorIdHandler);
roomRouter.get("/patient/:patientId", getRoomsByPatientIdHandler);
roomRouter.patch("/:roomKey/reopen", reopenRoomHandler);
roomRouter.patch("/:id/close", closeRoomByIdHandler);
roomRouter.patch("/:id", patchRoomByIdHandler);
roomRouter.get("/:id", getRoomByIdHandler);
