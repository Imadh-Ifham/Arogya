import app from './app';
import { env } from './config/env';

app.listen(env.port, () => {
  console.log(`[Gateway] Running on port ${env.port}`);
  console.log(`[Gateway] Auth service → ${env.services.auth}`);
  console.log(`[Gateway] Appointment  → ${env.services.appointment}`);
});