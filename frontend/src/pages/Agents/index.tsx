import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  enabled: true,
};

const languages = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en-US", label: "English" },
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
      enabled: agent.enabled,
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (agent: Agent) => {
    setSelectedAgent(agent);
    setDeleteDialogOpen(true);
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
                <TableHead>Description</TableHead>
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
                    No agents yet. Click "Add Agent" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="text-xl">{agent.icon || "🤖"}</TableCell>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {agent.description || "-"}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(agent)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(agent)}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <DialogHeader>
            <DialogTitle>{selectedAgent ? "Edit Agent" : "Add Agent"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="🤖"
                />
              </div>
              <div className="col-span-3 space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Agent"
                />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <select
                  id="language"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <Label htmlFor="enabled">Enabled</Label>
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
              </div>
            </div>

            {/* Core Files Tabs */}
            <div className="space-y-2">
              <Label>Core Files</Label>
              <Tabs defaultValue="agents_md" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="agents_md">Agents.md</TabsTrigger>
                  <TabsTrigger value="soul_md">Soul.md</TabsTrigger>
                  <TabsTrigger value="profile_md">PROFILE.md</TabsTrigger>
                  <TabsTrigger value="memory_md">MEMORY.md</TabsTrigger>
                </TabsList>
                <TabsContent value="agents_md">
                  <textarea
                    value={formData.agents_md}
                    onChange={(e) => setFormData({ ...formData, agents_md: e.target.value })}
                    placeholder="Enter Agents.md content..."
                    className="w-full min-h-[300px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
                  />
                </TabsContent>
                <TabsContent value="soul_md">
                  <textarea
                    value={formData.soul_md}
                    onChange={(e) => setFormData({ ...formData, soul_md: e.target.value })}
                    placeholder="Enter Soul.md content..."
                    className="w-full min-h-[300px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
                  />
                </TabsContent>
                <TabsContent value="profile_md">
                  <textarea
                    value={formData.profile_md}
                    onChange={(e) => setFormData({ ...formData, profile_md: e.target.value })}
                    placeholder="Enter PROFILE.md content..."
                    className="w-full min-h-[300px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
                  />
                </TabsContent>
                <TabsContent value="memory_md">
                  <textarea
                    value={formData.memory_md}
                    onChange={(e) => setFormData({ ...formData, memory_md: e.target.value })}
                    placeholder="Enter MEMORY.md content..."
                    className="w-full min-h-[300px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete "{selectedAgent?.name}"? This action cannot be undone.
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
