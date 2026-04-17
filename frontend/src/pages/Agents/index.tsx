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
import AgentFormDialog from "@/components/Agents/AgentFormDialog";
import AgentDeleteDialog from "@/components/Agents/AgentDeleteDialog";
import { Agent } from "../../../bindings/xAssistant/internal/models/index";
import { AgentService } from "../../../bindings/xAssistant/internal/services/index";

interface FormData {
  name: string;
  icon: string;
  description: string;
  agents_md: string;
  soul_md: string;
  profile_md: string;
  memory_md: string;
  language: string;
  type: string;
  tools: string;
  skills: string;
  mcp: string;
  max_iterations: number;
  enabled: boolean;
}

const defaultForm: FormData = {
  name: "",
  icon: "",
  description: "",
  agents_md: "",
  soul_md: "",
  profile_md: "",
  memory_md: "",
  language: "zh-CN",
  type: "simple",
  tools: "",
  skills: "",
  mcp: "",
  max_iterations: 100,
  enabled: true,
};

const languages = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en-US", label: "English" },
];

const agentTypes = [
  { value: "simple", label: "Simple" },
  { value: "project", label: "Project" },
];

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const data = await AgentService.GetAll();
      setAgents((data || []).filter((a): a is Agent => a !== null));
    } catch (error) {
      console.error("Failed to load agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedAgent(null);
    setFormData(defaultForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormData({
      name: agent.name,
      icon: agent.icon || "",
      description: agent.description || "",
      agents_md: agent.agents_md || "",
      soul_md: agent.soul_md || "",
      profile_md: agent.profile_md || "",
      memory_md: agent.memory_md || "",
      language: agent.language || "zh-CN",
      type: agent.type || "simple",
      tools: agent.tools || "",
      skills: agent.skills || "",
      mcp: agent.mcp || "",
      max_iterations: agent.max_iterations || 10,
      enabled: agent.enabled,
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (agent: Agent) => {
    setSelectedAgent(agent);
    setDeleteDialogOpen(true);
  };

  const handleFormChange = (data: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (selectedAgent) {
        await AgentService.Update(
          selectedAgent.id,
          formData.name,
          formData.icon,
          formData.description,
          formData.agents_md,
          formData.soul_md,
          formData.profile_md,
          formData.memory_md,
          formData.language,
          formData.type,
          formData.tools,
          formData.skills,
          formData.mcp,
          formData.max_iterations,
          formData.enabled
        );
      } else {
        await AgentService.Create(
          formData.name,
          formData.icon,
          formData.description,
          formData.agents_md,
          formData.soul_md,
          formData.profile_md,
          formData.memory_md,
          formData.language,
          formData.type,
          formData.tools,
          formData.skills,
          formData.mcp,
          formData.max_iterations,
          formData.enabled
        );
      }
      setDialogOpen(false);
      loadAgents();
    } catch (error) {
      console.error("Failed to save agent:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAgent) return;
    try {
      setIsSubmitting(true);
      await AgentService.Delete(selectedAgent.id);
      setDeleteDialogOpen(false);
      loadAgents();
    } catch (error) {
      console.error("Failed to delete agent:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLanguageLabel = (lang: string) => {
    return languages.find((l) => l.value === lang)?.label || lang;
  };

  const getTypeLabel = (type: string) => {
    return agentTypes.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">Manage your AI agents</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Agent
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Icon</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Language</TableHead>
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
              ) : agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No agents yet. Click &quot;Add Agent&quot; to create one.
                  </TableCell>
                </TableRow>
              ) : (
                agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="text-xl">{agent.icon || "🤖"}</TableCell>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(agent.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getLanguageLabel(agent.language)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={agent.enabled ? "default" : "secondary"}>
                        {agent.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(agent)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(agent)}>
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

      <AgentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agent={selectedAgent}
        formData={formData}
        isSubmitting={isSubmitting}
        onFormChange={handleFormChange}
        onSubmit={handleSubmit}
      />

      <AgentDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        agent={selectedAgent}
        onConfirm={handleDelete}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
