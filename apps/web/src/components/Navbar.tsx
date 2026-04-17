import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import {
  clearFrontendRole,
  getRoleHomePath,
  setFrontendRole,
  useFrontendRole,
  type FrontendRole,
} from "../app/frontendRole";

export default function Navbar() {
  const navigate = useNavigate();
  const role = useFrontendRole();

  const isDoctor = role === "doctor";
  const isAdmin = role === "admin";

  const setRole = (nextRole: FrontendRole) => {
    setFrontendRole(nextRole);
    navigate(getRoleHomePath(nextRole));
  };

  const handleLogout = () => {
    clearFrontendRole();
    navigate("/", { replace: true });
  };

  return (
    <nav className="bg-card border-b border-border px-6 py-3 flex items-center justify-between">
      <Link
        to={role ? getRoleHomePath(role) : "/"}
        className="text-xl font-semibold text-foreground tracking-tight"
      >
        Arogya
      </Link>

      <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
        {isDoctor ? (
          /* ── Doctor nav links ── */
          <>
            <Link
              to="/doctor/dashboard"
              className="hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/doctor/profile"
              className="hover:text-foreground transition-colors"
            >
              My Profile
            </Link>
            <Link
              to="/doctor/availability"
              className="hover:text-foreground transition-colors"
            >
              Availability
            </Link>
          </>
        ) : (
          /* ── Patient / public nav links ── */
          <>
            <Link
              to="/slots"
              className="hover:text-foreground transition-colors"
            >
              Browse Slots
            </Link>
            <Link
              to="/search"
              className="hover:text-foreground transition-colors"
            >
              Find Doctors
            </Link>
            <Link
              to="/symptom-checker"
              className="hover:text-foreground transition-colors"
            >
              Symptom Checker
            </Link>
            {role === "patient" && (
              <>
                <Link
                  to="/appointments"
                  className="hover:text-foreground transition-colors"
                >
                  My Appointments
                </Link>
                <Link
                  to="/profile"
                  className="hover:text-foreground transition-colors"
                >
                  Profile
                </Link>
              </>
            )}
          </>
        )}

        {isAdmin && (
          <Link
            to="/admin/dashboard"
            className="hover:text-foreground transition-colors"
          >
            Admin Dashboard
          </Link>
        )}

        <ThemeToggle />

        {role ? (
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1">
              {(["patient", "doctor", "admin"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRole(option)}
                  className={`px-2 py-1 rounded-md border text-xs capitalize transition-colors ${
                    role === option
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <span className="capitalize bg-secondary text-foreground px-2 py-0.5 rounded-full border border-border text-xs">
              {role}
            </span>
            <button
              onClick={handleLogout}
              className="text-red-500 hover:text-red-700 transition-colors"
            >
              Clear Role
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRole("patient")}
              className="border border-border text-foreground px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              Patient
            </button>
            <button
              type="button"
              onClick={() => setRole("doctor")}
              className="border border-border text-foreground px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              Doctor
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              Admin
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
