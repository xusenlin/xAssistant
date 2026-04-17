import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MessageSquare, Clock, Bot, Sparkles, Wrench, Cable, Settings, Scale, LayoutDashboard, BarChart2, FolderOpen, Monitor } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "./SidebarContext";

interface SidebarProps {
  currentPath: string;
}

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/chat", label: "Chat", icon: MessageSquare },
  { path: "/project", label: "Project", icon: FolderOpen },
  { path: "/cron", label: "Cron", icon: Clock },
  { path: "/agent", label: "Agent", icon: Bot },
  { path: "/models", label: "Models", icon: Scale },
  { path: "/skills", label: "Skills", icon: Sparkles },
  { path: "/tools", label: "Tools", icon: Wrench },
  { path: "/mcp", label: "MCP", icon: Cable },

];

const settingsItems = [
  { path: "/settings", label: "Settings", icon: Settings },
  { path: "/environment", label: "Environment", icon: Monitor },
  { path: "/token", label: "Token", icon: BarChart2 },
];

export default function Sidebar({ currentPath }: SidebarProps) {
  const navigate = useNavigate();
  const { collapsed } = useSidebar();

  return (
    <aside className={cn(
      "flex flex-col border-r bg-background transition-all duration-300",
      collapsed ? "w-16" : "w-56"
    )}>
      {/* Main navigation */}
      <nav className={cn("flex flex-col gap-0.5 p-2", collapsed && "items-center")}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;

          if (collapsed) {
            return (
              <Tooltip key={item.path} delayDuration={100}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <>
          <Separator className="my-2" />
          <div className="px-3 py-1">
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Settings
            </p>
            <nav className="flex flex-col gap-0.5">
              {settingsItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;

                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                      isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </>
      )}

      {/* Collapsed settings */}
      {collapsed && (
        <nav className="mt-auto flex flex-col items-center gap-0.5 p-2">
          {settingsItems.map((item) => (
            <Tooltip key={item.path} delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                    currentPath === item.path
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
      )}
    </aside>
  );
}
