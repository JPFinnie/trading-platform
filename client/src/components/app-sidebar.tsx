import { useLocation } from "wouter";
import {
  Eye, Briefcase, BookOpen, Brain, Bell, Settings, TrendingUp,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter, SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Alert } from "@shared/schema";

const navItems = [
  { title: "Watchlist", url: "/", icon: Eye },
  { title: "Markets", url: "/stock/AAPL", icon: TrendingUp },
  { title: "Portfolio", url: "/portfolio", icon: Briefcase },
  { title: "Trade Journal", url: "/trades", icon: BookOpen },
  { title: "Strategy AI", url: "/ai", icon: Brain },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const unreadCount = alerts?.filter((a) => !a.isRead).length || 0;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight" data-testid="text-app-title">FinX</span>
            <span className="text-xs text-muted-foreground">Smart Trading Dashboard</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.url === "/" ? location === "/" : location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.url)}
                      tooltip={item.title}
                      data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    {item.title === "Alerts" && unreadCount > 0 && (
                      <SidebarMenuBadge>
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          {unreadCount}
                        </Badge>
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-chart-2" />
            <span className="text-xs text-muted-foreground">TSX Market</span>
          </div>
          <span className="text-[10px] text-muted-foreground/60">CAD &middot; $6.95 commission</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
