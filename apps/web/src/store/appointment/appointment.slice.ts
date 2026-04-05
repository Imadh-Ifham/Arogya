import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { fetchAppointments } from "./appointment.thunk";

export type AppointmentStatus = "scheduled" | "completed" | "canceled";

export type Appointment = {
  id: string;
  patientName: string;
  status: AppointmentStatus;
};

export type AppointmentState = {
  items: Appointment[];
  loading: "idle" | "pending" | "succeeded" | "failed";
  error: string | null;
  selectedId: string | null;
};

const initialState: AppointmentState = {
  items: [],
  loading: "idle",
  error: null,
  selectedId: null,
};

const appointmentSlice = createSlice({
  name: "appointment",
  initialState,
  reducers: {
    selectAppointment(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },
    clearAppointmentError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppointments.pending, (state) => {
        state.loading = "pending";
        state.error = null;
      })
      .addCase(fetchAppointments.fulfilled, (state, action) => {
        state.loading = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchAppointments.rejected, (state, action) => {
        state.loading = "failed";
        state.error = action.error.message ?? "Failed to load appointments";
      });
  },
});

export const { selectAppointment, clearAppointmentError } =
  appointmentSlice.actions;

export const appointmentReducer = appointmentSlice.reducer;
