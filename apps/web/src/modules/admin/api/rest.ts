import api from "../../../lib/api";
import type { DoctorProfile } from "../../doctor/api/rest";
import type { Appointment } from "../../appointment/api/rest";

// ─── Doctor verification (existing) ──────────────────────────────────────────

export async function listDoctors(status?: "PENDING" | "APPROVED" | "REJECTED"): Promise<DoctorProfile[]> {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  const { data } = await api.get("/admin/doctors", { params });
  return (Array.isArray(data) ? data : data.data ?? []) as DoctorProfile[];
}

export async function approveDoctor(id: number | string): Promise<DoctorProfile> {
  const { data } = await api.put(`/admin/doctors/${id}/verify`);
  return (data.data ?? data) as DoctorProfile;
}

export async function rejectDoctor(id: number | string): Promise<DoctorProfile> {
  const { data } = await api.put(`/admin/doctors/${id}/reject`);
  return (data.data ?? data) as DoctorProfile;
}

// ─── User management ─────────────────────────────────────────────────────────

export interface AdminUser {
  _id: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: "patient" | "doctor" | "admin";
  isActive: boolean;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsersPage {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserMetrics {
  byRole: Record<string, { total: number; active: number; inactive: number }>;
  totalUsers: number;
  totalActive: number;
}

export async function listUsers(params?: {
  role?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<UsersPage> {
  const q: Record<string, string> = {};
  if (params?.role) q.role = params.role;
  if (params?.isActive !== undefined) q.isActive = String(params.isActive);
  if (params?.search) q.search = params.search;
  if (params?.page) q.page = String(params.page);
  if (params?.limit) q.limit = String(params.limit);
  const { data } = await api.get("/admin/users", { params: q });
  return (data.data ?? data) as UsersPage;
}

export async function getUser(id: string): Promise<AdminUser> {
  const { data } = await api.get(`/admin/users/${id}`);
  return (data.data ?? data) as AdminUser;
}

export async function activateUser(id: string): Promise<AdminUser> {
  const { data } = await api.patch(`/admin/users/${id}/activate`);
  return (data.data ?? data) as AdminUser;
}

export async function deactivateUser(id: string): Promise<AdminUser> {
  const { data } = await api.patch(`/admin/users/${id}/deactivate`);
  return (data.data ?? data) as AdminUser;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/admin/users/${id}`);
}

export async function getUserMetrics(): Promise<UserMetrics> {
  const { data } = await api.get("/admin/metrics/users");
  return (data.data ?? data) as UserMetrics;
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export interface AppointmentsPage {
  appointments: Appointment[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export async function listAllAppointments(params?: {
  status?: string;
  doctorId?: string;
  patientId?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}): Promise<AppointmentsPage> {
  const q: Record<string, string> = {};
  if (params?.status) q.status = params.status;
  if (params?.doctorId) q.doctorId = params.doctorId;
  if (params?.patientId) q.patientId = params.patientId;
  if (params?.from) q.from = params.from;
  if (params?.to) q.to = params.to;
  if (params?.page) q.page = String(params.page);
  if (params?.size) q.size = String(params.size);
  const { data } = await api.get("/admin/appointments/all", { params: q });
  return data as AppointmentsPage;
}

export async function adminCancelAppointment(id: string, cancellationReason?: string): Promise<Appointment> {
  const { data } = await api.patch(`/admin/appointments/${id}/cancel`, { cancellationReason: cancellationReason ?? "Cancelled by admin" });
  return data as Appointment;
}

export async function getAppointmentMetrics(): Promise<{ total: number; byStatus: Record<string, number> }> {
  const { data } = await api.get("/admin/appointments/metrics");
  return data as { total: number; byStatus: Record<string, number> };
}

// ─── Payments / Transactions ──────────────────────────────────────────────────

export interface AdminPayment {
  paymentId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  gateway: string;
  stripeSessionId: string;
  checkoutUrl: string;
  receipt: {
    receiptNumber: string;
    paidAt: string;
    gatewayReference: string;
    method: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentsPage {
  payments: AdminPayment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentMetrics {
  summary: {
    totalPending: number;
    totalSuccess: number;
    totalFailed: number;
    totalRevenue: number;
  };
  revenue: {
    daily:   { amount: number; count: number };
    weekly:  { amount: number; count: number };
    monthly: { amount: number; count: number };
  };
}

export async function listAllPayments(params?: {
  status?: string;
  patientId?: string;
  doctorId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<PaymentsPage> {
  const q: Record<string, string> = {};
  if (params?.status) q.status = params.status;
  if (params?.patientId) q.patientId = params.patientId;
  if (params?.doctorId) q.doctorId = params.doctorId;
  if (params?.from) q.from = params.from;
  if (params?.to) q.to = params.to;
  if (params?.page) q.page = String(params.page);
  if (params?.limit) q.limit = String(params.limit);
  const { data } = await api.get("/admin/payments/all", { params: q });
  return (data.data ?? data) as PaymentsPage;
}

export async function getPaymentMetrics(): Promise<PaymentMetrics> {
  const { data } = await api.get("/admin/payments/metrics");
  return (data.data ?? data) as PaymentMetrics;
}
