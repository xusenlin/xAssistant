import { useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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

type ImportResult =
  | { ok: true; skill: Skill }
  | { ok: false; error: string };

interface SkillImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPreview: (file: File) => void;
  onConfirm: () => void;
  onCancel: () => void;
  importFile: File | null;
  importResult: ImportResult | null;
  importLoading: boolean;
  isSubmitting: boolean;
}

export default function SkillImportDialog({
  open,
  onOpenChange,
  onPreview,
  onConfirm,
  onCancel,
  importFile,
  importResult,
  importLoading,
  isSubmitting,
}: SkillImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                onPreview(file);
              }
            }}
          >
            <Input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPreview(file);
              }}
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
          <Button variant="outline" onClick={onCancel} disabled={importLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={importResult?.ok !== true || isSubmitting}>
            {isSubmitting ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
