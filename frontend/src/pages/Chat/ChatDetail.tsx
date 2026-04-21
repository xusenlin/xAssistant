import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Bot, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatInput from "@/components/Chat/ChatInput";
import { Conversation, Message, MessageBlock } from "@/../bindings/xAssistant/internal/models";
import { ConversationService, MessageService, MessageBlockService } from "@/../bindings/xAssistant/internal/services";

export default function ChatDetail() {
  const { id } = useParams<{ id: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageBlocks, setMessageBlocks] = useState<Record<string, MessageBlock[]>>({});
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversation = async () => {
    if (!id) return;
    try {
      const conv = await ConversationService.GetByID(id);
      setConversation(conv);
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const loadMessages = async () => {
    if (!id) return;
    try {
      const msgs = await MessageService.GetByConversationID(id);
      setMessages((msgs || []).filter((m): m is Message => m !== null));

      // Load blocks for each message
      const blocksMap: Record<string, MessageBlock[]> = {};
      for (const msg of msgs || []) {
        if (msg) {
          const blocks = await MessageBlockService.GetByMessageID(msg.id);
          blocksMap[msg.id] = (blocks || []).filter((b): b is MessageBlock => b !== null);
        }
      }
      setMessageBlocks(blocksMap);
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  useEffect(() => {
    loadConversation();
    loadMessages();
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (message: string, modelId: string) => {
    if (!id || sending) return;

    setSending(true);

    try {
      // Create user message
      await MessageService.Create(id, "user", modelId);
      await loadMessages();

      // TODO: Call AI API here
      console.log("User message:", message, "Model:", modelId);

      setSending(false);
    } catch (error) {
      console.error("Failed to send message:", error);
      setSending(false);
    }
  };

  const renderMessage = (message: Message) => {
    const blocks = messageBlocks[message.id] || [];
    const isUser = message.role === "user";

    return (
      <div
        key={message.id}
        className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
      >
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>

        <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"} max-w-[70%]`}>
          <div className={`rounded-lg px-4 py-2 ${
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}>
            {blocks.length === 0 ? (
              <p className="text-sm">No content</p>
            ) : (
              blocks.map((block) => (
                <div key={block.id} className="text-sm">
                  {block.block_type === "text" && (
                    <div className="mt-2 prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {block.content}
                      </ReactMarkdown>
                    </div>
                  )}
                  {block.block_type === "thinking" && (
                    <div className="mt-2 rounded bg-yellow-100 p-2 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                      <span className="mr-1">💭</span>
                      {block.content}
                    </div>
                  )}
                  {block.block_type === "tool_use" && (
                    <div className="mt-2 rounded bg-blue-100 p-2 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                      <div className="flex items-center gap-1 font-medium">
                        <span>🔧</span> {block.tool_name}
                      </div>
                      {block.tool_input && (
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                          {(() => {
                            try {
                              return JSON.stringify(JSON.parse(block.tool_input), null, 2);
                            } catch {
                              return block.tool_input;
                            }
                          })()}
                        </pre>
                      )}
                    </div>
                  )}
                  {block.block_type === "tool_result" && (
                    <div className={`mt-2 rounded p-2 text-xs ${
                      block.is_error
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                        : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                    }`}>
                      <div className="flex items-center gap-1 font-medium">
                        <span>📦</span> Result
                      </div>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                        {block.tool_result}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {!isUser && message.model_name && (
              <span className="font-medium">{message.model_name}</span>
            )}
            {message.input_tokens > 0 || message.output_tokens > 0 ? (
              <span>· {message.input_tokens + message.output_tokens} tokens</span>
            ) : null}
            <span>
              {message.created_at ? new Date(message.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              }) : ""}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col flex-1">
      {/* Header */}
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

      {/* Messages */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm font-medium">Start the conversation</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Send a message to begin chatting
              </p>
            </div>
          ) : (
            messages.map(renderMessage)
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <ChatInput onSend={handleSend} sending={sending} />
      </div>
    </div>
  );
}
