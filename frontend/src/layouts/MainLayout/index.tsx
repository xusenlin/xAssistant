import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../Header";
import Sidebar from "../Sidebar";
import { SidebarProvider } from "../SidebarContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

function MainContent() {
  const location = useLocation();
  const isChatPage = location.pathname.startsWith("/chat");

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar currentPath={location.pathname} />
      <main className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className={isChatPage ?"mx-auto":"mx-auto max-w-4xl px-6 py-8"}>
          <Suspense fallback={
            <div className="flex h-[60vh] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          }>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default function MainLayout() {
  return (
    <SidebarProvider>
      <TooltipProvider>
        <div className="relative flex h-screen flex-col overflow-hidden bg-background">
          <Header />
          <MainContent />
          <Toaster position="top-right" richColors />
        </div>
      </TooltipProvider>
    </SidebarProvider>
  );
}
