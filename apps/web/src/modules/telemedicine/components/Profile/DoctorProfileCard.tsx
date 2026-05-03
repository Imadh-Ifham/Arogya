import { Stethoscope } from "lucide-react";

type DoctorProfile = {
  displayId: string;
  name: string;
  specialty: string;
  qualification: string;
  languages: string;
  careTip: string;
};

type DoctorProfileCardProps = {
  profile: DoctorProfile;
};

export default function DoctorProfileCard({ profile }: DoctorProfileCardProps) {
  return (
    <>
      <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
        <Stethoscope className="w-4 h-4" /> Doctor Profile
      </h2>
      <div className="text-xs space-y-1.5 rounded-xl border border-border p-3 bg-background/70 mt-3">
        <p>
          <span className="text-muted-foreground">Doctor:</span> {profile.name}
        </p>
        <p>
          <span className="text-muted-foreground">Code:</span>{" "}
          {profile.displayId}
        </p>
        <p>
          <span className="text-muted-foreground">Specialty:</span>{" "}
          {profile.specialty}
        </p>
        <p>
          <span className="text-muted-foreground">Qualification:</span>{" "}
          {profile.qualification}
        </p>
        <p>
          <span className="text-muted-foreground">Languages:</span>{" "}
          {profile.languages}
        </p>
        <p>
          <span className="text-muted-foreground">Care tip:</span>{" "}
          {profile.careTip}
        </p>
      </div>
    </>
  );
}
