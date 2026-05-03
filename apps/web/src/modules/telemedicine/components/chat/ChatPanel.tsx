import type { RefObject } from "react";
import { MessageSquare, Send } from "lucide-react";
import type { ChatMessage } from "../../api/rest";
import ChatMessageItem from "./ChatMessageItem";

type ChatPanelProps = {
  messages: ChatMessage[];
  userId: string;
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSend: () => void;
  formatDate: (iso: string) => string;
  chatEndRef: RefObject<HTMLDivElement | null>;
};

export default function ChatPanel({
  messages,
  userId,
  chatInput,
  onChatInputChange,
  onSend,
  formatDate,
  chatEndRef,
}: ChatPanelProps) {
  return (
    <div className="bg-background p-3 flex flex-col h-full min-h-0">
      <h3 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5 mb-2">
        <MessageSquare className="w-4 h-4" /> Chat
      </h3>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 pb-2">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground">No messages yet.</p>
        )}
        {messages.map((message) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            isOwn={message.senderId === userId}
            formatDate={formatDate}
          />
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="pt-2 border-t border-border mt-1">
        <div className="flex gap-2">
          <input
            value={chatInput}
            onChange={(event) => onChatInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="Type a message"
            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-input-background"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!chatInput.trim()}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> Send
          </button>
        </div>
      </div>
    </div>
  );
}
