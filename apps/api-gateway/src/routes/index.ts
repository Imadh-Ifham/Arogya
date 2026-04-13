import { Router, Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { verifyToken, requireRole } from '../middleware/auth.middleware';
import { env } from '../config/env';

const router = Router();

// ─── Helper: strip incoming x-user headers before forwarding ──────────────────
// Prevents clients from injecting fake user identity headers
const stripUserHeaders = (req: Request, _res: Response, next: NextFunction) => {
  delete req.headers['x-user-id'];
  delete req.headers['x-user-email'];
  delete req.headers['x-user-role'];
  next();
};

// ─── Proxy factory ────────────────────────────────────────────────────────────
const proxy = (target: string, pathRewrite?: Record<string, string>) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    on: {
      error: (_err, _req, res: any) => {
        res.status(502).json({
          success: false,
          message: 'Service temporarily unavailable',
        });
      },
    },
  } as Options);

// ─── Auth routes (public — no JWT needed) ─────────────────────────────────────
router.use(
  '/api/auth',
  stripUserHeaders,
  proxy(env.services.auth)
  // Note: no verifyToken here — login/register must be public
);

// ─── Appointment routes (protected) ───────────────────────────────────────────
router.use(
  '/api/appointments',
  stripUserHeaders,
  verifyToken,            // 1. verify JWT
  proxy(env.services.appointment)  // 2. forward with x-user headers attached
);

// ─── Doctor routes — patients can browse without auth, booking needs auth ─────
router.use(
  '/api/doctors',
  stripUserHeaders,
  proxy(env.services.appointment) // routed through appointment for now
);

// ─── Health check ──────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    upstream: {
      auth:        env.services.auth,
      appointment: env.services.appointment,
    },
  });
});

// ─── 404 catch-all ────────────────────────────────────────────────────────────
router.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

export default router;