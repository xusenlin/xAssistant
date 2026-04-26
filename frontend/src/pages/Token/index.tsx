import { useState, useEffect, useRef } from "react";
import { RefreshCw, ArrowUpToLine, ArrowDownToLine, MessageSquare, AlertTriangle, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModelService, ModelStatService } from "../../../bindings/xAssistant/internal/services/index";
import { Model } from "../../../bindings/xAssistant/internal/models/index";
import { toast } from "sonner";

type Range = "today" | "week" | "month" | "all";

interface StatSummary {
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  conversations: number;
  api_errors: number;
  avg_resp_time_ms: number;
  request_count: number;
}

const providers = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function formatMs(ms: number): string {
  if (ms >= 1000) return (ms / 1000).toFixed(1) + "s";
  return ms + "ms";
}

function getDateRange(range: Range): [string, string] {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  if (range === "today") {
    return [today, today];
  }
  if (range === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return [start.toISOString().split("T")[0], today];
  }
  if (range === "month") {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return [start.toISOString().split("T")[0], today];
  }
  return ["1970-01-01", "2100-01-01"];
}

function useCountUp(target: number, duration = 800) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }

    const startTime = performance.now();

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return current;
}

function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const animated = useCountUp(value);
  return <span>{format(animated)}</span>;
}

function StatCard({ icon: Icon, color, value, label, format }: { icon: React.ElementType; color: string; value: number; label: string; format: (n: number) => string }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold leading-none truncate">
            <AnimatedNumber value={value} format={format} />
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Token() {
  const [range, setRange] = useState<Range>("all");
  const [stats, setStats] = useState<StatSummary[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [globalStats, setGlobalStats] = useState<StatSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [animKey, setAnimKey] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      const [start, end] = getDateRange(range);

      const [statsData, globalData, modelsData] = await Promise.all([
        ModelStatService.GetStatsByDateRange(start, end),
        ModelStatService.GetGlobalStatsByDateRange(start, end),
        ModelService.GetAll(),
      ]);

      setStats((statsData || []).filter((s): s is StatSummary => s !== null && s.model_id !== ""));
      setGlobalStats(globalData ?? null);
      setModels((modelsData || []).filter((m): m is Model => m !== null));
    } catch (error: any) {
      console.error("Failed to load stats:", error);
      toast.error("加载统计数据失败: " + (error?.message || error));
    } finally {
      setLoading(false);
      setAnimKey((k) => k + 1);
    }
  };

  useEffect(() => {
    loadData();
  }, [range]);

  const getModelInfo = (modelID: string) => models.find((m) => m.id === modelID);

  const getProviderBadge = (provider: string) => {
    const colors: Record<string, string> = {
      openai: "bg-green-500/10 text-green-600 border-green-500/20",
      anthropic: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      deepseek: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      google: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    };
    const label = providers.find((p) => p.value === provider)?.label || provider;
    return <Badge variant="outline" className={colors[provider] || ""}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Token Usage</h1>
          <p className="text-muted-foreground">API usage statistics by model</p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-2">
        {(["all", "today", "week", "month"] as Range[]).map((r) => (
          <Button key={r} variant={range === r ? "default" : "outline"} size="sm" onClick={() => setRange(r)}>
            {r === "all" ? "All Time" : r === "today" ? "Today" : r === "week" ? "This Week" : "This Month"}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" key={animKey}>
        <StatCard icon={ArrowUpToLine} color="text-blue-600" value={globalStats?.input_tokens ?? 0} label="Input Tokens" format={formatNumber} />
        <StatCard icon={ArrowDownToLine} color="text-green-600" value={globalStats?.output_tokens ?? 0} label="Output Tokens" format={formatNumber} />
        <StatCard icon={MessageSquare} color="text-purple-600" value={globalStats?.conversations ?? 0} label="Conversations" format={formatNumber} />
        <StatCard icon={AlertTriangle} color="text-red-600" value={globalStats?.api_errors ?? 0} label="API Errors" format={formatNumber} />
        <StatCard icon={Timer} color="text-orange-600" value={globalStats?.avg_resp_time_ms ?? 0} label="Avg Response" format={formatMs} />
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No usage data yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Start a conversation to see token statistics</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {stats.map((stat) => {
            const model = getModelInfo(stat.model_id);
            return (
              <Card key={stat.model_id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="font-medium truncate">{model?.name || stat.model_id}</h3>
                      {model && getProviderBadge(model.provider)}
                    </div>
                    {stat.api_errors > 0 && (
                      <Badge variant="destructive" className="text-xs shrink-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {stat.api_errors} errors
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <ArrowUpToLine className="h-4 w-4 text-blue-500" />
                      <span className="text-muted-foreground">Input</span>
                      <span className="ml-auto font-mono font-medium">
                        <AnimatedNumber value={stat.input_tokens} format={formatNumber} />
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowDownToLine className="h-4 w-4 text-green-500" />
                      <span className="text-muted-foreground">Output</span>
                      <span className="ml-auto font-mono font-medium">
                        <AnimatedNumber value={stat.output_tokens} format={formatNumber} />
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-purple-500" />
                      <span className="text-muted-foreground">Conversations</span>
                      <span className="ml-auto font-mono font-medium">
                        <AnimatedNumber value={stat.conversations} format={formatNumber} />
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-orange-500" />
                      <span className="text-muted-foreground">Avg Response</span>
                      <span className="ml-auto font-mono font-medium">
                        <AnimatedNumber value={stat.avg_resp_time_ms} format={formatMs} />
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
