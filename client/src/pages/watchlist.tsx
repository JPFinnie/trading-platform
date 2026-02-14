import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { WatchlistItem, Settings } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calculator, Target, ShieldAlert, TrendingUp, Eye, ArrowRight } from "lucide-react";

const signalColors: Record<string, string> = {
  BUY: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  SELL: "bg-red-500/15 text-red-600 dark:text-red-400",
  HOLD: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  WATCH: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
};

function WatchlistCard({ item, setCalcTicker, deleteMutation }: { item: WatchlistItem, setCalcTicker: (i: WatchlistItem) => void, deleteMutation: any }) {
  // Fetch live price
  const { data: snapshot } = useQuery<any>({
    queryKey: ["/api/market/snapshot", item.ticker],
    queryFn: async () => {
      const res = await fetch(`/api/market/snapshot/${item.ticker}`);
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 30000,
  });

  const livePrice = snapshot?.ticker?.day?.c || snapshot?.ticker?.lastTrade?.p;
  const change = snapshot?.ticker?.todaysChangePerc;

  return (
    <Card className="group transition-all hover:shadow-md" data-testid={`card-watchlist-${item.id}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/stock/${item.ticker}`} className="hover:underline">
            <span className="font-semibold text-base tracking-tight flex items-center gap-1" data-testid={`text-ticker-${item.id}`}>
              {item.ticker}
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
            </span>
          </Link>
          <Badge className={`${signalColors[item.signal] || ""} border-0 text-[11px]`} data-testid={`badge-signal-${item.id}`}>
            {item.signal}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setCalcTicker(item)} data-testid={`button-calc-${item.id}`}>
            <Calculator className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)} data-testid={`button-delete-${item.id}`}>
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {/* Live Price Row */}
        {livePrice && (
          <div className="flex items-center justify-between text-sm pb-2 border-b">
            <span className="text-muted-foreground">Price</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">${livePrice.toFixed(2)}</span>
              {change !== undefined && (
                <span className={`text-xs ${change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Target className="w-3 h-3" />
              Entry
            </div>
            <div className="text-sm font-medium tabular-nums">${item.entryTarget.toFixed(2)}</div>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ShieldAlert className="w-3 h-3" />
              Stop
            </div>
            <div className="text-sm font-medium tabular-nums text-red-500 dark:text-red-400">${item.stopLoss.toFixed(2)}</div>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              Target
            </div>
            <div className="text-sm font-medium tabular-nums text-emerald-500 dark:text-emerald-400">${item.takeProfit.toFixed(2)}</div>
          </div>
        </div>
        {item.sector && item.sector !== "Other" && (
          <div className="text-xs text-muted-foreground">{item.sector}</div>
        )}
        {item.notes && (
          <p className="text-xs text-muted-foreground/80 line-clamp-2">{item.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Watchlist() {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [calcTicker, setCalcTicker] = useState<WatchlistItem | null>(null);
  const [form, setForm] = useState({ ticker: "", entryTarget: "", stopLoss: "", takeProfit: "", signal: "WATCH", sector: "Other", notes: "" });

  const { data: watchlist, isLoading } = useQuery<WatchlistItem[]>({ queryKey: ["/api/watchlist"] });
  const { data: settings } = useQuery<Settings>({ queryKey: ["/api/settings"] });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/watchlist", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      setShowAdd(false);
      setForm({ ticker: "", entryTarget: "", stopLoss: "", takeProfit: "", signal: "WATCH", sector: "Other", notes: "" });
      toast({ title: "Ticker added to watchlist" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/watchlist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({ title: "Removed from watchlist" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({
      ticker: form.ticker.toUpperCase(),
      entryTarget: parseFloat(form.entryTarget),
      stopLoss: parseFloat(form.stopLoss),
      takeProfit: parseFloat(form.takeProfit),
      signal: form.signal,
      sector: form.sector,
      notes: form.notes,
    });
  };

  const calcRisk = (item: WatchlistItem) => {
    if (!settings) return null;
    const riskPerShare = item.entryTarget - item.stopLoss;
    if (riskPerShare <= 0) return null;
    const riskAmount = settings.accountSize * (settings.riskPercentage / 100);
    const shares = Math.floor(riskAmount / riskPerShare);
    const totalCost = shares * item.entryTarget + 6.95;
    const potentialProfit = shares * (item.takeProfit - item.entryTarget) - 6.95;
    const rr = (item.takeProfit - item.entryTarget) / riskPerShare;
    return { shares, riskAmount, totalCost, potentialProfit, rr };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-watchlist-title">Watchlist</h1>
          <p className="text-sm text-muted-foreground mt-1">Track TSX tickers with entry targets, stop losses, and signals</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-watchlist">
              <Plus className="w-4 h-4 mr-2" />
              Add Ticker
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add to Watchlist</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Ticker</Label>
                  <Input data-testid="input-ticker" placeholder="e.g. RY.TO" value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Signal</Label>
                  <Select value={form.signal} onValueChange={(v) => setForm({ ...form, signal: v })}>
                    <SelectTrigger data-testid="select-signal"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUY">BUY</SelectItem>
                      <SelectItem value="SELL">SELL</SelectItem>
                      <SelectItem value="HOLD">HOLD</SelectItem>
                      <SelectItem value="WATCH">WATCH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Entry Target</Label>
                  <Input data-testid="input-entry" type="number" step="0.01" placeholder="$0.00" value={form.entryTarget} onChange={(e) => setForm({ ...form, entryTarget: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Stop Loss</Label>
                  <Input data-testid="input-stoploss" type="number" step="0.01" placeholder="$0.00" value={form.stopLoss} onChange={(e) => setForm({ ...form, stopLoss: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Take Profit</Label>
                  <Input data-testid="input-takeprofit" type="number" step="0.01" placeholder="$0.00" value={form.takeProfit} onChange={(e) => setForm({ ...form, takeProfit: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Sector</Label>
                  <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
                    <SelectTrigger data-testid="select-sector"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Financials", "Technology", "Energy", "Industrials", "Materials", "Telecom", "Healthcare", "Utilities", "Consumer", "Real Estate", "Other"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Input data-testid="input-notes" placeholder="Optional" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending} data-testid="button-submit-watchlist">
                {addMutation.isPending ? "Adding..." : "Add to Watchlist"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : !watchlist?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Eye className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium mb-1">No tickers yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add TSX tickers to start tracking price targets and signals</p>
            <Button variant="outline" onClick={() => setShowAdd(true)} data-testid="button-empty-add">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Ticker
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {watchlist.map((item) => (
            <WatchlistCard
              key={item.id}
              item={item}
              setCalcTicker={setCalcTicker}
              deleteMutation={deleteMutation}
            />
          ))}
        </div>
      )}

      <Dialog open={!!calcTicker} onOpenChange={() => setCalcTicker(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Position Sizing — {calcTicker?.ticker}
            </DialogTitle>
          </DialogHeader>
          {calcTicker && settings && (() => {
            const calc = calcRisk(calcTicker);
            if (!calc) return <p className="text-sm text-muted-foreground">Invalid stop loss (must be below entry)</p>;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Account Size</div>
                    <div className="text-sm font-medium">${settings.accountSize.toLocaleString()}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Risk Per Trade</div>
                    <div className="text-sm font-medium">{settings.riskPercentage}% (${calc.riskAmount.toFixed(2)})</div>
                  </div>
                </div>
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Recommended Shares</span>
                    <span className="text-lg font-semibold" data-testid="text-calc-shares">{calc.shares}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Cost (incl. fee)</span>
                    <span className="text-sm font-medium tabular-nums">${calc.totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Potential Profit</span>
                    <span className="text-sm font-medium tabular-nums text-emerald-500">${calc.potentialProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Risk/Reward Ratio</span>
                    <span className="text-sm font-medium">1 : {calc.rr.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
