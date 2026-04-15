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
const adminRewrite        = { '^/(.+)': '/api/admin/$1',            '^/$': '/api/admin' };
const adminAuthRewrite    = { '^/(.+)': '/api/auth/admin/$1',       '^/$': '/api/auth/admin' };
const adminApptRewrite    = { '^/(.+)': '/api/appointments/admin/$1', '^/$': '/api/appointments/admin' };
const adminPayRewrite     = { '^/(.+)': '/api/payments/admin/$1',   '^/$': '/api/payments/admin' };
const patientRewrite      = { '^/(.+)': '/patients/$1',             '^/$': '/patients' };
const telemedicineRewrite = { '^/(.+)': '/api/v1/telemedicine/$1', '^/$': '/api/v1/telemedicine' };
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

// ─── Admin routes — admin role required for all ────────────────────────────────
// Order matters: more-specific prefixes must come BEFORE the catch-all.

// /api/admin/users/*  → auth-service (user account management)
router.use(
  '/api/admin/users',
  stripUserHeaders,
  verifyToken,
  requireRole('admin'),
  proxy(env.services.auth, adminAuthRewrite)
);

// /api/admin/metrics/users → auth-service metrics
router.get(
  '/api/admin/metrics/users',
  stripUserHeaders,
  verifyToken,
  requireRole('admin'),
  proxy(env.services.auth, { '^.*': '/api/auth/admin/metrics' })
);

// /api/admin/appointments/* → appointment-service
router.use(
  '/api/admin/appointments',
  stripUserHeaders,
  verifyToken,
  requireRole('admin'),
  proxy(env.services.appointment, adminApptRewrite)
);

// /api/admin/payments/* → payment-service
router.use(
  '/api/admin/payments',
  stripUserHeaders,
  verifyToken,
  requireRole('admin'),
  proxy(env.services.payment, adminPayRewrite)
);

// /api/admin/doctors/* → doctor-service (existing verify doctor feature)
router.use(
  '/api/admin',
  stripUserHeaders,
  verifyToken,
  requireRole('admin'),
  proxy(env.services.doctor, adminRewrite)
);

// ─── Doctor routes ─────────────────────────────────────────────────────────────
// router.get/post/put/delete do NOT strip the path prefix (unlike router.use),
// so req.url keeps its full value (e.g. /api/doctors/me).  We therefore pass
// NO pathRewrite for these method-specific routes — the path is already correct.
//
// router.use('/api/doctors', ...) DOES strip the prefix, so doctorRewrite is
// still needed there to restore it before forwarding.

// POST /api/doctors/register — protected so the gateway injects x-user-id
router.post(
  '/api/doctors/register',
  stripUserHeaders,
  verifyToken,
  proxy(env.services.doctor)
);

// GET /api/doctors/me — must come before router.use('/api/doctors') catch-all
router.get(
  '/api/doctors/me',
  stripUserHeaders,
  verifyToken,
  proxy(env.services.doctor)
);

// PUT /api/doctors/me — update own profile
router.put(
  '/api/doctors/me',
  stripUserHeaders,
  verifyToken,
  proxy(env.services.doctor)
);

// DELETE availability slot — protected (doctor-only action)
router.delete(
  '/api/doctors/:id/availability/:templateId',
  stripUserHeaders,
  verifyToken,
  proxy(env.services.doctor)
);

// All remaining doctor routes (GET list, GET /:id, GET /:id/availability, POST review, POST availability)
// router.use strips the prefix so doctorRewrite must restore it
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