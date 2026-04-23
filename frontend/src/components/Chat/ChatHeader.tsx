import { Bot, FileText, Brain, User, Database } from "lucide-react";
import type { Agent } from "@/../bindings/xAssistant/internal/models";

interface ChatHeaderProps {
  agent: Agent | null;
  messageCount: number;
  title?: string;
}

export function ChatHeader({ agent, messageCount, title }: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-4 border-b px-6 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        {agent?.icon ? (
          <span className="text-xl">{agent.icon}</span>
        ) : (
          <Bot className="h-5 w-5" />
        )}
      </div>
      <div>
        <h2 className="font-semibold">{title || agent?.name || "New Chat"}</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{messageCount} messages</span>
          {agent && (
            <>
              <span>·</span>
              <span>{agent.name}</span>
              <div className="flex items-center gap-1 ml-1">
                <FileText className={`h-3 w-3 ${agent.agents_md ? "text-primary" : "text-muted-foreground/40"}`} />
                <Brain className={`h-3 w-3 ${agent.soul_md ? "text-primary" : "text-muted-foreground/40"}`} />
                <User className={`h-3 w-3 ${agent.profile_md ? "text-primary" : "text-muted-foreground/40"}`} />
                <Database className={`h-3 w-3 ${agent.memory_md ? "text-primary" : "text-muted-foreground/40"}`} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
