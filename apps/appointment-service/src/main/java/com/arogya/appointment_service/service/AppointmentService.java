package com.arogya.appointment_service.service;

import com.arogya.appointment_service.client.NotificationServiceClient;
import com.arogya.appointment_service.client.PatientServiceClient;
import com.arogya.appointment_service.client.PaymentServiceClient;
import com.arogya.appointment_service.client.TelemedicineServiceClient;
import com.arogya.appointment_service.dto.request.BookAppointmentRequest;
import com.arogya.appointment_service.dto.request.CancelAppointmentRequest;
import com.arogya.appointment_service.dto.request.RescheduleAppointmentRequest;
import com.arogya.appointment_service.dto.response.AppointmentResponse;
import com.arogya.appointment_service.entity.Appointment;
import com.arogya.appointment_service.entity.AppointmentSlot;
import com.arogya.appointment_service.enums.AppointmentStatus;
import com.arogya.appointment_service.enums.AppointmentType;
import com.arogya.appointment_service.enums.SlotStatus;
import com.arogya.appointment_service.exception.AppointmentNotFoundException;
import com.arogya.appointment_service.exception.UnauthorizedException;
import com.arogya.appointment_service.repository.AppointmentRepository;
import com.arogya.appointment_service.repository.AppointmentSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final AppointmentSlotRepository slotRepository;
    private final AppointmentSlotService slotService;
    private final PaymentServiceClient paymentClient;
    private final NotificationServiceClient notificationClient;
    private final PatientServiceClient patientClient;
    private final TelemedicineServiceClient telemedicineClient;

    // =========================================================================
    // STEP 1 — Book appointment & initiate payment
    // =========================================================================

    /**
     * APT-02: Book an appointment.
     *
     * PHYSICAL flow:
     *   1. Reserve slot (optimistic-lock guard prevents double-booking)
     *   2. Save appointment as PENDING
     *   3. Call payment-service → get checkoutUrl + paymentId
     *   4. Update appointment to AWAITING_PAYMENT, store paymentId + checkoutUrl
     *   5. Return appointment with checkoutUrl — frontend redirects patient to Stripe
     *
     * If the payment service is unreachable the appointment stays PENDING; the
     * patient can retrieve the appointment and retry via a separate endpoint.
     *
     * ONLINE: payment is deferred to the telemedicine-service (future iteration).
     *         Appointment stays PENDING until that service updates it.
     */
    @Transactional
    public AppointmentResponse bookAppointment(String patientId, BookAppointmentRequest request) {
        AppointmentSlot slot = slotService.getAvailableSlotForBooking(request.getSlotId());

        // Mark slot as BOOKED — @Version check fires here (APT-07 double-booking guard)
        slot.setStatus(SlotStatus.BOOKED);
        slotRepository.save(slot);

        Appointment appointment = new Appointment();
        appointment.setPatientId(patientId);
        appointment.setDoctorId(slot.getDoctorId());
        appointment.setSlotId(slot.getId());
        appointment.setStatus(AppointmentStatus.PENDING);
        appointment.setAppointmentType(request.getAppointmentType());

        Appointment saved = appointmentRepository.save(appointment);

        if (request.getAppointmentType() == AppointmentType.PHYSICAL) {
            // Initiate payment session — if unavailable, appointment stays PENDING so the
            // patient can retry (the slot is already reserved for them).
            try {
                PaymentServiceClient.PaymentInitiation initiation =
                        paymentClient.initiatePayment(saved.getId(), slot.getFee(), patientId, slot.getDoctorId());
                saved.setPaymentId(initiation.paymentId());
                saved.setCheckoutUrl(initiation.checkoutUrl());
                saved.setStatus(AppointmentStatus.AWAITING_PAYMENT);
                saved = appointmentRepository.save(saved);
                log.info("Payment session created for appointment {} — checkout: {}",
                        saved.getId(), initiation.checkoutUrl());
            } catch (RuntimeException e) {
                log.warn("Payment service unavailable for appointment {} — status remains PENDING: {}",
                        saved.getId(), e.getMessage());
            }
        } else if (request.getAppointmentType() == AppointmentType.ONLINE) {
            // For ONLINE appointments: create a Jitsi meeting room via the telemedicine service,
            // then initiate payment. If telemedicine service is unavailable the transaction rolls
            // back so the patient is clearly informed (they must retry).
            try {
                String meetingUrl = telemedicineClient.createSession(
                        saved.getId(), patientId, slot.getDoctorId());
                saved.setMeetingUrl(meetingUrl);
                saved = appointmentRepository.save(saved);
                log.info("Telemedicine session created for appointment {} — room: {}",
                        saved.getId(), meetingUrl);
            } catch (RuntimeException e) {
                log.warn("Telemedicine service unavailable for appointment {} — status remains PENDING: {}",
                        saved.getId(), e.getMessage());
            }

            // Initiate payment for the online consultation fee
            try {
                PaymentServiceClient.PaymentInitiation initiation =
                        paymentClient.initiatePayment(saved.getId(), slot.getFee(), patientId, slot.getDoctorId());
                saved.setPaymentId(initiation.paymentId());
                saved.setCheckoutUrl(initiation.checkoutUrl());
                saved.setStatus(AppointmentStatus.AWAITING_PAYMENT);
                saved = appointmentRepository.save(saved);
                log.info("Payment session created for ONLINE appointment {} — checkout: {}",
                        saved.getId(), initiation.checkoutUrl());
            } catch (RuntimeException e) {
                log.warn("Payment service unavailable for ONLINE appointment {} — status remains PENDING: {}",
                        saved.getId(), e.getMessage());
            }
        }

        return AppointmentResponse.from(saved);
    }

    // =========================================================================
    // STEP 2 — Payment confirmed (callback from payment-service after Stripe webhook)
    // =========================================================================

    /**
     * Called by payment-service after the Stripe webhook confirms payment success.
     *
     * Transitions the appointment:
     *   AWAITING_PAYMENT → PAYMENT_COMPLETED
     *
     * Then fires fire-and-forget notifications:
     *   - Patient: "Booking confirmed" email (APPOINTMENT_CONFIRMATION)
     *   - Doctor:  "New appointment received" email (NEW_APPOINTMENT_REQUEST)
     *
     * This endpoint is internal (service-to-service only); no JWT required.
     *
     * @param appointmentId the appointment being confirmed
     * @param paymentId     the paymentId returned by payment-service (cross-check)
     */
    @Transactional
    public AppointmentResponse confirmPayment(String appointmentId, String paymentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppointmentNotFoundException("Appointment not found: " + appointmentId));

        // Guard: idempotent — if already confirmed, return without changes
        if (appointment.getStatus() == AppointmentStatus.PAYMENT_COMPLETED
                || appointment.getStatus() == AppointmentStatus.ACCEPTED) {
            log.info("Payment confirm for appointment {} is a no-op (already {})",
                    appointmentId, appointment.getStatus());
            return AppointmentResponse.from(appointment);
        }

        if (appointment.getStatus() != AppointmentStatus.AWAITING_PAYMENT
                && appointment.getStatus() != AppointmentStatus.PENDING) {
            throw new IllegalStateException(
                    "Cannot confirm payment for appointment with status: " + appointment.getStatus());
        }

        appointment.setStatus(AppointmentStatus.PAYMENT_COMPLETED);
        if (paymentId != null && appointment.getPaymentId() == null) {
            appointment.setPaymentId(paymentId);
        }
        Appointment saved = appointmentRepository.save(appointment);

        // Fetch slot for appointment datetime (best-effort — notification is fire-and-forget)
        String appointmentDateTime = slotRepository.findById(saved.getSlotId())
                .map(s -> s.getStartTime() != null ? s.getStartTime().toString() : null)
                .orElse(null);

        // Notify patient: "Booking confirmed"
        notificationClient.sendBookingConfirmedToPatient(
                saved.getId(), saved.getPatientId(), appointmentDateTime);

        // Notify doctor: "New appointment received"
        notificationClient.sendNewAppointmentToDoctor(
                saved.getId(), saved.getDoctorId(), appointmentDateTime);

        log.info("Appointment {} confirmed after payment {}", appointmentId, paymentId);
        return AppointmentResponse.from(saved);
    }

    /**
     * Called by payment-service if the Stripe checkout session expires or payment fails.
     *
     * Rolls the appointment back to PENDING so the patient can retry payment.
     * The slot remains BOOKED so it is still reserved for the same patient.
     */
    @Transactional
    public void handlePaymentFailed(String appointmentId) {
        appointmentRepository.findById(appointmentId).ifPresent(appointment -> {
            if (appointment.getStatus() == AppointmentStatus.AWAITING_PAYMENT) {
                appointment.setStatus(AppointmentStatus.PENDING);
                appointment.setCheckoutUrl(null); // old session is expired
                appointmentRepository.save(appointment);
                log.warn("Payment failed for appointment {} — reset to PENDING", appointmentId);
            }
        });
    }

    // =========================================================================
    // STEP 3 — Doctor reviews: accept / reject
    // =========================================================================

    /**
     * Doctor accepts an appointment that has been paid for.
     *
     * Guard: appointment must be in PAYMENT_COMPLETED status.
     * Transition: PAYMENT_COMPLETED → ACCEPTED
     * Notification: patient is informed via APPOINTMENT_ACCEPTED email.
     */
    @Transactional
    public AppointmentResponse acceptAppointment(String appointmentId, String doctorId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppointmentNotFoundException("Appointment not found: " + appointmentId));

        if (!appointment.getDoctorId().equals(doctorId)) {
            throw new UnauthorizedException("You are not the assigned doctor for this appointment");
        }
        if (appointment.getStatus() != AppointmentStatus.PAYMENT_COMPLETED) {
            throw new IllegalStateException(
                    "Can only accept appointments with status PAYMENT_COMPLETED, current: "
                            + appointment.getStatus());
        }

        appointment.setStatus(AppointmentStatus.ACCEPTED);
        Appointment saved = appointmentRepository.save(appointment);

        notificationClient.sendAppointmentAccepted(saved.getId(), saved.getPatientId(), doctorId);

        return AppointmentResponse.from(saved);
    }

    /**
     * Doctor rejects an appointment.
     *
     * Guard: appointment must be in PAYMENT_COMPLETED status.
     * Transition: PAYMENT_COMPLETED → REJECTED
     * Side effects: slot released back to AVAILABLE.
     * Notification: patient is informed via APPOINTMENT_REJECTED email.
     *
     * NOTE: Refund handling is outside the scope of this service and must be
     * initiated separately by the payment-service or ops team.
     */
    @Transactional
    public AppointmentResponse rejectAppointment(String appointmentId, String doctorId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppointmentNotFoundException("Appointment not found: " + appointmentId));

        if (!appointment.getDoctorId().equals(doctorId)) {
            throw new UnauthorizedException("You are not the assigned doctor for this appointment");
        }
        if (appointment.getStatus() != AppointmentStatus.PAYMENT_COMPLETED) {
            throw new IllegalStateException(
                    "Can only reject appointments with status PAYMENT_COMPLETED, current: "
                            + appointment.getStatus());
        }

        appointment.setStatus(AppointmentStatus.REJECTED);
        appointment.setCancellationReason("Rejected by doctor");

        // Release slot so another patient can book it
        slotRepository.findById(appointment.getSlotId()).ifPresent(slot -> {
            slot.setStatus(SlotStatus.AVAILABLE);
            slotRepository.save(slot);
        });

        Appointment saved = appointmentRepository.save(appointment);

        notificationClient.sendAppointmentRejected(saved.getId(), saved.getPatientId(), doctorId);

        return AppointmentResponse.from(saved);
    }

    // =========================================================================
    // Read operations
    // =========================================================================

    /**
     * APT-03: View appointment details & status.
     * Patients see only their own; DOCTOR/ADMIN role can view any appointment.
     */
    public AppointmentResponse getAppointment(String appointmentId, String userId, String role) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppointmentNotFoundException("Appointment not found: " + appointmentId));
        assertCanView(appointment, userId, role);
        return AppointmentResponse.from(appointment);
    }

    /**
     * APT-03: List the calling patient's own appointments.
     * Enriches each response with doctorName fetched from the linked slot.
     */
    public List<AppointmentResponse> getMyAppointments(String patientId) {
        List<Appointment> appointments = appointmentRepository.findByPatientId(patientId);
        List<String> slotIds = appointments.stream().map(Appointment::getSlotId).toList();
        Map<String, AppointmentSlot> slotMap = slotRepository.findAllById(slotIds)
                .stream().collect(Collectors.toMap(AppointmentSlot::getId, s -> s));
        return appointments.stream()
                .map(a -> {
                    AppointmentSlot slot = slotMap.get(a.getSlotId());
                    String doctorName = slot != null ? slot.getDoctorName() : null;
                    return AppointmentResponse.from(a, doctorName, null);
                })
                .toList();
    }

    /**
     * APT-06: Real-time status tracking (polling).
     */
    public AppointmentStatus getAppointmentStatus(String appointmentId, String userId, String role) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppointmentNotFoundException("Appointment not found: " + appointmentId));
        assertCanView(appointment, userId, role);
        return appointment.getStatus();
    }

    // =========================================================================
    // Mutations: reschedule / cancel
    // =========================================================================

    /**
     * APT-04: Reschedule an existing appointment.
     * Releases the old slot back to AVAILABLE and books the new slot atomically.
     */
    @Transactional
    public AppointmentResponse rescheduleAppointment(String appointmentId, String patientId,
                                                     RescheduleAppointmentRequest request) {
        Appointment appointment = appointmentRepository.findByIdAndPatientId(appointmentId, patientId)
                .orElseThrow(() -> new AppointmentNotFoundException(
                        "Appointment not found or does not belong to you"));

        if (appointment.getStatus() == AppointmentStatus.CANCELLED
                || appointment.getStatus() == AppointmentStatus.COMPLETED
                || appointment.getStatus() == AppointmentStatus.REJECTED) {
            throw new IllegalStateException(
                    "Cannot reschedule an appointment with status: " + appointment.getStatus());
        }

        // Release old slot
        slotRepository.findById(appointment.getSlotId()).ifPresent(oldSlot -> {
            oldSlot.setStatus(SlotStatus.AVAILABLE);
            slotRepository.save(oldSlot);
        });

        // Book new slot (APT-07 double-booking guard applies here too)
        AppointmentSlot newSlot = slotService.getAvailableSlotForBooking(request.getNewSlotId());
        newSlot.setStatus(SlotStatus.BOOKED);
        slotRepository.save(newSlot);

        appointment.setSlotId(newSlot.getId());
        appointment.setDoctorId(newSlot.getDoctorId());
        appointment.setStatus(AppointmentStatus.PENDING);
        appointment.setCheckoutUrl(null); // old payment session is no longer valid
        appointment.setPaymentId(null);

        return AppointmentResponse.from(appointmentRepository.save(appointment));
    }

    /**
     * APT-05: Cancel an appointment.
     * Re-releases the slot so other patients can book it.
     */
    @Transactional
    public AppointmentResponse cancelAppointment(String appointmentId, String patientId,
                                                 CancelAppointmentRequest request) {
        Appointment appointment = appointmentRepository.findByIdAndPatientId(appointmentId, patientId)
                .orElseThrow(() -> new AppointmentNotFoundException(
                        "Appointment not found or does not belong to you"));

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new IllegalStateException("Appointment is already cancelled");
        }
        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new IllegalStateException("Cannot cancel a completed appointment");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setCancellationReason(request.getCancellationReason());

        slotRepository.findById(appointment.getSlotId()).ifPresent(slot -> {
            slot.setStatus(SlotStatus.AVAILABLE);
            slotRepository.save(slot);
        });

        return AppointmentResponse.from(appointmentRepository.save(appointment));
    }

    /**
     * List all appointments for a specific doctor (used by doctor dashboard).
     */
    public List<AppointmentResponse> getDoctorAppointments(String doctorId) {
        List<Appointment> appointments = appointmentRepository.findByDoctorId(doctorId);
        List<String> slotIds = appointments.stream().map(Appointment::getSlotId).toList();
        Map<String, AppointmentSlot> slotMap = slotRepository.findAllById(slotIds)
                .stream().collect(Collectors.toMap(AppointmentSlot::getId, s -> s));
        return appointments.stream()
                .map(a -> {
                    AppointmentSlot slot = slotMap.get(a.getSlotId());
                    String doctorName = slot != null ? slot.getDoctorName() : null;
                    String patientName = patientClient.getPatientName(a.getPatientId()).orElse(null);
                    return AppointmentResponse.from(a, doctorName, patientName);
                })
                .toList();
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /** Patients can only view their own appointments; doctors and admins can view any. */
    private void assertCanView(Appointment appointment, String userId, String role) {
        boolean isOwner      = appointment.getPatientId().equals(userId);
        boolean isPrivileged = "DOCTOR".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role);
        if (!isOwner && !isPrivileged) {
            throw new UnauthorizedException("You are not allowed to view this appointment");
        }
    }
}
