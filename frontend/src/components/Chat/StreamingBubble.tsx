import { Bot, Loader2 } from "lucide-react";
import { BlockContent } from "./BlockContent";
import type { StreamState } from "./types";

interface StreamingBubbleProps {
  streamState: StreamState;
  modelName?: string;
}

export function StreamingBubble({ streamState, modelName }: StreamingBubbleProps) {
  if (!streamState.isStreaming || !streamState.messageID) return null;

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
        <Bot className="h-4 w-4" />
      </div>

      <div className="flex flex-col gap-1 items-start max-w-[70%]">
        <div className="rounded-lg px-4 py-2 bg-muted">
          {streamState.blocks.map((block, index) => (
            <div key={index} className="text-sm">
              <BlockContent
                blockType={block.block_type}
                content={block.content}
                toolName={block.tool_name}
                toolInput={block.tool_input}
                toolResult={block.tool_result}
                isError={block.is_error}
              />
            </div>
          ))}

          {streamState.current && (
            <div className="text-sm">
              <BlockContent
                blockType={streamState.current.block_type}
                content={streamState.current.content}
                toolName={streamState.current.tool_name}
                showCursor
              />
            </div>
          )}

          {streamState.blocks.length === 0 && !streamState.current && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {modelName && <span className="font-medium">{modelName}</span>}
          <span className="animate-pulse">Streaming...</span>
        </div>
      </div>
    </div>
  );
}
