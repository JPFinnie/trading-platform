import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Alert } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Bell, BellOff, Check, CheckCheck, Trash2, AlertTriangle, AlertCircle, Info } from "lucide-react";

const urgencyConfig: Record<string, { icon: any; color: string; label: string }> = {
  high: { icon: AlertTriangle, color: "bg-red-500/15 text-red-600 dark:text-red-400", label: "High" },
  medium: { icon: AlertCircle, color: "bg-amber-500/15 text-amber-600 dark:text-amber-400", label: "Medium" },
  low: { icon: Info, color: "bg-sky-500/15 text-sky-600 dark:text-sky-400", label: "Low" },
};

const signalBadge: Record<string, string> = {
  BUY: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  SELL: "bg-red-500/15 text-red-600 dark:text-red-400",
  HOLD: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  WATCH: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
};

export default function Alerts() {
  const { toast } = useToast();

  const { data: alerts, isLoading } = useQuery<Alert[]>({ queryKey: ["/api/alerts"] });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/alerts/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/alerts"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/alerts/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "All alerts marked as read" });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/alerts"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "All alerts cleared" });
    },
  });

  const unreadCount = alerts?.filter(a => !a.isRead).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-alerts-title">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-generated trade signals &middot; {unreadCount} unread
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()} disabled={unreadCount === 0} data-testid="button-mark-all-read">
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="ghost" size="icon" onClick={() => clearMutation.mutate()} disabled={!alerts?.length} data-testid="button-clear-alerts">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : !alerts?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BellOff className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium mb-1">No alerts</h3>
            <p className="text-sm text-muted-foreground">AI-generated trade signals will appear here when you use Strategy AI</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const urgency = urgencyConfig[alert.urgency] || urgencyConfig.medium;
            const UrgencyIcon = urgency.icon;
            return (
              <Card
                key={alert.id}
                className={`transition-opacity ${alert.isRead ? "opacity-60" : ""}`}
                data-testid={`card-alert-${alert.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-md shrink-0 ${urgency.color}`}>
                        <UrgencyIcon className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" data-testid={`text-alert-ticker-${alert.id}`}>{alert.ticker}</span>
                          <Badge className={`${signalBadge[alert.signalType] || ""} border-0 text-[10px]`}>
                            {alert.signalType}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {urgency.label}
                          </Badge>
                          {!alert.isRead && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        {alert.createdAt && (
                          <p className="text-[11px] text-muted-foreground/60">
                            {new Date(alert.createdAt).toLocaleDateString()} {new Date(alert.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </div>
                    {!alert.isRead && (
                      <Button variant="ghost" size="icon" onClick={() => markReadMutation.mutate(alert.id)} data-testid={`button-read-alert-${alert.id}`}>
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
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
