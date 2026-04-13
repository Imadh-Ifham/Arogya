package com.arogya.appointment_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RescheduleAppointmentRequest {

    @NotBlank(message = "newSlotId is required")
    private String newSlotId;
}
