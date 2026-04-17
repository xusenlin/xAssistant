import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Download, FolderOpen, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
  const [isDragging, setIsDragging] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const [files, setFiles] = useState<SkillFileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("SKILL.md");
  const [fileContent, setFileContent] = useState<string>("");
  const [fileLoading, setFileLoading] = useState(false);
  const [fileSaving, setFileSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  useEffect(() => {
    if (!importDialogOpen) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = () => {
      setIsDragging(false);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file && file.name.endsWith(".zip")) {
        setImportFile(file);
        handleImportPreview(file);
      }
    };

    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, [importDialogOpen]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".zip")) {
      setImportFile(file);
      setImportDialogOpen(true);
      handleImportPreview(file);
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
      if (!filePath) {
        return; // user cancelled
      }
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

  const handleSaveFile = async () => {
    if (!selectedSkill) return;
    setFileSaving(true);
    try {
      await SkillService.SaveFileContent(selectedSkill.id, selectedFile, fileContent);
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("保存失败: " + error);
    } finally {
      setFileSaving(false);
    }
  };

  const parseMetadata = (meta: string) => {
    try {
      return JSON.parse(meta || "{}");
    } catch {
      return {};
    }
  };

  const parseAllowedTools = (tools: string) => {
    try {
      return JSON.parse(tools || "[]") as string[];
    } catch {
      return [];
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
          onClick={() => fileInputRef.current?.click()}
        >
          <FolderOpen className="h-12 w-12 mb-4" />
          <p className="mb-2">No skills yet</p>
          <p className="text-sm">Import a ZIP package to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => {
            const meta = parseMetadata(skill.metadata);
            const tools = parseAllowedTools(skill.allowed_tools);
            return (
              <Card key={skill.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{skill.name}</CardTitle>
                      {skill.description && (
                        <CardDescription className="mt-1 line-clamp-2">{skill.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  {skill.license && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{skill.license}</Badge>
                    </div>
                  )}
                  {skill.compatibility && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Compatibility:</span> {skill.compatibility}
                    </div>
                  )}
                  {meta.category && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Category:</span> {meta.category}
                    </div>
                  )}
                  {meta.tags && Array.isArray(meta.tags) && meta.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(meta.tags as string[]).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                  {tools.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Tools:</span> {tools.join(", ")}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Download ZIP"
                    onClick={() => handleExport(skill)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Edit"
                    onClick={() => handleOpenEdit(skill)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    onClick={() => handleOpenDelete(skill)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Skill</DialogTitle>
            <DialogDescription>Upload a ZIP package containing a SKILL.md</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file && file.name.endsWith(".zip")) {
                  setImportFile(file);
                  handleImportPreview(file);
                }
              }}
            >
              <Input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileSelect}
              />
              {importLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : importFile ? (
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium">{importFile.name}</p>
                  <p className="text-sm text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <p>Drag & drop a ZIP file here, or click to select</p>
                  <p className="text-xs mt-1">.zip package containing SKILL.md</p>
                </div>
              )}
            </div>

            {importResult?.ok && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <h4 className="font-medium">Ready to import:</h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Name:</span> {importResult.skill.name}</p>
                  {importResult.skill.description && <p><span className="font-medium">Description:</span> {importResult.skill.description}</p>}
                  {importResult.skill.license && <p><span className="font-medium">License:</span> {importResult.skill.license}</p>}
                  {importResult.skill.compatibility && <p><span className="font-medium">Compatibility:</span> {importResult.skill.compatibility}</p>}
                </div>
              </div>
            )}

            {importResult?.ok === false && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive whitespace-pre-wrap">
                {importResult.error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleImportCancel} disabled={importLoading}>
              Cancel
            </Button>
            <Button onClick={handleImportConfirm} disabled={importResult?.ok !== true || isSubmitting}>
              {isSubmitting ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Skill</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete "{selectedSkill?.name}"? This will remove the skill from the database and delete all extracted files. This action cannot be undone.</p>
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <DialogHeader>
            <DialogTitle>Edit Skill: {selectedSkill?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col flex-1 min-h-0 gap-4 py-2">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px] space-y-1">
                <Label className="text-xs text-muted-foreground">Files</Label>
                <div className="flex flex-wrap gap-1">
                  {files.map((f) => (
                    <button
                      key={f.path}
                      onClick={() => loadFileContent(f.path)}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        selectedFile === f.path
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted hover:bg-muted/80 border-transparent"
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
              {selectedSkill && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>License: {selectedSkill.license || "—"}</div>
                  <div>Compatibility: {selectedSkill.compatibility || "—"}</div>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0">
              <Label className="text-xs text-muted-foreground mb-1 block">
                {selectedFile} {fileLoading && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
              </Label>
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="w-full h-[400px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono resize-none"
                disabled={fileLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleSaveFile} disabled={fileLoading || fileSaving}>
              {fileSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
