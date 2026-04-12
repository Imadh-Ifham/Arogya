import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import './config/env';
import router from './routes';

const app = express();

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'] }));
app.use(express.json({ limit: '10kb' }));

// Request logging — shows every request with method, path, status, time
app.use(morgan(':method :url :status :response-time ms'));

// Rate limiting on the gateway protects ALL downstream services at once
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests' },
}));

app.use(router);

export default app;