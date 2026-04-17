import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { clearFrontendRole, useFrontendRole } from "../app/frontendRole";
import {
  Activity,
  CheckCircle,
  XCircle,
  LogOut,
  RefreshCw,
  User,
  Users,
  Calendar,
  CreditCard,
  LayoutDashboard,
  Search,
  ChevronLeft,
  ChevronRight,
  Ban,
  Trash2,
} from "lucide-react";
import {
  // Doctor verification
  listDoctors,
  approveDoctor,
  rejectDoctor,
  // Users
  listUsers,
  activateUser,
  deactivateUser,
  deleteUser,
  getUserMetrics,
  // Appointments
  listAllAppointments,
  adminCancelAppointment,
  getAppointmentMetrics,
  // Payments
  listAllPayments,
  getPaymentMetrics,
  type AdminUser,
  type UsersPage,
  type UserMetrics,
  type AppointmentsPage,
  type PaymentsPage,
  type PaymentMetrics,
} from "../modules/admin/api/rest";
import type { DoctorProfile } from "../modules/doctor/api/rest";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "overview" | "doctors" | "users" | "appointments" | "transactions";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED: "bg-green-100  text-green-800  border-green-200",
  REJECTED: "bg-red-100    text-red-800    border-red-200",
  SUCCESS: "bg-green-100  text-green-800  border-green-200",
  FAILED: "bg-red-100    text-red-800    border-red-200",
  CANCELLED: "bg-gray-100   text-gray-700   border-gray-200",
  COMPLETED: "bg-blue-100   text-blue-800   border-blue-200",
  ACCEPTED: "bg-teal-100   text-teal-800   border-teal-200",
  PAYMENT_COMPLETED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  AWAITING_PAYMENT: "bg-orange-100 text-orange-800 border-orange-200",
};

// ─── Shared sub-components ────────────────────────────────────────────────────

