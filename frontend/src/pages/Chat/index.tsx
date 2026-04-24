import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConversationList from "@/components/Chat/ConversationList";
import ChatDetail from "./ChatDetail";
import NewConversation from "./NewConversation";
import { useChatStore } from "@/stores/chatStore";
import { useState } from "react";

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { conversations, loadConversations } = useChatStore();
  const [searchQuery, setSearchQuery] = useState("");

  const isWelcomePage = !id;

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (id && !conversations.find((c) => c.id === id)) {
      navigate("/chat");
    }
  }, [conversations, id]);

  return (
    <div className="flex h-[calc(100vh-5rem)]">
      {/* Conversation List Panel */}
      <div className="flex w-72 flex-shrink-0 flex-col border-r bg-card">
        {/* Header */}
        <div className="border-b p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Chats</h2>
            {!isWelcomePage && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => navigate("/chat")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
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
          <ConversationList searchQuery={searchQuery} />
        </div>
      </div>

      {/* Chat Area */}
      {id ? <ChatDetail /> : <NewConversation />}
    </div>
  );
}
