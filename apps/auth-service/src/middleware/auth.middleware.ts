import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/token.util";
import { UserRole } from "../types/auth.types";

// ─── verifyToken ───────────────────────────────────────────────────────────────
// This middleware does one job: confirm the request carries a valid JWT
// and inject the decoded payload into req.user.
//
// Any route that needs authentication uses this middleware.
// After it runs, downstream middleware and controllers can trust req.user completely.

export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // JWT convention: Authorization header value is "Bearer <token>"
    // We split on space and take the second part
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Access token required",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access token malformed",
      });
      return;
    }

    // verifyAccessToken throws if the token is expired, tampered, or invalid.
    // The try/catch below catches those throws and converts them to 401 responses.
    const decoded = verifyAccessToken(token);

    // Attach the decoded payload to req so every downstream handler
    // can read req.user.userId, req.user.role, req.user.email
    req.user = decoded;

    next();
  } catch (error: any) {
    // jwt.verify throws specific error types we can give clear messages for
    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Access token expired — please refresh",
      });
      return;
    }

    if (error.name === "JsonWebTokenError") {
      res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
      return;
    }

    // Anything else — unexpected error
    res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

// ─── requireRole ───────────────────────────────────────────────────────────────
// This is a middleware FACTORY — it returns a middleware function.
// You call it with the roles you want to allow:
//
//   router.get('/slots', verifyToken, requireRole('doctor'), getSlots)
//   router.get('/admin', verifyToken, requireRole('admin'), getStats)
//   router.get('/shared', verifyToken, requireRole('doctor', 'admin'), getData)
//
// Always pair it with verifyToken — requireRole assumes req.user already exists.
// The 401 vs 403 distinction matters:
//   401 = not authenticated (who are you?)
//   403 = authenticated but not authorised (I know who you are, but no)

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // This should never happen if verifyToken runs first — but defensive coding
      res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied — requires role: ${roles.join(" or ")}`,
      });
      return;
    }

    next();
  };
};

// ─── optionalAuth ──────────────────────────────────────────────────────────────
// Some endpoints behave differently for logged-in vs anonymous users
// (e.g. browsing doctors is public, but booking requires login).
// This middleware attempts token verification but never blocks the request —
// req.user will be set if a valid token is present, undefined otherwise.

export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token) {
        req.user = verifyAccessToken(token);
      }
    }
  } catch {
    // Silently ignore — invalid token just means req.user stays undefined
  }
  next();
};
