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
 * Resolves patient contact details from Patient Service (Spring Boot, port 8082).
 * Called when a caller provides only a patientId and no contact fields.
 *
 * Patient Service REST contract assumed:
 *   GET /api/patients/{id}
 *   Response: { id, firstName, lastName, email, phoneNumber, ... }
 *
 * Returns null if the patient is not found or the service is unavailable,
 * so the caller can decide whether to fail or skip the notification.
 */
export const resolvePatientContact = async (
  patientId: string,
): Promise<PatientContact | null> => {
  try {
    const { data } = await axios.get(
      `${env.patientServiceUrl}/api/patients/${patientId}`,
      { timeout: 5000 },
    );

    // Patient Service wraps responses — handle both direct object and { data: {} }
    const patient = data?.data ?? data;

    return {
      patientId,
      firstName: patient.firstName ?? "",
      lastName: patient.lastName,
      email: patient.email,
      // Patient Service uses phoneNumber; normalise to phone here
      phone: patient.phoneNumber ?? patient.phone,
    };
  } catch (err: unknown) {
    // Log but don't throw — notification dispatch decides what to do next
    console.warn(
      `[PatientClient] Could not resolve contact for patient ${patientId}:`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
};
