import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Trade } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, BookOpen, ArrowUpRight, ArrowDownRight, Receipt, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  Cell,
} from "recharts";

export default function Trades() {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: "BUY", ticker: "", shares: "", price: "", fees: "6.95", date: "", notes: "" });

  const { data: trades, isLoading } = useQuery<Trade[]>({ queryKey: ["/api/trades"] });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/trades", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      setShowAdd(false);
      setForm({ type: "BUY", ticker: "", shares: "", price: "", fees: "6.95", date: "", notes: "" });
      toast({ title: "Trade logged" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/trades/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({ title: "Trade removed" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({
      type: form.type,
      ticker: form.ticker.toUpperCase(),
      shares: parseFloat(form.shares),
      price: parseFloat(form.price),
      fees: parseFloat(form.fees),
      date: form.date,
      notes: form.notes,
    });
  };

  const totalBought = trades?.filter(t => t.type === "BUY").reduce((s, t) => s + t.shares * t.price, 0) || 0;
  const totalSold = trades?.filter(t => t.type === "SELL").reduce((s, t) => s + t.shares * t.price, 0) || 0;
  const totalFees = trades?.reduce((s, t) => s + t.fees, 0) || 0;

  const sortedTrades = trades ? [...trades].sort((a, b) => a.date.localeCompare(b.date)) : [];

  const tradesByDate = sortedTrades.reduce((acc, t) => {
    const existing = acc.find(d => d.date === t.date);
    if (existing) {
      if (t.type === "BUY") {
        existing.buys += t.shares * t.price;
      } else {
        existing.sells += t.shares * t.price;
      }
      existing.fees += t.fees;
    } else {
      acc.push({
        date: t.date,
        buys: t.type === "BUY" ? t.shares * t.price : 0,
        sells: t.type === "SELL" ? t.shares * t.price : 0,
        fees: t.fees,
      });
    }
    return acc;
  }, [] as { date: string; buys: number; sells: number; fees: number }[]);

  const activityData = tradesByDate.map(d => ({
    date: d.date,
    Buys: parseFloat(d.buys.toFixed(2)),
    Sells: parseFloat(d.sells.toFixed(2)),
  }));

  let cumFees = 0;
  const feesOverTime = tradesByDate.map(d => {
    cumFees += d.fees;
    return {
      date: d.date,
      fees: parseFloat(cumFees.toFixed(2)),
    };
  });

  const tickerVolume = trades?.reduce((acc, t) => {
    const val = t.shares * t.price;
    acc[t.ticker] = (acc[t.ticker] || 0) + val;
    return acc;
  }, {} as Record<string, number>) || {};

  const tickerData = Object.entries(tickerVolume)
    .map(([ticker, volume]) => ({ ticker, volume: parseFloat(volume.toFixed(2)) }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-trades-title">Trade Journal</h1>
          <p className="text-sm text-muted-foreground mt-1">Log and review your completed trades</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-trade">
              <Plus className="w-4 h-4 mr-2" />
              Log Trade
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Log Trade</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger data-testid="select-trade-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUY">BUY</SelectItem>
                      <SelectItem value="SELL">SELL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Ticker</Label>
                  <Input data-testid="input-trade-ticker" placeholder="e.g. RY.TO" value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Shares</Label>
                  <Input data-testid="input-trade-shares" type="number" step="0.01" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Price</Label>
                  <Input data-testid="input-trade-price" type="number" step="0.01" placeholder="$0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Fees</Label>
                  <Input data-testid="input-trade-fees" type="number" step="0.01" value={form.fees} onChange={(e) => setForm({ ...form, fees: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input data-testid="input-trade-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Input data-testid="input-trade-notes" placeholder="Optional" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending} data-testid="button-submit-trade">
                {addMutation.isPending ? "Logging..." : "Log Trade"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">Total Bought</span>
                </div>
                <div className="text-lg font-semibold tabular-nums" data-testid="text-total-bought">${totalBought.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpRight className="w-4 h-4 text-sky-500" />
                  <span className="text-xs text-muted-foreground">Total Sold</span>
                </div>
                <div className="text-lg font-semibold tabular-nums" data-testid="text-total-sold">${totalSold.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Total Fees</span>
                </div>
                <div className="text-lg font-semibold tabular-nums" data-testid="text-total-fees">${totalFees.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {trades && trades.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card data-testid="chart-trade-activity">
                <CardHeader className="flex flex-row items-center gap-2 pb-2 p-4">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Trade Activity</span>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activityData} margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={{ stroke: "hsl(var(--border))" }}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                        />
                        <Legend
                          formatter={(value: string) => (
                            <span className="text-xs text-foreground">{value}</span>
                          )}
                        />
                        <Bar dataKey="Buys" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="Sells" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="chart-cumulative-fees">
                <CardHeader className="flex flex-row items-center gap-2 pb-2 p-4">
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Cumulative Fees</span>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={feesOverTime} margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={{ stroke: "hsl(var(--border))" }}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(v) => `$${v}`}
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          formatter={(value: number) => [`$${value.toFixed(2)}`, "Total Fees"]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                        />
                        <defs>
                          <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="fees"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          fill="url(#feeGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {tickerData.length > 1 && (
                <Card className="lg:col-span-2" data-testid="chart-volume-by-ticker">
                  <CardHeader className="flex flex-row items-center gap-2 pb-2 p-4">
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Volume by Ticker</span>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tickerData} margin={{ left: 10, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="ticker"
                            tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                            axisLine={{ stroke: "hsl(var(--border))" }}
                            tickLine={false}
                          />
                          <YAxis
                            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <RechartsTooltip
                            formatter={(value: number) => [`$${value.toLocaleString()}`, "Volume"]}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "6px",
                              fontSize: "12px",
                            }}
                          />
                          <Bar dataKey="volume" radius={[4, 4, 0, 0]} barSize={32}>
                            {tickerData.map((_, i) => (
                              <Cell key={i} fill={["#3b82f6", "#8b5cf6", "#14b8a6", "#f59e0b", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#f43f5e", "#64748b"][i % 10]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!trades?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium mb-1">No trades logged</h3>
                <p className="text-sm text-muted-foreground mb-4">Start logging your buy and sell transactions</p>
                <Button variant="outline" onClick={() => setShowAdd(true)} data-testid="button-empty-add-trade">
                  <Plus className="w-4 h-4 mr-2" />
                  Log First Trade
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Trade History</h2>
              {trades.map((trade) => (
                <Card key={trade.id} data-testid={`card-trade-${trade.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-md ${trade.type === "BUY" ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                          {trade.type === "BUY" ?
                            <ArrowDownRight className="w-4 h-4 text-emerald-500" /> :
                            <ArrowUpRight className="w-4 h-4 text-red-500" />
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold" data-testid={`text-trade-ticker-${trade.id}`}>{trade.ticker}</span>
                            <Badge variant="outline" className="text-[10px]">{trade.type}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">{trade.date}{trade.notes ? ` — ${trade.notes}` : ""}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Shares</div>
                          <div className="text-sm font-medium tabular-nums">{trade.shares}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Price</div>
                          <div className="text-sm font-medium tabular-nums">${trade.price.toFixed(2)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Total</div>
                          <div className="text-sm font-medium tabular-nums">${(trade.shares * trade.price).toFixed(2)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Fee</div>
                          <div className="text-sm font-medium tabular-nums text-muted-foreground">${trade.fees.toFixed(2)}</div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(trade.id)} data-testid={`button-delete-trade-${trade.id}`}>
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
