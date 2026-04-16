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
import TelemedicineDashboardPage from "../pages/TelemedicineDashboardPage";
import DoctorDashboardPage from "../pages/DoctorDashboardPage";
import DoctorProfilePage from "../pages/DoctorProfilePage";
import DoctorAvailabilityPage from "../pages/DoctorAvailabilityPage";
import DoctorAppointmentsPage from "../pages/DoctorAppointmentsPage";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import PaymentSuccessPage from "../pages/PaymentSuccessPage";
import PaymentCancelPage from "../pages/PaymentCancelPage";
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
      <Route path="/payments/success" element={<PaymentSuccessPage />} />
      <Route path="/payments/cancel" element={<PaymentCancelPage />} />

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

      {/* Telemedicine */}
      <Route
        path="/telemedicine"
        element={
          <ProtectedRoute>
            <TelemedicineDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Doctor routes */}
      <Route
        path="/doctor/appointments/:id/consultation"
        element={
          <ProtectedRoute>
            <ConsultationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/dashboard"
        element={
          <ProtectedRoute>
            <DoctorDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/profile"
        element={
          <ProtectedRoute>
            <DoctorProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/availability"
        element={
          <ProtectedRoute>
            <DoctorAvailabilityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/appointments"
        element={
          <ProtectedRoute>
            <DoctorAppointmentsPage />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboardPage />
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
