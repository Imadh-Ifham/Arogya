import type { ChatMessage } from "../../api/rest";

type ChatMessageItemProps = {
  message: ChatMessage;
  isOwn: boolean;
  formatDate: (iso: string) => string;
};

export default function ChatMessageItem({
  message,
  isOwn,
  formatDate,
}: ChatMessageItemProps) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-xl border px-3 py-2 ${
          isOwn ? "bg-primary/10 border-primary/20" : "bg-card border-border"
        }`}
      >
        <p className="text-[11px] text-muted-foreground">
          {message.senderRole === "doctor" ? "Doctor" : "Patient"} -{" "}
          {formatDate(message.createdAt)}
        </p>
        <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-all">
          {message.content}
        </p>
      </div>
    </div>
  );
}
