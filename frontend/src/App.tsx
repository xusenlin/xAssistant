import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Models from "./pages/Models";
import Agents from "./pages/Agents";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="chat" element={<PlaceholderPage title="Chat" description="Start a conversation with AI" />} />
          <Route path="cron" element={<PlaceholderPage title="Cron" description="Schedule and manage cron jobs" />} />
          <Route path="agent" element={<Agents />} />
          <Route path="skills" element={<PlaceholderPage title="Skills" description="Configure AI agent skills" />} />
          <Route path="tools" element={<PlaceholderPage title="Tools" description="Manage available tools" />} />
          <Route path="mcp" element={<PlaceholderPage title="MCP" description="Model Context Protocol servers" />} />
          <Route path="settings" element={<Settings />} />
          <Route path="models" element={<Models />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="rounded-xl bg-accent/50 p-8 text-center">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
