import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { logoutThunk } from "../store/auth/auth.thunk";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, accessToken } = useAppSelector((s) => s.auth);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate("/login");
  };

  return (
    <nav className="bg-card border-b border-border px-6 py-3 flex items-center justify-between">
      <Link to="/" className="text-xl font-semibold text-foreground tracking-tight">
        Arogya
      </Link>

      <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
        <Link to="/slots" className="hover:text-foreground transition-colors">
          Browse Slots
        </Link>
        <Link to="/search" className="hover:text-foreground transition-colors">
          Find Doctors
        </Link>
        <Link to="/symptom-checker" className="hover:text-foreground transition-colors">
          Symptom Checker
        </Link>

        {accessToken && (
          <>
            <Link to="/appointments" className="hover:text-foreground transition-colors">
              My Appointments
            </Link>
            <Link to="/profile" className="hover:text-foreground transition-colors">
              Profile
            </Link>
          </>
        )}

        <ThemeToggle />

        {accessToken ? (
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-muted-foreground text-xs">
                {user.firstName ?? user.email}{" "}
                <span className="capitalize bg-secondary text-foreground px-2 py-0.5 rounded-full border border-border">
                  {user.role}
                </span>
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-red-500 hover:text-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="hover:text-foreground transition-colors">
              Login
            </Link>
            <Link
              to="/register"
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
