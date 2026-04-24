import { Bot, User } from "lucide-react";
import { Message, MessageBlock } from "@/../bindings/xAssistant/internal/models";
import { BlockContent } from "@/components/Chat/BlockContent";
import { StreamingBubble } from "@/components/Chat/StreamingBubble";
import type { StreamState } from "@/components/Chat/types";

interface MessageBubbleProps {
  message: Message;
  blocks: MessageBlock[];
  isStreaming: boolean;
  streamState: StreamState;
}

export function MessageBubble({ message, blocks, isStreaming, streamState }: MessageBubbleProps) {
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
}