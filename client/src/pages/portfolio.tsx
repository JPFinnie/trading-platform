import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { PortfolioItem } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Briefcase, TrendingUp, TrendingDown, DollarSign, PieChart, ArrowRight } from "lucide-react";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const SECTOR_COLORS: Record<string, string> = {
  Financials: "#3b82f6",
  Technology: "#8b5cf6",
  Energy: "#f59e0b",
  Industrials: "#64748b",
  Materials: "#f97316",
  Telecom: "#14b8a6",
  Healthcare: "#ec4899",
  Utilities: "#84cc16",
  Consumer: "#f43f5e",
  "Real Estate": "#06b6d4",
  Other: "#9ca3af",
};

const sectorBgColors: Record<string, string> = {
  Financials: "bg-blue-500", Technology: "bg-violet-500", Energy: "bg-amber-500",
  Industrials: "bg-slate-500", Materials: "bg-orange-500", Telecom: "bg-teal-500",
  Healthcare: "bg-pink-500", Utilities: "bg-lime-500", Consumer: "bg-rose-500",
  "Real Estate": "bg-cyan-500", Other: "bg-gray-400",
};

function PortfolioItemCard({ item, deleteMutation }: { item: PortfolioItem, deleteMutation: any }) {
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

  // Use live price if available, otherwise fallback to stored price
  const currentPrice = snapshot?.ticker?.day?.c || snapshot?.ticker?.lastTrade?.p || item.currentPrice;
  const value = item.shares * currentPrice;
  const cost = item.shares * item.avgCost;
  const pnl = value - cost;
  const ret = cost > 0 ? (pnl / cost) * 100 : 0;

  return (
    <Card data-testid={`card-portfolio-${item.id}`} className="group transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-8 rounded-full ${sectorBgColors[item.sector || "Other"] || "bg-gray-400"}`} />
            <div>
              <Link href={`/stock/${item.ticker}`} className="hover:underline">
                <div className="font-semibold flex items-center gap-1" data-testid={`text-port-ticker-${item.id}`}>
                  {item.ticker}
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                </div>
              </Link>
              <div className="text-xs text-muted-foreground">{item.sector} &middot; {item.shares} shares</div>
            </div>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Avg Cost</div>
              <div className="text-sm font-medium tabular-nums">${item.avgCost.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Current</div>
              <div className="text-sm font-medium tabular-nums">
                ${currentPrice.toFixed(2)}
                {snapshot && <span className="ml-1 text-[10px] text-muted-foreground">(Live)</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">P&L</div>
              <div className={`text-sm font-medium tabular-nums ${pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ({ret >= 0 ? "+" : ""}{ret.toFixed(1)}%)
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)} data-testid={`button-delete-port-${item.id}`}>
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Portfolio() {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ticker: "", shares: "", avgCost: "", currentPrice: "", sector: "Other" });

  const { data: portfolio, isLoading } = useQuery<PortfolioItem[]>({ queryKey: ["/api/portfolio"] });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/portfolio", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      setShowAdd(false);
      setForm({ ticker: "", shares: "", avgCost: "", currentPrice: "", sector: "Other" });
      toast({ title: "Position added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/portfolio/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      toast({ title: "Position removed" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({
      ticker: form.ticker.toUpperCase(),
      shares: parseFloat(form.shares),
      avgCost: parseFloat(form.avgCost),
      currentPrice: parseFloat(form.currentPrice),
      sector: form.sector,
    });
  };

  const totalValue = portfolio?.reduce((sum, p) => sum + p.shares * p.currentPrice, 0) || 0;
  const totalCost = portfolio?.reduce((sum, p) => sum + p.shares * p.avgCost, 0) || 0;
  const totalPnl = totalValue - totalCost;
  const totalReturn = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const sectorMap = portfolio?.reduce((acc, p) => {
    const sector = p.sector || "Other";
    const value = p.shares * p.currentPrice;
    acc[sector] = (acc[sector] || 0) + value;
    return acc;
  }, {} as Record<string, number>) || {};

  const sectorChartData = Object.entries(sectorMap)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
      color: SECTOR_COLORS[name] || "#9ca3af",
    }));

  const holdingsPnlData = portfolio
    ?.map((item) => {
      const pnl = (item.currentPrice - item.avgCost) * item.shares;
      const ret = item.avgCost > 0 ? ((item.currentPrice - item.avgCost) / item.avgCost) * 100 : 0;
      return {
        ticker: item.ticker,
        pnl: parseFloat(pnl.toFixed(2)),
        returnPct: parseFloat(ret.toFixed(2)),
        fill: pnl >= 0 ? "#10b981" : "#ef4444",
      };
    })
    .sort((a, b) => b.pnl - a.pnl) || [];

  const holdingsValueData = portfolio
    ?.map((item) => ({
      ticker: item.ticker,
      value: parseFloat((item.shares * item.currentPrice).toFixed(2)),
      cost: parseFloat((item.shares * item.avgCost).toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-portfolio-title">Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your TSX holdings and performance</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-portfolio">
              <Plus className="w-4 h-4 mr-2" />
              Add Position
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Add Position</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Ticker</Label>
                  <Input data-testid="input-port-ticker" placeholder="e.g. RY.TO" value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Shares</Label>
                  <Input data-testid="input-port-shares" type="number" step="0.01" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Avg Cost</Label>
                  <Input data-testid="input-port-avgcost" type="number" step="0.01" placeholder="$0.00" value={form.avgCost} onChange={(e) => setForm({ ...form, avgCost: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Current Price</Label>
                  <Input data-testid="input-port-price" type="number" step="0.01" placeholder="$0.00" value={form.currentPrice} onChange={(e) => setForm({ ...form, currentPrice: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Sector</Label>
                <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
                  <SelectTrigger data-testid="select-port-sector"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Financials", "Technology", "Energy", "Industrials", "Materials", "Telecom", "Healthcare", "Utilities", "Consumer", "Real Estate", "Other"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending} data-testid="button-submit-portfolio">
                {addMutation.isPending ? "Adding..." : "Add Position"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Total Value</span>
                </div>
                <div className="text-xl font-semibold tabular-nums" data-testid="text-total-value">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Cost Basis</span>
                </div>
                <div className="text-xl font-semibold tabular-nums">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {totalPnl >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                  <span className="text-xs text-muted-foreground">Unrealized P&L</span>
                </div>
                <div className={`text-xl font-semibold tabular-nums ${totalPnl >= 0 ? "text-emerald-500" : "text-red-500"}`} data-testid="text-total-pnl">
                  {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PieChart className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Return</span>
                </div>
                <div className={`text-xl font-semibold tabular-nums ${totalReturn >= 0 ? "text-emerald-500" : "text-red-500"}`} data-testid="text-total-return">
                  {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {!portfolio?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium mb-1">No positions yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Add your TSX holdings to track performance</p>
                <Button variant="outline" onClick={() => setShowAdd(true)} data-testid="button-empty-add-portfolio">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Position
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card data-testid="chart-sector-allocation">
                  <CardHeader className="flex flex-row items-center gap-2 pb-2 p-4">
                    <PieChart className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Sector Allocation</span>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={sectorChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            stroke="none"
                          >
                            {sectorChartData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "6px",
                              fontSize: "12px",
                            }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            iconSize={8}
                            formatter={(value: string) => (
                              <span className="text-xs text-foreground">{value}</span>
                            )}
                          />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="chart-holdings-pnl">
                  <CardHeader className="flex flex-row items-center gap-2 pb-2 p-4">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">P&L by Holding</span>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={holdingsPnlData} layout="vertical" margin={{ left: 10, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                          <XAxis
                            type="number"
                            tickFormatter={(v) => `$${v}`}
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={{ stroke: "hsl(var(--border))" }}
                          />
                          <YAxis
                            type="category"
                            dataKey="ticker"
                            width={65}
                            tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <RechartsTooltip
                            formatter={(value: number) => [`$${value.toLocaleString()}`, "P&L"]}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "6px",
                              fontSize: "12px",
                            }}
                          />
                          <Bar dataKey="pnl" radius={[0, 4, 4, 0]} barSize={20}>
                            {holdingsPnlData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card data-testid="chart-value-vs-cost">
                <CardHeader className="flex flex-row items-center gap-2 pb-2 p-4">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Value vs Cost Basis</span>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={holdingsValueData} margin={{ left: 10, right: 20 }}>
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
                          formatter={(value: number, name: string) => [
                            `$${value.toLocaleString()}`,
                            name === "value" ? "Market Value" : "Cost Basis",
                          ]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                        />
                        <Legend
                          formatter={(value: string) => (
                            <span className="text-xs text-foreground">
                              {value === "value" ? "Market Value" : "Cost Basis"}
                            </span>
                          )}
                        />
                        <Bar dataKey="cost" fill="#64748b" radius={[4, 4, 0, 0]} barSize={24} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">Holdings</h2>
                {portfolio.map((item) => (
                  <PortfolioItemCard
                    key={item.id}
                    item={item}
                    deleteMutation={deleteMutation}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
