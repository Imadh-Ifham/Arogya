import { Response } from "express";
import { ApiResponse } from "../types/notification.types";

// Mirrors the same shape as auth-service — every service in the monorepo
// uses { success, message, data } so the gateway and frontend never guess.

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200,
): void => {
  const response: ApiResponse<T> = { success: true, message, data };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errors?: unknown,
): void => {
  const response: ApiResponse = { success: false, message, errors };
  res.status(statusCode).json(response);
};
