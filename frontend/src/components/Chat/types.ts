import type { MessageBlock } from "@/../bindings/xAssistant/internal/models";

export interface StreamEvent {
  type: "block_start" | "delta" | "block_end" | "complete" | "error";
  block_type?: string;
  delta?: string;
  content?: string;
  error?: string;
}

export interface StreamState {
  messageID: string | null;
  blocks: MessageBlock[];
  current: MessageBlock | null;
  isStreaming: boolean;
}
