package com.arogya.appointment_service.dto.request;

import lombok.Data;

@Data
public class CancelAppointmentRequest {

    private String cancellationReason;
}
