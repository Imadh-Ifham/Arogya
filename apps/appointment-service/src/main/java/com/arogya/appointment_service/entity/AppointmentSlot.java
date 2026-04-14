package com.arogya.appointment_service.entity;

import com.arogya.appointment_service.enums.SlotStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointment_slots")
@Data
@NoArgsConstructor
public class AppointmentSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String doctorId;       // references Doctor Service — not a FK

    /** Display name copied from doctor-service at slot-generation time. */
    @Column(nullable = true)
    private String doctorName;

    @Column(nullable = false)
    private LocalDateTime startTime;

    @Column(nullable = false)
    private LocalDateTime endTime;

    @Column(nullable = false)
    private BigDecimal fee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SlotStatus status = SlotStatus.AVAILABLE;

    // Optimistic locking — prevents two patients booking the same slot simultaneously.
    // JPA increments this number on every update. If two transactions try to update
    // the same row, the second one sees a version mismatch and throws
    // OptimisticLockException — which we catch and return a 409 Conflict.
    @Version
    private Long version;

    @Column(updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
