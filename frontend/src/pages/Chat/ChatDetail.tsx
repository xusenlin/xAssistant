import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Bot, User, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatInput from "@/components/Chat/ChatInput";
import type { ThinkingLevel } from "@/components/Chat/ChatInput";
import { ChatHeader } from "@/components/Chat/ChatHeader";
import { BlockContent } from "@/components/Chat/BlockContent";
import { StreamingBubble } from "@/components/Chat/StreamingBubble";
import type { StreamEvent, StreamState } from "@/components/Chat/types";
import { Conversation, Message, MessageBlock } from "@/../bindings/xAssistant/internal/models";
import { ConversationService, MessageService, MessageBlockService, ChatService } from "@/../bindings/xAssistant/internal/services";
import { Events } from "@wailsio/runtime";

interface ChatDetailProps {
  onConversationUpdate?: () => void;
}

export default function ChatDetail({ onConversationUpdate }: ChatDetailProps) {
  const { id } = useParams<{ id: string }>();
  const idRef = useRef(id);
  idRef.current = id;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const conversationRef = useRef<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageBlocks, setMessageBlocks] = useState<Record<string, MessageBlock[]>>({});
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventOffRef = useRef<(() => void) | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  const [streamState, setStreamState] = useState<StreamState>({
    messageID: null,
    blocks: [],
    current: null,
    isStreaming: false,
  });

  const loadConversation = async () => {
    const currentId = idRef.current;
    if (!currentId) return;
    try {
      const conv = await ConversationService.GetByID(currentId);
      setConversation(conv);
      conversationRef.current = conv;
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const loadMessages = async () => {
    const currentId = idRef.current;
    if (!currentId) return;
    try {
      const msgs = await MessageService.GetByConversationID(currentId);
      const filteredMsgs = (msgs || []).filter((m): m is Message => m !== null);

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

      const lastMsg = filteredMsgs[filteredMsgs.length - 1];
      if (lastMsg && lastMsg.status !== "completed" && lastMsg.status !== "failed" && streamingMessageIdRef.current !== lastMsg.id) {
        subscribeToStream(lastMsg.id);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const unsubscribeFromStream = useCallback(() => {
    streamingMessageIdRef.current = null;
    if (eventOffRef.current) {
      eventOffRef.current();
      eventOffRef.current = null;
    }
    setStreamState({ messageID: null, blocks: [], current: null, isStreaming: false });
  }, []);

  const handleStreamEvent = useCallback((event: { data: StreamEvent }) => {
    const data = event.data;

    setStreamState((prev) => {
      switch (data.type) {
        case "block_start":
          return {
            ...prev,
            current: new MessageBlock({ block_type: data.block_type || "text", content: "" }),
          };

        case "delta":
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
          return {
            ...prev,
            blocks: [
              ...prev.blocks,
              new MessageBlock({ block_type: data.block_type || "text", content: data.content || "" }),
            ],
            current: null,
          };

        case "complete": {
          const currentConv = conversationRef.current;
          setTimeout(async () => {
            await loadMessages();
            unsubscribeFromStream();
            setSending(false);

            if (currentConv && (currentConv.title === "" || currentConv.title === "New Chat")) {
              try {
                const title = await ChatService.GenerateTitle(currentConv.id);
                if (title) {
                  setConversation((prev) => (prev ? { ...prev, title } : null));
                  onConversationUpdate?.();
                }
              } catch (error) {
                console.error("Failed to generate title:", error);
              }
            }
          }, 0);
          return prev;
        }

        case "error":
          console.error("Stream error:", data.error);
          setTimeout(async () => {
            await loadMessages();
            unsubscribeFromStream();
            setSending(false);
          }, 0);
          return prev;

        default:
          return prev;
      }
    });
  }, [unsubscribeFromStream, onConversationUpdate]);

  const subscribeToStream = useCallback(async (messageID: string) => {
    unsubscribeFromStream();
    streamingMessageIdRef.current = messageID;

    try {
      const snapshot = await ChatService.Subscribe(messageID);
      setStreamState({
        messageID,
        blocks: snapshot?.blocks || [],
        current: snapshot?.current || null,
        isStreaming: true,
      });

      const eventName = `chat:stream:${messageID}`;
      Events.On(eventName, handleStreamEvent);
      eventOffRef.current = () => Events.Off(eventName);
    } catch (error) {
      console.error("Failed to subscribe to stream:", error);
      streamingMessageIdRef.current = null;
      setStreamState({ messageID: null, blocks: [], current: null, isStreaming: false });
    }
  }, [unsubscribeFromStream, handleStreamEvent]);

  useEffect(() => {
    return () => unsubscribeFromStream();
  }, [unsubscribeFromStream]);

  useEffect(() => {
    unsubscribeFromStream();
    loadConversation();
    loadMessages();
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamState.blocks, streamState.current]);

  const handleSend = useCallback(
    (message: string, modelId: string, thinkingLevel: ThinkingLevel) => {
      const currentId = idRef.current;
      if (!currentId || sending) return;

      setSending(true);

      ChatService.SendMessageStream(currentId, message, modelId, thinkingLevel)
        .then(async (messageID) => {
          await subscribeToStream(messageID);
          await loadMessages();
        })
        .catch(async (error) => {
          console.error("SendMessageStream error:", error);
          await loadMessages();
          setSending(false);
        });
    },
    [sending, subscribeToStream]
  );

  const handleModelChange = useCallback((modelId: string) => {
    const currentId = idRef.current;
    if (currentId && modelId) {
      ConversationService.UpdateModelID(currentId, modelId);
    }
  }, []);

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col flex-1">
      <ChatHeader conversation={conversation} />

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
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                blocks={messageBlocks[message.id] || []}
                isStreaming={message.id === streamState.messageID && streamState.isStreaming}
                streamState={streamState}
              />
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <ChatInput
          onSend={handleSend}
          sending={sending}
          defaultModelId={conversation?.model_id}
          onModelChange={handleModelChange}
        />
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  blocks: MessageBlock[];
  isStreaming: boolean;
  streamState: StreamState;
}

const MessageBubble = ({ message, blocks, isStreaming, streamState }: MessageBubbleProps) => {
  const isUser = message.role === "user";

  if (isStreaming) {
    return (
      <StreamingBubble
        streamState={streamState}
        modelName={message.model_name}
      />
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"} max-w-[70%]`}>
        <div
          className={`rounded-lg px-4 py-2 ${
            isUser ? "bg-primary/10 text-primary-foreground" : "bg-muted"
          }`}
        >
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {message.status === "failed" ? "Stream failed" : "No content"}
            </p>
          ) : (
            blocks.map((block) => (
              <div key={block.id} className="text-sm">
                <BlockContent
                  blockType={block.block_type}
                  content={block.content}
                  toolName={block.tool_name}
                  toolInput={block.tool_input}
                  toolResult={block.tool_result}
                  isError={block.is_error}
                />
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
            {message.created_at
              ? new Date(message.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </span>
        </div>
      </div>
    </div>
  );
};
