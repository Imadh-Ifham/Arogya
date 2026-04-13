import { useState, type FormEvent, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { loginThunk } from "../store/auth/auth.thunk";
import { clearAuthError } from "../store/auth/auth.slice";
import { fetchMeThunk } from "../store/auth/auth.thunk";

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error, accessToken } = useAppSelector((s) => s.auth);

  const from = (location.state as any)?.from?.pathname ?? "/appointments";

  const [form, setForm] = useState({ email: "", password: "" });

  // Already logged in → redirect
  useEffect(() => {
    if (accessToken) navigate(from, { replace: true });
  }, [accessToken, from, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    dispatch(clearAuthError());
    const result = await dispatch(loginThunk(form));
    if (loginThunk.fulfilled.match(result)) {
      await dispatch(fetchMeThunk());
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
        <p className="text-sm text-gray-500 mb-6">
          New here?{" "}
          <Link to="/register" className="text-blue-600 hover:underline">
            Create an account
          </Link>
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading === "pending"}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading === "pending" ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
