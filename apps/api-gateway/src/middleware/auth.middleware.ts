import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
}

// Extends Express Request so downstream handlers can read req.user
declare global {
  namespace Express {
    interface Request { user?: JwtPayload; }
  }
}

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Access token required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwtSecret, {
      issuer: 'arogya-auth-service',
      audience: 'arogya-platform',
    }) as JwtPayload;

    req.user = decoded;

    // Forward decoded user info as headers to downstream services
    // This way Appointment Service knows WHO made the request
    // without doing its own JWT verification
    req.headers['x-user-id']    = decoded.userId;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role']  = decoded.role;

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Token expired' });
      return;
    }
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    next();
  };