import { Router } from "express";
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
  getMeController,
  getInternalUserController,
} from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import {
  registerRules,
  loginRules,
  refreshRules,
} from "../middleware/validationRules";
import { verifyToken } from "../middleware/auth.middleware";

// Router is a mini Express app — it handles a subset of routes.
// We mount it at /api/auth in app.ts, so every route here is
// automatically prefixed with /api/auth
const router = Router();

// ─── Public routes (no token required) ────────────────────────────────────────

// POST /api/auth/register
// validate() runs first — if it fails, controller never executes
router.post("/register", validate(registerRules), registerController);

// POST /api/auth/login
router.post("/login", validate(loginRules), loginController);

// POST /api/auth/refresh
// Client sends refreshToken in body → gets new access + refresh tokens
router.post("/refresh", validate(refreshRules), refreshController);

// POST /api/auth/logout
// Doesn't need auth middleware — the refresh token itself is the credential
router.post("/logout", validate(refreshRules), logoutController);

// ─── Protected routes (token required) ────────────────────────────────────────
// We'll add authMiddleware here in Step 1.10
// Keeping it separate now so you can test public routes immediately

// GET /api/auth/me
router.get("/me", verifyToken, getMeController);

// ─── Internal service-to-service endpoint (no JWT required) ───────────────────
// Used by notification-service to resolve a user's email + name by their auth userId.
// NOT exposed through the API Gateway — internal Docker network only.
// GET /api/auth/internal/users/:userId
router.get("/internal/users/:userId", getInternalUserController);

// ─── Health check ──────────────────────────────────────────────────────────────
// Every microservice must expose this. The API Gateway, Docker, and
// Kubernetes all ping this to know if the service is alive.
// It must respond fast — no DB calls, no logic.
router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "auth-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;
