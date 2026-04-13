const express = require('express');
const app = express();
app.use(express.json());

// POST /api/notifications/send — called after booking, payment, cancellation
app.post('/api/notifications/send', (req, res) => {
  const { type, recipient, data } = req.body;
  console.log(`[Notification Stub] Sending ${type} to ${recipient}:`, data);
  // In real service this calls Twilio/SendGrid
  res.status(201).json({ notificationId: `NOTIF-${Date.now()}`, status: 'SENT' });
});

app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'notification-stub' }));
app.listen(3002, () => console.log('[Notification Stub] Running on :3002'));