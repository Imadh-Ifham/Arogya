import { createAsyncThunk } from "@reduxjs/toolkit";
import type { Doctor } from "./doctor.slice";
import type { DoctorProfile, AvailabilitySlot, UpdateDoctorProfilePayload, AddAvailabilityPayload } from "../../modules/doctor/api/rest";
import {
  searchDoctors,
  fetchMyDoctorProfile,
  updateMyDoctorProfile,
  getDoctorAvailability,
  addDoctorAvailability,
  deleteDoctorAvailability,
} from "../../modules/doctor/api/rest";

export const fetchDoctors = createAsyncThunk<Doctor[], string | undefined, { rejectValue: string }>(
  "doctor/fetchAll",
  async (specialty, { rejectWithValue }) => {
    try {
      const profiles = await searchDoctors(specialty ? { specialty, status: "APPROVED" } : { status: "APPROVED" });
      return profiles
        .filter((p) => p.id != null)
        .map((p) => ({
          id: p.id as string,
          name: p.name ?? "",
          specialization: p.specialty ?? "",
        }));
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to load doctors");
    }
  },
);

export const fetchMyDoctorProfileThunk = createAsyncThunk<DoctorProfile, void, { rejectValue: string }>(
  "doctor/fetchMyProfile",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchMyDoctorProfile();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to load profile");
    }
  },
);

export const updateMyDoctorProfileThunk = createAsyncThunk<
  DoctorProfile,
  UpdateDoctorProfilePayload,
  { rejectValue: string }
>("doctor/updateMyProfile", async (payload, { rejectWithValue }) => {
  try {
    return await updateMyDoctorProfile(payload);
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message ?? "Failed to update profile");
  }
});

export const fetchMyAvailabilityThunk = createAsyncThunk<
  AvailabilitySlot[],
  string,
  { rejectValue: string }
>("doctor/fetchAvailability", async (doctorId, { rejectWithValue }) => {
  try {
    return await getDoctorAvailability(doctorId);
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message ?? "Failed to load availability");
  }
});

export const addAvailabilityThunk = createAsyncThunk<
  AvailabilitySlot,
  { doctorId: string; payload: AddAvailabilityPayload },
  { rejectValue: string }
>("doctor/addAvailability", async ({ doctorId, payload }, { rejectWithValue }) => {
  try {
    return await addDoctorAvailability(doctorId, payload);
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message ?? "Failed to add slot");
  }
});

export const deleteAvailabilityThunk = createAsyncThunk<
  number,
  { doctorId: string; templateId: number },
  { rejectValue: string }
>("doctor/deleteAvailability", async ({ doctorId, templateId }, { rejectWithValue }) => {
  try {
    await deleteDoctorAvailability(doctorId, templateId);
    return templateId;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message ?? "Failed to delete slot");
  }
});
