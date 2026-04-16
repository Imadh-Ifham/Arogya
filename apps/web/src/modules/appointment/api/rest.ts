import api from "../../../lib/api";

export type SlotStatus = "AVAILABLE" | "BOOKED";
export type AppointmentStatus =
  | "PENDING"
  | "AWAITING_PAYMENT"
  | "PAYMENT_COMPLETED"
  | "ACCEPTED"
  | "REJECTED"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";
export type AppointmentType = "PHYSICAL" | "ONLINE";

export interface Slot {
  id: string;
  doctorId: string;
  doctorName?: string;
  startTime: string;
  endTime: string;
  fee: number;
  status: SlotStatus;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  slotId: string;
  status: AppointmentStatus;
  appointmentType: AppointmentType;
  paymentId: string | null;
  checkoutUrl: string | null;
  meetingUrl: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  doctorName?: string | null;
  patientName?: string | null;
  slotStartTime?: string | null;
  slotEndTime?: string | null;
}

export interface SlotsFilter {
  doctorId?: string;
  date?: string;      // ISO date string YYYY-MM-DD
  specialty?: string;
}

export async function fetchSlots(filter?: SlotsFilter): Promise<Slot[]> {
  const params: Record<string, string> = {};
  if (filter?.doctorId) params.doctorId = filter.doctorId;
  if (filter?.date) params.date = filter.date;
  if (filter?.specialty) params.specialty = filter.specialty;
  const { data } = await api.get("/appointments/slots", { params });
  return data as Slot[];
}

export async function fetchSlot(slotId: string): Promise<Slot> {
  const { data } = await api.get(`/appointments/slots/${slotId}`);
  return data as Slot;
}

export async function bookAppointment(payload: {
  slotId: string;
  appointmentType: AppointmentType;
}): Promise<Appointment> {
  const { data } = await api.post("/appointments", payload);
  return data as Appointment;
}

export async function fetchMyAppointments(): Promise<Appointment[]> {
  const { data } = await api.get("/appointments/my");
  return data as Appointment[];
}

export async function fetchAppointment(id: string): Promise<Appointment> {
  const { data } = await api.get(`/appointments/${id}`);
  return data as Appointment;
}

export async function cancelAppointment(id: string, cancellationReason?: string): Promise<Appointment> {
  const { data } = await api.patch(`/appointments/${id}/cancel`, { cancellationReason });
  return data as Appointment;
}

export async function rescheduleAppointment(id: string, newSlotId: string): Promise<Appointment> {
  const { data } = await api.patch(`/appointments/${id}/reschedule`, { newSlotId });
  return data as Appointment;
}

export async function fetchDoctorAppointments(): Promise<Appointment[]> {
  const { data } = await api.get("/appointments/doctor");
  return data as Appointment[];
}

export async function acceptAppointment(id: string): Promise<Appointment> {
  const { data } = await api.patch(`/appointments/${id}/accept`);
  return data as Appointment;
}

export async function rejectAppointment(id: string): Promise<Appointment> {
  const { data } = await api.patch(`/appointments/${id}/reject`);
  return data as Appointment;
}

/** DEV ONLY — simulates Stripe webhook success for a payment that is PENDING in payment-service */
export async function devSimulatePayment(paymentId: string): Promise<void> {
  await api.post(`/payments/dev/simulate-success/${paymentId}`);
}

/** Mark appointment as COMPLETED after a telemedicine session ends. */
export async function completeAppointment(id: string): Promise<Appointment> {
  const { data } = await api.patch(`/appointments/${id}/complete`);
  return data as Appointment;
}
