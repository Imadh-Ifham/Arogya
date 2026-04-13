import axios from "axios";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  _id: string;
  email: string;
  role: "patient" | "doctor" | "admin";
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  role: "patient" | "doctor" | "admin";
  firstName?: string;
  lastName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// Auth calls go directly to /api/auth (no auth header needed for login/register)
const authAxios = axios.create({ baseURL: "/api", headers: { "Content-Type": "application/json" } });

export async function register(payload: RegisterPayload): Promise<AuthTokens> {
  const { data } = await authAxios.post("/auth/register", payload);
  return data.data as AuthTokens;
}

export async function login(payload: LoginPayload): Promise<AuthTokens> {
  const { data } = await authAxios.post("/auth/login", payload);
  return data.data as AuthTokens;
}

export async function logout(refreshToken: string): Promise<void> {
  await authAxios.post("/auth/logout", { refreshToken });
}

export async function getMe(accessToken: string): Promise<UserProfile> {
  const { data } = await authAxios.get("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data.data as UserProfile;
}
