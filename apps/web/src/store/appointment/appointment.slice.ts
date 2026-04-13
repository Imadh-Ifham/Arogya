import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Appointment, Slot } from "../../modules/appointment/api/rest";
import {
  fetchMyAppointmentsThunk,
  fetchSlotsThunk,
  bookAppointmentThunk,
  cancelAppointmentThunk,
  rescheduleAppointmentThunk,
} from "./appointment.thunk";

export interface AppointmentState {
  appointments: Appointment[];
  slots: Slot[];
  selectedAppointmentId: string | null;
  loading: "idle" | "pending" | "succeeded" | "failed";
  bookingLoading: "idle" | "pending" | "succeeded" | "failed";
  error: string | null;
}

const initialState: AppointmentState = {
  appointments: [],
  slots: [],
  selectedAppointmentId: null,
  loading: "idle",
  bookingLoading: "idle",
  error: null,
};

const appointmentSlice = createSlice({
  name: "appointment",
  initialState,
  reducers: {
    selectAppointment(state, action: PayloadAction<string | null>) {
      state.selectedAppointmentId = action.payload;
    },
    clearAppointmentError(state) {
      state.error = null;
    },
    resetBookingStatus(state) {
      state.bookingLoading = "idle";
    },
  },
  extraReducers: (builder) => {
    // ── Fetch slots ────────────────────────────────────────────────────────────
    builder
      .addCase(fetchSlotsThunk.pending, (state) => {
        state.loading = "pending";
        state.error = null;
      })
      .addCase(fetchSlotsThunk.fulfilled, (state, action) => {
        state.loading = "succeeded";
        state.slots = action.payload;
      })
      .addCase(fetchSlotsThunk.rejected, (state, action) => {
        state.loading = "failed";
        state.error = action.payload as string ?? "Failed to load slots";
      });

    // ── Fetch my appointments ──────────────────────────────────────────────────
    builder
      .addCase(fetchMyAppointmentsThunk.pending, (state) => {
        state.loading = "pending";
        state.error = null;
      })
      .addCase(fetchMyAppointmentsThunk.fulfilled, (state, action) => {
        state.loading = "succeeded";
        state.appointments = action.payload;
      })
      .addCase(fetchMyAppointmentsThunk.rejected, (state, action) => {
        state.loading = "failed";
        state.error = action.payload as string ?? "Failed to load appointments";
      });

    // ── Book appointment ───────────────────────────────────────────────────────
    builder
      .addCase(bookAppointmentThunk.pending, (state) => {
        state.bookingLoading = "pending";
        state.error = null;
      })
      .addCase(bookAppointmentThunk.fulfilled, (state, action) => {
        state.bookingLoading = "succeeded";
        state.appointments.unshift(action.payload);
      })
      .addCase(bookAppointmentThunk.rejected, (state, action) => {
        state.bookingLoading = "failed";
        state.error = action.payload as string ?? "Booking failed";
      });

    // ── Cancel appointment ─────────────────────────────────────────────────────
    builder.addCase(cancelAppointmentThunk.fulfilled, (state, action) => {
      const idx = state.appointments.findIndex((a) => a.id === action.payload.id);
      if (idx !== -1) state.appointments[idx] = action.payload;
    });

    // ── Reschedule appointment ─────────────────────────────────────────────────
    builder.addCase(rescheduleAppointmentThunk.fulfilled, (state, action) => {
      const idx = state.appointments.findIndex((a) => a.id === action.payload.id);
      if (idx !== -1) state.appointments[idx] = action.payload;
    });
  },
});

export const { selectAppointment, clearAppointmentError, resetBookingStatus } =
  appointmentSlice.actions;

export const appointmentReducer = appointmentSlice.reducer;
