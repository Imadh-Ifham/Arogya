import { createAsyncThunk } from "@reduxjs/toolkit";
import * as appointmentApi from "../../modules/appointment/api/rest";
import type { Appointment, Slot, SlotsFilter, AppointmentType } from "../../modules/appointment/api/rest";

export const fetchDoctorAppointmentsThunk = createAsyncThunk<Appointment[], void, { rejectValue: string }>(
  "appointment/fetchDoctorAppointments",
  async (_, { rejectWithValue }) => {
    try {
      return await appointmentApi.fetchDoctorAppointments();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to load appointments");
    }
  },
);

export const acceptAppointmentThunk = createAsyncThunk<Appointment, string, { rejectValue: string }>(
  "appointment/accept",
  async (id, { rejectWithValue }) => {
    try {
      return await appointmentApi.acceptAppointment(id);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to accept appointment");
    }
  },
);

export const rejectAppointmentThunk = createAsyncThunk<Appointment, string, { rejectValue: string }>(
  "appointment/reject",
  async (id, { rejectWithValue }) => {
    try {
      return await appointmentApi.rejectAppointment(id);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to reject appointment");
    }
  },
);

export const fetchSlotsThunk = createAsyncThunk<Slot[], SlotsFilter | undefined, { rejectValue: string }>(
  "appointment/fetchSlots",
  async (filter, { rejectWithValue }) => {
    try {
      return await appointmentApi.fetchSlots(filter);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to load slots");
    }
  },
);

export const fetchMyAppointmentsThunk = createAsyncThunk<Appointment[], void, { rejectValue: string }>(
  "appointment/fetchMine",
  async (_, { rejectWithValue }) => {
    try {
      return await appointmentApi.fetchMyAppointments();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to load appointments");
    }
  },
);

export const bookAppointmentThunk = createAsyncThunk<
  Appointment,
  { slotId: string; appointmentType: AppointmentType },
  { rejectValue: string }
>(
  "appointment/book",
  async (payload, { rejectWithValue }) => {
    try {
      return await appointmentApi.bookAppointment(payload);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Booking failed");
    }
  },
);

export const cancelAppointmentThunk = createAsyncThunk<
  Appointment,
  { id: string; reason?: string },
  { rejectValue: string }
>(
  "appointment/cancel",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      return await appointmentApi.cancelAppointment(id, reason);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Cancel failed");
    }
  },
);

export const rescheduleAppointmentThunk = createAsyncThunk<
  Appointment,
  { id: string; newSlotId: string },
  { rejectValue: string }
>(
  "appointment/reschedule",
  async ({ id, newSlotId }, { rejectWithValue }) => {
    try {
      return await appointmentApi.rescheduleAppointment(id, newSlotId);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Reschedule failed");
    }
  },
);

// Keep old export name as alias so doctor.thunk and any other old refs don't break
export const fetchAppointments = fetchMyAppointmentsThunk;
