import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { fetchDoctors } from "./doctor.thunk";

export type Doctor = {
  id: string;
  name: string;
  specialization: string;
};

export type DoctorState = {
  items: Doctor[];
  loading: "idle" | "pending" | "succeeded" | "failed";
  error: string | null;
  selectedId: string | null;
};

const initialState: DoctorState = {
  items: [],
  loading: "idle",
  error: null,
  selectedId: null,
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoctors.pending, (state) => {
        state.loading = "pending";
        state.error = null;
      })
      .addCase(fetchDoctors.fulfilled, (state, action) => {
        state.loading = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchDoctors.rejected, (state, action) => {
        state.loading = "failed";
        state.error = action.error.message ?? "Failed to load doctors";
      });
  },
});

export const { selectDoctor, clearDoctorError } = doctorSlice.actions;

export const doctorReducer = doctorSlice.reducer;
