import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ModelFormDialog from "@/components/Models/ModelFormDialog";
import ModelDeleteDialog from "@/components/Models/ModelDeleteDialog";
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

const providerColors: Record<string, string> = {
  openai: "bg-green-500/10 text-green-600 border-green-500/20",
  anthropic: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  deepseek: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  google: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  azure: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  ollama: "bg-pink-500/10 text-pink-600 border-pink-500/20",
};

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
    setShowApiKey(false);
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
    setShowApiKey(false);
    setDialogOpen(true);
  };

  const handleOpenDelete = (model: Model) => {
    setSelectedModel(model);
    setDeleteDialogOpen(true);
  };

  const handleFormChange = (data: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
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
    const label = providers.find((p) => p.value === provider)?.label || provider;
    return (
      <Badge variant="outline" className={providerColors[provider] || ""}>
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
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Model
        </Button>
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
                    No models yet. Click &quot;Add Model&quot; to create one.
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
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(model)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(model)}>
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

      <ModelFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        model={selectedModel}
        formData={formData}
        isSubmitting={isSubmitting}
        showApiKey={showApiKey}
        onFormChange={handleFormChange}
        onToggleApiKey={() => setShowApiKey((v) => !v)}
        onSubmit={handleSubmit}
      />

      <ModelDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        model={selectedModel}
        onConfirm={handleDelete}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
