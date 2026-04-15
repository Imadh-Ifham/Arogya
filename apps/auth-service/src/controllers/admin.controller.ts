import { Request, Response, NextFunction } from "express";
import * as adminService from "../services/admin.service";
import { sendSuccess, sendError } from "../utils/apiResponse.util";

/** GET /api/auth/admin/users?role=&isActive=&page=&limit=&search= */
export const listUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const role     = req.query.role as string | undefined;
    const isActive = req.query.isActive !== undefined
      ? req.query.isActive === "true"
      : undefined;
    const search   = req.query.search as string | undefined;
    const page     = parseInt(req.query.page as string) || 1;
    const limit    = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await adminService.listUsers({ role, isActive, search, page, limit });
    sendSuccess(res, result, "Users retrieved");
  } catch (error) {
    next(error);
  }
};

/** GET /api/auth/admin/users/:id */
export const getUserController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await adminService.getUserById(req.params.id);
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }
    sendSuccess(res, user, "User retrieved");
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/auth/admin/users/:id/activate */
export const activateUserController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await adminService.setUserActive(req.params.id, true);
    sendSuccess(res, user, "User activated");
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/auth/admin/users/:id/deactivate */
export const deactivateUserController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await adminService.setUserActive(req.params.id, false);
    sendSuccess(res, user, "User deactivated");
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/auth/admin/users/:id — soft delete (sets isActive=false) */
export const deleteUserController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await adminService.softDeleteUser(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/** GET /api/auth/admin/metrics — counts by role + active status */
export const metricsController = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const metrics = await adminService.getPlatformUserMetrics();
    sendSuccess(res, metrics, "Metrics retrieved");
  } catch (error) {
    next(error);
  }
};
