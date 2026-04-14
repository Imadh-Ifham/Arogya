package com.arogya.doctor_service.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.time.DayOfWeek;
import java.time.LocalTime;

@Entity
@Data
@Table(name = "availability_templates")
public class AvailabilityTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private DayOfWeek dayOfWeek; // e.g., MONDAY, TUESDAY

    private LocalTime startTime; // e.g., 09:00
    private LocalTime endTime;   // e.g., 17:00

    @ManyToOne
    @JoinColumn(name = "doctor_id")
    @JsonIgnore
    private Doctor doctor;
}