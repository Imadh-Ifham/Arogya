import { MessageTemplate } from "../models/messageTemplate.model";

/**
 * Inserts default email templates if they don't already exist.
 * Safe to call on every startup — uses upsert-by-slug so it's idempotent.
 */
export const seedDefaultTemplates = async (): Promise<void> => {
  const defaults = [
    {
      slug: "appointment_confirmation_email",
      channel: "EMAIL" as const,
      eventType: "APPOINTMENT_CONFIRMATION" as const,
      subject: "Your Arogya appointment is confirmed",
      body: `<p>Hi {{recipientName}},</p>
<p>Your appointment has been confirmed and payment received.</p>
<p><strong>Appointment ID:</strong> {{appointmentId}}<br/>
<strong>Date &amp; Time:</strong> {{appointmentDateTime}}</p>
<p>Please arrive 10 minutes early. If you need to cancel or reschedule, log in to your Arogya account.</p>
<p>Thank you,<br/>Arogya Health Team</p>`,
      description: "Sent to patient after payment is successfully processed",
      isActive: true,
    },
    {
      slug: "appointment_accepted_email",
      channel: "EMAIL" as const,
      eventType: "APPOINTMENT_ACCEPTED" as const,
      subject: "Your appointment has been accepted by the doctor",
      body: `<p>Hi {{recipientName}},</p>
<p>Great news — your doctor has accepted your appointment.</p>
<p><strong>Appointment ID:</strong> {{appointmentId}}</p>
<p>Please check your Arogya account for full details and meeting instructions.</p>
<p>Thank you,<br/>Arogya Health Team</p>`,
      description: "Sent to patient when the doctor accepts the appointment",
      isActive: true,
    },
    {
      slug: "appointment_rejected_email",
      channel: "EMAIL" as const,
      eventType: "APPOINTMENT_REJECTED" as const,
      subject: "Update on your Arogya appointment",
      body: `<p>Hi {{recipientName}},</p>
<p>We regret to inform you that your appointment (ID: {{appointmentId}}) could not be accepted by the doctor at this time.</p>
<p>Please log in to your Arogya account to book a new appointment. A refund will be processed within 5–7 business days if applicable.</p>
<p>We apologise for the inconvenience.<br/>Arogya Health Team</p>`,
      description: "Sent to patient when the doctor rejects the appointment",
      isActive: true,
    },
    {
      slug: "new_appointment_request_email",
      channel: "EMAIL" as const,
      eventType: "NEW_APPOINTMENT_REQUEST" as const,
      subject: "New appointment request on Arogya",
      body: `<p>Dear Doctor,</p>
<p>You have a new appointment request awaiting your review.</p>
<p><strong>Appointment ID:</strong> {{appointmentId}}<br/>
<strong>Date &amp; Time:</strong> {{appointmentDateTime}}</p>
<p>Please log in to your Arogya doctor dashboard to accept or reject the appointment.</p>
<p>Arogya Health Team</p>`,
      description: "Sent to doctor when a patient's payment succeeds",
      isActive: true,
    },
    {
      slug: "payment_receipt_email",
      channel: "EMAIL" as const,
      eventType: "PAYMENT_RECEIPT" as const,
      subject: "Arogya payment receipt",
      body: `<p>Hi {{recipientName}},</p>
<p>We've received your payment. Here are your receipt details:</p>
<p><strong>Amount:</strong> {{amount}}<br/>
<strong>Payment ID:</strong> {{paymentId}}<br/>
<strong>Appointment Date:</strong> {{appointmentDate}}</p>
<p>Thank you for choosing Arogya Health.<br/>Arogya Health Team</p>`,
      description: "Payment receipt sent to patient after successful payment",
      isActive: true,
    },
  ];

  for (const template of defaults) {
    const existing = await MessageTemplate.findOne({ slug: template.slug });
    if (!existing) {
      await MessageTemplate.create(template);
      console.log(`[Templates] Seeded default template: ${template.slug}`);
    }
  }
};
