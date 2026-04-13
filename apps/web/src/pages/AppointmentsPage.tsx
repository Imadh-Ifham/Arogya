import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchMyAppointmentsThunk } from "../store/appointment/appointment.thunk";
import { getDoctorName } from "../data/mockDoctors";
import Layout from "../components/Layout";
import type { AppointmentStatus } from "../modules/appointment/api/rest";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  PENDING:    "bg-yellow-50 text-yellow-700 border-yellow-200",
  CONFIRMED:  "bg-green-50 text-green-700 border-green-200",
  CANCELLED:  "bg-red-50 text-red-700 border-red-200",
  COMPLETED:  "bg-blue-50 text-blue-700 border-blue-200",
  NO_SHOW:    "bg-gray-100 text-gray-600 border-gray-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function AppointmentsPage() {
  const dispatch = useAppDispatch();
  const { appointments, loading, error } = useAppSelector((s) => s.appointment);

  useEffect(() => {
    dispatch(fetchMyAppointmentsThunk());
  }, [dispatch]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
        <Link
          to="/slots"
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Book New
        </Link>
      </div>

      {loading === "pending" && (
        <div className="text-center py-16 text-gray-400">Loading appointments…</div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading === "succeeded" && appointments.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No appointments yet.</p>
          <Link to="/slots" className="text-blue-600 hover:underline text-sm mt-1 inline-block">
            Browse available slots →
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {appointments.map((apt) => (
          <Link
            key={apt.id}
            to={`/appointments/${apt.id}`}
            className="block bg-white border border-gray-200 rounded-xl px-5 py-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <p className="font-semibold text-gray-800 text-sm">
                  {getDoctorName(apt.doctorId)}
                </p>
                <p className="text-xs text-gray-500">Booked {formatDate(apt.createdAt)}</p>
                <p className="text-xs text-gray-400 capitalize">{apt.appointmentType.toLowerCase()}</p>
              </div>
              <span
                className={`text-xs font-medium border rounded-full px-2.5 py-1 whitespace-nowrap ${STATUS_STYLES[apt.status]}`}
              >
                {apt.status}
              </span>
            </div>

            {apt.meetingUrl && (
              <a
                href={apt.meetingUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-3 inline-block text-xs text-blue-600 hover:underline"
              >
                Join video call →
              </a>
            )}
          </Link>
        ))}
      </div>
    </Layout>
  );
}
