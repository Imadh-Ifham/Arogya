import type { NextFunction, Request, Response } from "express";
import { logger } from "../logger.js";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    logger.warn(
      {
        method: req.method,
        path: req.path,
        statusCode: err.statusCode,
        message: err.message,
        details: err.details,
      },
      "Request failed with handled error",
    );
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
    return;
  }

  logger.error(
    {
      method: req.method,
      path: req.path,
      err,
    },
    "Unhandled request error",
  );
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
