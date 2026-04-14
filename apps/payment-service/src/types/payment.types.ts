// ─── Request types ────────────────────────────────────────────────────────────

export interface InitiatePaymentBody {
  appointmentId: string;
  amount: number;
  patientId: string;
  doctorId: string;
  currency?: string; // defaults to "LKR"
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface InitiatePaymentResponse {
  paymentId: string;
  checkoutUrl: string;
  status: "PENDING";
  amount: number;
  currency: string;
}

// ─── Trusted headers from API Gateway ─────────────────────────────────────────

export interface GatewayHeaders {
  "x-user-id"?: string;
  "x-user-role"?: string;
  "x-user-email"?: string;
}
