import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Model } from "../../../bindings/xAssistant/internal/models/index";
import { ModelService } from "../../../bindings/xAssistant/internal/services/index";

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

const defaultForm: FormData = {
  name: "",
  provider: "",
  model_id: "",
  base_url: "",
  api_key: "",
  description: "",
  temperature: 0.7,
  max_tokens: 4096,
  top_p: 1.0,
  enabled: true,
  tags: "",
  metadata: "",
};

const providers = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
];

export default function Models() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await ModelService.GetAll();
      setModels((data || []).filter((m): m is Model => m !== null));
    } catch (error) {
      console.error("Failed to load models:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedModel(null);
    setFormData(defaultForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (model: Model) => {
    setSelectedModel(model);
    setFormData({
      name: model.name,
      provider: model.provider,
      model_id: model.model_id,
      base_url: model.base_url || "",
      api_key: "",
      description: model.description || "",
      temperature: model.temperature,
      max_tokens: model.max_tokens,
      top_p: model.top_p,
      enabled: model.enabled,
      tags: model.tags || "",
      metadata: model.metadata || "",
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (model: Model) => {
    setSelectedModel(model);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (selectedModel) {
        await ModelService.Update(
          selectedModel.id,
          formData.name,
          formData.provider,
          formData.model_id,
          formData.base_url,
          formData.api_key,
          formData.description,
          formData.temperature,
          formData.max_tokens,
          formData.top_p,
          formData.enabled,
          formData.tags,
          formData.metadata
        );
      } else {
        await ModelService.Create(
          formData.name,
          formData.provider,
          formData.model_id,
          formData.base_url,
          formData.api_key,
          formData.description,
          formData.temperature,
          formData.max_tokens,
          formData.top_p,
          formData.enabled,
          formData.tags,
          formData.metadata
        );
      }
      setDialogOpen(false);
      loadModels();
    } catch (error) {
      console.error("Failed to save model:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedModel) return;
    try {
      setIsSubmitting(true);
      await ModelService.Delete(selectedModel.id);
      setDeleteDialogOpen(false);
      loadModels();
    } catch (error) {
      console.error("Failed to delete model:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProviderBadge = (provider: string) => {
    const colors: Record<string, string> = {
      openai: "bg-green-500/10 text-green-600 border-green-500/20",
      anthropic: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      deepseek: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      google: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      azure: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      ollama: "bg-pink-500/10 text-pink-600 border-pink-500/20",
    };
    const label = providers.find((p) => p.value === provider)?.label || provider;
    return (
      <Badge variant="outline" className={colors[provider] || ""}>
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Models</h1>
          <p className="text-muted-foreground">Manage your AI models</p>
        </div>
        <div>
          <Button  onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Model
          </Button>
        </div>

      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Model ID</TableHead>
                <TableHead>Temperature</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : models.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No models yet. Click "Add Model" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>{getProviderBadge(model.provider)}</TableCell>
                    <TableCell className="text-muted-foreground">{model.model_id}</TableCell>
                    <TableCell>{model.temperature}</TableCell>
                    <TableCell>
                      <Badge variant={model.enabled ? "default" : "secondary"}>
                        {model.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(model)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(model)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <DialogHeader>
            <DialogTitle>{selectedModel ? "Edit Model" : "Add Model"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My GPT-4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <select
                  id="provider"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                  placeholder="gpt-4-turbo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base_url">Base URL</Label>
                <Input
                  id="base_url"
                  value={formData.base_url}
                  onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">
                API Key {selectedModel && "(leave empty to keep current)"}
              </Label>
              <div className="relative">
                <Input
                  id="api_key"
                  type={showApiKey ? "text" : "password"}
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder={selectedModel ? "••••••••" : "sk-..."}
                  className="pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowApiKey(!showApiKey)}
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
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    setFormData({ ...formData, temperature: parseFloat(e.target.value) || 0 })
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
                    setFormData({ ...formData, max_tokens: parseInt(e.target.value) || 0 })
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
                    setFormData({ ...formData, top_p: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label htmlFor="enabled">Enabled</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (JSON array)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder='["gpt4", "fast"]'
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metadata">Metadata (JSON)</Label>
                <Input
                  id="metadata"
                  value={formData.metadata}
                  onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                  placeholder='{"key": "value"}'
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name || !formData.provider || !formData.model_id}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Model</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete "{selectedModel?.name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
