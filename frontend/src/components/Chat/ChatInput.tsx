import { useState, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Model } from "@/../bindings/xAssistant/internal/models";
import { ModelService } from "@/../bindings/xAssistant/internal/services";

interface ChatInputProps {
  onSend: (message: string, modelId: string) => void;
  disabled?: boolean;
  sending?: boolean;
  defaultModelId?: string;
}

export default function ChatInput({
  onSend,
  disabled,
  sending,
  defaultModelId,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<string>(defaultModelId || "");
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (defaultModelId && models.length > 0) {
      setSelectedModelId(defaultModelId);
    } else if (models.length > 0 && !selectedModelId) {
      const enabledModel = models.find((m) => m.enabled);
      if (enabledModel) {
        setSelectedModelId(enabledModel.model_id);
      }
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
    onSend(input.trim(), selectedModelId);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedModel = models.find((m) => m.model_id === selectedModelId);

  return (
    <div className="flex flex-col gap-2">
      <InputGroup>
        {/* Textarea */}
        <InputGroupTextarea
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending || !selectedModelId}
        />

        {/* Right Addon */}
        <InputGroupAddon align="block-end">
          {/* Model Selector */}
          <Select value={selectedModelId} onValueChange={setSelectedModelId}>
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
                    <SelectItem key={model.id} value={model.model_id} className="py-2">
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
