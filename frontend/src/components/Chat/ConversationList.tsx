import { useNavigate, useParams } from "react-router-dom";
import { Bot, MessageSquare, MoreVertical, Pin, PinOff, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Conversation } from "@/../bindings/xAssistant/internal/models";
import { ConversationService } from "@/../bindings/xAssistant/internal/services";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chatStore";

interface ConversationListProps {
  searchQuery?: string;
}

export default function ConversationList({ searchQuery = "" }: ConversationListProps) {
  const navigate = useNavigate();
  const { id: selectedId } = useParams();
  const { conversations, loadConversations } = useChatStore();

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return d.toLocaleDateString([], { weekday: "short" });
    } else {
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const pinnedConversations = filteredConversations.filter((c) => c.pinned);
  const activeConversations = filteredConversations.filter(
    (c) => c.status === "active" && !c.pinned
  );
  const archivedConversations = filteredConversations.filter(
    (c) => c.status === "archived"
  );

  const renderConversationItem = (conversation: Conversation) => {
    const isSelected = selectedId === conversation.id;

    return (
      <div
        key={conversation.id}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors cursor-pointer",
          isSelected
            ? "bg-primary/10 text-primary"
            : "hover:bg-accent"
        )}
        onClick={() => navigate(`/chat/${conversation.id}`)}
      >
        <div className={cn(
          "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
          isSelected ? "bg-primary/20" : "bg-muted"
        )}>
          {conversation.type === "project" ? (
            <Bot className="h-4 w-4" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">
              {conversation.title || "Untitled"}
            </span>
            {conversation.pinned && (
              <Pin className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(conversation.updated_at)}</span>
            {conversation.message_count > 0 && (
              <>
                <span>·</span>
                <span>{conversation.message_count*2} messages</span>
              </>
            )}
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleTogglePin(conversation, loadConversations)}>
                {conversation.pinned ? (
                  <>
                    <PinOff className="mr-2 h-4 w-4" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 h-4 w-4" />
                    Pin
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleArchive(conversation, loadConversations)}>
                {conversation.status === "archived" ? (
                  <>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(conversation, loadConversations)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  const renderSection = (
    title: string,
    items: Conversation[],
    icon?: React.ReactNode
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {icon}
          {title}
          <Badge variant="secondary" className="ml-auto text-xs">
            {items.length}
          </Badge>
        </div>
        <div className="space-y-0.5">{items.map(renderConversationItem)}</div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-2">
      {renderSection("Pinned", pinnedConversations, <Pin className="h-3 w-3" />)}
      {renderSection("Recent", activeConversations)}
      {archivedConversations.length > 0 &&
        renderSection(
          "Archived",
          archivedConversations,
          <Archive className="h-3 w-3" />
        )}
      {filteredConversations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">No conversations yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Start a new chat to begin
          </p>
        </div>
      )}
    </div>
  );
}

async function handleTogglePin(conversation: Conversation, onRefresh: () => void) {
  toast.promise(ConversationService.TogglePin(conversation.id), {
    loading: conversation.pinned ? "Unpinning..." : "Pinning...",
    success: () => {
      onRefresh();
      return conversation.pinned ? "Unpinned" : "Pinned";
    },
    error: "Failed to update pin status",
  });
}

async function handleArchive(conversation: Conversation, onRefresh: () => void) {
  const action = conversation.status === "archived" ? "unarchiving" : "archiving";
  toast.promise(ConversationService.Archive(conversation.id), {
    loading: `${action.charAt(0).toUpperCase() + action.slice(1)}...`,
    success: () => {
      onRefresh();
      return conversation.status === "archived" ? "Unarchived" : "Archived";
    },
    error: "Failed to update archive status",
  });
}

async function handleDelete(conversation: Conversation, onRefresh: () => void) {
  toast.promise(ConversationService.Delete(conversation.id), {
    loading: "Deleting...",
    success: () => {
      onRefresh();
      return "Conversation deleted";
    },
    error: "Failed to delete conversation",
  });
}
