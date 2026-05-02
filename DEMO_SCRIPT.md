# Arogya Demo Script

## Demo Flow
Use the demo as a single patient journey:
1. Sign up and log in.
2. Open the app through the API gateway.
3. Create or view patient and doctor profiles.
4. Run AI symptom checking.
5. Find a doctor and book an appointment.
6. Complete payment.
7. Receive notifications.
8. Join a telemedicine consultation.

The script below is grouped by team member and keeps each speaker under about 3 minutes.

## 1) Dahami - API Gateway and Auth Service

"Hi everyone, I’m Dahami, and I worked on the entry layer of the platform: the API gateway and the auth service.

I’ll start with the auth service. This is where users register, log in, refresh their session, and log out. It also gives us a secure way to identify the current user, which is important because the rest of the platform depends on trusted identity. In the codebase, the auth layer is also protected with rate limiting and CORS so the service is safer and ready for real-world access.

Then at the gateway level, I made sure all front-end requests pass through one controlled entry point. The gateway routes traffic to the right backend service and strips spoofed identity headers so clients cannot fake who they are. That means services like patient, doctor, appointment, payment, notification, AI symptom checking, and telemedicine all receive consistent user context from the gateway instead of trusting the browser directly.

So in the live flow, the first thing we show is a user creating an account, logging in, and then entering the platform through the gateway. From there, the rest of the services can safely work together using the authenticated identity."

## 2) Aman - Patient Service and Payment Service

"Hi, I’m Aman, and I worked on the patient service and the payment service.

The patient service manages the user-side medical profile. It lets a patient keep their profile information organized and gives the platform a patient-specific record to work with during the rest of the journey. This is the part of the system that makes the app feel personal instead of just being a generic booking site.

On the payment side, I implemented the flow that supports paid appointments through Stripe. The service creates checkout sessions, handles webhook confirmation, and tracks payment status so the appointment can move forward only after the payment is completed. That gives us a clean business flow: book first, pay securely, and then confirm the visit.

In the demo, after the patient logs in, we show the patient profile, then move to the booking flow, and finally complete the payment. That demonstrates how the platform connects identity, patient data, and real transaction handling in one path."

## 3) Thisuri - AI Symptom Checker, Doctor Service, and Notification Service

"Hi everyone, I’m Thisuri, and I worked across the AI symptom checker, the doctor service, and the notification service.

The AI symptom checker is the triage entry point. A patient can submit symptoms and get an AI-assisted suggestion that helps decide what kind of care they may need. The service also stores analysis history, so it is not just a one-time response; it keeps a record of prior checks for follow-up and review.

The doctor service handles doctor profiles, approvals, specializations, and availability. That means we can show how doctors become discoverable in the system and how their available slots are created for patients to book. This is what connects the clinical side of the platform to the scheduling side.

The notification service is the communication layer. It is used to send updates and keep the user informed when important events happen, such as booking changes, payment updates, or consultation-related actions. In a complete flow, this is what keeps the experience responsive instead of silent.

In the demo, I would first show the AI symptom check, then the doctor discovery and availability flow, and finally the notifications that confirm the important events. Together, these three services show how the platform helps a patient find care and stay informed."

## 4) Dahami - Appointment Service

"Again, I’m Dahami, and I also worked on the appointment service.

This service is the scheduling core of the platform. It manages slot browsing, booking, rescheduling, cancellation, and appointment state changes. It is the place where everything becomes an actual visit rather than just a profile update or a symptom check.

The important part is that the appointment service sits in the middle of the workflow. It can take doctor availability, match it to a patient request, create the appointment, and then move the appointment forward once the payment and follow-up steps are complete. It is also connected to the broader care flow, so the appointment does not end at booking; it continues into the consultation stage.

In the demo, after the doctor is available and the patient has decided to proceed, I would show the slot selection, booking confirmation, and appointment status updates. That gives us a clear transition from triage and discovery into an actual scheduled consultation."

## 5) Imadh - Telemedicine Service

"Hi everyone, I’m Imadh, and I worked on the telemedicine service.

This service supports the live consultation experience. It manages consultation rooms, consultation sessions, chat, and clinical notes so the appointment can turn into a real online visit. Instead of stopping at booking, the platform supports the actual interaction between patient and doctor.

The telemedicine layer is what makes the platform feel complete. It is where the patient joins the session, the doctor joins the same room, and the consultation can be documented as it happens. That means the system supports not only scheduling, but also the care encounter itself.

In the demo, I would show the final step: the patient and doctor entering the consultation room, the session being created, and the consultation details being tracked. That closes the loop from sign-up all the way to treatment delivery."

## Suggested Speaking Order
1. Dahami: gateway and auth.
2. Aman: patient and payment.
3. Thisuri: AI symptom checker, doctor, and notification.
4. Dahami: appointment service.
5. Imadh: telemedicine.

## Short Transition Lines
If you want the handoff between speakers to feel smooth, use lines like these:
- "Now that the user is authenticated, I’ll hand over to the patient and payment flow."
- "Once the patient is set up, we can see how the AI and doctor services guide the next step."
- "After the appointment is created, the final step is the live consultation itself."

## Demo Closing Line
"That was the full Arogya flow: secure login, patient and doctor setup, AI-assisted triage, appointment booking, payment, notifications, and finally the telemedicine consultation. Together, these services form a complete healthcare journey from first contact to virtual care."