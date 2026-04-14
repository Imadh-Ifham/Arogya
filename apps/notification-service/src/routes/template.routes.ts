import { Router } from "express";
import {
  createTemplateController,
  listTemplatesController,
  getTemplateController,
  updateTemplateController,
  deleteTemplateController,
} from "../controllers/template.controller";

const router = Router();

// GET  /api/notifications/templates          — list (filter: ?channel=SMS&eventType=APPOINTMENT_CONFIRMATION&isActive=true)
// POST /api/notifications/templates          — create
router
  .route("/")
  .get(listTemplatesController)
  .post(createTemplateController);

// GET    /api/notifications/templates/:id    — fetch one
// PUT    /api/notifications/templates/:id    — full update
// DELETE /api/notifications/templates/:id    — soft hard-delete
router
  .route("/:id")
  .get(getTemplateController)
  .put(updateTemplateController)
  .delete(deleteTemplateController);

export default router;