function Badge({ value }: { value: string }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[value] ?? "bg-secondary text-muted-foreground border-border"}`}
    >
      {value}
    </span>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
      {msg}
    </div>
  );
}

function Spinner() {
  return (
    <div className="text-center py-16 text-muted-foreground text-sm">
      Loading…
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground text-sm">
      {label}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [apptMetrics, setApptMetrics] = useState<{
    total: number;
    byStatus: Record<string, number>;
  } | null>(null);
  const [payMetrics, setPayMetrics] = useState<PaymentMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [um, am, pm] = await Promise.all([
        getUserMetrics(),
        getAppointmentMetrics(),
        getPaymentMetrics(),
      ]);
      setUserMetrics(um);
      setApptMetrics(am);
      setPayMetrics(pm);
    } catch {
      setError("Failed to load metrics. Make sure all services are running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner msg={error} />;
  if (!userMetrics || !apptMetrics || !payMetrics) return null;

  const fmt = (n: number) => new Intl.NumberFormat().format(n);
  const fmtCcy = (n: number) => `LKR ${new Intl.NumberFormat().format(n)}`;

  return (
    <div className="space-y-8">
      {/* Users */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Users
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total Users"
            value={fmt(userMetrics.totalUsers)}
            sub={`${fmt(userMetrics.totalActive)} active`}
          />
          <MetricCard
            label="Patients"
            value={fmt(userMetrics.byRole.patient?.total ?? 0)}
            sub={`${fmt(userMetrics.byRole.patient?.active ?? 0)} active`}
          />
          <MetricCard
            label="Doctors"
            value={fmt(userMetrics.byRole.doctor?.total ?? 0)}
            sub={`${fmt(userMetrics.byRole.doctor?.active ?? 0)} active`}
          />
          <MetricCard
            label="Admins"
            value={fmt(userMetrics.byRole.admin?.total ?? 0)}
          />
        </div>
      </section>

      {/* Appointments */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Appointments
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total" value={fmt(apptMetrics.total)} />
          <MetricCard
            label="Accepted / Completed"
            value={fmt(
              (apptMetrics.byStatus.ACCEPTED ?? 0) +
                (apptMetrics.byStatus.COMPLETED ?? 0),
            )}
          />
          <MetricCard
            label="Pending / Awaiting"
            value={fmt(
              (apptMetrics.byStatus.PENDING ?? 0) +
                (apptMetrics.byStatus.AWAITING_PAYMENT ?? 0),
            )}
          />
          <MetricCard
            label="Cancelled"
            value={fmt(apptMetrics.byStatus.CANCELLED ?? 0)}
          />
        </div>
      </section>

      {/* Revenue */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Revenue
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total Revenue"
            value={fmtCcy(payMetrics.summary.totalRevenue)}
            sub={`${fmt(payMetrics.summary.totalSuccess)} paid`}
          />
          <MetricCard
            label="Today"
            value={fmtCcy(payMetrics.revenue.daily.amount)}
            sub={`${payMetrics.revenue.daily.count} transactions`}
          />
          <MetricCard
            label="This Week"
            value={fmtCcy(payMetrics.revenue.weekly.amount)}
            sub={`${payMetrics.revenue.weekly.count} transactions`}
          />
          <MetricCard
            label="This Month"
            value={fmtCcy(payMetrics.revenue.monthly.amount)}
            sub={`${payMetrics.revenue.monthly.count} transactions`}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <MetricCard
            label="Pending Payments"
            value={fmt(payMetrics.summary.totalPending)}
          />
          <MetricCard
            label="Failed Payments"
            value={fmt(payMetrics.summary.totalFailed)}
          />
          <MetricCard
            label="Successful"
            value={fmt(payMetrics.summary.totalSuccess)}
          />
        </div>
      </section>
    </div>
  );
}

// ─── Doctor Verification Tab ──────────────────────────────────────────────────

type DoctorFilter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

function DoctorsTab() {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [filter, setFilter] = useState<DoctorFilter>("PENDING");
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (f: DoctorFilter) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDoctors(f === "ALL" ? undefined : f);
      setDoctors(data);
    } catch {
      setError("Failed to load doctors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
  }, [filter]);

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      const updated = await approveDoctor(id);
      setDoctors((prev) =>
        prev.map((d) => (String(d.id) === id ? { ...d, ...updated } : d)),
      );
      if (filter === "PENDING")
        setDoctors((prev) => prev.filter((d) => String(d.id) !== id));
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
      setDoctors((prev) =>
        prev.map((d) => (String(d.id) === id ? { ...d, ...updated } : d)),
      );
      if (filter === "PENDING")
        setDoctors((prev) => prev.filter((d) => String(d.id) !== id));
    } catch {
      setError("Failed to reject doctor.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6">
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
        <button
          onClick={() => load(filter)}
          disabled={loading}
          className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <ErrorBanner msg={error} />}
      {loading ? (
        <Spinner />
      ) : doctors.length === 0 ? (
        <Empty
          label={`No ${filter === "ALL" ? "" : filter.toLowerCase()} doctors.`}
        />
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
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">
                      {doctor.name || (
                        <span className="text-muted-foreground italic">
                          No name
                        </span>
                      )}
                    </span>
                    <Badge value={doctor.verificationStatus} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {doctor.specialty ?? "Specialty not set"}
                    {doctor.licenseNumber
                      ? ` · License: ${doctor.licenseNumber}`
                      : ""}
                  </p>
                  {doctor.bio && (
                    <p className="text-sm text-foreground mt-1 line-clamp-2">
                      {doctor.bio}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                    {doctor.qualifications && (
                      <span>{doctor.qualifications}</span>
                    )}
                    {doctor.consultationFee != null && (
                      <span>Fee: LKR {doctor.consultationFee}</span>
                    )}
                    {doctor.languages?.length ? (
                      <span>Languages: {doctor.languages.join(", ")}</span>
                    ) : null}
                  </div>
                </div>
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
    </div>
  );
}

// ─── User Management Tab ──────────────────────────────────────────────────────

function UsersTab() {
  const [result, setResult] = useState<UsersPage | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      setError(null);
      try {
        const data = await listUsers({
          search: search || undefined,
          role: role || undefined,
          page: p,
          limit: 20,
        });
        setResult(data);
        setPage(p);
      } catch {
        setError("Failed to load users.");
      } finally {
        setLoading(false);
      }
    },
    [search, role],
  );

  useEffect(() => {
    load(1);
  }, [role]); // Re-fetch on role filter change

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(1);
  };

  const toggleActive = async (user: AdminUser) => {
    setActionId(user._id);
    try {
      const updated = user.isActive
        ? await deactivateUser(user._id)
        : await activateUser(user._id);
      setResult((prev) =>
        prev
          ? {
              ...prev,
              users: prev.users.map((u) =>
                u._id === updated._id ? updated : u,
              ),
            }
          : prev,
      );
    } catch {
      setError(`Failed to ${user.isActive ? "deactivate" : "activate"} user.`);
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Soft-delete this user? They will be deactivated and cannot log in.",
      )
    )
      return;
    setActionId(id);
    try {
      await deleteUser(id);
      setResult((prev) =>
        prev
          ? {
              ...prev,
              users: prev.users.filter((u) => u._id !== id),
              total: prev.total - 1,
            }
          : prev,
      );
    } catch {
      setError("Failed to delete user.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <form
          onSubmit={handleSearch}
          className="flex items-center gap-2 flex-1 min-w-48"
        >
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm"
          >
            Search
          </button>
        </form>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none"
        >
          <option value="">All roles</option>
          <option value="patient">Patients</option>
          <option value="doctor">Doctors</option>
          <option value="admin">Admins</option>
        </select>
        <button
          onClick={() => load(page)}
          disabled={loading}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <ErrorBanner msg={error} />}
      {loading ? (
        <Spinner />
      ) : !result || result.users.length === 0 ? (
        <Empty label="No users found." />
      ) : (
        <>
          <div className="space-y-2">
            {result.users.map((user) => {
              const busy = actionId === user._id;
              return (
                <div
                  key={user._id}
                  className="bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-4"
                >
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground text-sm">
                        {user.firstName}
                        {user.lastName ? ` ${user.lastName}` : ""}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground capitalize">
                        {user.role}
                      </span>
                      {!user.isActive && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive(user)}
                      disabled={busy}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors disabled:opacity-50 ${user.isActive ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" : "bg-green-100 text-green-800 hover:bg-green-200"}`}
                    >
                      <Ban className="w-3 h-3" />
                      {busy ? "…" : user.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(user._id)}
                      disabled={busy}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-red-100 text-red-800 hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            page={page}
            totalPages={result.totalPages}
            onPage={(p) => load(p)}
          />
          <p className="text-center text-xs text-muted-foreground mt-3">
            {result.total} users total
          </p>
        </>
      )}
    </div>
  );
}

