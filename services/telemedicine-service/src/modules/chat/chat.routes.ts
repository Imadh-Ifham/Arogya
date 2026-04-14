import { Router } from "express";
import {
  createChatMessageHandler,
  deleteChatMessageHandler,
  editChatMessageHandler,
  getChatRoomStateHandler,
  listChatMessagesHandler,
  patchChatRoomSummaryHandler,
} from "./chat.controller.js";

export const chatRouter = Router();

chatRouter.get("/rooms/:roomId/state", getChatRoomStateHandler);
chatRouter.patch("/rooms/:roomId/summary", patchChatRoomSummaryHandler);
chatRouter.get("/rooms/:roomId/messages", listChatMessagesHandler);
chatRouter.post("/rooms/:roomId/messages", createChatMessageHandler);
chatRouter.patch("/rooms/:roomId/messages/:messageId", editChatMessageHandler);
chatRouter.delete(
  "/rooms/:roomId/messages/:messageId",
  deleteChatMessageHandler,
);
