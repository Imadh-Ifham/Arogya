import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/apiResponse";

/**
 * Extracts and validates x-user-id and x-user-role headers
 * injected by the API Gateway after JWT verification.
 *
 * This service never parses JWTs — it trusts the gateway.
 */
export const requireUser = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const userId = req.headers["x-user-id"] as string | undefined;
  const userRole = req.headers["x-user-role"] as string | undefined;

  if (!userId || !userRole) {
    sendError(res, "Missing authentication headers", 401);
    return;
  }

  next();
};

/**
 * Restricts access to specific roles.
 * Must be used AFTER requireUser.
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.headers["x-user-role"] as string;

    if (!roles.includes(userRole)) {
      sendError(res, "Insufficient permissions", 403);
      return;
    }

    next();
  };
};
