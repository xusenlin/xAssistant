import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Bot, User, Loader2, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatInput from "@/components/Chat/ChatInput";
import { Conversation, Message, MessageBlock } from "@/../bindings/xAssistant/internal/models";
import { ConversationService, MessageService, MessageBlockService, ChatService } from "@/../bindings/xAssistant/internal/services";
import { Events } from "@wailsio/runtime";

// Stream block data from Go
interface StreamBlockData {
  id?: string;
  message_id?: string;
  block_type: string;
  content: string;
  tool_use_id?: string;
  tool_name?: string;
  tool_input?: string;
  tool_result?: string;
  is_error?: boolean;
}

// Stream event from Go
interface StreamEvent {
  type: "block_start" | "delta" | "block_end" | "complete" | "error";
  block_type?: string;
  delta?: string;
  content?: string;
  error?: string;
}

// Stream state for a message
interface StreamState {
  messageID: string | null;
  blocks: StreamBlockData[];
  current: StreamBlockData | null;
  isStreaming: boolean;
}

export default function ChatDetail() {
  const { id } = useParams<{ id: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageBlocks, setMessageBlocks] = useState<Record<string, MessageBlock[]>>({});
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventOffRef = useRef<(() => void) | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  // Stream state
  const [streamState, setStreamState] = useState<StreamState>({
    messageID: null,
    blocks: [],
    current: null,
    isStreaming: false,
  });

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  };

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
      const filteredMsgs = (msgs || []).filter((m): m is Message => m !== null);

      // Load blocks for each message (skip streaming messages)
      const blocksMap: Record<string, MessageBlock[]> = {};
      for (const msg of filteredMsgs) {
        if (msg && msg.status === "completed") {
          const blocks = await MessageBlockService.GetByMessageID(msg.id);
          const filteredBlocks = (blocks || []).filter((b): b is MessageBlock => b !== null);
          blocksMap[msg.id] = filteredBlocks;
        }
      }

      setMessages(filteredMsgs);
      setMessageBlocks(blocksMap);

      // Check for unfinished streaming messages
      const lastMsg = filteredMsgs[filteredMsgs.length - 1];
      if (lastMsg && lastMsg.status !== "completed" && lastMsg.status !== "failed") {
        subscribeToStream(lastMsg.id);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  // Subscribe to a message stream
  const subscribeToStream = async (messageID: string) => {
    // Unsubscribe from previous stream if any
    unsubscribeFromStream();

    try {
      // Get current buffer from Go
      const snapshot = await ChatService.Subscribe(messageID);

      // Set initial state from buffer
      setStreamState({
        messageID: messageID,
        blocks: snapshot?.blocks || [],
        current: snapshot?.current || null,
        isStreaming: true,
      });

      // Listen for stream events
      const eventName = `chat:stream:${messageID}`;
      Events.On(eventName, handleStreamEvent);
      eventOffRef.current = () => Events.Off(eventName);
    } catch (error) {
      console.error("Failed to subscribe to stream:", error);
      // No active stream, just load messages normally
      setStreamState({
        messageID: null,
        blocks: [],
        current: null,
        isStreaming: false,
      });
    }
  };

  // Unsubscribe from current stream
  const unsubscribeFromStream = () => {
    if (eventOffRef.current) {
      eventOffRef.current();
      eventOffRef.current = null;
    }
    setStreamState({
      messageID: null,
      blocks: [],
      current: null,
      isStreaming: false,
    });
  };

  // Handle stream events from Go
  const handleStreamEvent = useCallback((event: { data: StreamEvent }) => {
    const data = event.data;

    setStreamState((prev) => {
      switch (data.type) {
        case "block_start":
          // New block starting
          return {
            ...prev,
            current: {
              block_type: data.block_type || "text",
              content: "",
            },
          };

        case "delta":
          // Update current block with delta
          if (prev.current && prev.current.block_type === data.block_type) {
            return {
              ...prev,
              current: {
                ...prev.current,
                content: data.content || prev.current.content + (data.delta || ""),
              },
            };
          }
          return prev;

        case "block_end":
          // Block completed, move to blocks list
          return {
            ...prev,
            blocks: [
              ...prev.blocks,
              {
                block_type: data.block_type || "text",
                content: data.content || "",
              },
            ],
            current: null,
          };

        case "complete":
          // Stream completed
          setTimeout(() => {
            unsubscribeFromStream();
            loadMessages();
            setSending(false);
          }, 0);
          return prev;

        case "error":
          // Stream error
          console.error("Stream error:", data.error);
          setTimeout(() => {
            unsubscribeFromStream();
            loadMessages();
            setSending(false);
          }, 0);
          return prev;

        default:
          return prev;
      }
    });
  }, []);

  // Clean up on unmount or conversation change
  useEffect(() => {
    return () => {
      unsubscribeFromStream();
    };
  }, []);

  useEffect(() => {
    unsubscribeFromStream();
    loadConversation();
    loadMessages();
  }, [id]);

  // Auto scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamState.blocks, streamState.current]);

  const handleSend = useCallback((message: string, modelId: string) => {
    if (!id || sending) return;

    setSending(true);

    ChatService.SendMessageStream(id, message, modelId)
      .then(async (messageID) => {
        console.log("Message sent:", messageID);
        // Subscribe to the stream
        await subscribeToStream(messageID);
        // Reload messages to show the new user message
        await loadMessages();
      })
      .catch(async (error) => {
        console.error("SendMessageStream error:", error);
        await loadMessages();
        setSending(false);
      });
  }, [id, sending]);

  // Render a streaming message
  const renderStreamingMessage = () => {
    if (!streamState.isStreaming || !streamState.messageID) return null;

    const streamingMsg = messages.find((m) => m.id === streamState.messageID);
    if (!streamingMsg) return null;

    return (
      <div className="flex gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
          <Bot className="h-4 w-4" />
        </div>

        <div className="flex flex-col gap-1 items-start max-w-[70%]">
          <div className="rounded-lg px-4 py-2 bg-muted">
            {/* Completed blocks */}
            {streamState.blocks.map((block, index) => (
              <div key={index} className="text-sm">
                {renderStreamBlock(block)}
              </div>
            ))}

            {/* Current streaming block with cursor */}
            {streamState.current && (
              <div className="text-sm">
                {renderStreamBlock(streamState.current, true)}
              </div>
            )}

            {/* Loading indicator if no content yet */}
            {streamState.blocks.length === 0 && !streamState.current && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {streamingMsg.model_name && (
              <span className="font-medium">{streamingMsg.model_name}</span>
            )}
            <span className="animate-pulse">Streaming...</span>
          </div>
        </div>
      </div>
    );
  };

  // Render a stream block
  const renderStreamBlock = (block: StreamBlockData, showCursor = false) => {
    switch (block.block_type) {
      case "thinking":
        return (
          <div className="mt-2 rounded bg-yellow-100 p-2 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
            <span className="mr-1">💭</span>
            {block.content}
            {showCursor && <span className="animate-pulse">|</span>}
          </div>
        );

      case "text":
        return (
          <div className="mt-2 prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {block.content || " "}
            </ReactMarkdown>
            {showCursor && <span className="animate-pulse">|</span>}
          </div>
        );

      case "tool_use":
        return (
          <div className="mt-2 rounded bg-blue-100 p-2 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
            <div className="flex items-center gap-1 font-medium">
              <span>🔧</span> {block.tool_name || "Tool"}
            </div>
            {block.content && (
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(block.content), null, 2);
                  } catch {
                    return block.content;
                  }
                })()}
              </pre>
            )}
          </div>
        );

      case "tool_result":
        return (
          <div className={`mt-2 rounded p-2 text-xs ${
            block.is_error
              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
              : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
          }`}>
            <div className="flex items-center gap-1 font-medium">
              {block.is_error ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <span>📦</span>
              )} Result
            </div>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
              {block.content}
            </pre>
          </div>
        );

      default:
        return <span>{block.content}</span>;
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === "user";

    // If this is the streaming message, render streaming version
    if (message.id === streamState.messageID && streamState.isStreaming) {
      return renderStreamingMessage();
    }

    const blocks = messageBlocks[message.id] || [];

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
            isUser ? "bg-primary/10 text-primary-foreground" : "bg-muted"
          }`}>
            {blocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {message.status === "failed" ? "Stream failed" : "No content"}
              </p>
            ) : (
              blocks.map((block) => (
                <div key={block.id} className="text-sm">
                  {block.block_type === "text" && (
                    block.is_error ? (
                      <div className="mt-2 rounded bg-red-100 p-2 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-200">
                        <div className="flex items-center gap-1 font-medium">
                          <AlertTriangle className="h-3 w-3" /> Error
                        </div>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                          {block.content}
                        </pre>
                      </div>
                    ) : (
                      <div className="mt-2 prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {block.content}
                        </ReactMarkdown>
                      </div>
                    )
                  )}
                  {block.block_type === "thinking" && (
                    <div className="mt-2 rounded bg-yellow-100 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                      <button
                        onClick={() => toggleBlock(block.id)}
                        className="flex w-full items-center gap-1 p-2 font-medium hover:bg-yellow-200/50 dark:hover:bg-yellow-800/30 rounded"
                      >
                        {expandedBlocks.has(block.id) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <span>💭</span>
                        <span>Thinking</span>
                        {!expandedBlocks.has(block.id) && block.content && (
                          <span className="ml-auto text-yellow-600/70 truncate max-w-[200px]">
                            {block.content.substring(0, 50)}...
                          </span>
                        )}
                      </button>
                      {expandedBlocks.has(block.id) && (
                        <div className="px-2 pb-2 whitespace-pre-wrap">
                          {block.content}
                        </div>
                      )}
                    </div>
                  )}
                  {block.block_type === "tool_use" && (
                    <div className="mt-2 rounded bg-blue-100 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                      <button
                        onClick={() => toggleBlock(block.id)}
                        className="flex w-full items-center gap-1 p-2 font-medium hover:bg-blue-200/50 dark:hover:bg-blue-800/30 rounded"
                      >
                        {expandedBlocks.has(block.id) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <span>🔧</span>
                        <span>{block.tool_name}</span>
                        {!expandedBlocks.has(block.id) && block.tool_input && (
                          <span className="ml-auto text-blue-600/70 truncate max-w-[200px]">
                            {block.tool_input.substring(0, 50)}...
                          </span>
                        )}
                      </button>
                      {expandedBlocks.has(block.id) && block.tool_input && (
                        <pre className="px-2 pb-2 overflow-x-auto whitespace-pre-wrap">
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
                    <div className={`mt-2 rounded text-xs ${
                      block.is_error
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                        : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                    }`}>
                      <button
                        onClick={() => toggleBlock(block.id)}
                        className={`flex w-full items-center gap-1 p-2 font-medium rounded ${
                          block.is_error
                            ? "hover:bg-red-200/50 dark:hover:bg-red-800/30"
                            : "hover:bg-green-200/50 dark:hover:bg-green-800/30"
                        }`}
                      >
                        {expandedBlocks.has(block.id) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        {block.is_error ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (
                          <span>📦</span>
                        )}
                        <span>Result</span>
                        {!expandedBlocks.has(block.id) && block.tool_result && (
                          <span className="ml-auto opacity-70 truncate max-w-[200px]">
                            {block.tool_result.substring(0, 50)}...
                          </span>
                        )}
                      </button>
                      {expandedBlocks.has(block.id) && (
                        <pre className="px-2 pb-2 overflow-x-auto whitespace-pre-wrap">
                          {block.tool_result}
                        </pre>
                      )}
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
        <ChatInput
          onSend={handleSend}
          sending={sending}
          defaultModelId={conversation?.model_id}
          onModelChange={(modelId) => {
            if (id && modelId) {
              ConversationService.UpdateModelID(id, modelId);
            }
          }}
        />
      </div>
    </div>
  );
}
