import { useState, useEffect } from "react";
import { Send, Loader2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Model } from "@/../bindings/xAssistant/internal/models";
import { ModelService } from "@/../bindings/xAssistant/internal/services";

export type ThinkingLevel = "" | "low" | "medium" | "high";

const THINKING_LEVELS: { value: ThinkingLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

interface ChatInputProps {
  onSend: (message: string, modelId: string, thinkingLevel: ThinkingLevel) => void;
  disabled?: boolean;
  sending?: boolean;
  defaultModelId?: string;
  onModelChange?: (modelId: string) => void;
}

export default function ChatInput({
  onSend,
  disabled,
  sending,
  defaultModelId,
  onModelChange,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<string>(defaultModelId || "");
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>("medium");

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (models.length === 0) return;

    if (defaultModelId) {
      setSelectedModelId(defaultModelId);
    } else {
      ModelService.GetDefault().then((defaultModel) => {
        if (defaultModel) {
          setSelectedModelId(defaultModel.id);
          onModelChange?.(defaultModel.id);
          return;
        }
        const enabledModel = models.find((m) => m.enabled);
        if (enabledModel) {
          setSelectedModelId(enabledModel.id);
        }
      });
    }
  }, [models, defaultModelId]);

  const loadModels = async () => {
    try {
      const data = await ModelService.GetAll();
      setModels((data || []).filter((m): m is Model => m !== null));
    } catch (error) {
      console.error("Failed to load models:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || !selectedModelId || sending) return;
    onSend(input.trim(), selectedModelId, thinkingEnabled ? thinkingLevel : "");
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedModel = models.find((m) => m.id === selectedModelId);

  return (
    <div className="flex flex-col gap-2">
      <InputGroup>
        <InputGroupTextarea
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending || !selectedModelId}
        />

        <InputGroupAddon align="block-end">
          {/* Model Selector */}
          <Select value={selectedModelId} onValueChange={(value) => {
            setSelectedModelId(value);
            onModelChange?.(value);
          }}>
            <SelectTrigger className="h-8 border-0 bg-transparent shadow-none focus:ring-0 text-xs px-1">
              <SelectValue>
                {selectedModel ? (
                  selectedModel.name
                ) : (
                  <span className="text-muted-foreground">Model</span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : models.filter((m) => m.enabled).length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No models available
                </div>
              ) : (
                models
                  .filter((m) => m.enabled)
                  .map((model) => (
                    <SelectItem key={model.id} value={model.id} className="py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-xs">{model.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {model.provider} · {model.model_id}
                        </span>
                      </div>
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>

          {/* Thinking Controls */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              thinkingEnabled && "text-blue-500 hover:text-blue-600"
            )}
            onClick={() => setThinkingEnabled(!thinkingEnabled)}
            title={thinkingEnabled ? "Disable thinking" : "Enable thinking"}
          >
            <Brain className="h-4 w-4" />
          </Button>

          {thinkingEnabled && (
            <Select value={thinkingLevel} onValueChange={(v) => setThinkingLevel(v as ThinkingLevel)}>
              <SelectTrigger className="h-8 border-0 bg-transparent shadow-none focus:ring-0 text-xs px-1 w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THINKING_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Send Button */}
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || !input.trim() || !selectedModelId}
            className="ml-auto"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </InputGroupAddon>
      </InputGroup>

      {!selectedModelId && !loading && (
        <p className="text-xs text-muted-foreground">
          Please select a model to start chatting
        </p>
      )}
    </div>
  );
}
