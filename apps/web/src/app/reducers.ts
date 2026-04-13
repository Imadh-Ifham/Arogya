import { combineReducers } from "@reduxjs/toolkit";
import { appointmentReducer } from "../store/appointment/appointment.slice";
import { doctorReducer } from "../store/doctor/doctor.slice";
import { authReducer } from "../store/auth/auth.slice";

export const rootReducer = combineReducers({
  auth: authReducer,
  appointment: appointmentReducer,
  doctor: doctorReducer,
});
