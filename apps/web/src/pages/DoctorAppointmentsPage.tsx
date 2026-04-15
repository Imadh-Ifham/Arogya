import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  fetchDoctorAppointmentsThunk,
  acceptAppointmentThunk,
  rejectAppointmentThunk,
} from "../store/appointment/appointment.thunk";
import Layout from "../components/Layout";
import { CheckCircle2, XCircle, Clock, User, Video } from "lucide-react";
import type { AppointmentStatus } from "../modules/appointment/api/rest";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  PENDING:           "bg-amber-50   text-amber-700  border-amber-200",
  AWAITING_PAYMENT:  "bg-orange-50  text-orange-700 border-orange-200",
  PAYMENT_COMPLETED: "bg-blue-50    text-blue-700   border-blue-200",
  ACCEPTED:          "bg-teal-50    text-teal-700   border-teal-200",
  REJECTED:          "bg-red-50     text-red-700    border-red-200",
  CONFIRMED:         "bg-teal-50    text-teal-700   border-teal-200",
  CANCELLED:         "bg-red-50     text-red-700    border-red-200",
  COMPLETED:         "bg-green-50   text-green-700  border-green-200",
  NO_SHOW:           "bg-gray-100   text-gray-600   border-gray-200",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING:           "Pending",
  AWAITING_PAYMENT:  "Awaiting Payment",
  PAYMENT_COMPLETED: "Payment Received",
  ACCEPTED:          "Accepted",
  REJECTED:          "Rejected",
  CONFIRMED:         "Confirmed",
  CANCELLED:         "Cancelled",
  COMPLETED:         "Completed",
  NO_SHOW:           "No Show",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function DoctorAppointmentsPage() {
  const dispatch = useAppDispatch();
  const { doctorAppointments, doctorLoading, doctorError, actionLoading } =
    useAppSelector((s) => s.appointment);

  useEffect(() => {
    dispatch(fetchDoctorAppointmentsThunk());
  }, [dispatch]);

  // Only PAYMENT_COMPLETED appointments can be accepted/rejected
  const awaitingReview = doctorAppointments.filter(
    (a) => a.status === "PAYMENT_COMPLETED",
  );
  // Unpaid appointments are visible but the doctor can't act yet
  const unpaidAppointments = doctorAppointments.filter(
    (a) => a.status === "PENDING" || a.status === "AWAITING_PAYMENT",
  );
  const otherAppointments = doctorAppointments.filter(
    (a) =>
      a.status !== "PAYMENT_COMPLETED" &&
      a.status !== "PENDING" &&
      a.status !== "AWAITING_PAYMENT",
  );

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patient Appointments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and respond to appointment requests from your patients.
          </p>
        </div>

        {doctorLoading === "pending" && (
          <div className="text-center py-16 text-muted-foreground">Loading appointments…</div>
        )}

        {doctorError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {doctorError}
          </div>
        )}

        {/* ── Awaiting review (payment confirmed — doctor can act) ── */}
        {awaitingReview.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Awaiting Your Response ({awaitingReview.length})
            </h2>
            <div className="space-y-3">
              {awaitingReview.map((apt) => {
                const isActing = actionLoading[apt.id] === "pending";
                return (
                  <div
                    key={apt.id}
                    className="bg-card rounded-xl px-5 py-4 space-y-3 border border-blue-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <p className="font-semibold text-foreground text-sm">
                            {apt.patientName ?? "Patient"}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Requested {formatDateTime(apt.createdAt)}
                        </p>
                        <p className="text-xs text-muted-foreground/70 capitalize">
                          {apt.appointmentType.toLowerCase()} consultation
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium border rounded-full px-2.5 py-1 whitespace-nowrap ${STATUS_STYLES[apt.status]}`}
                      >
                        {STATUS_LABELS[apt.status]}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => dispatch(acceptAppointmentThunk(apt.id))}
                        disabled={isActing}
                        className="flex items-center gap-1.5 text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isActing ? "Processing…" : "Accept"}
                      </button>
                      <button
                        onClick={() => dispatch(rejectAppointmentThunk(apt.id))}
                        disabled={isActing}
                        className="flex items-center gap-1.5 text-xs bg-white text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {isActing ? "Processing…" : "Reject"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Unpaid appointments (patient hasn't completed payment yet) ── */}
        {unpaidAppointments.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Awaiting Patient Payment ({unpaidAppointments.length})
            </h2>
            <div className="space-y-3">
              {unpaidAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-card rounded-xl px-5 py-4 border border-amber-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <p className="font-semibold text-foreground text-sm">
                          {apt.patientName ?? "Patient"}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Requested {formatDateTime(apt.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground/70 capitalize">
                        {apt.appointmentType.toLowerCase()} consultation
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium border rounded-full px-2.5 py-1 whitespace-nowrap ${STATUS_STYLES[apt.status]}`}
                    >
                      {STATUS_LABELS[apt.status]}
                    </span>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    Waiting for the patient to complete payment before you can review.
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── All other appointments ── */}
        {otherAppointments.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Past & Upcoming
            </h2>
            <div className="space-y-3">
              {otherAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-card border border-border rounded-xl px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <p className="font-semibold text-foreground text-sm">
                          {apt.patientName ?? "Patient"}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(apt.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground/70 capitalize">
                        {apt.appointmentType.toLowerCase()} consultation
                      </p>
                      {apt.cancellationReason && (
                        <p className="text-xs text-red-500 mt-1">
                          Reason: {apt.cancellationReason}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={`text-xs font-medium border rounded-full px-2.5 py-1 whitespace-nowrap ${STATUS_STYLES[apt.status]}`}
                      >
                        {STATUS_LABELS[apt.status]}
                      </span>
                      {apt.appointmentType === "ONLINE" &&
                        (apt.status === "ACCEPTED" || apt.status === "CONFIRMED") && (
                          <Link
                            to={`/doctor/appointments/${apt.id}/consultation`}
                            className="flex items-center gap-1 text-xs text-teal-600 hover:underline"
                          >
                            <Video className="w-3 h-3" />
                            Join session
                          </Link>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {doctorLoading === "succeeded" && doctorAppointments.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">No appointments yet.</p>
            <p className="text-sm mt-1">Patient bookings will appear here once your profile is approved.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
