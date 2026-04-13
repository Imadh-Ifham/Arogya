// Mock doctor registry keyed by the UUIDs used in the seed SQL script.
// Replace / extend these once the doctor-service is integrated.
export interface MockDoctor {
  name: string;
  specialty: string;
}

export const MOCK_DOCTORS: Record<string, MockDoctor> = {
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890": {
    name: "Dr. Arjun Mehta",
    specialty: "Cardiology",
  },
  "b2c3d4e5-f6a7-8901-bcde-f12345678901": {
    name: "Dr. Priya Nair",
    specialty: "Dermatology",
  },
  "c3d4e5f6-a7b8-9012-cdef-123456789012": {
    name: "Dr. Sanjay Reddy",
    specialty: "General Medicine",
  },
};

export function getDoctorLabel(doctorId: string): string {
  const doc = MOCK_DOCTORS[doctorId];
  return doc ? `${doc.name} — ${doc.specialty}` : `Doctor ${doctorId.slice(0, 8)}…`;
}

export function getDoctorName(doctorId: string): string {
  return MOCK_DOCTORS[doctorId]?.name ?? `Unknown (${doctorId.slice(0, 8)}…)`;
}

export function getDoctorSpecialty(doctorId: string): string {
  return MOCK_DOCTORS[doctorId]?.specialty ?? "Unknown";
}
