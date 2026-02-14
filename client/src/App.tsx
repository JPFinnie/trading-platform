import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import NotFound from "@/pages/not-found";
import Watchlist from "@/pages/watchlist";
import Portfolio from "@/pages/portfolio";
import Trades from "@/pages/trades";
import AiChat from "@/pages/ai-chat";
import Alerts from "@/pages/alerts";
import SettingsPage from "@/pages/settings";

import StockDetail from "@/pages/stock-detail";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Watchlist} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/trades" component={Trades} />
      <Route path="/ai" component={AiChat} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/stock/:ticker" component={StockDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b h-12 shrink-0 sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppLayout />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
