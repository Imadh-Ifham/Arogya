import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Activity } from "lucide-react";
import {
  getRoleHomePath,
  setFrontendRole,
  useFrontendRole,
} from "../app/frontendRole";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentRole = useFrontendRole();

  const initialRole = useMemo(
    () => (searchParams.get("role") === "doctor" ? "doctor" : "patient"),
    [searchParams],
  );
  const [role, setRole] = useState<"patient" | "doctor">(initialRole);

  useEffect(() => {
    if (currentRole) navigate(getRoleHomePath(currentRole), { replace: true });
  }, [currentRole, navigate]);

  const continueWithRole = () => {
    setFrontendRole(role);
    navigate(getRoleHomePath(role), { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <Activity className="w-7 h-7 text-teal" />
          <span className="text-xl text-foreground">Arogya</span>
        </Link>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Temporary frontend mode: registration is bypassed. Choose a role and
            continue.
          </div>

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

          <button
            type="button"
            onClick={continueWithRole}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Continue as {role}
          </button>

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
