import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import SkillFileTree from "./SkillFileTree";

interface SkillFileInfo {
  path: string;
  name: string;
  size: number;
  is_dir: boolean;
}

interface Skill {
  id: string;
  name: string;
  license: string;
  compatibility: string;
}

interface SkillEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: Skill | null;
  files: SkillFileInfo[];
  selectedFile: string;
  fileContent: string;
  fileLoading: boolean;
  fileSaving: boolean;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
  onSelectFile: (path: string) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
}

export default function SkillEditDialog({
  open,
  onOpenChange,
  skill,
  files,
  selectedFile,
  fileContent,
  fileLoading,
  fileSaving,
  expandedDirs,
  onToggleDir,
  onSelectFile,
  onContentChange,
  onSave,
}: SkillEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <DialogHeader>
          <DialogTitle>Edit Skill: {skill?.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col flex-1 min-h-0 gap-4 py-2">
          <div className="flex gap-4">
            <div className="w-[30%] min-w-0 flex flex-col">
              <Label className="text-xs text-muted-foreground mb-1">Files</Label>
              <SkillFileTree
                files={files}
                selectedFile={selectedFile}
                expandedDirs={expandedDirs}
                onToggleDir={onToggleDir}
                onSelectFile={onSelectFile}
              />
              {skill && (
                <div className="text-xs text-muted-foreground space-y-0.5 mt-3">
                  <div>License: {skill.license || "—"}</div>
                  <div>Compatibility: {skill.compatibility || "—"}</div>
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <textarea
                className="w-full h-full min-h-[500px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus-visible:outline-none"
                value={fileContent}
                onChange={(e) => onContentChange(e.target.value)}
                disabled={fileLoading}
                spellCheck={false}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onSave} disabled={fileLoading || fileSaving}>
            {fileSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
