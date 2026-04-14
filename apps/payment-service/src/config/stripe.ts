import Stripe from "stripe";
import { env } from "./env";

// When STRIPE_SECRET_KEY is absent (dev/CI without Stripe), the client is
// initialised with a placeholder. Real API calls will fail at runtime — that
// is intentional. The service still starts so health checks pass.
export const stripe = new Stripe(env.stripe.secretKey || "sk_placeholder");
