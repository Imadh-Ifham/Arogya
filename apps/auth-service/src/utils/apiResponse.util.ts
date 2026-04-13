import { Response } from "express";

// Every response from this service follows the same shape.
// Consistency matters in microservices — the API Gateway and frontend
// should never have to guess what the response structure looks like.

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

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
