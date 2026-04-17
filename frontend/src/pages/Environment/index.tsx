import { useState, useEffect } from "react";
import { RefreshCw, Check, X, Copy, CheckCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EnvironmentService } from "../../../bindings/xAssistant/internal/services/index";

interface Tool {
  name: string;
  version: string;
  path: string;
  exists: boolean;
}

const toolIcons: Record<string, string> = {
  "Node.js": "⬢",
  npm: "📦",
  pnpm: "📦",
  yarn: "🧶",
  git: "🔀",
  python3: "🐍",
  pip3: "🐍",
  go: "🐹",
  Docker: "🐳",
  Claude: "🤖",
};

export default function Environment() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const loadTools = async () => {
    try {
      setLoading(true);
      const data = await EnvironmentService.GetTools();
      setTools((data || []).filter((t): t is Tool => t !== null));
    } catch (error) {
      console.error("Failed to load tools:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
  }, []);

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const installedCount = tools.filter((t) => t.exists).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Environment</h1>
          <p className="text-muted-foreground">Development tools detected on this system</p>
        </div>
        <Button variant="outline" onClick={loadTools} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">{installedCount}</div>
            <p className="text-sm text-muted-foreground">Installed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-muted-foreground">{tools.length - installedCount}</div>
            <p className="text-sm text-muted-foreground">Not Installed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{tools.length}</div>
            <p className="text-sm text-muted-foreground">Total Checked</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 rounded bg-muted" />
                    <div className="h-3 w-32 rounded bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tools.map((tool) => (
            <Card key={tool.name} className={tool.exists ? "border-green-500/20" : ""}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-lg">
                    {toolIcons[tool.name] || "🔧"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{tool.name}</h3>
                      {tool.exists ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs h-5">
                          <Check className="h-3 w-3 mr-0.5" />
                          OK
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs h-5">
                          <X className="h-3 w-3 mr-0.5" />
                          Missing
                        </Badge>
                      )}
                    </div>
                    <p className={`text-sm font-mono mt-0.5 ${tool.exists ? "text-foreground" : "text-muted-foreground"}`}>
                      {tool.exists ? tool.version : "—"}
                    </p>
                  </div>
                  {tool.exists && tool.path && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => copyPath(tool.path)}
                          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                        >
                          {copiedPath === tool.path ? (
                            <CheckCheck className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p className="max-w-xs break-all">{tool.path}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
