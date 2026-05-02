import axios from "axios";
import { env } from "../config/env";

export interface PatientContact {
  patientId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

/**
 * Resolves patient contact details by authUserId.
 *
 * The patientId passed from appointment-service is the auth-service userId
 * (i.e. the JWT sub / authUserId), not the patient DB UUID.
 *
 * Resolution strategy:
 *   1. GET /patients/profile/{authUserId} → firstName, lastName, phoneNumber
 *   2. GET /api/auth/internal/users/{authUserId} → email
 *
 * Returns null if both services are unavailable.
 */
export const resolvePatientContact = async (
  patientId: string,
): Promise<PatientContact | null> => {
  let firstName = "";
  let lastName: string | undefined;
  let phone: string | undefined;
  let email: string | undefined;

  // Step 1 — fetch profile from patient-service (name + phone)
  try {
    const { data } = await axios.get(
      `${env.patientServiceUrl}/patients/profile/${patientId}`,
      { timeout: 5000 },
    );

    // Patient service wraps in { success, data } via ApiResponse
    const profile = data?.data ?? data;

    if (profile) {
      firstName = profile.firstName ?? "";
      lastName = profile.lastName ?? undefined;
      phone = profile.phoneNumber ?? undefined;
    }
  } catch (err: unknown) {
    console.warn(
      `[PatientClient] Could not fetch profile for patient ${patientId} from patient-service:`,
      err instanceof Error ? err.message : String(err),
    );
  }

  // Step 2 — fetch email from auth-service (email lives in the users collection)
  try {
    const { data } = await axios.get(
      `${env.authServiceUrl}/api/auth/internal/users/${patientId}`,
      { timeout: 5000 },
    );

    const user = data?.data ?? data;
    if (user?.email) {
      email = user.email;
      // Use auth-service name as fallback if patient profile had none
      if (!firstName && user.firstName) firstName = user.firstName;
      if (!lastName && user.lastName) lastName = user.lastName;
    }
  } catch (err: unknown) {
    console.warn(
      `[PatientClient] Could not fetch email for patient ${patientId} from auth-service:`,
      err instanceof Error ? err.message : String(err),
    );
  }

  if (!email) {
    console.warn(
      `[PatientClient] No email resolved for patient ${patientId} — notification will be skipped`,
    );
    return null;
  }

  return { patientId, firstName, lastName, email, phone };
};
