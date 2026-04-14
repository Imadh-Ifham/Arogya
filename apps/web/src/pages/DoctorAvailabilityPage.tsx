import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchMyDoctorProfileThunk, fetchMyAvailabilityThunk, addAvailabilityThunk, deleteAvailabilityThunk } from "../store/doctor/doctor.thunk";
import { clearAvailabilityError } from "../store/doctor/doctor.slice";
import Layout from "../components/Layout";
import { Trash2, Plus } from "lucide-react";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

type Day = (typeof DAYS)[number];

const DAY_LABELS: Record<Day, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

/** Strips the seconds part from "HH:mm:ss" → "HH:mm" for display */
function formatTime(t: string): string {
  return t ? t.substring(0, 5) : "";
}

export default function DoctorAvailabilityPage() {
  const dispatch = useAppDispatch();
  const { myProfile, profileLoading, availability, availabilityLoading, availabilityError } =
    useAppSelector((s) => s.doctor);

  const [day, setDay] = useState<Day>("MONDAY");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Load doctor profile first to get the doctor ID, then load availability
  useEffect(() => {
    dispatch(fetchMyDoctorProfileThunk());
  }, [dispatch]);

  useEffect(() => {
    if (myProfile?.id) {
      dispatch(fetchMyAvailabilityThunk(myProfile.id));
    }
  }, [dispatch, myProfile?.id]);

  const handleAdd = async () => {
    setFormError(null);
    if (!myProfile?.id) {
      setFormError("Doctor profile not found. Please complete your profile first.");
      return;
    }
    if (startTime >= endTime) {
      setFormError("Start time must be before end time.");
      return;
    }
    setAdding(true);
    const result = await dispatch(
      addAvailabilityThunk({
        doctorId: myProfile.id,
        payload: { dayOfWeek: day, startTime, endTime },
      }),
    );
    setAdding(false);
    if (addAvailabilityThunk.rejected.match(result)) {
      setFormError((result.payload as string) ?? "Failed to add slot.");
    }
  };

  const handleDelete = (templateId: number) => {
    if (!myProfile?.id) return;
    dispatch(clearAvailabilityError());
    dispatch(deleteAvailabilityThunk({ doctorId: myProfile.id, templateId }));
  };

  // Group slots by day for display
  const slotsByDay = DAYS.reduce<Record<string, typeof availability>>(
    (acc, d) => {
      acc[d] = availability.filter((s) => s.dayOfWeek === d);
      return acc;
    },
    {} as Record<string, typeof availability>,
  );

  return (
    <Layout>
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weekly Availability</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define your recurring weekly consultation hours. Patients will see slots based on this
            schedule.
          </p>
        </div>

        {(profileLoading === "pending" || availabilityLoading === "pending") && (
          <div className="text-center py-8 text-muted-foreground">Loading…</div>
        )}

        {availabilityError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {availabilityError}
          </div>
        )}

        {/* Add slot form */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Add a Time Slot</h2>

          {formError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Day</label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value as Day)}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={adding || !myProfile}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {adding ? "Adding…" : "Add Slot"}
          </button>
        </div>

        {/* Current schedule */}
        {availability.length === 0 && availabilityLoading !== "pending" && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No availability slots defined yet. Add your first slot above.
          </p>
        )}

        {availability.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Current Schedule</h2>
            {DAYS.filter((d) => slotsByDay[d].length > 0).map((d) => (
              <div key={d} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {d.charAt(0) + d.slice(1).toLowerCase()}
                </p>
                <div className="space-y-2">
                  {slotsByDay[d].map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-foreground font-medium">
                        {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                      </span>
                      <button
                        onClick={() => handleDelete(slot.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                        aria-label="Delete slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
