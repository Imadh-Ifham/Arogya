// import { producer } from "../config/kafka";
// import { env } from "../config/env";

// export interface PaymentCompletedEvent {
//   paymentId: string;
//   appointmentId: string;
//   patientId: string;
//   doctorId: string;
//   amount: number;
//   currency: string;
//   receiptNumber: string;
//   paidAt: Date;
// }

// export async function publishPaymentCompleted(
//   event: PaymentCompletedEvent
// ): Promise<void> {
//   if (!env.kafka.broker) {
//     console.warn("[Kafka] KAFKA_BROKER not set — skipping event publish");
//     return;
//   }

//   try {
//     await producer.send({
//       topic: env.kafka.topicPaymentCompleted,
//       messages: [
//         {
//           key: event.paymentId,
//           value: JSON.stringify(event),
//         },
//       ],
//     });
//     console.log(
//       `[Kafka] Published payment.completed for paymentId=${event.paymentId}`
//     );
//   } catch (err) {
//     console.error("[Kafka] Failed to publish payment.completed:", err);
//   }
// }
