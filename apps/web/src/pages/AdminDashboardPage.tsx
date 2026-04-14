import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { logoutThunk } from "../store/auth/auth.thunk";
import { useNavigate } from "react-router-dom";
import { Activity, CheckCircle, XCircle, Clock, LogOut, RefreshCw, User } from "lucide-react";
import { listDoctors, approveDoctor, rejectDoctor } from "../modules/admin/api/rest";
import type { DoctorProfile } from "../modules/doctor/api/rest";

type FilterStatus = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

const STATUS_BADGE: Record<string, string> = {
  PENDING:  "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED: "bg-green-100  text-green-800  border-green-200",
  REJECTED: "bg-red-100    text-red-800    border-red-200",
};

export default function AdminDashboardPage() {
  const dispatch = useAppDispatch();
  const navigate  = useNavigate();
  const { user }  = useAppSelector((s) => s.auth);

  const [doctors, setDoctors]   = useState<DoctorProfile[]>([]);
  const [filter, setFilter]     = useState<FilterStatus>("PENDING");
  const [loading, setLoading]   = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const load = async (status: FilterStatus) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDoctors(status === "ALL" ? undefined : status);
      setDoctors(data);
    } catch {
      setError("Failed to load doctors. Make sure the doctor service is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); }, [filter]);

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      const updated = await approveDoctor(id);
      setDoctors((prev) => prev.map((d) => (String(d.id) === String(id) ? { ...d, ...updated } : d)));
      // If filtered to PENDING, remove the now-approved doctor from the list
      if (filter === "PENDING") setDoctors((prev) => prev.filter((d) => String(d.id) !== String(id)));
    } catch {
      setError("Failed to approve doctor.");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionId(id);
    try {
      const updated = await rejectDoctor(id);
      setDoctors((prev) => prev.map((d) => (String(d.id) === String(id) ? { ...d, ...updated } : d)));
      if (filter === "PENDING") setDoctors((prev) => prev.filter((d) => String(d.id) !== String(id)));
    } catch {
      setError("Failed to reject doctor.");
    } finally {
      setActionId(null);
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate("/login", { replace: true });
  };

  const counts = {
    PENDING:  doctors.filter((d) => d.verificationStatus === "PENDING").length,
    APPROVED: doctors.filter((d) => d.verificationStatus === "APPROVED").length,
    REJECTED: doctors.filter((d) => d.verificationStatus === "REJECTED").length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-teal" />
          <span className="text-lg text-foreground">Arogya</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">Admin Panel</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {user?.firstName} ({user?.email})
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl text-foreground mb-2">Doctor Review Queue</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          Review doctor profiles and approve or reject them before they become visible to patients.
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`bg-card border rounded-xl p-4 text-left transition-all ${
                filter === s ? "border-teal ring-1 ring-teal" : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {s === "PENDING"  && <Clock        className="w-4 h-4 text-yellow-500" />}
                {s === "APPROVED" && <CheckCircle  className="w-4 h-4 text-green-500"  />}
                {s === "REJECTED" && <XCircle      className="w-4 h-4 text-red-500"    />}
                <span className="text-xs text-muted-foreground capitalize">{s.toLowerCase()}</span>
              </div>
              <span className="text-2xl text-foreground">{filter === s ? doctors.length : "—"}</span>
            </button>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-6">
          {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "ALL" ? "All Doctors" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
          <button
            onClick={() => load(filter)}
            disabled={loading}
            className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Doctor list */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Loading…</div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No doctors with status{" "}
            <span className="font-medium">{filter === "ALL" ? "any" : filter.toLowerCase()}</span>.
          </div>
        ) : (
          <div className="space-y-3">
            {doctors.map((doctor) => {
              const id = String(doctor.id);
              const busy = actionId === id;
              return (
                <div
                  key={id}
                  className="bg-card border border-border rounded-xl p-5 flex items-start gap-4"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">
                        {doctor.name || <span className="text-muted-foreground italic">No name set</span>}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          STATUS_BADGE[doctor.verificationStatus] ?? ""
                        }`}
                      >
                        {doctor.verificationStatus}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {doctor.specialty ?? "Specialty not set"}
                      {doctor.licenseNumber ? ` · License: ${doctor.licenseNumber}` : ""}
                    </p>
                    {doctor.bio && (
                      <p className="text-sm text-foreground mt-1 line-clamp-2">{doctor.bio}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      {doctor.qualifications && <span>{doctor.qualifications}</span>}
                      {doctor.consultationFee != null && (
                        <span>Fee: ${doctor.consultationFee}</span>
                      )}
                      {doctor.languages?.length ? (
                        <span>Languages: {doctor.languages.join(", ")}</span>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {doctor.verificationStatus !== "APPROVED" && (
                      <button
                        onClick={() => handleApprove(id)}
                        disabled={busy}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {busy ? "…" : "Approve"}
                      </button>
                    )}
                    {doctor.verificationStatus !== "REJECTED" && (
                      <button
                        onClick={() => handleReject(id)}
                        disabled={busy}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {busy ? "…" : "Reject"}
                      </button>
                    )}
                    {doctor.verificationStatus === "APPROVED" && (
                      <span className="flex items-center gap-1.5 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" /> Approved
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
