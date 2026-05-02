import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  fetchDoctorAppointmentsThunk,
  acceptAppointmentThunk,
  rejectAppointmentThunk,
} from "../store/appointment/appointment.thunk";
import Layout from "../components/Layout";
import { CheckCircle2, XCircle, Clock, User, Video, ArrowRight } from "lucide-react";
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
  EXPIRED:           "bg-gray-100   text-gray-500   border-gray-200",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING:           "Pending",
  AWAITING_PAYMENT:  "Payment Pending",
  PAYMENT_COMPLETED: "Awaiting Approval",
  ACCEPTED:          "Approved",
  REJECTED:          "Rejected",
  CONFIRMED:         "Confirmed",
  CANCELLED:         "Cancelled",
  COMPLETED:         "Completed",
  NO_SHOW:           "No Show",
  EXPIRED:           "Expired",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function DoctorAppointmentsPage() {
  const dispatch = useAppDispatch();
  const { doctorAppointments, doctorLoading, doctorError, actionLoading } =
    useAppSelector((s) => s.appointment);

  const [acceptedOnlineId, setAcceptedOnlineId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchDoctorAppointmentsThunk());
  }, [dispatch]);

  const handleAccept = async (aptId: string, isOnline: boolean) => {
    const result = await dispatch(acceptAppointmentThunk(aptId));
    if (acceptAppointmentThunk.fulfilled.match(result) && isOnline) {
      setAcceptedOnlineId(aptId);
    }
  };

  // PHYSICAL appointments: PAYMENT_COMPLETED means payment confirmed via Stripe → doctor can act
  // ONLINE appointments: PAYMENT_COMPLETED also means payment confirmed → doctor can act
  const awaitingReview = doctorAppointments.filter(
    (a) => a.status === "PAYMENT_COMPLETED",
  );
  // Pending/in-flight payment — patient is in the process of paying (transient Stripe state)
  // For PHYSICAL: AWAITING_PAYMENT means patient is on the Stripe checkout page
  // For ONLINE: AWAITING_PAYMENT or PENDING means not yet paid
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

        {/* ── Online appointment accepted — telemedicine CTA ── */}
        {acceptedOnlineId && (
          <div className="flex items-center justify-between gap-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Online appointment accepted</p>
                <p className="text-xs text-green-700 mt-0.5">
                  A telemedicine consultation room has been created for this appointment.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={`/doctor/appointments/${acceptedOnlineId}/consultation`}
                className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Video className="w-3.5 h-3.5" />
                Open Room
              </Link>
              <Link
                to="/telemedicine"
                className="flex items-center gap-1.5 text-xs border border-green-300 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
              >
                All consultations
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setAcceptedOnlineId(null)}
                className="text-green-500 hover:text-green-700 text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

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
                          {apt.slotStartTime ? formatDateTime(apt.slotStartTime) : formatDateTime(apt.createdAt)}
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
                        onClick={() => handleAccept(apt.id, apt.appointmentType === "ONLINE")}
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

        {/* ── Unpaid appointments (payment not yet confirmed) ── */}
        {unpaidAppointments.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Payment In Progress ({unpaidAppointments.length})
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
                    {apt.appointmentType === "PHYSICAL"
                      ? "Payment is being processed — you will be able to approve or reject once confirmed."
                      : "Waiting for the patient to complete payment before you can review."}
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
