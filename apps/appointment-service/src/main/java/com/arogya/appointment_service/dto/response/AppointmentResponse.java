package com.arogya.appointment_service.dto.response;

import com.arogya.appointment_service.entity.Appointment;
import com.arogya.appointment_service.enums.AppointmentStatus;
import com.arogya.appointment_service.enums.AppointmentType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AppointmentResponse {

    private String id;
    private String patientId;
    private String doctorId;
    private String slotId;
    private AppointmentStatus status;
    private AppointmentType appointmentType;
    private String paymentId;
    /**
     * Stripe Checkout URL — populated immediately after booking (PHYSICAL appointments only).
     * The frontend should redirect the patient here to complete payment.
     * Null for ONLINE appointments or once payment is no longer actionable.
     */
    private String checkoutUrl;
    private String meetingUrl;
    private String cancellationReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** Denormalised for display — populated from the linked AppointmentSlot. */
    private String doctorName;

    /** Denormalised for display — populated from patient-service. */
    private String patientName;

    /** Appointment slot start/end time — denormalised from AppointmentSlot for display. */
    private LocalDateTime slotStartTime;
    private LocalDateTime slotEndTime;

    public static AppointmentResponse from(Appointment a) {
        AppointmentResponse r = new AppointmentResponse();
        r.id                 = a.getId();
        r.patientId          = a.getPatientId();
        r.doctorId           = a.getDoctorId();
        r.slotId             = a.getSlotId();
        r.status             = a.getStatus();
        r.appointmentType    = a.getAppointmentType();
        r.paymentId          = a.getPaymentId();
        r.checkoutUrl        = a.getCheckoutUrl();
        r.meetingUrl         = a.getMeetingUrl();
        r.cancellationReason = a.getCancellationReason();
        r.createdAt          = a.getCreatedAt();
        r.updatedAt          = a.getUpdatedAt();
        return r;
    }

    public static AppointmentResponse from(Appointment a, String doctorName, String patientName) {
        AppointmentResponse r = from(a);
        r.doctorName  = doctorName;
        r.patientName = patientName;
        return r;
    }

    public static AppointmentResponse from(Appointment a, String doctorName, String patientName,
                                           LocalDateTime slotStartTime, LocalDateTime slotEndTime) {
        AppointmentResponse r = from(a, doctorName, patientName);
        r.slotStartTime = slotStartTime;
        r.slotEndTime   = slotEndTime;
        return r;
    }
}
