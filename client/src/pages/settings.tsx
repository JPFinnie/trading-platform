import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Settings as SettingsType } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Save, Settings as SettingsIcon, DollarSign, Shield, Mail, Clock, Wifi, WifiOff, Building2, Globe, Banknote, Receipt } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<SettingsType>({ queryKey: ["/api/settings"] });
  const { data: aiStatus } = useQuery<{ connected: boolean }>({ queryKey: ["/api/ai-status"] });

  const [form, setForm] = useState({ accountSize: "", riskPercentage: "", email: "", analysisInterval: "" });

  useEffect(() => {
    if (settings) {
      setForm({
        accountSize: settings.accountSize.toString(),
        riskPercentage: settings.riskPercentage.toString(),
        email: settings.email || "",
        analysisInterval: settings.analysisInterval.toString(),
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved" });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      accountSize: parseFloat(form.accountSize),
      riskPercentage: parseFloat(form.riskPercentage),
      email: form.email,
      analysisInterval: parseInt(form.analysisInterval),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-settings-title">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your trading parameters and preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-base font-medium mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                Trading Parameters
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Account Size (CAD)</Label>
                  <Input
                    data-testid="input-account-size"
                    type="number"
                    step="100"
                    value={form.accountSize}
                    onChange={(e) => setForm({ ...form, accountSize: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Used for position sizing calculations</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Risk Per Trade (%)</Label>
                  <Input
                    data-testid="input-risk-pct"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={form.riskPercentage}
                    onChange={(e) => setForm({ ...form, riskPercentage: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Maximum risk per trade as % of account</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    data-testid="input-email"
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Analysis Interval (minutes)</Label>
                  <Input
                    data-testid="input-interval"
                    type="number"
                    min="5"
                    value={form.analysisInterval}
                    onChange={(e) => setForm({ ...form, analysisInterval: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">How often bot runs analysis</p>
                </div>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-settings">
                  <Save className="w-4 h-4 mr-2" />
                  {updateMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-base font-medium mb-4 flex items-center gap-2">
                {aiStatus?.connected ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-amber-500" />}
                API Connection
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Anthropic Claude</span>
                  <Badge variant={aiStatus?.connected ? "default" : "outline"} className={aiStatus?.connected ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0" : ""}>
                    {aiStatus?.connected ? "Connected" : "Not Connected"}
                  </Badge>
                </div>
                {!aiStatus?.connected && (
                  <p className="text-xs text-muted-foreground">
                    Add ANTHROPIC_API_KEY as an environment secret to enable AI features.
                    All other features work without it.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-base font-medium mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Platform Information
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Broker</span>
                  </div>
                  <span className="text-sm font-medium" data-testid="text-broker">CIBC Investor's Edge</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Exchange</span>
                  </div>
                  <span className="text-sm font-medium">TSX</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Currency</span>
                  </div>
                  <span className="text-sm font-medium">CAD</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Commission</span>
                  </div>
                  <span className="text-sm font-medium">$6.95 per trade</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
