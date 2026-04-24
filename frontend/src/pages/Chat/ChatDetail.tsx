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

export default function ChatDetail() {
  const { id } = useParams<{ id: string }>();

  // Keep a ref to the latest id so async callbacks can read it without stale closures
  const idRef = useRef(id);
  idRef.current = id;

  // --- Store ---
  const { currentConversation: conversation, loadCurrentConversation, loadConversations } = useChatStore();

  // --- Local state ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageBlocks, setMessageBlocks] = useState<Record<string, MessageBlock[]>>({});
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Message loading ---

  const loadMessages = useCallback(async () => {
    const currentId = idRef.current;
    if (!currentId) return;
    try {
      const msgs = await MessageService.GetByConversationID(currentId);
      const filteredMsgs = (msgs || []).filter((m): m is Message => m !== null);

      const blocksMap: Record<string, MessageBlock[]> = {};
      for (const msg of filteredMsgs) {
        if (msg.status === "completed") {
          const blocks = await MessageBlockService.GetByMessageID(msg.id);
          blocksMap[msg.id] = (blocks || []).filter((b): b is MessageBlock => b !== null);
        }
      }

      setMessages(filteredMsgs);
      setMessageBlocks(blocksMap);

      // Resume stream if last message is still in-progress (e.g. page refresh during streaming)
      const lastMsg = filteredMsgs[filteredMsgs.length - 1];
      if (lastMsg && lastMsg.status !== "completed" && lastMsg.status !== "failed" && streamingMessageIdRef.current !== lastMsg.id) {
        subscribe(lastMsg.id);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  }, []);

  // --- Stream subscription ---

  const handleStreamComplete = useCallback(async () => {
    await loadMessages();
    setSending(false);

    // Auto-generate title for untitled conversations
    const conv = useChatStore.getState().currentConversation;
    if (conv && (conv.title === "" || conv.title === "New Chat")) {
      try {
        const title = await ChatService.GenerateTitle(conv.id);
        if (title) {
          await loadCurrentConversation(conv.id);
          loadConversations();
        }
      } catch (error) {
        console.error("Failed to generate title:", error);
      }
    }
  }, [loadMessages, loadCurrentConversation, loadConversations]);

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
      loadCurrentConversation(id);
    }
    loadMessages();
  }, [id]);

  // Auto-scroll on new content
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamState.blocks, streamState.current]);

  // --- Actions ---

  const handleSend = useCallback(
    async (message: string, modelId: string, thinkingLevel: ThinkingLevel) => {
      const currentId = idRef.current;
      if (!currentId || sending) return;

      setSending(true);

      const agentID = useChatStore.getState().currentConversation?.agent_id || "";

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
    [sending, subscribe, loadMessages]
  );

  const handleModelChange = useCallback((modelId: string) => {
    const currentId = idRef.current;
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
