import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchMyAppointmentsThunk, devSimulatePaymentThunk } from "../store/appointment/appointment.thunk";
import Layout from "../components/Layout";
import type { AppointmentStatus } from "../modules/appointment/api/rest";

// Poll interval for PHYSICAL appointments awaiting doctor approval (ms)
const APPROVAL_POLL_INTERVAL_MS = 10_000;

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  PENDING:           "bg-amber-light  text-amber       border-border",
  AWAITING_PAYMENT:  "bg-orange-50    text-orange-700  border-orange-200",
  PAYMENT_COMPLETED: "bg-blue-50      text-blue-700    border-blue-200",
  ACCEPTED:          "bg-green-50     text-green-700   border-green-200",
  REJECTED:          "bg-red-50       text-red-700     border-red-200",
  CONFIRMED:         "bg-teal-light   text-teal        border-border",
  CANCELLED:         "bg-red-50       text-red-700     border-red-200",
  COMPLETED:         "bg-sage-light   text-green-700   border-border",
  NO_SHOW:           "bg-muted        text-muted-foreground border-border",
  EXPIRED:           "bg-gray-100     text-gray-500    border-gray-200",
};

// Patient-friendly display labels
const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING:           "Pending",
  AWAITING_PAYMENT:  "Awaiting Payment",
  PAYMENT_COMPLETED: "Awaiting Approval",
  ACCEPTED:          "Approved",
  REJECTED:          "Rejected",
  CONFIRMED:         "Confirmed",
  CANCELLED:         "Cancelled",
  COMPLETED:         "Completed",
  NO_SHOW:           "No Show",
  EXPIRED:           "Expired",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function AppointmentsPage() {
  const dispatch = useAppDispatch();
  const { appointments, appointmentsLoading, error } = useAppSelector((s) => s.appointment);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Always fetch fresh on mount — Redux may hold stale data from before a booking
  useEffect(() => {
    dispatch(fetchMyAppointmentsThunk());
  }, [dispatch]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time polling: while any PHYSICAL in-person appointment is awaiting doctor
  // approval, poll every 10 s so the patient sees status changes without a page refresh.
  // Polling stops automatically once all such appointments have been resolved.
  useEffect(() => {
    const hasAwaitingApproval = appointments.some(
      (a) => a.appointmentType === "PHYSICAL" && a.status === "PAYMENT_COMPLETED",
    );

    if (hasAwaitingApproval) {
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(() => {
          dispatch(fetchMyAppointmentsThunk());
        }, APPROVAL_POLL_INTERVAL_MS);
      }
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [appointments, dispatch]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Appointments</h1>
        <Link
          to="/slots"
          className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          + Book New
        </Link>
      </div>

      {appointmentsLoading === "pending" && (
        <div className="text-center py-16 text-muted-foreground">Loading appointments…</div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {appointmentsLoading === "succeeded" && appointments.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No appointments yet.</p>
          <Link to="/slots" className="text-teal hover:underline text-sm mt-1 inline-block">
            Browse available slots →
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {appointments.map((apt) => (
          <Link
            key={apt.id}
            to={`/appointments/${apt.id}`}
            className="block bg-card border border-border rounded-xl px-5 py-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground text-sm">
                  {apt.doctorName ?? "Doctor"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {apt.slotStartTime ? formatDate(apt.slotStartTime) : formatDate(apt.createdAt)}
                </p>
                <p className="text-xs text-muted-foreground/70 capitalize">{apt.appointmentType.toLowerCase()}</p>
              </div>
              <span
                className={`text-xs font-medium border rounded-full px-2.5 py-1 whitespace-nowrap ${STATUS_STYLES[apt.status]}`}
              >
                {STATUS_LABELS[apt.status]}
              </span>
            </div>

            {/* Payment prompt — shown if patient hasn't completed payment yet */}
            {apt.status === "AWAITING_PAYMENT" && (
              <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                {apt.paymentId && (
                  <button
                    onClick={() => dispatch(devSimulatePaymentThunk(apt.paymentId!))}
                    className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    {apt.appointmentType === "ONLINE" ? "Confirm online consultation" : "Confirm physical session"}
                  </button>
                )}
              </div>
            )}

            {/* Live polling indicator — shown while awaiting doctor's decision on in-person appointments */}
            {apt.appointmentType === "PHYSICAL" && apt.status === "PAYMENT_COMPLETED" && (
              <p className="mt-2 text-xs text-blue-500">
                Waiting for the doctor to approve or reject — this page updates automatically.
              </p>
            )}

            {/* Video consultation link for confirmed online appointments */}
            {apt.appointmentType === "ONLINE" &&
              (apt.status === "ACCEPTED" || apt.status === "CONFIRMED") && (
              <Link
                to={`/appointments/${apt.id}/consultation`}
                onClick={(e) => e.stopPropagation()}
                className="mt-3 inline-block text-xs text-teal hover:underline"
              >
                Join video consultation →
              </Link>
            )}
          </Link>
        ))}
      </div>
    </Layout>
  );
}
