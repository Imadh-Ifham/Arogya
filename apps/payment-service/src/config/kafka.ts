// import { Kafka } from "kafkajs";
// import { env } from "./env";

// export const kafka = new Kafka({
//   clientId: "payment-service",
//   brokers: [env.kafka.broker],
// });

// export const producer = kafka.producer();

// export async function connectKafka(): Promise<void> {
//   await producer.connect();
//   console.log("[Kafka] Producer connected");
// }

// export async function disconnectKafka(): Promise<void> {
//   await producer.disconnect();
//   console.log("[Kafka] Producer disconnected");
// }
