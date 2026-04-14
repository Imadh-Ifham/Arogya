import { createAsyncThunk } from "@reduxjs/toolkit";
import * as authApi from "../../modules/auth/api/rest";
import type { AuthTokens, LoginPayload, RegisterPayload, UserProfile } from "../../modules/auth/api/rest";

export const loginThunk = createAsyncThunk<AuthTokens, LoginPayload, { rejectValue: string }>(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      return await authApi.login(payload);
    } catch (err: any) {
      const message = err.response?.data?.message ?? "Login failed";
      return rejectWithValue(message);
    }
  },
);

export const registerThunk = createAsyncThunk<AuthTokens, RegisterPayload, { rejectValue: string }>(
  "auth/register",
  async (payload, { rejectWithValue }) => {
    try {
      return await authApi.register(payload);
    } catch (err: any) {
      const message = err.response?.data?.message ?? "Registration failed";
      return rejectWithValue(message);
    }
  },
);

export const logoutThunk = createAsyncThunk<void, void>(
  "auth/logout",
  async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Ignore — still clear local state
      }
    }
  },
);

export const fetchMeThunk = createAsyncThunk<UserProfile, void>(
  "auth/fetchMe",
  async (_, { rejectWithValue }) => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return rejectWithValue("No token");
    try {
      return await authApi.getMe(accessToken);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to fetch profile");
    }
  },
);
