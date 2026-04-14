# Clinical Notes API Examples

This document provides sample HTTP requests for testing consultation clinical notes.

Clinical notes are SOAP-structured, doctor-authored, and patient-readable only after the consultation status becomes `ended`.

---

## Required headers

- `x-user-id`: actor identifier.
- `x-user-role`: `doctor` or `patient`.

---

## 1. Create Clinical Note (Doctor only)

**POST** `/api/v1/telemedicine/consultations/{consultationId}/notes`

```json
{
  "status": "draft",
  "patientSummary": "Initial summary for patient-friendly review.",
  "soap": {
    "subjective": {
      "chiefComplaint": "Fever for 2 days",
      "historyOfPresentIllness": "Intermittent fever with mild cough",
      "symptoms": "fever, cough"
    },
    "objective": {
      "vitals": "Temp 101F, Pulse 92",
      "physicalExam": "No respiratory distress"
    },
    "assessment": {
      "diagnosis": "Acute viral upper respiratory infection",
      "notes": "No red-flag signs"
    },
    "plan": {
      "treatmentPlan": "Symptomatic treatment and hydration",
      "medications": "Paracetamol 650mg SOS",
      "followUpInstructions": "Follow up in 48 hours if fever persists"
    }
  }
}
```

**Sample cURL:**

```bash
curl -X POST http://localhost:8086/api/v1/telemedicine/consultations/CONSULTATION_ID/notes \
  -H "Content-Type: application/json" \
  -H "x-user-id: doctor-123" \
  -H "x-user-role: doctor" \
  -d '{
    "status": "draft",
    "patientSummary": "Initial summary for patient-friendly review.",
    "soap": {
      "subjective": {
        "chiefComplaint": "Fever for 2 days",
        "historyOfPresentIllness": "Intermittent fever with mild cough",
        "symptoms": "fever, cough"
      },
      "objective": {
        "vitals": "Temp 101F, Pulse 92",
        "physicalExam": "No respiratory distress"
      },
      "assessment": {
        "diagnosis": "Acute viral upper respiratory infection",
        "notes": "No red-flag signs"
      },
      "plan": {
        "treatmentPlan": "Symptomatic treatment and hydration",
        "medications": "Paracetamol 650mg SOS",
        "followUpInstructions": "Follow up in 48 hours if fever persists"
      }
    }
  }'
```

---

## 2. List Clinical Notes for Consultation

**GET** `/api/v1/telemedicine/consultations/{consultationId}/notes?limit=50&before=2026-04-14T09:30:00.000Z`

**Sample cURL:**

```bash
curl "http://localhost:8086/api/v1/telemedicine/consultations/CONSULTATION_ID/notes?limit=20" \
  -H "x-user-id: doctor-123" \
  -H "x-user-role: doctor"
```

---

## 3. Get Clinical Note by ID

**GET** `/api/v1/telemedicine/consultations/{consultationId}/notes/{noteId}`

**Sample cURL:**

```bash
curl http://localhost:8086/api/v1/telemedicine/consultations/CONSULTATION_ID/notes/NOTE_ID \
  -H "x-user-id: doctor-123" \
  -H "x-user-role: doctor"
```

---

## 4. Update Clinical Note (Doctor only)

**PATCH** `/api/v1/telemedicine/consultations/{consultationId}/notes/{noteId}`

```json
{
  "status": "final",
  "patientSummary": "Likely viral infection. Continue hydration and fever control.",
  "soap": {
    "subjective": {
      "chiefComplaint": "Fever improving",
      "historyOfPresentIllness": "Responding to medication",
      "symptoms": "mild fever"
    },
    "objective": {
      "vitals": "Temp 99.2F, Pulse 84"
    },
    "assessment": {
      "diagnosis": "Resolving viral URI"
    },
    "plan": {
      "treatmentPlan": "Continue home care",
      "followUpInstructions": "Return if symptoms worsen"
    }
  }
}
```

---

## 5. Release Clinical Note (Doctor only)

**PATCH** `/api/v1/telemedicine/consultations/{consultationId}/notes/{noteId}/release`

**Sample cURL:**

```bash
curl -X PATCH http://localhost:8086/api/v1/telemedicine/consultations/CONSULTATION_ID/notes/NOTE_ID/release \
  -H "x-user-id: doctor-123" \
  -H "x-user-role: doctor"
```

---

## 6. Delete Clinical Note (Soft delete, Doctor only)

**DELETE** `/api/v1/telemedicine/consultations/{consultationId}/notes/{noteId}`

**Sample cURL:**

```bash
curl -X DELETE http://localhost:8086/api/v1/telemedicine/consultations/CONSULTATION_ID/notes/NOTE_ID \
  -H "x-user-id: doctor-123" \
  -H "x-user-role: doctor"
```

---

## Notes

- All endpoints return `{ success, data, message? }` envelopes.
- Patients can read notes only when consultation status is `ended`.
- Patients can only see notes with status `final`.
- Create/update/delete/release actions are doctor-only.
- Delete is soft-delete; deleted notes are hidden from normal reads.
