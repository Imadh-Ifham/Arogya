import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../types/auth.types";
import {
  listUsersController,
  getUserController,
  activateUserController,
  deactivateUserController,
  deleteUserController,
  metricsController,
} from "../controllers/admin.controller";

// Mounted at /api/auth/admin — all routes require a valid JWT with role=admin
const router = Router();

router.use(verifyToken, requireRole(UserRole.ADMIN));

router.get("/users",                   listUsersController);
router.get("/users/:id",               getUserController);
router.patch("/users/:id/activate",    activateUserController);
router.patch("/users/:id/deactivate",  deactivateUserController);
router.delete("/users/:id",            deleteUserController);
router.get("/metrics",                 metricsController);

export default router;
