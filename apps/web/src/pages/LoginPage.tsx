import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Activity } from "lucide-react";
import {
  getRoleHomePath,
  setFrontendRole,
  useFrontendRole,
} from "../app/frontendRole";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentRole = useFrontendRole();

  const from = (location.state as any)?.from?.pathname;

  const [tab, setTab] = useState<"patient" | "doctor" | "admin">("patient");

  // If a role is already selected, go straight to its default area.
  useEffect(() => {
    if (currentRole)
      navigate(from ?? getRoleHomePath(currentRole), { replace: true });
  }, [currentRole, from, navigate]);

  const continueWithRole = () => {
    setFrontendRole(tab);
    navigate(from ?? getRoleHomePath(tab), { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <Activity className="w-7 h-7 text-teal" />
          <span className="text-xl text-foreground">Arogya</span>
        </Link>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Temporary frontend mode: authentication is bypassed. Choose a role
            to continue.
          </div>

          <div className="flex bg-secondary rounded-lg p-1 mb-6">
            {(["patient", "doctor", "admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTab(r)}
                className={`flex-1 py-2 rounded-md text-sm capitalize transition-colors ${
                  tab === r
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {r === "admin" ? "Admin" : `${r} Login`}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={continueWithRole}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Continue as {tab === "admin" ? "Admin" : tab}
          </button>

          {tab !== "admin" && (
            <p className="text-sm text-muted-foreground text-center mt-6">
              Don't have an account?{" "}
              <Link
                to={`/register?role=${tab}`}
                className="text-teal hover:underline"
              >
                Register
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
