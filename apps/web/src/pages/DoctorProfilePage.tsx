import { useEffect, useState, type FormEvent } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchMyDoctorProfileThunk, updateMyDoctorProfileThunk } from "../store/doctor/doctor.thunk";
import { clearProfileError } from "../store/doctor/doctor.slice";
import Layout from "../components/Layout";

const SPECIALTIES = [
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "General Practice",
  "Gynecology",
  "Neurology",
  "Oncology",
  "Ophthalmology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Pulmonology",
  "Radiology",
  "Urology",
];

export default function DoctorProfilePage() {
  const dispatch = useAppDispatch();
  const { myProfile, profileLoading, profileSaveLoading, profileError } = useAppSelector(
    (s) => s.doctor,
  );
  const { user } = useAppSelector((s) => s.auth);

  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [languagesText, setLanguagesText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    dispatch(fetchMyDoctorProfileThunk());
  }, [dispatch]);

  // Pre-fill form from fetched profile (which includes registration data)
  useEffect(() => {
    if (myProfile) {
      setName(myProfile.name ?? "");
      setSpecialty(myProfile.specialty ?? "");
      setBio(myProfile.bio ?? "");
      setConsultationFee(myProfile.consultationFee != null ? String(myProfile.consultationFee) : "");
      setQualifications(myProfile.qualifications ?? "");
      setLanguagesText(myProfile.languages?.join(", ") ?? "");
    } else if (user) {
      // Seed name from auth profile when doctor service profile doesn't exist yet
      setName(`${user.firstName ?? ""} ${(user as any).lastName ?? ""}`.trim());
    }
  }, [myProfile, user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    dispatch(clearProfileError());
    setSaved(false);

    const languages = languagesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const result = await dispatch(
      updateMyDoctorProfileThunk({
        name: name || undefined,
        specialty: specialty || undefined,
        bio: bio || undefined,
        consultationFee: consultationFee ? Number(consultationFee) : undefined,
        qualifications: qualifications || undefined,
        languages: languages.length > 0 ? languages : undefined,
      }),
    );

    if (updateMyDoctorProfileThunk.fulfilled.match(result)) {
      setSaved(true);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">My Profile</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Update your professional details visible to patients.
        </p>

        {profileLoading === "pending" && (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        )}

        {profileError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            {profileError}
          </div>
        )}

        {saved && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4">
            Profile saved successfully.
          </div>
        )}

        {profileLoading !== "pending" && (
          <form
            onSubmit={handleSubmit}
            className="bg-card border border-border rounded-xl p-6 space-y-4"
          >
            {/* Read-only registration fields */}
            {myProfile?.licenseNumber && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  License Number
                </label>
                <input
                  value={myProfile.licenseNumber}
                  readOnly
                  className="w-full border border-border bg-secondary text-muted-foreground rounded-lg px-3 py-2 text-sm cursor-default"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Dr. Jane Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Specialty</label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select specialty…</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Consultation Fee{" "}
                <span className="text-muted-foreground font-normal">(LKR)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="1500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Qualifications</label>
              <input
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="MBBS, MD (Cardiology)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Languages{" "}
                <span className="text-muted-foreground font-normal">(comma-separated)</span>
              </label>
              <input
                value={languagesText}
                onChange={(e) => setLanguagesText(e.target.value)}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="English, Sinhala, Tamil"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Brief professional introduction…"
              />
            </div>

            <button
              type="submit"
              disabled={profileSaveLoading === "pending"}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {profileSaveLoading === "pending" ? "Saving…" : "Save Profile"}
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
}
