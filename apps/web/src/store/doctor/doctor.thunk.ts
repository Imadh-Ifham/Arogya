import { createAsyncThunk } from "@reduxjs/toolkit";
import type { Doctor } from "./doctor.slice";

export const fetchDoctors = createAsyncThunk<Doctor[]>(
  "doctor/fetchAll",
  async () => {
    return [
      { id: "doc-001", name: "Dr. Meera Sharma", specialization: "Cardiology" },
      { id: "doc-002", name: "Dr. Vivek Rao", specialization: "Dermatology" },
    ];
  },
);
