import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { cancelAppointmentThunk, rescheduleAppointmentThunk } from "../store/appointment/appointment.thunk";
import { fetchSlotsThunk } from "../store/appointment/appointment.thunk";
import { fetchAppointment } from "../modules/appointment/api/rest";
import type { Appointment, AppointmentStatus } from "../modules/appointment/api/rest";
import { getDoctorLabel, getDoctorName } from "../data/mockDoctors";
import Layout from "../components/Layout";
import { Video } from "lucide-react";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  PENDING:           "bg-amber-50    text-amber-700  border-amber-200",
  AWAITING_PAYMENT:  "bg-orange-50   text-orange-700 border-orange-200",
  PAYMENT_COMPLETED: "bg-teal-50     text-teal-700   border-teal-200",
  ACCEPTED:          "bg-green-50    text-green-700  border-green-200",
  REJECTED:          "bg-red-50      text-red-700    border-red-200",
  CONFIRMED:         "bg-teal-50     text-teal-700   border-teal-200",
  CANCELLED:         "bg-red-50      text-red-700    border-red-200",
  COMPLETED:         "bg-green-50    text-green-700  border-green-200",
  NO_SHOW:           "bg-gray-100    text-gray-600   border-gray-200",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING:           "Pending",
  AWAITING_PAYMENT:  "Awaiting Payment",
  PAYMENT_COMPLETED: "Confirmed",
  ACCEPTED:          "Accepted",
  REJECTED:          "Rejected",
  CONFIRMED:         "Confirmed",
  CANCELLED:         "Cancelled",
  COMPLETED:         "Completed",
  NO_SHOW:           "No Show",
};

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { slots } = useAppSelector((s) => s.appointment);

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedNewSlot, setSelectedNewSlot] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchAppointment(id)
      .then(setAppointment)
      .catch(() => setLoadError("Appointment not found."));
    dispatch(fetchSlotsThunk(undefined));
  }, [id, dispatch]);

  const handleCancel = async () => {
    if (!id) return;
    setActionError(null);
    const result = await dispatch(cancelAppointmentThunk({ id, reason: cancelReason || undefined }));
    if (cancelAppointmentThunk.fulfilled.match(result)) {
      setAppointment(result.payload);
      setShowCancel(false);
    } else {
      setActionError(result.payload as string ?? "Cancel failed");
    }
  };

  const handleReschedule = async () => {
    if (!id || !selectedNewSlot) return;
    setActionError(null);
    const result = await dispatch(rescheduleAppointmentThunk({ id, newSlotId: selectedNewSlot }));
    if (rescheduleAppointmentThunk.fulfilled.match(result)) {
      setAppointment(result.payload);
      setShowReschedule(false);
    } else {
      setActionError(result.payload as string ?? "Reschedule failed");
    }
  };

  // Patient can cancel while payment is pending or after payment (until doctor acts)
  const canCancel =
    appointment?.status === "PENDING" ||
    appointment?.status === "AWAITING_PAYMENT" ||
    appointment?.status === "PAYMENT_COMPLETED" ||
    appointment?.status === "ACCEPTED" ||
    appointment?.status === "CONFIRMED";

  // Reschedule only makes sense before payment is initiated
  const canReschedule =
    appointment?.status === "PENDING" ||
    appointment?.status === "CONFIRMED";

  const availableSlots = slots.filter((s) => s.status === "AVAILABLE");

  return (
    <Layout>
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1 transition-colors"
      >
        ← Back
      </button>

      {loadError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {loadError}
        </div>
      )}

      {appointment && (
        <div className="max-w-lg space-y-5">
          <h1 className="text-2xl font-bold text-foreground">Appointment Detail</h1>

          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-start">
              <p className="font-semibold text-foreground">{getDoctorName(appointment.doctorId)}</p>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLES[appointment.status]}`}
              >
                {STATUS_LABELS[appointment.status]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground capitalize">
              Type: {appointment.appointmentType.toLowerCase()}
            </p>
            {appointment.slotStartTime && (
              <p className="text-xs text-muted-foreground/70">
                Appointment: {formatDateTime(appointment.slotStartTime)}
                {appointment.slotEndTime && ` – ${new Date(appointment.slotEndTime).toLocaleTimeString("en-IN", { timeStyle: "short" })}`}
              </p>
            )}
            <p className="text-xs text-muted-foreground/70">Booked on {formatDateTime(appointment.createdAt)}</p>
            {appointment.cancellationReason && (
              <p className="text-sm text-red-500">
                Reason: {appointment.cancellationReason}
              </p>
            )}
            {appointment.appointmentType === "ONLINE" &&
              (appointment.status === "ACCEPTED" || appointment.status === "CONFIRMED") && (
              <div className="pt-2 border-t border-border mt-2">
                <Link
                  to={`/appointments/${appointment.id}/consultation`}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Video className="w-4 h-4" />
                  Join Video Consultation
                </Link>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Your online consultation room is ready.
                </p>
              </div>
            )}
            {appointment.appointmentType === "ONLINE" && appointment.status === "COMPLETED" && (
              <div className="pt-2 border-t border-border mt-2">
                <Link
                  to={`/appointments/${appointment.id}/consultation`}
                  className="inline-flex items-center gap-2 border border-border text-foreground text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-secondary transition-colors"
                >
                  <Video className="w-4 h-4" />
                  View Session Notes
                </Link>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Your consultation has ended. Any released clinical notes are available here.
                </p>
              </div>
            )}
          </div>

          {/* Payment banner — shown while payment is still required */}
          {appointment.status === "AWAITING_PAYMENT" && appointment.checkoutUrl && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-orange-800">Payment required to confirm your booking</p>
              <p className="text-xs text-orange-600">
                Your slot is reserved. Complete the payment within the session window to secure your appointment.
              </p>
              <a
                href={appointment.checkoutUrl}
                className="inline-block mt-1 text-sm bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Complete Payment →
              </a>
            </div>
          )}

          {/* Doctor rejected — inform patient */}
          {appointment.status === "REJECTED" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-medium text-red-700">This appointment was not accepted by the doctor.</p>
              <p className="text-xs text-red-500 mt-1">
                You may book a new appointment with another available slot.
              </p>
              <Link
                to="/slots"
                className="inline-block mt-2 text-xs text-primary hover:underline"
              >
                Browse available slots →
              </Link>
            </div>
          )}

          {actionError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {actionError}
            </div>
          )}

          {(canCancel || canReschedule) && (
            <div className="flex gap-3">
              {canCancel && (
                <button
                  onClick={() => { setShowReschedule(false); setShowCancel((v) => !v); }}
                  className="flex-1 border border-red-300 text-red-600 text-sm py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Cancel Appointment
                </button>
              )}
              {canReschedule && (
                <button
                  onClick={() => { setShowCancel(false); setShowReschedule((v) => !v); }}
                  className="flex-1 border border-border text-foreground text-sm py-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  Reschedule
                </button>
              )}
            </div>
          )}

          {showCancel && (
            <div className="bg-card border border-red-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Reason (optional)</p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                placeholder="e.g. Schedule conflict"
              />
              <button
                onClick={handleCancel}
                className="w-full bg-red-600 text-white text-sm py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm Cancellation
              </button>
            </div>
          )}

          {showReschedule && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Select a new slot</p>
              {availableSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No available slots right now.</p>
              ) : (
                <select
                  value={selectedNewSlot}
                  onChange={(e) => setSelectedNewSlot(e.target.value)}
                  className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">-- pick a slot --</option>
                  {availableSlots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {getDoctorLabel(s.doctorId)} · {formatDateTime(s.startTime)} · LKR{Number(s.fee).toLocaleString("en-IN")}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={handleReschedule}
                disabled={!selectedNewSlot}
                className="w-full bg-primary text-primary-foreground text-sm py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Confirm Reschedule
              </button>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
