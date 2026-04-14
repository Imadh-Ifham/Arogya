import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchDoctors } from "../store/doctor/doctor.thunk";
import Layout from "../components/Layout";

const SPECIALTIES = [
  "Cardiology",
  "Dermatology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "General Medicine",
  "ENT",
  "Ophthalmology",
  "Gynecology",
];

export default function DoctorSearchPage() {
  const dispatch = useAppDispatch();
  const { items: doctors, loading, error } = useAppSelector((s) => s.doctor);
  const [searchParams, setSearchParams] = useSearchParams();

  const [specialty, setSpecialty] = useState(searchParams.get("specialty") ?? "");

  useEffect(() => {
    dispatch(fetchDoctors(specialty || undefined));
  }, [dispatch, specialty]);

  const handleSpecialtyChange = (value: string) => {
    setSpecialty(value);
    if (value) {
      setSearchParams({ specialty: value });
    } else {
      setSearchParams({});
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Find a Doctor</h1>
        <Link
          to="/symptom-checker"
          className="text-sm border border-border text-foreground px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
        >
          Not sure? Try AI Symptom Checker →
        </Link>
      </div>

      {/* Specialty filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => handleSpecialtyChange("")}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            specialty === ""
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:bg-secondary"
          }`}
        >
          All
        </button>
        {SPECIALTIES.map((s) => (
          <button
            key={s}
            onClick={() => handleSpecialtyChange(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              specialty === s
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading === "pending" && (
        <div className="text-center py-16 text-muted-foreground">Searching doctors…</div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {loading === "succeeded" && doctors.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No doctors found{specialty ? ` for ${specialty}` : ""}.</p>
          {specialty && (
            <button
              onClick={() => handleSpecialtyChange("")}
              className="text-sm text-teal hover:underline mt-1 inline-block"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((doctor) => (
          <div
            key={doctor.id}
            className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-semibold text-sm flex-shrink-0">
                {doctor.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{doctor.name}</p>
                {doctor.specialization && (
                  <p className="text-xs text-muted-foreground mt-0.5">{doctor.specialization}</p>
                )}
              </div>
            </div>

            <Link
              to={`/slots?doctorId=${doctor.id}`}
              className="mt-auto text-center bg-primary text-primary-foreground text-sm py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              View Available Slots
            </Link>
          </div>
        ))}
      </div>
    </Layout>
  );
}
