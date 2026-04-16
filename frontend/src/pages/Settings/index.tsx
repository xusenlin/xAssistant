import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import AboutDialog from "@/components/About";

export default function Settings() {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your application settings</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <h3 className="font-medium">About</h3>
            <p className="text-sm text-muted-foreground">Application information and credits</p>
          </div>
          <Button variant="outline" onClick={() => setAboutOpen(true)}>
            <Info className="mr-2 h-4 w-4" />
            View
          </Button>
        </div>
      </div>

      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </div>
  );
}
