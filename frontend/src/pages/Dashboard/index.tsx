import { MessageSquare, Sparkles, Cable, Clock, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Logo from "@/components/Logo";

const stats = [
  { title: "对话", value: "0", icon: MessageSquare, color: "text-blue-600" },
  { title: "Models", value: "0", icon: Sparkles, color: "text-orange-500" },
  { title: "MCP", value: "0", icon: Cable, color: "text-purple-600" },
  { title: "Skills", value: "0", icon: Wrench, color: "text-pink-600" },
  { title: "Tools", value: "0", icon: Wrench, color: "text-cyan-600" },
  { title: "定时任务", value: "0", icon: Clock, color: "text-green-600" },
];

export default function Dashboard() {
  return (
    <div className="flex flex-col items-center px-6 pb-6 pt-4">
      {/* Logo & Title */}
      <div className="mb-8 flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100">
          <Logo className="h-10 w-10" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">xAssistant</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your personal AI assistant</p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid w-full max-w-4xl gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom Cards */}
      <div className="grid w-full max-w-4xl gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold">Quick Start</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure your first AI model to start chatting
            </p>
            <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium">1. Go to Settings &gt; Models</p>
              <p className="font-medium">2. Add your API key</p>
              <p className="font-medium">3. Start using AI!</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold">Features</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Explore what xAssistant can do
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-muted p-2">Multi-model support</div>
              <div className="rounded-lg bg-muted p-2">Secure storage</div>
              <div className="rounded-lg bg-muted p-2">Chat history</div>
              <div className="rounded-lg bg-muted p-2">Cron jobs</div>
              <div className="rounded-lg bg-muted p-2 col-span-2">Multi-conversation streaming</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
