import { useState } from "react";
import { Bot, FileText, Brain, User, Database, RefreshCw, Loader2 } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { ChatService } from "@/../bindings/xAssistant/internal/services";

export function ChatHeader() {
  const { currentConversation: conversation, currentAgent: agent, loadCurrentConversation, loadConversations } = useChatStore();
  const [refreshingTitle, setRefreshingTitle] = useState(false);

  const handleRefreshTitle = async () => {
    if (!conversation?.id || refreshingTitle) return;
    setRefreshingTitle(true);
    try {
      await ChatService.GenerateTitle(conversation.id);
      await loadCurrentConversation(conversation.id);
      loadConversations();
    } finally {
      setRefreshingTitle(false);
    }
  };

  const messageCount = conversation?.message_count || 0;

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
        <div className="flex items-center gap-2">
          <h2 className="font-semibold truncate">{conversation?.title || agent?.name || "New Chat"}</h2>
          {messageCount >= 2 && (
            <button
              onClick={handleRefreshTitle}
              disabled={refreshingTitle}
              className="p-1 rounded-md hover:bg-muted transition-colors shrink-0 disabled:opacity-50"
              title="Refresh title"
            >
              {refreshingTitle ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {messageCount} messages
        </p>
      </div>
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