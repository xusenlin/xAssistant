import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Search, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConversationList from "@/components/Chat/ConversationList";
import ChatDetail from "./ChatDetail";
import { Conversation } from "@/../bindings/xAssistant/internal/models";
import { ConversationService } from "@/../bindings/xAssistant/internal/services";

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadConversations = async () => {
    try {
      const data = await ConversationService.GetAll();
      setConversations((data || []).filter((c): c is Conversation => c !== null));
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleCreateConversation = async () => {
    try {
      const newConv = await ConversationService.Create(
        "New Chat",
        "",
        "simple"
      );
      await loadConversations();
      if (newConv) {
        navigate(`/chat/${newConv.id}`);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    navigate(`/chat/${conversation.id}`);
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderChatArea = () => {
    if (id) {
      return <ChatDetail />;
    }

    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">Start a new conversation</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Create a new chat or select an existing conversation from the list.
          </p>
          <Button className="mt-6" onClick={handleCreateConversation}>
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-5rem)]">
      {/* Conversation List Panel */}
      <div className="flex w-72 flex-shrink-0 flex-col border-r bg-card">
        {/* Header */}
        <div className="border-b p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Chats</h2>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleCreateConversation}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-hidden">
          <ConversationList
            conversations={filteredConversations}
            selectedId={id}
            onSelect={handleSelectConversation}
            onRefresh={loadConversations}
          />
        </div>
      </div>

      {/* Chat Area */}
      {renderChatArea()}
    </div>
  );
}
