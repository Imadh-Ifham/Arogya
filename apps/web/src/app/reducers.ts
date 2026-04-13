import { combineReducers } from "@reduxjs/toolkit";
import { appointmentReducer } from "../store/appointment/appointment.slice";
import { doctorReducer } from "../store/doctor/doctor.slice";

export const rootReducer = combineReducers({
  appointment: appointmentReducer,
  doctor: doctorReducer,
});
