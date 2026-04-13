package com.arogya.patient.dto;

import jakarta.validation.constraints.NotBlank;

public class CreatePatientDocumentRequest {

    @NotBlank
    private String fileUrl;

    private String description;

    public String getFileUrl() {
        return fileUrl;
    }

    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
