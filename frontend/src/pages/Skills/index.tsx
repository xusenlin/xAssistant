import { useState, useEffect } from "react";
import { Plus, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SkillCard from "@/components/Skills/SkillCard";
import SkillImportDialog from "@/components/Skills/SkillImportDialog";
import SkillDeleteDialog from "@/components/Skills/SkillDeleteDialog";
import SkillEditDialog from "@/components/Skills/SkillEditDialog";
import { SkillService } from "../../../bindings/xAssistant/internal/services/index";
import { toast } from "sonner";
import { Dialogs } from "@wailsio/runtime";

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

interface SkillFileInfo {
  path: string;
  name: string;
  size: number;
  is_dir: boolean;
}

type ImportResult =
  | { ok: true; skill: Skill }
  | { ok: false; error: string };

export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const [files, setFiles] = useState<SkillFileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("SKILL.md");
  const [fileContent, setFileContent] = useState<string>("");
  const [fileLoading, setFileLoading] = useState(false);
  const [fileSaving, setFileSaving] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const data = await SkillService.GetAll();
      setSkills((data || []).filter((s): s is Skill => s !== null));
    } catch (error) {
      console.error("Failed to load skills:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportPreview = async (file: File) => {
    setImportResult(null);
    setImportFile(file);
    setImportLoading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const commaIdx = result.indexOf(",");
          resolve(commaIdx >= 0 ? result.substring(commaIdx + 1) : result);
        };
        reader.onerror = () => reject(new Error("file read error"));
        reader.readAsDataURL(file);
      });
      const skill = await SkillService.ImportSkill(base64);
      if (!skill) {
        setImportResult({ ok: false, error: "unexpected null result" });
      } else {
        setImportResult({ ok: true, skill });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      setImportResult({ ok: false, error: msg });
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportConfirm = async () => {
    if (!importResult?.ok) return;
    setIsSubmitting(true);
    try {
      setImportDialogOpen(false);
      setImportFile(null);
      setImportResult(null);
      await loadSkills();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportCancel = async () => {
    if (importResult?.ok && importResult.skill) {
      try {
        await SkillService.Delete(importResult.skill.id);
      } catch {
        // ignore
      }
    }
    setImportDialogOpen(false);
    setImportFile(null);
    setImportResult(null);
  };

  const handleExport = async (skill: Skill) => {
    try {
      const filePath = await Dialogs.SaveFile({
        Title: "导出 Skill",
        Filename: `${skill.name}.zip`,
        Filters: [{ DisplayName: "ZIP Archive", Pattern: "*.zip" }],
      });
      if (!filePath) return;
      await SkillService.SaveSkillZip(skill.id, filePath);
      toast.success(`已导出到: ${filePath}`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("导出失败: " + error);
    }
  };

  const handleOpenDelete = (skill: Skill) => {
    setSelectedSkill(skill);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedSkill) return;
    try {
      setIsSubmitting(true);
      await SkillService.Delete(selectedSkill.id);
      setDeleteDialogOpen(false);
      setSelectedSkill(null);
      await loadSkills();
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = async (skill: Skill) => {
    setSelectedSkill(skill);
    setFileContent("");
    setFiles([]);
    setSelectedFile("SKILL.md");
    setExpandedDirs(new Set());

    try {
      const fileList = await SkillService.GetSkillFiles(skill.id);
      const filteredFiles = fileList.filter((f) => !f.is_dir);
      setFiles(filteredFiles);
      if (filteredFiles.some((f) => f.name === "SKILL.md")) {
        const content = await SkillService.GetFileContent(skill.id, "SKILL.md");
        setFileContent(content);
      }
      setEditDialogOpen(true);
    } catch (error) {
      toast.error("加载文件列表失败: " + error);
      console.error("Failed to load files:", error);
    }
  };

  const loadFileContent = async (filePath: string) => {
    if (!selectedSkill) return;
    setFileLoading(true);
    try {
      const content = await SkillService.GetFileContent(selectedSkill.id, filePath);
      setFileContent(content);
      setSelectedFile(filePath);
    } catch (error) {
      console.error("Failed to load file:", error);
    } finally {
      setFileLoading(false);
    }
  };

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSaveFile = async () => {
    if (!selectedSkill) return;
    setFileSaving(true);
    try {
      await SkillService.SaveFileContent(selectedSkill.id, selectedFile, fileContent);
      toast.success("保存成功");
      setEditDialogOpen(false);
      await loadSkills();
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("保存失败: " + error);
    } finally {
      setFileSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Skills</h1>
          <p className="text-muted-foreground">Manage your AI agent skills</p>
        </div>
        <Button onClick={() => setImportDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Import Skill
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : skills.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-20 text-muted-foreground transition-colors cursor-pointer"
          onClick={() => setImportDialogOpen(true)}
        >
          <FolderOpen className="h-12 w-12 mb-4" />
          <p className="mb-2">No skills yet</p>
          <p className="text-sm">Import a ZIP package to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onExport={handleExport}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
            />
          ))}
        </div>
      )}

      <SkillImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onPreview={handleImportPreview}
        onConfirm={handleImportConfirm}
        onCancel={handleImportCancel}
        importFile={importFile}
        importResult={importResult}
        importLoading={importLoading}
        isSubmitting={isSubmitting}
      />

      <SkillDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        skill={selectedSkill}
        onConfirm={handleDelete}
        isSubmitting={isSubmitting}
      />

      <SkillEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        skill={selectedSkill}
        files={files}
        selectedFile={selectedFile}
        fileContent={fileContent}
        fileLoading={fileLoading}
        fileSaving={fileSaving}
        expandedDirs={expandedDirs}
        onToggleDir={toggleDir}
        onSelectFile={loadFileContent}
        onContentChange={setFileContent}
        onSave={handleSaveFile}
      />
    </div>
  );
}
