import { createAsyncThunk } from "@reduxjs/toolkit";
import type { Appointment } from "./appointment.slice";

export const fetchAppointments = createAsyncThunk<Appointment[]>(
  "appointment/fetchAll",
  async () => {
    return [
      { id: "apt-001", patientName: "Asha Verma", status: "scheduled" },
      { id: "apt-002", patientName: "Rahul Singh", status: "completed" },
    ];
  },
);
