import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowRight, Activity, Percent } from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Tooltip
} from "recharts";

// Major Indices to track
const INDICES = [
    { symbol: "SPY", name: "S&P 500 ETF" },
    { symbol: "QQQ", name: "Nasdaq 100 ETF" },
    { symbol: "DIA", name: "Dow Jones ETF" },
    { symbol: "IWM", name: "Russell 2000 ETF" },
];

// Curated list of popular "movers" since we don't have a direct API for top gainers yet
const POPULAR_TICKERS = ["NVDA", "TSLA", "AAPL", "AMD", "AMZN", "MSFT", "GOOGL", "META"];

function MiniChart({ ticker, color }: { ticker: string, color: string }) {
    const { data: chartData } = useQuery({
        queryKey: ["/api/market/chart", ticker, "1", "day"], // 1 day intraday
        queryFn: async () => {
            // Get last 30 days for a better sparkline or just today if available
            // For sparklines, let's try to get a month of daily data for smoothness
            // Calculate 'from' and 'to' dates
            const to = new Date().toISOString().split('T')[0];
            const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const res = await fetch(`/api/market/chart/${ticker}?multiplier=1&timespan=day&from=${from}&to=${to}`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.results?.map((r: any) => ({
                value: r.c,
                time: r.t,
            })) || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    if (!chartData || chartData.length === 0) {
        return <div className="h-[60px] w-full bg-muted/10 animate-pulse rounded" />;
    }

    return (
        <div className="h-[60px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id={`gradient-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        fill={`url(#gradient-${ticker})`}
                        strokeWidth={2}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

function QuoteCard({ symbol, name }: { symbol: string, name: string }) {
    const { data: snapshot } = useQuery<any>({
        queryKey: ["/api/market/snapshot", symbol],
        queryFn: async () => {
            const res = await fetch(`/api/market/snapshot/${symbol}`);
            if (!res.ok) return null;
            return res.json();
        },
        refetchInterval: 30000,
    });

    const tickerData = snapshot?.ticker;
    const price = tickerData?.day?.c || tickerData?.lastTrade?.p || tickerData?.prevDay?.c || 0;
    const prevClose = tickerData?.prevDay?.c || price;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;
    const isPositive = change >= 0;
    const color = isPositive ? "#10b981" : "#ef4444"; // emerald-500 : red-500

    return (
        <Card className="overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="font-bold text-lg">{symbol}</div>
                        <div className="text-xs text-muted-foreground">{name}</div>
                    </div>
                    <div className="text-right">
                        <div className="font-mono font-medium">${price.toFixed(2)}</div>
                        <div className={`text-xs flex items-center justify-end ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                            {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            {changePercent.toFixed(2)}%
                        </div>
                    </div>
                </div>
                <MiniChart ticker={symbol} color={color} />
            </CardContent>
        </Card>
    );
}

function MarketMoverRow({ ticker }: { ticker: string }) {
    const { data: snapshot } = useQuery<any>({
        queryKey: ["/api/market/snapshot", ticker],
        queryFn: async () => {
            const res = await fetch(`/api/market/snapshot/${ticker}`);
            if (!res.ok) return null;
            return res.json();
        },
    });

    const tickerData = snapshot?.ticker;
    const price = tickerData?.day?.c || tickerData?.lastTrade?.p || 0;
    const prevClose = tickerData?.prevDay?.c || price;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;

    if (!price) return null; // Don't show if no data

    return (
        <div className="flex items-center justify-between py-3 border-b last:border-0 hover:bg-muted/50 px-2 rounded transition-colors">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {ticker[0]}
                </div>
                <div>
                    <Link href={`/stock/${ticker}`} className="font-medium hover:underline flex items-center gap-1">
                        {ticker}
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                    </Link>
                    <div className="text-xs text-muted-foreground">US Market</div>
                </div>
            </div>
            <div className="text-right">
                <div className="font-medium">${price.toFixed(2)}</div>
                <Badge variant={change >= 0 ? "default" : "destructive"} className="text-[10px] h-5 px-1.5">
                    {change > 0 ? "+" : ""}{changePercent.toFixed(2)}%
                </Badge>
            </div>
        </div>
    );
}

export default function Markets() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Market Overview</h1>
                <p className="text-muted-foreground mt-1">Real-time performance of major indices and market movers.</p>
            </div>

            {/* Indices Grid */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-semibold">Major Indices</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {INDICES.map((idx) => (
                        <QuoteCard key={idx.symbol} symbol={idx.symbol} name={idx.name} />
                    ))}
                </div>
            </section>

            {/* Market Movers */}
            <section className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            Top Movers (Popular)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col">
                            {POPULAR_TICKERS.map((ticker) => (
                                <MarketMoverRow key={ticker} ticker={ticker} />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Info Card / Placeholder for Sector Performance later */}
                <Card className="bg-gradient-to-br from-primary/5 to-transparent border-dashed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Percent className="w-5 h-5 text-primary" />
                            Market Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-background/50 rounded-lg border">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Exchange Status</div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="font-semibold">NYSE: Open</span>
                            </div>
                        </div>
                        <div className="p-4 bg-background/50 rounded-lg border">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Exchange Status</div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="font-semibold">NASDAQ: Open</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            * Data provided by Massive API. Delayed by 15 mins for free tier.
                        </p>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
