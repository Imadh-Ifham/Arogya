import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  fetchDoctors,
  fetchMyDoctorProfileThunk,
  updateMyDoctorProfileThunk,
  fetchMyAvailabilityThunk,
  addAvailabilityThunk,
  deleteAvailabilityThunk,
} from "./doctor.thunk";
import type { DoctorProfile, AvailabilitySlot } from "../../modules/doctor/api/rest";

export type Doctor = {
  id: string;
  name: string;
  specialization: string;
};

export type DoctorState = {
  // Doctor search results (patient-facing)
  items: Doctor[];
  loading: "idle" | "pending" | "succeeded" | "failed";
  error: string | null;
  selectedId: string | null;

  // Current doctor's own profile
  myProfile: DoctorProfile | null;
  profileLoading: "idle" | "pending" | "succeeded" | "failed";
  profileSaveLoading: "idle" | "pending" | "succeeded" | "failed";
  profileError: string | null;

  // Weekly availability slots
  availability: AvailabilitySlot[];
  availabilityLoading: "idle" | "pending" | "succeeded" | "failed";
  availabilityError: string | null;
};

const initialState: DoctorState = {
  items: [],
  loading: "idle",
  error: null,
  selectedId: null,

  myProfile: null,
  profileLoading: "idle",
  profileSaveLoading: "idle",
  profileError: null,

  availability: [],
  availabilityLoading: "idle",
  availabilityError: null,
};

const doctorSlice = createSlice({
  name: "doctor",
  initialState,
  reducers: {
    selectDoctor(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },
    clearDoctorError(state) {
      state.error = null;
    },
    clearProfileError(state) {
      state.profileError = null;
    },
    clearAvailabilityError(state) {
      state.availabilityError = null;
    },
  },
  extraReducers: (builder) => {
    // ── Doctor search (patient-facing) ────────────────────────────────────────
    builder
      .addCase(fetchDoctors.pending, (state) => {
        state.loading = "pending";
        state.error = null;
        state.items = [];
      })
      .addCase(fetchDoctors.fulfilled, (state, action) => {
        state.loading = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchDoctors.rejected, (state, action) => {
        state.loading = "failed";
        state.error = (action.payload as string) ?? action.error.message ?? "Failed to load doctors";
      });

    // ── Fetch my doctor profile ────────────────────────────────────────────────
    builder
      .addCase(fetchMyDoctorProfileThunk.pending, (state) => {
        state.profileLoading = "pending";
        state.profileError = null;
      })
      .addCase(fetchMyDoctorProfileThunk.fulfilled, (state, action) => {
        state.profileLoading = "succeeded";
        state.myProfile = action.payload;
      })
      .addCase(fetchMyDoctorProfileThunk.rejected, (state, action) => {
        state.profileLoading = "failed";
        state.profileError = action.payload as string ?? "Failed to load profile";
      });

    // ── Update my doctor profile ───────────────────────────────────────────────
    builder
      .addCase(updateMyDoctorProfileThunk.pending, (state) => {
        state.profileSaveLoading = "pending";
        state.profileError = null;
      })
      .addCase(updateMyDoctorProfileThunk.fulfilled, (state, action) => {
        state.profileSaveLoading = "succeeded";
        state.myProfile = action.payload;
      })
      .addCase(updateMyDoctorProfileThunk.rejected, (state, action) => {
        state.profileSaveLoading = "failed";
        state.profileError = action.payload as string ?? "Failed to update profile";
      });

    // ── Fetch availability ─────────────────────────────────────────────────────
    builder
      .addCase(fetchMyAvailabilityThunk.pending, (state) => {
        state.availabilityLoading = "pending";
        state.availabilityError = null;
      })
      .addCase(fetchMyAvailabilityThunk.fulfilled, (state, action) => {
        state.availabilityLoading = "succeeded";
        state.availability = action.payload;
      })
      .addCase(fetchMyAvailabilityThunk.rejected, (state, action) => {
        state.availabilityLoading = "failed";
        state.availabilityError = action.payload as string ?? "Failed to load availability";
      });

    // ── Add availability slot ──────────────────────────────────────────────────
    builder
      .addCase(addAvailabilityThunk.fulfilled, (state, action) => {
        state.availability.push(action.payload);
      })
      .addCase(addAvailabilityThunk.rejected, (state, action) => {
        state.availabilityError = action.payload as string ?? "Failed to add slot";
      });

    // ── Delete availability slot ───────────────────────────────────────────────
    builder
      .addCase(deleteAvailabilityThunk.fulfilled, (state, action) => {
        state.availability = state.availability.filter((s) => s.id !== action.payload);
      })
      .addCase(deleteAvailabilityThunk.rejected, (state, action) => {
        state.availabilityError = action.payload as string ?? "Failed to delete slot";
      });
  },
});

export const { selectDoctor, clearDoctorError, clearProfileError, clearAvailabilityError } =
  doctorSlice.actions;

export const doctorReducer = doctorSlice.reducer;
