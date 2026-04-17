import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
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
import TelemedicineRoomPage from "../pages/TelemedicineRoomPage.tsx";
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
  // Apply saved/system theme early in app lifecycle
  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);

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
          <ProtectedRoute requiredRole="patient">
            <BookPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute requiredRole="patient">
            <AppointmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments/:id"
        element={
          <ProtectedRoute requiredRole="patient">
            <AppointmentDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments/:id/consultation"
        element={
          <ProtectedRoute requiredRole="patient">
            <ConsultationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/telemedicine/consultations/:id"
        element={
          <ProtectedRoute requiredRole="patient">
            <ConsultationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/telemedicine/consultations/:id"
        element={<ConsultationPage />}
      />
      <Route
        path="/patient/telemedicine/rooms/:roomId"
        element={<TelemedicineRoomPage />}
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute requiredRole="patient">
            <PatientProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/symptom-checker"
        element={
          <ProtectedRoute requiredRole="patient">
            <SymptomCheckerPage />
          </ProtectedRoute>
        }
      />

      {/* Telemedicine */}
      <Route
        path="/telemedicine"
        element={<Navigate to="/patient/telemedicine" replace />}
      />
      <Route
        path="/patient/telemedicine"
        element={<TelemedicineDashboardPage audience="patient" />}
      />

      {/* Doctor routes */}
      <Route
        path="/doctor/appointments/:id/consultation"
        element={
          <ProtectedRoute requiredRole="doctor">
            <ConsultationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/telemedicine/consultations/:id"
        element={<ConsultationPage />}
      />
      <Route
        path="/doctor/telemedicine/rooms/:roomId"
        element={<TelemedicineRoomPage />}
      />
      <Route
        path="/doctor/telemedicine"
        element={<TelemedicineDashboardPage audience="doctor" />}
      />
      <Route
        path="/doctor/dashboard"
        element={
          <ProtectedRoute requiredRole="doctor">
            <DoctorDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/profile"
        element={
          <ProtectedRoute requiredRole="doctor">
            <DoctorProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/availability"
        element={
          <ProtectedRoute requiredRole="doctor">
            <DoctorAvailabilityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/appointments"
        element={
          <ProtectedRoute requiredRole="doctor">
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
