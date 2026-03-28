import { Document, Types } from "mongoose";

// The three roles in the Arogya platform.
export enum UserRole {
  PATIENT = "patient",
  DOCTOR = "doctor",
  ADMIN = "admin",
}

// Shape of a User document as stored in MongoDB.
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Shape of a RefreshToken document in MongoDB
export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string; // We store a hash, never the raw token
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}

// What gets encoded inside a JWT payload.
// Keep this small — every API call carries this data.
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// Shape of the registration request body
export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

// Shape of the login request body
export interface LoginDto {
  email: string;
  password: string;
}

// What the auth service returns after a successful login or register
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