// ─── Appointments Tab ─────────────────────────────────────────────────────────

const APPT_STATUSES = [
  "PENDING",
  "AWAITING_PAYMENT",
  "PAYMENT_COMPLETED",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
];

function AppointmentsTab() {
  const [result, setResult] = useState<AppointmentsPage | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      setError(null);
      try {
        const data = await listAllAppointments({
          status: status || undefined,
          page: p,
          size: 20,
        });
        setResult(data);
        setPage(p);
      } catch {
        setError("Failed to load appointments.");
      } finally {
        setLoading(false);
      }
    },
    [status],
  );

  useEffect(() => {
    load(1);
  }, [status]);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this appointment?")) return;
    setActionId(id);
    try {
      await adminCancelAppointment(id);
      setResult((prev) =>
        prev
          ? {
              ...prev,
              appointments: prev.appointments.map((a) =>
                a.id === id ? { ...a, status: "CANCELLED" as const } : a,
              ),
            }
          : prev,
      );
    } catch {
      setError("Failed to cancel appointment.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none"
        >
          <option value="">All statuses</option>
          {APPT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={() => load(page)}
          disabled={loading}
          className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <ErrorBanner msg={error} />}
      {loading ? (
        <Spinner />
      ) : !result || result.appointments.length === 0 ? (
        <Empty label="No appointments found." />
      ) : (
        <>
          <div className="space-y-2">
            {result.appointments.map((appt) => {
              const busy = actionId === appt.id;
              return (
                <div
                  key={appt.id}
                  className="bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge value={appt.status} />
                      <span className="text-xs text-muted-foreground">
                        {appt.appointmentType}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                      {appt.doctorName && <span>Dr. {appt.doctorName}</span>}
                      {appt.patientName && (
                        <span>Patient: {appt.patientName}</span>
                      )}
                      <span>ID: {appt.id.slice(0, 8)}…</span>
                      <span>
                        {new Date(appt.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {appt.status !== "CANCELLED" &&
                    appt.status !== "COMPLETED" && (
                      <button
                        onClick={() => handleCancel(appt.id)}
                        disabled={busy}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-800 text-xs hover:bg-red-200 disabled:opacity-50 transition-colors shrink-0"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {busy ? "…" : "Cancel"}
                      </button>
                    )}
                </div>
              );
            })}
          </div>
          <Pagination
            page={page}
            totalPages={result.totalPages}
            onPage={(p) => load(p)}
          />
          <p className="text-center text-xs text-muted-foreground mt-3">
            {result.total} appointments total
          </p>
        </>
      )}
    </div>
  );
}

// ─── Transactions Tab ─────────────────────────────────────────────────────────

function TransactionsTab() {
  const [result, setResult] = useState<PaymentsPage | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      setError(null);
      try {
        const data = await listAllPayments({
          status: status || undefined,
          page: p,
          limit: 20,
        });
        setResult(data);
        setPage(p);
      } catch {
        setError("Failed to load transactions.");
      } finally {
        setLoading(false);
      }
    },
    [status],
  );

  useEffect(() => {
    load(1);
  }, [status]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
        </select>
        <button
          onClick={() => load(page)}
          disabled={loading}
          className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <ErrorBanner msg={error} />}
      {loading ? (
        <Spinner />
      ) : !result || result.payments.length === 0 ? (
        <Empty label="No transactions found." />
      ) : (
        <>
          <div className="space-y-2">
            {result.payments.map((payment) => (
              <div
                key={payment.paymentId}
                className="bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge value={payment.status} />
                    <span className="text-sm font-medium text-foreground">
                      {payment.currency}{" "}
                      {new Intl.NumberFormat().format(payment.amount)}
                    </span>
                    {payment.receipt && (
                      <span className="text-xs text-muted-foreground">
                        Receipt: {payment.receipt.receiptNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>ID: {payment.paymentId.slice(0, 14)}…</span>
                    <span>Appt: {payment.appointmentId.slice(0, 8)}…</span>
                    <span>
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {payment.receipt && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="text-xs text-green-600">
                      {new Date(payment.receipt.paidAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={result.totalPages}
            onPage={(p) => load(p)}
          />
          <p className="text-center text-xs text-muted-foreground mt-3">
            {result.total} transactions total
          </p>
        </>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "overview",
    label: "Overview",
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    id: "doctors",
    label: "Doctors",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  { id: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
  {
    id: "appointments",
    label: "Appointments",
    icon: <Calendar className="w-4 h-4" />,
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: <CreditCard className="w-4 h-4" />,
  },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const role = useFrontendRole();
  const [tab, setTab] = useState<Tab>("overview");

  const handleLogout = () => {
    clearFrontendRole();
    navigate("/", { replace: true });
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
          <span className="text-sm text-muted-foreground hidden sm:block">
            Role: {role ?? "none"}
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

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tab nav */}
        <nav className="flex items-center gap-1 mb-8 border-b border-border pb-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-t-lg transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "text-foreground border-b-2 border-teal -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        {tab === "overview" && <OverviewTab />}
        {tab === "doctors" && <DoctorsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "appointments" && <AppointmentsTab />}
        {tab === "transactions" && <TransactionsTab />}
      </div>
    </div>
  );
}
