import { Bot } from "lucide-react";
import type { Conversation } from "@/../bindings/xAssistant/internal/models";

interface ChatHeaderProps {
  conversation: Conversation;
}

export function ChatHeader({ conversation }: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-4 border-b px-6 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <Bot className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-semibold">{conversation.title || "New Chat"}</h2>
        <p className="text-xs text-muted-foreground">
          {conversation.message_count} messages · {conversation.agent_id || "No agent"}
        </p>
      </div>
    </div>
  );
}
