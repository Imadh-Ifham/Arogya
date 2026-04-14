import api from "../../../lib/api";
import type { DoctorProfile } from "../../doctor/api/rest";

/**
 * GET /api/admin/doctors?status=PENDING
 * Returns all doctors, optionally filtered by verification status.
 */
export async function listDoctors(status?: "PENDING" | "APPROVED" | "REJECTED"): Promise<DoctorProfile[]> {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  const { data } = await api.get("/admin/doctors", { params });
  return (Array.isArray(data) ? data : data.data ?? []) as DoctorProfile[];
}

/**
 * PUT /api/admin/doctors/:id/verify
 * Approve a doctor (sets verificationStatus → APPROVED).
 */
export async function approveDoctor(id: number | string): Promise<DoctorProfile> {
  const { data } = await api.put(`/admin/doctors/${id}/verify`);
  return (data.data ?? data) as DoctorProfile;
}

/**
 * PUT /api/admin/doctors/:id/reject
 * Reject a doctor (sets verificationStatus → REJECTED).
 */
export async function rejectDoctor(id: number | string): Promise<DoctorProfile> {
  const { data } = await api.put(`/admin/doctors/${id}/reject`);
  return (data.data ?? data) as DoctorProfile;
}
