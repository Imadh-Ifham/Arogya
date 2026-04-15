import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Appointment, Slot } from "../../modules/appointment/api/rest";
import {
  fetchMyAppointmentsThunk,
  fetchSlotsThunk,
  bookAppointmentThunk,
  cancelAppointmentThunk,
  rescheduleAppointmentThunk,
  fetchDoctorAppointmentsThunk,
  acceptAppointmentThunk,
  rejectAppointmentThunk,
} from "./appointment.thunk";

export interface AppointmentState {
  appointments: Appointment[];
  doctorAppointments: Appointment[];
  slots: Slot[];
  selectedAppointmentId: string | null;
  appointmentsLoading: "idle" | "pending" | "succeeded" | "failed";
  slotsLoading: "idle" | "pending" | "succeeded" | "failed";
  doctorLoading: "idle" | "pending" | "succeeded" | "failed";
  actionLoading: Record<string, "pending" | "succeeded" | "failed">;
  bookingLoading: "idle" | "pending" | "succeeded" | "failed";
  error: string | null;
  doctorError: string | null;
}

const initialState: AppointmentState = {
  appointments: [],
  doctorAppointments: [],
  slots: [],
  selectedAppointmentId: null,
  appointmentsLoading: "idle",
  slotsLoading: "idle",
  doctorLoading: "idle",
  actionLoading: {},
  bookingLoading: "idle",
  error: null,
  doctorError: null,
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
        state.slotsLoading = "pending";
        state.error = null;
      })
      .addCase(fetchSlotsThunk.fulfilled, (state, action) => {
        state.slotsLoading = "succeeded";
        state.slots = action.payload;
      })
      .addCase(fetchSlotsThunk.rejected, (state, action) => {
        state.slotsLoading = "failed";
        state.error = action.payload as string ?? "Failed to load slots";
      });

    // ── Fetch my appointments ──────────────────────────────────────────────────
    builder
      .addCase(fetchMyAppointmentsThunk.pending, (state) => {
        state.appointmentsLoading = "pending";
        state.error = null;
      })
      .addCase(fetchMyAppointmentsThunk.fulfilled, (state, action) => {
        state.appointmentsLoading = "succeeded";
        state.appointments = action.payload;
      })
      .addCase(fetchMyAppointmentsThunk.rejected, (state, action) => {
        state.appointmentsLoading = "failed";
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

    // ── Doctor: fetch their appointments ──────────────────────────────────────
    builder
      .addCase(fetchDoctorAppointmentsThunk.pending, (state) => {
        state.doctorLoading = "pending";
        state.doctorError = null;
      })
      .addCase(fetchDoctorAppointmentsThunk.fulfilled, (state, action) => {
        state.doctorLoading = "succeeded";
        state.doctorAppointments = action.payload;
      })
      .addCase(fetchDoctorAppointmentsThunk.rejected, (state, action) => {
        state.doctorLoading = "failed";
        state.doctorError = action.payload ?? "Failed to load appointments";
      });

    // ── Doctor: accept appointment ─────────────────────────────────────────────
    builder
      .addCase(acceptAppointmentThunk.pending, (state, action) => {
        state.actionLoading[action.meta.arg] = "pending";
      })
      .addCase(acceptAppointmentThunk.fulfilled, (state, action) => {
        delete state.actionLoading[action.payload.id];
        const idx = state.doctorAppointments.findIndex((a) => a.id === action.payload.id);
        if (idx !== -1) state.doctorAppointments[idx] = action.payload;
      })
      .addCase(acceptAppointmentThunk.rejected, (state, action) => {
        state.actionLoading[action.meta.arg] = "failed";
        state.doctorError = action.payload ?? "Failed to accept appointment";
      });

    // ── Doctor: reject appointment ─────────────────────────────────────────────
    builder
      .addCase(rejectAppointmentThunk.pending, (state, action) => {
        state.actionLoading[action.meta.arg] = "pending";
      })
      .addCase(rejectAppointmentThunk.fulfilled, (state, action) => {
        delete state.actionLoading[action.payload.id];
        const idx = state.doctorAppointments.findIndex((a) => a.id === action.payload.id);
        if (idx !== -1) state.doctorAppointments[idx] = action.payload;
      })
      .addCase(rejectAppointmentThunk.rejected, (state, action) => {
        state.actionLoading[action.meta.arg] = "failed";
        state.doctorError = action.payload ?? "Failed to reject appointment";
      });
  },
});

export const { selectAppointment, clearAppointmentError, resetBookingStatus } =
  appointmentSlice.actions;

export const appointmentReducer = appointmentSlice.reducer;
