import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Model } from "../../../bindings/xAssistant/internal/models/index";

interface FormData {
  name: string;
  provider: string;
  model_id: string;
  base_url: string;
  api_key: string;
  description: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  enabled: boolean;
  tags: string;
  metadata: string;
}

const providers = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
];

interface ModelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: Model | null;
  formData: FormData;
  isSubmitting: boolean;
  showApiKey: boolean;
  onFormChange: (data: Partial<FormData>) => void;
  onToggleApiKey: () => void;
  onSubmit: () => void;
}

export default function ModelFormDialog({
  open,
  onOpenChange,
  model,
  formData,
  isSubmitting,
  showApiKey,
  onFormChange,
  onToggleApiKey,
  onSubmit,
}: ModelFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <DialogHeader>
          <DialogTitle>{model ? "Edit Model" : "Add Model"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => onFormChange({ name: e.target.value })}
                placeholder="My GPT-4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <select
                id="provider"
                value={formData.provider}
                onChange={(e) => onFormChange({ provider: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select provider</option>
                {providers.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model_id">Model ID</Label>
              <Input
                id="model_id"
                value={formData.model_id}
                onChange={(e) => onFormChange({ model_id: e.target.value })}
                placeholder="gpt-4-turbo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="base_url">Base URL</Label>
              <Input
                id="base_url"
                value={formData.base_url}
                onChange={(e) => onFormChange({ base_url: e.target.value })}
                placeholder={
                  formData.provider === "anthropic"
                    ? "https://api.anthropic.com/v1/messages"
                    : "https://api.openai.com/v1"
                }
              />
              {formData.provider === "anthropic" && (
                <p className="text-xs text-muted-foreground">
                  Anthropic 需要完整路径，以 /v1/messages 结尾
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_key">
              API Key {model && "(leave empty to keep current)"}
            </Label>
            <div className="relative">
              <Input
                id="api_key"
                type={showApiKey ? "text" : "password"}
                value={formData.api_key}
                onChange={(e) => onFormChange({ api_key: e.target.value })}
                placeholder={model ? "••••••••" : "sk-..."}
                className="pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={onToggleApiKey}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={formData.temperature}
                onChange={(e) =>
                  onFormChange({ temperature: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_tokens">Max Tokens</Label>
              <Input
                id="max_tokens"
                type="number"
                value={formData.max_tokens}
                onChange={(e) =>
                  onFormChange({ max_tokens: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="top_p">Top P</Label>
              <Input
                id="top_p"
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={formData.top_p}
                onChange={(e) =>
                  onFormChange({ top_p: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) => onFormChange({ enabled: checked })}
            />
            <Label htmlFor="enabled">Enabled</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (JSON array)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => onFormChange({ tags: e.target.value })}
                placeholder='["gpt4", "fast"]'
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metadata">Metadata (JSON)</Label>
              <Input
                id="metadata"
                value={formData.metadata}
                onChange={(e) => onFormChange({ metadata: e.target.value })}
                placeholder='{"key": "value"}'
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !formData.name || !formData.provider || !formData.model_id}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
