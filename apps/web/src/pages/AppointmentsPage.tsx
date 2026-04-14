import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchMyAppointmentsThunk } from "../store/appointment/appointment.thunk";
import Layout from "../components/Layout";
import type { AppointmentStatus } from "../modules/appointment/api/rest";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-light text-amber border-border",
  CONFIRMED: "bg-teal-light text-teal border-border",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  COMPLETED: "bg-sage-light text-green-700 border-border",
  NO_SHOW: "bg-muted text-muted-foreground border-border",
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
        <h1 className="text-2xl font-bold text-foreground">My Appointments</h1>
        <Link
          to="/slots"
          className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          + Book New
        </Link>
      </div>

      {loading === "pending" && (
        <div className="text-center py-16 text-muted-foreground">Loading appointments…</div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading === "succeeded" && appointments.length === 0 && (
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
                <p className="text-xs text-muted-foreground">Booked {formatDate(apt.createdAt)}</p>
                <p className="text-xs text-muted-foreground/70 capitalize">{apt.appointmentType.toLowerCase()}</p>
              </div>
              <span
                className={`text-xs font-medium border rounded-full px-2.5 py-1 whitespace-nowrap ${STATUS_STYLES[apt.status]}`}
              >
                {apt.status}
              </span>
            </div>

            {apt.appointmentType === "ONLINE" && apt.status === "CONFIRMED" && (
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
