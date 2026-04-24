import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Bot, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatInput from "@/components/Chat/ChatInput";
import type { ThinkingLevel } from "@/components/Chat/ChatInput";
import { ChatHeader } from "@/components/Chat/ChatHeader";
import { MessageBubble } from "@/components/Chat/MessageBubble";
import { Message, MessageBlock } from "@/../bindings/xAssistant/internal/models";
import { ConversationService, MessageService, MessageBlockService, ChatService } from "@/../bindings/xAssistant/internal/services";
import { useChatStore } from "@/stores/chatStore";
import { useStreamSubscription } from "@/hooks/useStreamSubscription";
import { useLatest } from "@/hooks/useLatest";

export default function ChatDetail() {
  const { id } = useParams<{ id: string }>();
  const latestId = useLatest(id);

  // --- Store ---
  const { conversations, setActiveConversation, loadConversations } = useChatStore();
  const conversation = conversations.find((c) => c.id === id) || null;

  // --- Local state ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageBlocks, setMessageBlocks] = useState<Record<string, MessageBlock[]>>({});
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendingRef = useLatest(sending);

  // --- Message loading ---

  const loadMessages = useCallback(async (): Promise<Message[]> => {
    const currentId = latestId.current;
    if (!currentId) return [];
    try {
      const msgs = await MessageService.GetByConversationID(currentId);
      const filteredMsgs = (msgs || []).filter((m): m is Message => m !== null);

      // Fetch blocks in parallel instead of sequentially
      const completedMsgs = filteredMsgs.filter((msg) => msg.status === "completed");
      const blocksEntries = await Promise.all(
        completedMsgs.map(async (msg) => {
          const blocks = await MessageBlockService.GetByMessageID(msg.id);
          return [msg.id, (blocks || []).filter((b): b is MessageBlock => b !== null)] as const;
        })
      );
      const blocksMap: Record<string, MessageBlock[]> = Object.fromEntries(blocksEntries);

      setMessages(filteredMsgs);
      setMessageBlocks(blocksMap);

      return filteredMsgs;
    } catch (error) {
      console.error("Failed to load messages:", error);
      return [];
    }
  }, []);

  // --- Stream subscription ---

  const handleStreamComplete = useCallback(async () => {
    await loadMessages();
    setSending(false);
    loadConversations();
  }, [loadMessages, loadConversations]);

  const handleStreamError = useCallback(async () => {
    await loadMessages();
    setSending(false);
  }, [loadMessages]);

  const { streamState, subscribe, streamingMessageIdRef } = useStreamSubscription({
    onComplete: handleStreamComplete,
    onError: handleStreamError,
  });

  // --- Effects ---

  // Load conversation & messages when id changes
  useEffect(() => {
    if (id) {
      setActiveConversation(id);
    }
    (async () => {
      const msgs = await loadMessages();

      // Resume stream if last message is still in-progress (e.g. page refresh during streaming)
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.status !== "completed" && lastMsg.status !== "failed" && streamingMessageIdRef.current !== lastMsg.id) {
        subscribe(lastMsg.id);
      }
    })();
  }, [id]);

  // Auto-scroll on new content
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamState.blocks, streamState.current]);

  // --- Actions ---

  const handleSend = useCallback(
    async (message: string, modelId: string, thinkingLevel: ThinkingLevel) => {
      const currentId = latestId.current;
      if (!currentId || sendingRef.current) return;

      setSending(true);

      const { conversations: cs } = useChatStore.getState();
      const conv = cs.find((c) => c.id === currentId);
      const agentID = conv?.agent_id || "";

      try {
        const messageID = await ChatService.SendMessageStream(currentId, message, modelId, agentID, thinkingLevel);
        await subscribe(messageID);
        await loadMessages();
      } catch (error) {
        console.error("SendMessageStream error:", error);
        await loadMessages();
        setSending(false);
      }
    },
    [subscribe, loadMessages]
  );

  const handleModelChange = useCallback((modelId: string) => {
    const currentId = latestId.current;
    if (currentId && modelId) {
      ConversationService.UpdateModelID(currentId, modelId);
    }
  }, []);

  // --- Render ---

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col flex-1">
      <ChatHeader />

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
