import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import './config/env';
import router from './routes';

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://api-gateway:3000', 'http://web:5173', '*'],
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  credentials: true,
}));
// Do NOT parse bodies here — express.json() would consume the request stream
// before http-proxy-middleware can forward it to downstream services.

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