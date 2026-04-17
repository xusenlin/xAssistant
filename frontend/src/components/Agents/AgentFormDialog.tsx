import { AlertCircle } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Agent } from "../../../bindings/xAssistant/internal/models/index";

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

const languages = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en-US", label: "English" },
];

const agentTypes = [
  { value: "simple", label: "Simple" },
  { value: "project", label: "Project" },
];

const textareaClass =
  "w-full min-h-[300px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono";

interface AgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent | null;
  formData: FormData;
  isSubmitting: boolean;
  onFormChange: (data: Partial<FormData>) => void;
  onSubmit: () => void;
}

export default function AgentFormDialog({
  open,
  onOpenChange,
  agent,
  formData,
  isSubmitting,
  onFormChange,
  onSubmit,
}: AgentFormDialogProps) {
  const isProjectAgent = formData.type === "project";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <DialogHeader>
          <DialogTitle>{agent ? "Edit Agent" : "Add Agent"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => onFormChange({ icon: e.target.value })}
                placeholder="🤖"
              />
            </div>
            <div className="col-span-3 space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => onFormChange({ name: e.target.value })}
                placeholder="My Agent"
              />
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
              <Label htmlFor="language">Language</Label>
              <select
                id="language"
                value={formData.language}
                onChange={(e) => onFormChange({ language: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => onFormChange({ type: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {agentTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_iterations">Max Iterations</Label>
              <Input
                id="max_iterations"
                type="number"
                min={1}
                max={100}
                value={formData.max_iterations}
                onChange={(e) =>
                  onFormChange({ max_iterations: parseInt(e.target.value) || 100 })
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2">
            <Label htmlFor="enabled">Enabled</Label>
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) => onFormChange({ enabled: checked })}
            />
          </div>

          {isProjectAgent && (
            <div className="space-y-2">
              <Label htmlFor="tools">Tools</Label>
              <Input
                id="tools"
                value={formData.tools}
                onChange={(e) => onFormChange({ tools: e.target.value })}
                placeholder="Tool1, Tool2"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="mcp">MCP</Label>
            <Input
              id="mcp"
              value={formData.mcp}
              onChange={(e) => onFormChange({ mcp: e.target.value })}
              placeholder="MCP1, MCP2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills</Label>
            <Input
              id="skills"
              value={formData.skills}
              onChange={(e) => onFormChange({ skills: e.target.value })}
              placeholder="Skill1, Skill2"
            />
            {!isProjectAgent && (
              <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>Simple agent does not support tool calling. Script skills cannot be executed. Only suitable for simple chat tasks.</p>
              </div>
            )}
          </div>

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
                  className={textareaClass}
                  value={formData.agents_md}
                  onChange={(e) => onFormChange({ agents_md: e.target.value })}
                  placeholder="Enter Agents.md content..."
                />
              </TabsContent>
              <TabsContent value="soul_md">
                <textarea
                  className={textareaClass}
                  value={formData.soul_md}
                  onChange={(e) => onFormChange({ soul_md: e.target.value })}
                  placeholder="Enter Soul.md content..."
                />
              </TabsContent>
              <TabsContent value="profile_md">
                <textarea
                  className={textareaClass}
                  value={formData.profile_md}
                  onChange={(e) => onFormChange({ profile_md: e.target.value })}
                  placeholder="Enter PROFILE.md content..."
                />
              </TabsContent>
              <TabsContent value="memory_md">
                <textarea
                  className={textareaClass}
                  value={formData.memory_md}
                  onChange={(e) => onFormChange({ memory_md: e.target.value })}
                  placeholder="Enter MEMORY.md content..."
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting || !formData.name}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
