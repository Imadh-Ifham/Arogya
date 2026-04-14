const express = require('express');
const app = express();
app.use(express.json());

// POST /api/payments/initiate — Appointment Service calls this when booking
app.post('/api/payments/initiate', (req, res) => {
  console.log('[Payment Stub] Payment initiated:', req.body);
  // Simulate immediate payment success (in real service this goes through PayHere)
  res.status(201).json({
    paymentId: `PAY-${Date.now()}`,
    status: 'SUCCESS',
    amount: req.body.amount,
    currency: 'LKR',
  });
});

// POST /api/payments/:id/refund
app.post('/api/payments/:id/refund', (req, res) => {
  console.log(`[Payment Stub] Refund for payment ${req.params.id}`);
  res.json({ refundId: `REF-${Date.now()}`, status: 'PROCESSED' });
});

app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'payment-stub' }));
app.listen(3001, () => console.log('[Payment Stub] Running on :3001'));