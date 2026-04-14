package com.arogya.appointment_service.service;

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

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final AppointmentSlotRepository slotRepository;
    private final AppointmentSlotService slotService;
    private final TelemedicineServiceClient telemedicineClient;

    /**
     * APT-02: Book an appointment.
     * APT-07: Double-booking is prevented by the @Version field on AppointmentSlot.
     *         If two requests try to mark the same slot BOOKED simultaneously, the
     *         second transaction throws OptimisticLockingFailureException → 409.
     */
    /*
    @Transactional
    public AppointmentResponse bookAppointment(String patientId, BookAppointmentRequest request) {
        // TEMP (dev only): bypass slot/doctor validations and external service calls.
        String resolvedPatientId =
            (patientId == null || patientId.isBlank())
                ? UUID.randomUUID().toString()
                : patientId;
        String resolvedSlotId =
            (request == null || request.getSlotId() == null || request.getSlotId().isBlank())
                ? UUID.randomUUID().toString()
                : request.getSlotId();
        if (resolvedPatientId.length() > 36) {
            resolvedPatientId = resolvedPatientId.substring(0, 36);
        }
        if (resolvedSlotId.length() > 36) {
            resolvedSlotId = resolvedSlotId.substring(0, 36);
        }
        String resolvedDoctorId = UUID.randomUUID().toString();
        AppointmentType resolvedType =
            (request == null || request.getAppointmentType() == null)
                ? AppointmentType.ONLINE
                : request.getAppointmentType();

        Appointment appointment = new Appointment();
        appointment.setPatientId(resolvedPatientId);
        appointment.setDoctorId(resolvedDoctorId);
        appointment.setSlotId(resolvedSlotId);
        appointment.setStatus(AppointmentStatus.PENDING);
        appointment.setAppointmentType(resolvedType);

        Appointment saved = appointmentRepository.save(appointment);

        if (resolvedType == AppointmentType.ONLINE) {
            try {
                String meetingUrl = telemedicineClient.createSession(
                        saved.getId(),
                        resolvedPatientId,
                        resolvedDoctorId,
                        LocalDateTime.now().plusMinutes(5),
                        null);
                saved.setMeetingUrl(meetingUrl);
                saved = appointmentRepository.save(saved);
            } catch (RuntimeException ex) {
                // TEMP: preserve booking flow during local testing even if telemedicine is down.
                log.warn("Telemedicine session creation failed for appointment {}. Falling back to temp URL.",
                        saved.getId());
                saved.setMeetingUrl("https://meet.jit.si/arogya-temp-" + UUID.randomUUID());
                saved = appointmentRepository.save(saved);
            }
        }

        return AppointmentResponse.from(saved);
    }
    */

    @Transactional
    public AppointmentResponse bookAppointment(String patientId, BookAppointmentRequest request) {
        // Validates slot exists and is AVAILABLE; throws SlotNotAvailableException otherwise
        AppointmentSlot slot = slotService.getAvailableSlotForBooking(request.getSlotId());

        // Mark slot as BOOKED - @Version check fires here (APT-07)
        slot.setStatus(SlotStatus.BOOKED);
        slotRepository.save(slot);

        Appointment appointment = new Appointment();
        appointment.setPatientId(patientId);
        appointment.setDoctorId(slot.getDoctorId());
        appointment.setSlotId(slot.getId());
        appointment.setStatus(AppointmentStatus.PENDING);
        appointment.setAppointmentType(request.getAppointmentType());

        Appointment saved = appointmentRepository.save(appointment);

        // For ONLINE appointments, call telemedicine-service to create a video session.
        // If the call fails the whole transaction rolls back, releasing the slot.
        if (request.getAppointmentType() == AppointmentType.ONLINE) {
            String meetingUrl = telemedicineClient.createSession(
                    saved.getId(), patientId, slot.getDoctorId(), slot.getStartTime(), null);
            saved.setMeetingUrl(meetingUrl);
            saved = appointmentRepository.save(saved);
        }

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

    // Patients can only view their own appointments; doctors and admins can view any
    private void assertCanView(Appointment appointment, String userId, String role) {
        boolean isOwner = appointment.getPatientId().equals(userId);
        boolean isPrivileged = "DOCTOR".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role);
        if (!isOwner && !isPrivileged) {
            throw new UnauthorizedException("You are not allowed to view this appointment");
        }
    }
}
