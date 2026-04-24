import { Bot, FileText, Brain, User, Database, RefreshCw } from "lucide-react";
import type { Agent } from "@/../bindings/xAssistant/internal/models";

interface ChatHeaderProps {
  agent: Agent | null;
  messageCount: number;
  title?: string;
  onRefreshTitle?: () => void;
}

export function ChatHeader({ agent, messageCount, title, onRefreshTitle }: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-4 border-b px-6 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        {agent?.icon ? (
          <span className="text-xl">{agent.icon}</span>
        ) : (
          <Bot className="h-5 w-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold truncate">{title || agent?.name || "New Chat"}</h2>
        <p className="text-xs text-muted-foreground">
          {messageCount} messages
        </p>
      </div>
      {messageCount > 2 && onRefreshTitle && (
        <button
          onClick={onRefreshTitle}
          className="p-1.5 rounded-md hover:bg-muted transition-colors shrink-0"
          title="Refresh title"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      {agent && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <span>{agent.name}</span>
          <div className="flex items-center gap-1.5">
            <FileText className={`h-3 w-3 ${agent.agents_md ? "text-primary" : "text-muted-foreground/40"}`} />
            <Brain className={`h-3 w-3 ${agent.soul_md ? "text-primary" : "text-muted-foreground/40"}`} />
            <User className={`h-3 w-3 ${agent.profile_md ? "text-primary" : "text-muted-foreground/40"}`} />
            <Database className={`h-3 w-3 ${agent.memory_md ? "text-primary" : "text-muted-foreground/40"}`} />
          </div>
        </div>
      )}
    </div>
  );
}