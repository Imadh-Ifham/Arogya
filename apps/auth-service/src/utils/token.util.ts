import jwt, { SignOptions } from "jsonwebtoken";
import type { StringValue } from "ms";
import crypto from "crypto";
import { env } from "../config/env";
import { JwtPayload } from "../types/auth.types";

export const generateAccessToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: env.jwt.expiresIn as StringValue,
    issuer: "arogya-auth-service",
    audience: "arogya-platform",
  };
  return jwt.sign(payload, env.jwt.secret as string, options);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.jwt.secret as string, {
    issuer: "arogya-auth-service",
    audience: "arogya-platform",
  }) as JwtPayload;
};

export const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString("hex");
};

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const generateRefreshJwt = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: env.jwt.refreshExpiresIn as StringValue,
    issuer: "arogya-auth-service",
    audience: "arogya-platform",
  };
  return jwt.sign(payload, env.jwt.refreshSecret as string, options);
};

export const verifyRefreshJwt = (token: string): JwtPayload => {
  return jwt.verify(token, env.jwt.refreshSecret as string, {
    issuer: "arogya-auth-service",
    audience: "arogya-platform",
  }) as JwtPayload;
};
