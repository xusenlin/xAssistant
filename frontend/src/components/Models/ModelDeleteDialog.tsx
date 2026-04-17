import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Model } from "../../../bindings/xAssistant/internal/models/index";

interface ModelDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: Model | null;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export default function ModelDeleteDialog({
  open,
  onOpenChange,
  model,
  onConfirm,
  isSubmitting,
}: ModelDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Model</DialogTitle>
        </DialogHeader>
        <p>
          Are you sure you want to delete &quot;{model?.name}&quot;? This action cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
