const express = require('express');
const app = express();
app.use(express.json());

// POST /api/sessions — creates a meeting room for a confirmed appointment
app.post('/api/sessions', (req, res) => {
  const { appointmentId } = req.body;
  console.log(`[Telemedicine Stub] Creating session for appointment ${appointmentId}`);
  res.status(201).json({
    sessionId: `SESSION-${Date.now()}`,
    meetingUrl: `https://meet.jit.si/arogya-${appointmentId}`,
    status: 'CREATED',
  });
});

app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'telemedicine-stub' }));
app.listen(3003, () => console.log('[Telemedicine Stub] Running on :3003'));