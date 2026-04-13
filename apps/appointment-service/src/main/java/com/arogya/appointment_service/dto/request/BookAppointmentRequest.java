package com.arogya.appointment_service.dto.request;

import com.arogya.appointment_service.enums.AppointmentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BookAppointmentRequest {

    @NotBlank(message = "slotId is required")
    private String slotId;

    @NotNull(message = "appointmentType is required (PHYSICAL or ONLINE)")
    private AppointmentType appointmentType;
}
