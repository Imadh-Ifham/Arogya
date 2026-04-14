import { useEffect, useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { bookAppointmentThunk } from "../store/appointment/appointment.thunk";
import { resetBookingStatus, clearAppointmentError } from "../store/appointment/appointment.slice";
import { getDoctorLabel } from "../data/mockDoctors";
import { fetchSlot } from "../modules/appointment/api/rest";
import type { Slot, AppointmentType } from "../modules/appointment/api/rest";
import Layout from "../components/Layout";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function BookPage() {
  const { slotId } = useParams<{ slotId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { bookingLoading, error } = useAppSelector((s) => s.appointment);

  const [slot, setSlot] = useState<Slot | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>("PHYSICAL");

  useEffect(() => {
    dispatch(resetBookingStatus());
    dispatch(clearAppointmentError());

    if (!slotId) return;
    fetchSlot(slotId)
      .then(setSlot)
      .catch(() => setSlotError("Slot not found or no longer available."));
  }, [slotId, dispatch]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!slotId) return;

    const result = await dispatch(bookAppointmentThunk({ slotId, appointmentType }));
    if (bookAppointmentThunk.fulfilled.match(result)) {
      const { checkoutUrl } = result.payload;
      if (checkoutUrl) {
        // PHYSICAL appointment — redirect patient to Stripe Checkout
        window.location.href = checkoutUrl;
      } else {
        navigate("/appointments");
      }
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1 transition-colors"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-6">Book Appointment</h1>

        {slotError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            {slotError}
          </div>
        )}

        {slot && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-2">
            <p className="font-semibold text-foreground">{getDoctorLabel(slot.doctorId)}</p>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(slot.startTime)} → {formatDateTime(slot.endTime)}
            </p>
            <p className="text-primary font-bold text-lg">
              LKR{Number(slot.fee).toLocaleString("en-IN")}
            </p>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Appointment type
            </label>
            <div className="flex gap-3">
              {(["PHYSICAL", "ONLINE"] as AppointmentType[]).map((type) => (
                <label
                  key={type}
                  className={`flex-1 flex items-center justify-center gap-2 border rounded-lg py-2.5 text-sm cursor-pointer transition-colors ${
                    appointmentType === type
                      ? "border-border bg-secondary text-foreground font-medium"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <input
                    type="radio"
                    name="appointmentType"
                    value={type}
                    checked={appointmentType === type}
                    onChange={() => setAppointmentType(type)}
                    className="sr-only"
                  />
                  {type === "PHYSICAL" ? "🏥 In-person" : "💻 Online"}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={bookingLoading === "pending" || !slot}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {bookingLoading === "pending"
              ? "Processing…"
              : appointmentType === "PHYSICAL"
              ? "Continue to Payment"
              : "Confirm Booking"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
