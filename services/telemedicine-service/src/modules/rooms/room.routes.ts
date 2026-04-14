import { Router } from "express";
import { createRoomHandler, reopenRoomHandler } from "./room.controller.js";

export const roomRouter = Router();

roomRouter.post("/", createRoomHandler);
roomRouter.patch("/:roomKey/reopen", reopenRoomHandler);
