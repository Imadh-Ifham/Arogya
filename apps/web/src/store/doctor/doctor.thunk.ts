import { createAsyncThunk } from "@reduxjs/toolkit";
import type { Doctor } from "./doctor.slice";
import { searchDoctors } from "../../modules/doctor/api/rest";

export const fetchDoctors = createAsyncThunk<Doctor[], string | undefined, { rejectValue: string }>(
  "doctor/fetchAll",
  async (specialty, { rejectWithValue }) => {
    try {
      const profiles = await searchDoctors(specialty ? { specialty, status: "APPROVED" } : { status: "APPROVED" });
      return profiles.map((p) => ({
        id: p.id,
        name: p.name ?? "",
        specialization: p.specialty ?? "",
      }));
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message ?? "Failed to load doctors");
    }
  },
);
