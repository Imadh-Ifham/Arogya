package com.arogya.appointment_service.service;

import com.arogya.appointment_service.client.NotificationServiceClient;
import com.arogya.appointment_service.client.PaymentServiceClient;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final AppointmentSlotRepository slotRepository;
    private final AppointmentSlotService slotService;
    private final PaymentServiceClient paymentClient;
    private final NotificationServiceClient notificationClient;

    /**
     * APT-02: Book an appointment.
     *
     * PHYSICAL appointments are fully handled here: slot reservation → appointment
     * record → payment (optional) → notification (fire-and-forget).
     *
     * ONLINE appointments are also stored here (slot + appointment record) but the
     * telemedicine session provisioning is intentionally deferred — it will be
     * handled by the telemedicine-service in a future iteration.  The meeting URL
     * stays null until that service sets it.
     *
     * APT-07: Double-booking is prevented by the @Version field on AppointmentSlot.
     *         Simultaneous bookings → OptimisticLockingFailureException → 409.
     */
    @Transactional
    public AppointmentResponse bookAppointment(String patientId, BookAppointmentRequest request) {
        // Validates slot exists and is AVAILABLE; throws SlotNotAvailableException otherwise
        AppointmentSlot slot = slotService.getAvailableSlotForBooking(request.getSlotId());

        // Mark slot as BOOKED — @Version check fires here (APT-07)
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
            // ── PHYSICAL: initiate payment immediately ────────────────────────
            // If the payment service is unavailable the appointment stays PENDING;
            // payment can be retried or reconciled later.
            try {
                String paymentId = paymentClient.initiatePayment(saved.getId(), slot.getFee(), patientId);
                saved.setPaymentId(paymentId);
                saved.setStatus(AppointmentStatus.CONFIRMED);
                saved = appointmentRepository.save(saved);
            } catch (RuntimeException e) {
                log.warn("Payment service unavailable for appointment {} — status remains PENDING: {}",
                        saved.getId(), e.getMessage());
            }
        }
        // ONLINE: payment and telemedicine session are deferred to the
        // telemedicine-service (future implementation).  Appointment is saved
        // in PENDING status; the telemedicine-service will update it once
        // the session and payment are confirmed.

        // Fire-and-forget notification — errors are swallowed inside the client
        notificationClient.sendAppointmentConfirmed(
                saved.getId(),
                patientId,
                slot.getDoctorId(),
                slot.getStartTime() != null ? slot.getStartTime().toString() : null
        );

        return AppointmentResponse.from(saved);
    }

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
     */
    public List<AppointmentResponse> getMyAppointments(String patientId) {
        return appointmentRepository.findByPatientId(patientId)
                .stream().map(AppointmentResponse::from).toList();
    }

    /**
     * APT-06: Real-time status tracking (polling).
     * Clients poll this lightweight endpoint repeatedly to track status changes.
     */
    public AppointmentStatus getAppointmentStatus(String appointmentId, String userId, String role) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppointmentNotFoundException("Appointment not found: " + appointmentId));
        assertCanView(appointment, userId, role);
        return appointment.getStatus();
    }

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
                || appointment.getStatus() == AppointmentStatus.COMPLETED) {
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

        // Re-release the slot so other patients can book it (slot re-release — APT-05)
        slotRepository.findById(appointment.getSlotId()).ifPresent(slot -> {
            slot.setStatus(SlotStatus.AVAILABLE);
            slotRepository.save(slot);
        });

        return AppointmentResponse.from(appointmentRepository.save(appointment));
    }

    /**
     * Doctor accepts an appointment.
     * Only the assigned doctor can accept their own appointment.
     */
    @Transactional
    public AppointmentResponse acceptAppointment(String appointmentId, String doctorId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppointmentNotFoundException("Appointment not found: " + appointmentId));

        if (!appointment.getDoctorId().equals(doctorId)) {
            throw new UnauthorizedException("You are not the assigned doctor for this appointment");
        }
        if (appointment.getStatus() == AppointmentStatus.CANCELLED
                || appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new IllegalStateException("Cannot accept appointment with status: " + appointment.getStatus());
        }

        appointment.setStatus(AppointmentStatus.CONFIRMED);
        Appointment saved = appointmentRepository.save(appointment);

        // Notify the patient that the doctor accepted
        notificationClient.sendAppointmentAccepted(saved.getId(), saved.getPatientId(), doctorId);

        return AppointmentResponse.from(saved);
    }

    /**
     * Doctor rejects / cancels an appointment.
     * Releases the slot so another patient can book it.
     */
    @Transactional
    public AppointmentResponse rejectAppointment(String appointmentId, String doctorId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppointmentNotFoundException("Appointment not found: " + appointmentId));

        if (!appointment.getDoctorId().equals(doctorId)) {
            throw new UnauthorizedException("You are not the assigned doctor for this appointment");
        }
        if (appointment.getStatus() == AppointmentStatus.CANCELLED
                || appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new IllegalStateException("Cannot reject appointment with status: " + appointment.getStatus());
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setCancellationReason("Rejected by doctor");

        // Re-release the slot
        slotRepository.findById(appointment.getSlotId()).ifPresent(slot -> {
            slot.setStatus(SlotStatus.AVAILABLE);
            slotRepository.save(slot);
        });

        Appointment saved = appointmentRepository.save(appointment);

        // Notify the patient that the doctor rejected
        notificationClient.sendAppointmentRejected(saved.getId(), saved.getPatientId(), doctorId);

        return AppointmentResponse.from(saved);
    }

    /**
     * List all appointments for a specific doctor (used by doctor dashboard).
     */
    public List<AppointmentResponse> getDoctorAppointments(String doctorId) {
        return appointmentRepository.findByDoctorId(doctorId)
                .stream().map(AppointmentResponse::from).toList();
    }

    // Patients can only view their own appointments; doctors and admins can view any
    private void assertCanView(Appointment appointment, String userId, String role) {
        boolean isOwner = appointment.getPatientId().equals(userId);
        boolean isPrivileged = "DOCTOR".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role);
        if (!isOwner && !isPrivileged) {
            throw new UnauthorizedException("You are not allowed to view this appointment");
        }
    }
}
