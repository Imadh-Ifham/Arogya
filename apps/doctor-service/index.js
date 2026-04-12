const express = require('express');
const app = express();
app.use(express.json());

// GET /api/doctors/:id — Appointment Service calls this to validate doctor exists
app.get('/api/doctors/:id', (req, res) => {
  console.log(`[Doctor Stub] GET /api/doctors/${req.params.id}`);
  res.json({
    id: req.params.id,
    name: 'Dr. Thisuri Perera',
    specialization: 'Cardiology',
    fee: 2500.00,
    isActive: true,
    isVerified: true,
  });
});

// GET /api/doctors/:id/available — check if doctor is available
app.get('/api/doctors/:id/available', (_req, res) => {
  res.json({ available: true });
});

app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'doctor-stub' }));
app.listen(8082, () => console.log('[Doctor Stub] Running on :8082'));