import { Zap, Settings, Scale, Package, Wrench, Download, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Skill {
  id: string;
  name: string;
  description: string;
  license: string;
  compatibility: string;
  metadata: string;
  allowed_tools: string;
  created_at: string;
  updated_at: string;
}

interface SkillCardProps {
  skill: Skill;
  onExport: (skill: Skill) => void;
  onEdit: (skill: Skill) => void;
  onDelete: (skill: Skill) => void;
}

const parseMetadata = (meta: string) => {
  try {
    return JSON.parse(meta || "{}");
  } catch {
    return {};
  }
};

const parseAllowedTools = (tools: string) => {
  const trimmed = (tools || "").trim();
  return trimmed ? trimmed.split(/\s+/) : [];
};

export default function SkillCard({ skill, onExport, onEdit, onDelete }: SkillCardProps) {
  const meta = parseMetadata(skill.metadata);
  const tools = parseAllowedTools(skill.allowed_tools);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-primary shrink-0" />
              <CardTitle className="text-base truncate">{skill.name}</CardTitle>
            </div>
            {skill.description && (
              <CardDescription className="mt-1 line-clamp-3 text-xs">{skill.description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0 space-y-2 pb-2">
        {skill.compatibility && (
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1" title={skill.compatibility}>
            <Settings className="h-3 w-3 shrink-0 text-muted-foreground/60" />
            <span className="text-muted-foreground/60">·</span> {skill.compatibility}
          </div>
        )}
        <div className="pt-1 pb-1 flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {skill.license && (
            <Badge variant="outline" className="text-xs shrink-0 flex items-center gap-0.5">
              <Scale className="h-3 w-3 shrink-0 text-muted-foreground/60" />
              {skill.license}
            </Badge>
          )}
          {Object.entries(meta).map(([k, v]) => (
            <Badge key={k} variant="outline" className="text-xs shrink-0 flex items-center gap-0.5">
              <Package className="h-3 w-3 shrink-0 text-muted-foreground/60" />
              {String(k)}:{String(v)}
            </Badge>
          ))}
        </div>
        {tools.length > 0 && (
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1" title={tools.join(", ")}>
            <Wrench className="h-3 w-3 shrink-0 text-muted-foreground/60" />
            <span className="text-muted-foreground/60">·</span> {tools.join(", ")}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex justify-end">
        <Button variant="ghost" size="icon" title="Download ZIP" onClick={() => onExport(skill)}>
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Edit" onClick={() => onEdit(skill)}>
          <FileText className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Delete" onClick={() => onDelete(skill)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardFooter>
    </Card>
  );
}
