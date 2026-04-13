import { useState, type FormEvent, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { loginThunk } from "../store/auth/auth.thunk";
import { clearAuthError } from "../store/auth/auth.slice";
import { fetchMeThunk } from "../store/auth/auth.thunk";
import { Activity, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error, accessToken } = useAppSelector((s) => s.auth);

  const from = (location.state as any)?.from?.pathname ?? "/appointments";

  const [form, setForm] = useState({ email: "", password: "" });
  const [tab, setTab] = useState<"patient" | "doctor">("patient");
  const [showPw, setShowPw] = useState(false);

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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
                onClick={() => setTab(r)}
                className={`flex-1 py-2 rounded-md text-sm capitalize transition-colors ${
                  tab === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {r} Login
              </button>
            ))}
          </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-foreground block mb-1.5">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm text-foreground block mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-input-background border border-border text-foreground placeholder:text-muted-foreground pr-10 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <a href="#" className="text-sm text-teal hover:underline">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading === "pending"}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading === "pending" ? "Signing in…" : "Sign in"}
          </button>
        </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Don't have an account?{" "}
            <Link to={`/register?role=${tab}`} className="text-teal hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
