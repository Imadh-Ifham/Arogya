import React, { useMemo, useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { registerThunk, fetchMeThunk } from "../store/auth/auth.thunk";
import { clearAuthError } from "../store/auth/auth.slice";
import { registerDoctor } from "../modules/doctor/api/rest";
import { Activity, Eye, EyeOff } from "lucide-react";

type Role = "patient" | "doctor" | "admin";

const SPECIALTIES = [
  "Cardiology",
  "Dermatology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "General Medicine",
  "ENT",
  "Ophthalmology",
  "Gynecology",
];

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, error, accessToken } = useAppSelector((s) => s.auth);

  const initialRole = useMemo(
    () => (searchParams.get("role") === "doctor" ? "doctor" : "patient"),
    [searchParams],
  );
  const [role, setRole] = useState<Exclude<Role, "admin">>(initialRole);
  const [showPw, setShowPw] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) navigate("/appointments", { replace: true }); // already logged in before landing here
  }, [accessToken, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setClientError(null);

    if (password !== confirmPassword) {
      setClientError("Passwords do not match");
      return;
    }

    if (role === "doctor" && !specialty) {
      setClientError("Please select your specialty");
      return;
    }

    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? "";
    const lastName = parts.slice(1).join(" ") || undefined;

    dispatch(clearAuthError());

    // Step 1: Create auth account
    const authResult = await dispatch(
      registerThunk({
        email,
        password,
        role: role as Role,
        firstName: firstName || undefined,
        lastName,
        phoneNumber: phoneNumber || undefined,
      }),
    );

    if (!registerThunk.fulfilled.match(authResult)) return;

    // Step 2: Fetch user profile (needed to get the userId for doctor registration)
    const meResult = await dispatch(fetchMeThunk());

    // Step 3: For doctors, create the doctor profile in the doctor service
    if (role === "doctor") {
      const userId = fetchMeThunk.fulfilled.match(meResult)
        ? meResult.payload._id
        : undefined;
      try {
        await registerDoctor({
          name: fullName.trim(),
          specialty,
          licenseNumber: licenseNo || undefined,
          ...(userId && { authUserId: userId }),
        });
      } catch {
        // Auth account was created successfully. Doctor profile creation failed
        // (e.g. doctor service is down). User can retry from their profile page.
      }
    }

    navigate(role === "doctor" ? "/doctor/dashboard" : "/appointments", {
      replace: true,
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <Activity className="w-7 h-7 text-teal" />
          <span className="text-xl text-foreground">Arogya</span>
        </Link>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <div className="flex bg-secondary rounded-lg p-1 mb-6">
            {(["patient", "doctor"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-md text-sm capitalize transition-colors ${
                  role === r
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {r} Registration
              </button>
            ))}
          </div>

          {(clientError || error) && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {clientError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-foreground block mb-1.5">
                Full Name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter your full name"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="text-sm text-foreground block mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-sm text-foreground block mb-1.5">
                Phone Number
              </label>
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="+94 7X XXX XXXX"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>

            {role === "doctor" && (
              <>
                <div>
                  <label className="text-sm text-foreground block mb-1.5">
                    Specialty <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select specialty…</option>
                    {SPECIALTIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-foreground block mb-1.5">
                    Medical License No.
                  </label>
                  <input
                    value={licenseNo}
                    onChange={(e) => setLicenseNo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter license number"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-sm text-foreground block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground pr-10 focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Create a password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-foreground block mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Confirm password"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading === "pending"}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading === "pending" ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-teal hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
