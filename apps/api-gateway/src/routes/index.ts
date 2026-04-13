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

// ─── Path rewrite helpers ─────────────────────────────────────────────────────
// Express router.use('/api/foo', handler) strips the '/api/foo' prefix from
// req.url before the next middleware sees it.  http-proxy-middleware then uses
// that stripped req.url to build the upstream path, so we must restore the
// prefix via pathRewrite.
//
// Two rules are needed because the root path ('/') is a special case:
//   '^/(.+)'  → sub-paths  e.g. /login  → /api/auth/login
//   '^/$'     → root path  e.g. /       → /api/appointments   (no trailing slash)
//
// Without the second rule a POST to /api/appointments would reach the upstream
// as /api/appointments/ — Spring Boot 3 disabled trailing-slash matching and
// returns 500 instead of 201 for that path.
const authRewrite         = { '^/(.+)': '/api/auth/$1',             '^/$': '/api/auth' };
const appointmentRewrite  = { '^/(.+)': '/api/appointments/$1',     '^/$': '/api/appointments' };
const doctorRewrite       = { '^/(.+)': '/api/doctors/$1',          '^/$': '/api/doctors' };
const patientRewrite      = { '^/(.+)': '/patients/$1',             '^/$': '/patients' };
const telemedicineRewrite = { '^/(.+)': '/api/v1/consultations/$1', '^/$': '/api/v1/consultations' };
const aiRewrite           = { '^/(.+)': '/ai/$1',                   '^/$': '/ai' };
const notificationRewrite = { '^/(.+)': '/api/notifications/$1',    '^/$': '/api/notifications' };
const paymentRewrite      = { '^/(.+)': '/api/payments/$1',         '^/$': '/api/payments' };
const slotRewrite         = { '^/(.+)': '/api/appointments/slots/$1', '^/$': '/api/appointments/slots' };

// ─── Auth routes (public — no JWT needed) ─────────────────────────────────────
router.use(
  '/api/auth',
  stripUserHeaders,
  proxy(env.services.auth, authRewrite)
  // Note: no verifyToken here — login/register must be public
);

// ─── Slot routes (public — patients browse without login) ─────────────────────
router.use(
  '/api/slots',
  stripUserHeaders,
  proxy(env.services.appointment, slotRewrite)
);

// ─── Appointment routes (protected) ───────────────────────────────────────────
router.use(
  '/api/appointments',
  stripUserHeaders,
  verifyToken,
  proxy(env.services.appointment, appointmentRewrite)
);

// ─── Doctor routes ─────────────────────────────────────────────────────────────
// POST /api/doctors/register is protected so the gateway injects x-user-id.
// All other doctor routes (GET list, GET profile) remain public.
router.post(
  '/api/doctors/register',
  stripUserHeaders,
  verifyToken,
  proxy(env.services.doctor, doctorRewrite)
);

router.use(
  '/api/doctors',
  stripUserHeaders,
  proxy(env.services.doctor, doctorRewrite)
);

// ─── Patient routes (protected) ───────────────────────────────────────────────
router.use(
  '/api/patients',
  stripUserHeaders,
  verifyToken,
  proxy(env.services.patient, patientRewrite)
);

// ─── Telemedicine routes (protected) ──────────────────────────────────────────
router.use(
  '/api/telemedicine',
  stripUserHeaders,
  verifyToken,
  proxy(env.services.telemedicine, telemedicineRewrite)
);

// ─── AI symptom checker routes (protected) ────────────────────────────────────
router.use(
  '/api/ai',
  stripUserHeaders,
  verifyToken,
  proxy(env.services.ai, aiRewrite)
);

// ─── Notification routes (internal — protected) ───────────────────────────────
router.use(
  '/api/notifications',
  stripUserHeaders,
  verifyToken,
  proxy(env.services.notification, notificationRewrite)
);

// ─── Payment routes (protected) ───────────────────────────────────────────────
router.use(
  '/api/payments',
  stripUserHeaders,
  verifyToken,
  proxy(env.services.payment, paymentRewrite)
);

// ─── Health check ──────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    upstream: {
      auth:         env.services.auth,
      patient:      env.services.patient,
      doctor:       env.services.doctor,
      appointment:  env.services.appointment,
      telemedicine: env.services.telemedicine,
      ai:           env.services.ai,
      notification: env.services.notification,
      payment:      env.services.payment,
    },
  });
});

// ─── 404 catch-all ────────────────────────────────────────────────────────────
router.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

export default router;