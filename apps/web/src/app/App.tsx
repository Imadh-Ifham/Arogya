import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAppDispatch } from "./hooks";
import { fetchMeThunk } from "../store/auth/auth.thunk";
import { forceLogout } from "../store/auth/auth.slice";
import { applyTheme, getInitialTheme } from "./theme";

import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import SlotsPage from "../pages/SlotsPage";
import BookPage from "../pages/BookPage";
import AppointmentsPage from "../pages/AppointmentsPage";
import AppointmentDetailPage from "../pages/AppointmentDetailPage";
import PatientProfilePage from "../pages/PatientProfilePage";
import DoctorSearchPage from "../pages/DoctorSearchPage";
import SymptomCheckerPage from "../pages/SymptomCheckerPage";
import ConsultationPage from "../pages/ConsultationPage";
import ProtectedRoute from "../components/ProtectedRoute";
import HomePage from "../pages/HomePage";

function AppRoutes() {
  const dispatch = useAppDispatch();

  // Rehydrate user profile on app load if a token exists in localStorage
  useEffect(() => {
    dispatch(fetchMeThunk());
  }, [dispatch]);

  // Apply saved/system theme early in app lifecycle
  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);

  // Listen for forced logout events fired by the axios interceptor
  useEffect(() => {
    const handler = () => dispatch(forceLogout());
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, [dispatch]);

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/slots" element={<SlotsPage />} />
      <Route path="/search" element={<DoctorSearchPage />} />

      {/* Protected */}
      <Route
        path="/book/:slotId"
        element={
          <ProtectedRoute>
            <BookPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <AppointmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments/:id"
        element={
          <ProtectedRoute>
            <AppointmentDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments/:id/consultation"
        element={
          <ProtectedRoute>
            <ConsultationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <PatientProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/symptom-checker"
        element={
          <ProtectedRoute>
            <SymptomCheckerPage />
          </ProtectedRoute>
        }
      />

      {/* Default */}
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
