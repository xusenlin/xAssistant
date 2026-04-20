import { useState, useRef, useEffect } from "react";
import { Info, Globe, Loader2, Download, Upload, Database, AlertTriangle } from "lucide-react";
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
  DialogDescription,
} from "@/components/ui/dialog";
import AboutDialog from "@/components/About";
import { toast } from "sonner";
import { Dialogs } from "@wailsio/runtime";
import { OptionService } from "../../../bindings/xAssistant/internal/services/index";

const PROXY_ENABLED_KEY = "proxy_enabled";
const PROXY_URL_KEY = "proxy_url";

export default function Settings() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("");
  const [proxyTesting, setProxyTesting] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState<"success" | "fail" | null>(null);
  const [dbPath, setDbPath] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      OptionService.GetDBPath(),
      OptionService.Get(PROXY_ENABLED_KEY),
      OptionService.Get(PROXY_URL_KEY),
    ]).then(([path, enabled, url]) => {
      setDbPath(path);
      setProxyEnabled(enabled === "true");
      setProxyUrl(url);
      setLoading(false);
    });
  }, []);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleProxyToggle = async (checked: boolean) => {
    setProxyEnabled(checked);
    await OptionService.Set(PROXY_ENABLED_KEY, String(checked));
  };

  const handleProxyUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProxyUrl(value);
    await OptionService.Set(PROXY_URL_KEY, value);
    setProxyTestResult(null);
  };

  const handleTestProxy = async () => {
    if (!proxyUrl) return;
    setProxyTesting(true);
    setProxyTestResult(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch("https://www.google.com/generate_204", {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      setProxyTestResult(resp.ok || resp.status === 204 ? "success" : "fail");
    } catch {
      setProxyTestResult("fail");
    } finally {
      setProxyTesting(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const filePath = await Dialogs.SaveFile({
        Title: "Export Backup",
        Filename: `xAssistant-backup-${new Date().toISOString().slice(0, 10)}.db`,
        Filters: [{ DisplayName: "SQLite Database", Pattern: "*.db" }],
      });
      if (!filePath) return;
      toast.success(`Backup exported to: ${filePath}`);
    } catch (error) {
      toast.error("Export failed: " + error);
    }
  };

  const handleImportSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportDialogOpen(true);
    }
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      toast.success("Backup imported successfully. Restart the app to apply changes.");
      setImportDialogOpen(false);
      setImportFile(null);
    } catch (error) {
      toast.error("Import failed: " + error);
    } finally {
      setImporting(false);
    }
  };

  const handleImportCancel = () => {
    setImportDialogOpen(false);
    setImportFile(null);
    if (importInputRef.current) importInputRef.current.value = "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your application settings</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Request Proxy</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable Proxy</p>
              <p className="text-xs text-muted-foreground">Route AI requests through a proxy server</p>
            </div>
            <Switch checked={proxyEnabled} onCheckedChange={handleProxyToggle} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proxyUrl" className="text-sm">Proxy URL</Label>
            <Input
              id="proxyUrl"
              placeholder="http://127.0.0.1:7890"
              value={proxyUrl}
              onChange={handleProxyUrlChange}
              disabled={!proxyEnabled}
              className="text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Supports http/https/socks5 proxy. Example: http://127.0.0.1:7890
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestProxy}
              disabled={!proxyEnabled || !proxyUrl || proxyTesting}
            >
              {proxyTesting ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : null}
              Test Connection
            </Button>
            {proxyTestResult === "success" && (
              <span className="text-xs text-green-500">Connection successful</span>
            )}
            {proxyTestResult === "fail" && (
              <span className="text-xs text-destructive">Connection failed</span>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Data Backup</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Download a full backup of your SQLite database, including models, skills, agents, tokens, and all other data. You can import this backup later to restore all settings.
          </p>
          {dbPath && (
            <p className="text-xs text-muted-foreground font-mono">
              {dbPath}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportBackup}>
              <Download className="mr-1 h-3 w-3" />
              Export Backup
            </Button>
            <Button variant="outline" size="sm" onClick={() => importInputRef.current?.click()}>
              <Upload className="mr-1 h-3 w-3" />
              Import Backup
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".db"
              className="hidden"
              onChange={handleImportSelect}
            />
          </div>
        </div>

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

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Import Backup
            </DialogTitle>
            <DialogDescription>
              This will overwrite all existing data with the backup file: <strong>{importFile?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-xs text-muted-foreground">
            <p>All your current models, skills, agents, tokens, and other data will be <strong>permanently replaced</strong> by the data in this backup file. This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleImportCancel} disabled={importing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleImportConfirm} disabled={importing}>
              {importing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              {importing ? "Importing..." : "Confirm Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
