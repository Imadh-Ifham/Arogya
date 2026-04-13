import { JwtPayload } from "./auth.types";

// Declaration merging — we're adding our custom field to Express's
// existing Request interface without modifying the library itself.
// After this, req.user is fully typed everywhere in the codebase.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
