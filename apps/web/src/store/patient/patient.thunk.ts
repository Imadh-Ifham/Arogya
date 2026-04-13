import { createAsyncThunk } from "@reduxjs/toolkit";
import * as patientApi from "../../modules/patient/api/rest";
import type { PatientProfile, UpdateProfilePayload } from "../../modules/patient/api/rest";

export const fetchProfileThunk = createAsyncThunk<PatientProfile, void, { rejectValue: string }>(
  "patient/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      return await patientApi.fetchMyProfile();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to load profile");
    }
  },
);

export const updateProfileThunk = createAsyncThunk<
  PatientProfile,
  UpdateProfilePayload,
  { rejectValue: string }
>(
  "patient/updateProfile",
  async (payload, { rejectWithValue }) => {
    try {
      return await patientApi.upsertMyProfile(payload);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to save profile");
    }
  },
);
