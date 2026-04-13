import { createSlice } from "@reduxjs/toolkit";
import type { PatientProfile } from "../../modules/patient/api/rest";
import { fetchProfileThunk, updateProfileThunk } from "./patient.thunk";

export interface PatientState {
  profile: PatientProfile | null;
  loading: "idle" | "pending" | "succeeded" | "failed";
  saveLoading: "idle" | "pending" | "succeeded" | "failed";
  error: string | null;
}

const initialState: PatientState = {
  profile: null,
  loading: "idle",
  saveLoading: "idle",
  error: null,
};

const patientSlice = createSlice({
  name: "patient",
  initialState,
  reducers: {
    clearPatientError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfileThunk.pending, (state) => {
        state.loading = "pending";
        state.error = null;
      })
      .addCase(fetchProfileThunk.fulfilled, (state, action) => {
        state.loading = "succeeded";
        state.profile = action.payload;
      })
      .addCase(fetchProfileThunk.rejected, (state, action) => {
        state.loading = "failed";
        state.error = action.payload as string ?? "Failed to load profile";
      });

    builder
      .addCase(updateProfileThunk.pending, (state) => {
        state.saveLoading = "pending";
        state.error = null;
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.saveLoading = "succeeded";
        state.profile = action.payload;
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.saveLoading = "failed";
        state.error = action.payload as string ?? "Failed to save profile";
      });
  },
});

export const { clearPatientError } = patientSlice.actions;
export const patientReducer = patientSlice.reducer;
