import { env } from "../config/env";
import { User } from "../models/user.model";
import { RefreshToken } from "../models/refreshToken.model";
import {
  RegisterDto,
  LoginDto,
  AuthTokens,
  JwtPayload,
  UserRole,
} from "../types/auth.types";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from "../utils/token.util";

export class AuthError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export const register = async (dto: RegisterDto): Promise<AuthTokens> => {
  const existing = await User.findOne({ email: dto.email.toLowerCase() });
  if (existing) {
    throw new AuthError("Email already registered", 409); // 409 Conflict
  }

  const user = await User.create({
    email: dto.email,
    passwordHash: dto.password, // hook hashes this automatically on save
    role: dto.role,
    firstName: dto.firstName,
    lastName: dto.lastName,
  });

  return issueTokens(user._id.toString(), user.email, user.role);
};

export const login = async (dto: LoginDto): Promise<AuthTokens> => {
  const user = await User.findOne({ email: dto.email.toLowerCase() }).select(
    "+passwordHash",
  );

  if (!user || !user.isActive) {
    throw new AuthError("Invalid credentials", 401);
  }

  const isMatch = await user.comparePassword(dto.password);
  if (!isMatch) {
    throw new AuthError("Invalid credentials", 401);
  }

  return issueTokens(user._id.toString(), user.email, user.role);
};

export const refresh = async (rawRefreshToken: string): Promise<AuthTokens> => {
  const tokenHash = hashToken(rawRefreshToken);

  const storedToken = await RefreshToken.findOne({
    tokenHash,
    isRevoked: false,
    expiresAt: { $gt: new Date() }, // not expired
  });

  if (!storedToken) {
    throw new AuthError("Invalid or expired refresh token", 401);
  }

  const user = await User.findById(storedToken.userId);
  if (!user || !user.isActive) {
    throw new AuthError("User not found or deactivated", 401);
  }

  await RefreshToken.findByIdAndUpdate(storedToken._id, { isRevoked: true });

  return issueTokens(user._id.toString(), user.email, user.role);
};

export const logout = async (rawRefreshToken: string): Promise<void> => {
  const tokenHash = hashToken(rawRefreshToken);
  await RefreshToken.findOneAndUpdate({ tokenHash }, { isRevoked: true });
};

export const getProfile = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AuthError("User not found", 404);
  return user;
};

// Internal helper
const issueTokens = async (
  userId: string,
  email: string,
  role: UserRole,
): Promise<AuthTokens> => {
  const payload: JwtPayload = { userId, email, role };

  const accessToken = generateAccessToken(payload);

  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  await RefreshToken.create({
    userId,
    tokenHash,
    expiresAt,
    isRevoked: false,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken, // raw token goes to client, hash stays in DB
  };
};
