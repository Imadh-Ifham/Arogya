import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { cancelAppointmentThunk, rescheduleAppointmentThunk } from "../store/appointment/appointment.thunk";
import { fetchSlotsThunk } from "../store/appointment/appointment.thunk";
import { fetchAppointment } from "../modules/appointment/api/rest";
import type { Appointment } from "../modules/appointment/api/rest";
import { getDoctorLabel, getDoctorName } from "../data/mockDoctors";
import Layout from "../components/Layout";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

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

  const canModify = appointment?.status === "PENDING" || appointment?.status === "CONFIRMED";
  const availableSlots = slots.filter((s) => s.status === "AVAILABLE");

  return (
    <Layout>
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
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
          <h1 className="text-2xl font-bold text-gray-900">Appointment Detail</h1>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-start">
              <p className="font-semibold text-gray-800">{getDoctorName(appointment.doctorId)}</p>
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {appointment.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 capitalize">
              Type: {appointment.appointmentType.toLowerCase()}
            </p>
            <p className="text-xs text-gray-400">Booked {formatDateTime(appointment.createdAt)}</p>
            <p className="text-xs text-gray-400">Updated {formatDateTime(appointment.updatedAt)}</p>
            {appointment.cancellationReason && (
              <p className="text-sm text-red-500">
                Reason: {appointment.cancellationReason}
              </p>
            )}
            {appointment.meetingUrl && (
              <a
                href={appointment.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm text-blue-600 hover:underline"
              >
                Join video call →
              </a>
            )}
          </div>

          {actionError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {actionError}
            </div>
          )}

          {canModify && (
            <div className="flex gap-3">
              <button
                onClick={() => { setShowReschedule(false); setShowCancel((v) => !v); }}
                className="flex-1 border border-red-300 text-red-600 text-sm py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                Cancel Appointment
              </button>
              <button
                onClick={() => { setShowCancel(false); setShowReschedule((v) => !v); }}
                className="flex-1 border border-blue-300 text-blue-600 text-sm py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Reschedule
              </button>
            </div>
          )}

          {showCancel && (
            <div className="bg-white border border-red-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Reason (optional)</p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
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
            <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Select a new slot</p>
              {availableSlots.length === 0 ? (
                <p className="text-sm text-gray-400">No available slots right now.</p>
              ) : (
                <select
                  value={selectedNewSlot}
                  onChange={(e) => setSelectedNewSlot(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
