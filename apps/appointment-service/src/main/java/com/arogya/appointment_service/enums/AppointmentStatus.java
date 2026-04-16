package com.arogya.appointment_service.enums;

public enum AppointmentStatus {
    /** Appointment created; payment not yet initiated. */
    PENDING,
    /** Payment session created; patient redirected to Stripe checkout. */
    AWAITING_PAYMENT,
    /** Stripe payment succeeded; doctor can now review the request. Patient sees this as "Confirmed". */
    PAYMENT_COMPLETED,
    /** Legacy alias for PAYMENT_COMPLETED — kept to avoid crashing on existing DB rows. */
    CONFIRMED,
    /** Doctor accepted the appointment. */
    ACCEPTED,
    /** Doctor rejected the appointment. */
    REJECTED,
    CANCELLED,
    COMPLETED,
    NO_SHOW,
    /** Appointment date has passed without the doctor approving or rejecting it. */
    EXPIRED
}
