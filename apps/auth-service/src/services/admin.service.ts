import { User } from "../models/user.model";
import { AuthError } from "./auth.service";

export interface ListUsersOptions {
  role?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/** List all users with optional filtering and pagination. */
export const listUsers = async (opts: ListUsersOptions) => {
  const { role, isActive, search, page = 1, limit = 20 } = opts;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive;
  if (search) {
    const re = new RegExp(search, "i");
    filter.$or = [{ email: re }, { firstName: re }, { lastName: re }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
};

/** Get a single user by their MongoDB _id. */
export const getUserById = async (id: string) => {
  return User.findById(id).lean();
};

/** Activate or deactivate a user account. */
export const setUserActive = async (id: string, isActive: boolean) => {
  const user = await User.findByIdAndUpdate(
    id,
    { isActive },
    { new: true },
  ).lean();
  if (!user) throw new AuthError("User not found", 404);
  return user;
};

/** Soft-delete: deactivate and mark with deletedAt timestamp via a flag field.
 *  We avoid hard-deletes to preserve foreign key integrity across services. */
export const softDeleteUser = async (id: string) => {
  const user = await User.findById(id);
  if (!user) throw new AuthError("User not found", 404);
  user.isActive = false;
  await user.save();
};

/** Aggregate user counts by role and active status. */
export const getPlatformUserMetrics = async () => {
  const result = await User.aggregate([
    {
      $group: {
        _id: { role: "$role", isActive: "$isActive" },
        count: { $sum: 1 },
      },
    },
  ]);

  const metrics: Record<string, { total: number; active: number; inactive: number }> = {
    patient: { total: 0, active: 0, inactive: 0 },
    doctor:  { total: 0, active: 0, inactive: 0 },
    admin:   { total: 0, active: 0, inactive: 0 },
  };

  for (const row of result) {
    const role: string = row._id.role;
    const active: boolean = row._id.isActive;
    const count: number = row.count;
    if (!metrics[role]) metrics[role] = { total: 0, active: 0, inactive: 0 };
    metrics[role].total += count;
    if (active) metrics[role].active += count;
    else metrics[role].inactive += count;
  }

  const totalUsers = Object.values(metrics).reduce((s, m) => s + m.total, 0);
  const totalActive = Object.values(metrics).reduce((s, m) => s + m.active, 0);

  return { byRole: metrics, totalUsers, totalActive };
};
