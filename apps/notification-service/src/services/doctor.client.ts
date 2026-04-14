import axios from "axios";
import { env } from "../config/env";

export interface DoctorContact {
  doctorId: string;
  name?: string;
  email?: string;
}

/**
 * Resolves doctor contact details from Doctor Service (Spring Boot, port 8083).
 * Called when a caller provides only a doctorId (auth user ID) and no contact fields.
 *
 * Doctor Service REST contract:
 *   GET /api/doctors/by-auth/{authUserId}
 *   Response: DoctorSummaryDto { id, authUserId, name, email, specialty, ... }
 *
 * Returns null if the doctor has no profile, has no email set, or the service
 * is unavailable — the caller decides whether to fail or skip the notification.
 */
export const resolveDoctorContact = async (
  doctorId: string,
): Promise<DoctorContact | null> => {
  try {
    const { data } = await axios.get(
      `${env.doctorServiceUrl}/api/doctors/by-auth/${doctorId}`,
      { timeout: 5000 },
    );

    // Doctor Service may wrap in { success, data } — handle both shapes
    const doctor = data?.data ?? data;

    if (!doctor || !doctor.email) {
      console.warn(
        `[DoctorClient] Doctor ${doctorId} found but has no email set — skipping email notification`,
      );
      return null;
    }

    return {
      doctorId,
      name: doctor.name,
      email: doctor.email,
    };
  } catch (err: unknown) {
    console.warn(
      `[DoctorClient] Could not resolve contact for doctor ${doctorId}:`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
};
