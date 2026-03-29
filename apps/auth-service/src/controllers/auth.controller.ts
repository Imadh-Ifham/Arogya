import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { AuthError } from "../services/auth.service";
import { sendSuccess, sendError } from "../utils/apiResponse.util";
import { RegisterDto, LoginDto } from "../types/auth.types";

// Controllers are intentionally thin — each one does exactly three things:
// 1. Extract data from the request
// 2. Call the service
// 3. Send the response (or pass the error to Express error handler)
//
// Notice there is zero business logic here. No bcrypt, no JWT, nothing.
// If you find yourself importing mongoose in a controller, stop — move it to the service.

export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: RegisterDto = req.body;
    const tokens = await authService.register(dto);

    // 201 Created — new resource was created
    sendSuccess(res, tokens, "Registration successful", 201);
  } catch (error) {
    next(error); // passes to global error handler in app.ts
  }
};

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: LoginDto = req.body;
    const tokens = await authService.login(dto);

    sendSuccess(res, tokens, "Login successful");
  } catch (error) {
    next(error);
  }
};

export const refreshController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refresh(refreshToken);

    sendSuccess(res, tokens, "Tokens refreshed successfully");
  } catch (error) {
    next(error);
  }
};

export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);

    // 204 No Content — success, but nothing to return
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getMeController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // req.user is injected by auth middleware (Step 1.10)
    // TypeScript knows about it because we'll extend the Request type
    const userId = req.user!.userId;
    const profile = await authService.getProfile(userId);

    sendSuccess(res, profile, "Profile fetched successfully");
  } catch (error) {
    next(error);
  }
};
