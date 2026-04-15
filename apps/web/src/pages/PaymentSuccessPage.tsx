import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../app/hooks";
import { fetchMyAppointmentsThunk } from "../store/appointment/appointment.thunk";
import Layout from "../components/Layout";

/**
 * Landing page after Stripe redirects the patient back on success.
 * URL: /payments/success?session_id=cs_...
 *
 * Stripe fires the webhook asynchronously, so the appointment may still be in
 * AWAITING_PAYMENT for a few seconds. We re-fetch the appointments list (which
 * refreshes Redux state) and then redirect to /appointments.
 */
export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Refresh the appointments list in the background so the patient sees the
    // updated status when they land on /appointments.
    dispatch(fetchMyAppointmentsThunk());

    // Short countdown then redirect — gives the webhook a moment to propagate
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          navigate("/appointments", { replace: true });
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [dispatch, navigate]);

  return (
    <Layout>
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="text-5xl">✓</div>
        <h1 className="text-2xl font-bold text-foreground">Payment Successful</h1>
        <p className="text-muted-foreground text-sm">
          Your appointment has been booked and your payment is confirmed.
          The doctor will review and accept your appointment shortly.
        </p>
        {sessionId && (
          <p className="text-xs text-muted-foreground/60 font-mono break-all">
            Ref: {sessionId}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Redirecting to your appointments in {countdown}s…
        </p>
        <button
          onClick={() => navigate("/appointments", { replace: true })}
          className="text-sm text-teal-600 hover:underline"
        >
          Go now →
        </button>
      </div>
    </Layout>
  );
}
