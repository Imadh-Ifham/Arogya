package com.arogya.patient.dto;

import java.util.List;

public class PatientDashboardResponse {

    private PatientProfileResponse profile;
    private List<PatientDocumentResponse> documents;
    private List<PrescriptionDto> prescriptions;

    public PatientDashboardResponse(
            PatientProfileResponse profile,
            List<PatientDocumentResponse> documents,
            List<PrescriptionDto> prescriptions) {
        this.profile = profile;
        this.documents = documents;
        this.prescriptions = prescriptions;
    }

    public PatientProfileResponse getProfile() {
        return profile;
    }

    public List<PatientDocumentResponse> getDocuments() {
        return documents;
    }

    public List<PrescriptionDto> getPrescriptions() {
        return prescriptions;
    }
}
