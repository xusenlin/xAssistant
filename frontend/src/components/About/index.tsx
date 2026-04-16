import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/Logo";


interface AboutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function AboutDialog({open, onOpenChange}: AboutDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="flex flex-row items-center gap-4 pb-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100">
                      <Logo />
                    </div>
                    <div className="flex flex-col gap-1">
                        <DialogTitle className="text-xl font-bold">xAssistant</DialogTitle>
                        <p className="text-sm text-muted-foreground">Version 1.0.0</p>
                    </div>
                </DialogHeader>
                <div className="space-y-4 border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                        Your Personal AI Assistant - easy to install, deploy on your own machine.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">Wails v3</Badge>
                        <Badge variant="secondary">React 18</Badge>
                        <Badge variant="secondary">TypeScript</Badge>
                        <Badge variant="secondary">TailwindCSS</Badge>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
