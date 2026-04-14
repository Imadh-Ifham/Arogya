import { useEffect, useState, type FormEvent } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchProfileThunk, updateProfileThunk } from "../store/patient/patient.thunk";
import { clearPatientError } from "../store/patient/patient.slice";
import Layout from "../components/Layout";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function PatientProfilePage() {
  const dispatch = useAppDispatch();
  const { profile, loading, saveLoading, error } = useAppSelector((s) => s.patient);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER" | "">("");
  const [phone, setPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [allergiesText, setAllergiesText] = useState("");
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    dispatch(fetchProfileThunk());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
      setDateOfBirth(profile.dateOfBirth ?? "");
      setGender((profile.gender as "MALE" | "FEMALE" | "OTHER" | "") ?? "");
      setPhone(profile.phoneNumber ?? "");
      setBloodGroup(profile.bloodGroup ?? "");
      setAllergiesText(profile.allergies?.join(", ") ?? "");
      setAddress(profile.address ?? "");
    }
  }, [profile]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    dispatch(clearPatientError());
    setSaved(false);

    const allergies = allergiesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const result = await dispatch(
      updateProfileThunk({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        dateOfBirth: dateOfBirth || undefined,
        gender: (gender as "MALE" | "FEMALE" | "OTHER") || undefined,
        phoneNumber: phone || undefined,
        bloodGroup: bloodGroup || undefined,
        allergies: allergies.length > 0 ? allergies : undefined,
        address: address || undefined,
      }),
    );

    if (updateProfileThunk.fulfilled.match(result)) {
      setSaved(true);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">My Profile</h1>

        {loading === "pending" && (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {saved && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4">
            Profile saved successfully.
          </div>
        )}

        {loading !== "pending" && (
          <form
            onSubmit={handleSubmit}
            className="bg-card border border-border rounded-xl p-6 space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">First name</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Last name</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Date of birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE" | "OTHER" | "")}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select…</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="+94 77 123 4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Blood group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Unknown</option>
                {BLOOD_GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Allergies{" "}
                <span className="text-muted-foreground font-normal">(comma-separated)</span>
              </label>
              <input
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="penicillin, peanuts"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="123 Main St, Colombo"
              />
            </div>

            <button
              type="submit"
              disabled={saveLoading === "pending"}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saveLoading === "pending" ? "Saving…" : "Save Profile"}
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
}
