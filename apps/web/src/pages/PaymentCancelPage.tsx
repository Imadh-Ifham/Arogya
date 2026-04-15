import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

/**
 * Landing page when the patient cancels out of Stripe Checkout.
 * The appointment is still reserved (slot stays BOOKED) and the status rolls
 * back to PENDING so the patient can retry payment from their appointments list.
 */
export default function PaymentCancelPage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="text-5xl">✕</div>
        <h1 className="text-2xl font-bold text-foreground">Payment Cancelled</h1>
        <p className="text-muted-foreground text-sm">
          Your appointment slot is still reserved. You can complete payment from
          your appointments list.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => navigate("/appointments", { replace: true })}
            className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            View My Appointments
          </button>
          <button
            onClick={() => navigate("/slots")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Browse other slots
          </button>
        </div>
      </div>
    </Layout>
  );
}
