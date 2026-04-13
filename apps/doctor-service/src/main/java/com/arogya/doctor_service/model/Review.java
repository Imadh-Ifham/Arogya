package com.arogya.doctor_service.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long patientId; // From Aman's Patient Service
    private Integer rating; // e.g., 1 to 5
    private String comment;

    @ManyToOne
    @JoinColumn(name = "doctor_id")
    @JsonIgnore // Prevents infinite loops when converting to JSON
    private Doctor doctor;
}
