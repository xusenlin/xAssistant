import { useState, useEffect, useRef, useCallback } from "react";
import { MessageBlock } from "@/../bindings/xAssistant/internal/models";
import { ChatService } from "@/../bindings/xAssistant/internal/services";
import { Events } from "@wailsio/runtime";
import type { StreamEvent, StreamState } from "@/components/Chat/types";

interface UseStreamSubscriptionCallbacks {
  onComplete: () => Promise<void>;
  onError: () => Promise<void>;
}

const INITIAL_STREAM_STATE: StreamState = {
  messageID: null,
  blocks: [],
  current: null,
  isStreaming: false,
};

export function useStreamSubscription({ onComplete, onError }: UseStreamSubscriptionCallbacks) {
  const [streamState, setStreamState] = useState<StreamState>(INITIAL_STREAM_STATE);
  const eventOffRef = useRef<(() => void) | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  // Stable callback refs to avoid circular dependencies
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const unsubscribe = useCallback(() => {
    streamingMessageIdRef.current = null;
    if (eventOffRef.current) {
      eventOffRef.current();
      eventOffRef.current = null;
    }
    setStreamState(INITIAL_STREAM_STATE);
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

        case "complete":
          // Defer async cleanup outside of setState
          setTimeout(() => {
            onCompleteRef.current();
            unsubscribe();
          }, 0);
          return prev;

        case "error":
          console.error("Stream error:", data.error);
          setTimeout(() => {
            onErrorRef.current();
            unsubscribe();
          }, 0);
          return prev;

        default:
          return prev;
      }
    });
  }, [unsubscribe]);

  const subscribe = useCallback(async (messageID: string) => {
    unsubscribe();
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
      setStreamState(INITIAL_STREAM_STATE);
    }
  }, [unsubscribe, handleStreamEvent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => unsubscribe();
  }, [unsubscribe]);

  return { streamState, subscribe, unsubscribe, streamingMessageIdRef };
}
