import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Search, MessageSquare, Bot, FileText, Brain, User, Database, Globe, Repeat, Wrench, BookOpen, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ConversationList from "@/components/Chat/ConversationList";
import ChatDetail from "./ChatDetail";
import { Conversation, Agent } from "@/../bindings/xAssistant/internal/models";
import { ConversationService, AgentService } from "@/../bindings/xAssistant/internal/services";

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);

  const isWelcomePage = !id;

  const loadConversations = async () => {
    try {
      const data = await ConversationService.GetAll();
      const filtered = (data || []).filter((c): c is Conversation => c !== null);
      setConversations(filtered);

      // If current conversation is deleted, navigate back
      if (id && !filtered.find((c) => c.id === id)) {
        navigate("/chat");
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const loadAgents = async () => {
    try {
      const data = await AgentService.GetEnabled();
      const filtered = (data || []).filter((a): a is Agent => a !== null);
      setAgents(filtered);
    } catch (error) {
      console.error("Failed to load agents:", error);
    }
  };

  useEffect(() => {
    loadConversations();
    loadAgents();
  }, []);

  const handleAgentSelect = async (agentId: string) => {
    try {
      const newConv = await ConversationService.Create(
        "New Chat",
        agentId,
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

  const getAgentItemCount = (items: string | undefined) => {
    if (!items) return 0;
    return items.split(",").filter(i => i.trim()).length;
  };

  const renderChatArea = () => {
    if (id) {
      return <ChatDetail onConversationUpdate={loadConversations} />;
    }

    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">Start a new conversation</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {agents.length > 0 ? "Select an agent to begin" : "Create an agent first to start chatting"}
          </p>
        </div>

        {/* Agent Cards */}
        {agents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
            {agents.map((agent) => (
              <Card
                key={agent.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleAgentSelect(agent.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {agent.icon ? (
                      <span className="text-lg">{agent.icon}</span>
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                    {agent.name}
                  </CardTitle>
                  {agent.description && (
                    <CardDescription className="line-clamp-2 mt-1">
                      {agent.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pb-2">
                  {/* MD Status Icons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <FileText className={`h-3.5 w-3.5 ${agent.agents_md ? "text-primary" : "text-muted-foreground/40"}`} />
                            <span className="text-xs text-muted-foreground">Agents</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Agents MD: {agent.agents_md ? "Configured" : "Empty"}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <Brain className={`h-3.5 w-3.5 ${agent.soul_md ? "text-primary" : "text-muted-foreground/40"}`} />
                            <span className="text-xs text-muted-foreground">Soul</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Soul MD: {agent.soul_md ? "Configured" : "Empty"}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <User className={`h-3.5 w-3.5 ${agent.profile_md ? "text-primary" : "text-muted-foreground/40"}`} />
                            <span className="text-xs text-muted-foreground">Profile</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Profile MD: {agent.profile_md ? "Configured" : "Empty"}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <Database className={`h-3.5 w-3.5 ${agent.memory_md ? "text-primary" : "text-muted-foreground/40"}`} />
                            <span className="text-xs text-muted-foreground">Memory</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Memory MD: {agent.memory_md ? "Configured" : "Empty"}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {agent.language && (
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span>{agent.language}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Repeat className="h-3 w-3" />
                      <span>{agent.max_iterations}</span>
                    </div>
                    {getAgentItemCount(agent.tools) > 0 && (
                      <div className="flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        <span>{getAgentItemCount(agent.tools)}</span>
                      </div>
                    )}
                    {getAgentItemCount(agent.skills) > 0 && (
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span>{getAgentItemCount(agent.skills)}</span>
                      </div>
                    )}
                    {getAgentItemCount(agent.mcp) > 0 && (
                      <div className="flex items-center gap-1">
                        <Server className="h-3 w-3" />
                        <span>{getAgentItemCount(agent.mcp)}</span>
                      </div>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center py-8">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground text-center mb-4">
                No agents available yet. Create your first agent to start a conversation.
              </p>
              <Button onClick={() => navigate("/agents")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            </CardContent>
          </Card>
        )}
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
