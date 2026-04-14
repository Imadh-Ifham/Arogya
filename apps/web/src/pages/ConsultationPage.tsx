import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchAppointment } from "../modules/appointment/api/rest";
import type { Appointment } from "../modules/appointment/api/rest";
import Layout from "../components/Layout";

export default function ConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchAppointment(id)
      .then((apt) => {
        if (apt.appointmentType !== "ONLINE") {
          setError("This appointment is not an online consultation.");
          return;
        }
        if (apt.status !== "CONFIRMED") {
          setError(
            `Consultation is not available yet. Appointment status: ${apt.status}`,
          );
          return;
        }
        if (!apt.meetingUrl) {
          setError("Meeting room has not been set up for this appointment yet.");
          return;
        }
        setAppointment(apt);
      })
      .catch(() => setError("Appointment not found."));
  }, [id]);

  if (error) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1 transition-colors"
          >
            ← Back
          </button>
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        </div>
      </Layout>
    );
  }

  if (!appointment) {
    return (
      <Layout>
        <div className="text-center py-16 text-muted-foreground">Loading consultation…</div>
      </Layout>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Slim header */}
      <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        <span className="text-sm font-medium text-foreground">Video Consultation</span>
        <a
          href={appointment.meetingUrl!}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-teal hover:underline"
        >
          Open in new tab
        </a>
      </div>

      {/* Jitsi iframe */}
      <iframe
        src={appointment.meetingUrl!}
        className="flex-1 w-full border-0"
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        title="Video consultation room"
      />
    </div>
  );
}
