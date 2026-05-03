import type { ConsultationView } from "../../api/rest";

type VideoPanelProps = {
  selectedConsultation: ConsultationView | null;
  canOpenVideo: boolean;
  roomUrl: string;
};

export default function VideoPanel({
  selectedConsultation,
  canOpenVideo,
  roomUrl,
}: VideoPanelProps) {
  if (!selectedConsultation) {
    return (
      <div className="h-full grid place-items-center text-sm text-muted-foreground">
        Pick a consultation to open workspace view.
      </div>
    );
  }

  if (!canOpenVideo) {
    return (
      <div className="h-full grid place-items-center text-sm text-muted-foreground px-6 text-center">
        Patient can join only after doctor starts the consultation.
      </div>
    );
  }

  return (
    <iframe
      src={roomUrl}
      className="w-full h-full border-0"
      allow="camera; microphone; fullscreen; display-capture; autoplay"
      title="Embedded telemedicine call"
    />
  );
}
