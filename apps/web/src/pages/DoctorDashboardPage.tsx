import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchMyDoctorProfileThunk } from "../store/doctor/doctor.thunk";
import Layout from "../components/Layout";
import { Stethoscope, CalendarDays, UserCircle, AlertCircle, CheckCircle2, Clock } from "lucide-react";

const STATUS_CONFIG = {
  APPROVED: {
    label: "Approved",
    icon: CheckCircle2,
    className: "text-green-700 bg-green-50 border-green-200",
  },
  PENDING: {
    label: "Pending Review",
    icon: Clock,
    className: "text-amber-700 bg-amber-50 border-amber-200",
  },
  REJECTED: {
    label: "Rejected",
    icon: AlertCircle,
    className: "text-red-700 bg-red-50 border-red-200",
  },
} as const;

export default function DoctorDashboardPage() {
  const dispatch = useAppDispatch();
  const { myProfile, profileLoading } = useAppSelector((s) => s.doctor);
  const { user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(fetchMyDoctorProfileThunk());
  }, [dispatch]);

  const status = myProfile?.verificationStatus ?? "PENDING";
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = statusCfg.icon;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Welcome header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, Dr. {user?.firstName ?? myProfile?.name ?? "Doctor"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your profile, availability, and consultations from here.
          </p>
        </div>

        {profileLoading === "pending" && (
          <div className="text-center py-10 text-muted-foreground">Loading…</div>
        )}

        {/* Verification status banner */}
        {myProfile && (
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${statusCfg.className}`}
          >
            <StatusIcon className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Account status: {statusCfg.label}</p>
              {status === "PENDING" && (
                <p className="text-xs mt-0.5">
                  Your registration is under review. You can still set up your profile and
                  availability while you wait.
                </p>
              )}
              {status === "REJECTED" && (
                <p className="text-xs mt-0.5">
                  Your registration was rejected. Please contact support for further assistance.
                </p>
              )}
              {status === "APPROVED" && (
                <p className="text-xs mt-0.5">
                  You are approved and visible to patients.
                </p>
              )}
            </div>
          </div>
        )}

        {/* No profile yet (doctor registered in auth but not in doctor service) */}
        {profileLoading === "failed" && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Profile not set up yet</p>
              <p className="text-xs mt-0.5">
                Complete your doctor registration to appear on the platform.
              </p>
            </div>
          </div>
        )}

        {/* Quick stats */}
        {myProfile && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Specialty</p>
              <p className="font-semibold text-foreground text-sm">
                {myProfile.specialty ?? <span className="text-muted-foreground italic">Not set</span>}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Consultation Fee
              </p>
              <p className="font-semibold text-foreground text-sm">
                {myProfile.consultationFee != null
                  ? `LKR ${myProfile.consultationFee.toLocaleString()}`
                  : <span className="text-muted-foreground italic">Not set</span>}
              </p>
            </div>
          </div>
        )}

        {/* Action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/doctor/profile"
            className="bg-card border border-border rounded-xl p-5 hover:border-primary transition-colors group"
          >
            <UserCircle className="w-6 h-6 text-primary mb-3" />
            <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
              My Profile
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Update specialty, bio, and consultation fee
            </p>
          </Link>

          <Link
            to="/doctor/availability"
            className="bg-card border border-border rounded-xl p-5 hover:border-primary transition-colors group"
          >
            <CalendarDays className="w-6 h-6 text-primary mb-3" />
            <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
              Availability
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Define your weekly consultation hours
            </p>
          </Link>

          <Link
            to="/doctor/appointments"
            className="bg-card border border-border rounded-xl p-5 hover:border-primary transition-colors group"
          >
            <Stethoscope className="w-6 h-6 text-primary mb-3" />
            <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
              Appointments
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              View and manage patient appointments
            </p>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
