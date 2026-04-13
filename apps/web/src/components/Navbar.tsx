import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { logoutThunk } from "../store/auth/auth.thunk";

export default function Navbar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, accessToken } = useAppSelector((s) => s.auth);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold text-blue-600 tracking-tight">
        Arogya
      </Link>

      <div className="flex items-center gap-6 text-sm font-medium text-gray-600">
        <Link to="/slots" className="hover:text-blue-600 transition-colors">
          Browse Slots
        </Link>

        {accessToken && (
          <Link to="/appointments" className="hover:text-blue-600 transition-colors">
            My Appointments
          </Link>
        )}

        {accessToken ? (
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-gray-400 text-xs">
                {user.firstName ?? user.email}{" "}
                <span className="capitalize bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
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
            <Link to="/login" className="hover:text-blue-600 transition-colors">
              Login
            </Link>
            <Link
              to="/register"
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
