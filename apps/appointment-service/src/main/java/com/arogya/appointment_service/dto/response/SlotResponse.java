package com.arogya.appointment_service.dto.response;

import com.arogya.appointment_service.entity.AppointmentSlot;
import com.arogya.appointment_service.enums.SlotStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class SlotResponse {

    private String id;
    private String doctorId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private BigDecimal fee;
    private SlotStatus status;

    public static SlotResponse from(AppointmentSlot s) {
        SlotResponse r = new SlotResponse();
        r.id        = s.getId();
        r.doctorId  = s.getDoctorId();
        r.startTime = s.getStartTime();
        r.endTime   = s.getEndTime();
        r.fee       = s.getFee();
        r.status    = s.getStatus();
        return r;
    }
}
