import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import {
    ArrowLeft, TrendingUp, TrendingDown, Clock, BarChart3,
    Activity, DollarSign, Volume2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Timeframe presets
const TIMEFRAMES = [
    { label: "1D", multiplier: 5, timespan: "minute", days: 1 },
    { label: "1W", multiplier: 30, timespan: "minute", days: 7 },
    { label: "1M", multiplier: 1, timespan: "day", days: 30 },
    { label: "3M", multiplier: 1, timespan: "day", days: 90 },
    { label: "1Y", multiplier: 1, timespan: "day", days: 365 },
] as const;

function formatDate(d: Date): string {
    return d.toISOString().split("T")[0];
}

function formatPrice(p: number): string {
    return p.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatVolume(v: number): string {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return String(v);
}

export default function StockDetail() {
    const [, params] = useRoute("/stock/:ticker");
    const [, setLocation] = useLocation();
    const ticker = params?.ticker?.toUpperCase() ?? "AAPL";
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const [activeTimeframe, setActiveTimeframe] = useState(2); // default 1M

    const tf = TIMEFRAMES[activeTimeframe];

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - tf.days);

    // Fetch snapshot (current price)
    const { data: snapshot, isLoading: snapshotLoading } = useQuery<any>({
        queryKey: ["/api/market/snapshot", ticker],
        queryFn: async () => {
            const res = await fetch(`/api/market/snapshot/${ticker}`);
            if (!res.ok) throw new Error("Failed to fetch snapshot");
            return res.json();
        },
        refetchInterval: 30_000, // refresh every 30s
    });

    // Fetch chart bars
    const { data: chartData, isLoading: chartLoading } = useQuery<any>({
        queryKey: ["/api/market/chart", ticker, tf.multiplier, tf.timespan, tf.days],
        queryFn: async () => {
            const res = await fetch(
                `/api/market/chart/${ticker}?multiplier=${tf.multiplier}&timespan=${tf.timespan}&from=${formatDate(from)}&to=${formatDate(now)}`
            );
            if (!res.ok) throw new Error("Failed to fetch chart data");
            return res.json();
        },
    });

    // Parse snapshot data safely
    const tickerData = snapshot?.ticker;
    const currentPrice = tickerData?.day?.c ?? tickerData?.lastTrade?.p ?? 0;
    const dayChange = tickerData?.todaysChange ?? 0;
    const dayChangePerc = tickerData?.todaysChangePerc ?? 0;
    const dayOpen = tickerData?.day?.o ?? 0;
    const dayHigh = tickerData?.day?.h ?? 0;
    const dayLow = tickerData?.day?.l ?? 0;
    const dayVolume = tickerData?.day?.v ?? 0;
    const prevClose = tickerData?.prevDay?.c ?? 0;
    const isPositive = dayChange >= 0;

    // Initialize and update chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        let cancelled = false;

        (async () => {
            const lc = await import("lightweight-charts");
            if (cancelled || !chartContainerRef.current) return;

            // Dispose previous chart
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }

            const chart = lc.createChart(chartContainerRef.current, {
                width: chartContainerRef.current.clientWidth,
                height: 420,
                layout: {
                    background: { type: lc.ColorType.Solid, color: "transparent" },
                    textColor: "#94a3b8",
                    fontSize: 12,
                },
                grid: {
                    vertLines: { color: "rgba(148, 163, 184, 0.06)" },
                    horzLines: { color: "rgba(148, 163, 184, 0.06)" },
                },
                crosshair: {
                    mode: lc.CrosshairMode.Normal,
                    vertLine: { color: "rgba(99, 102, 241, 0.4)", width: 1, style: lc.LineStyle.Dashed },
                    horzLine: { color: "rgba(99, 102, 241, 0.4)", width: 1, style: lc.LineStyle.Dashed },
                },
                rightPriceScale: {
                    borderColor: "rgba(148, 163, 184, 0.1)",
                },
                timeScale: {
                    borderColor: "rgba(148, 163, 184, 0.1)",
                    timeVisible: tf.timespan === "minute",
                    secondsVisible: false,
                },
            });

            chartRef.current = chart;

            // Candlestick series
            const candleSeries = chart.addCandlestickSeries({
                upColor: "#22c55e",
                downColor: "#ef4444",
                borderUpColor: "#22c55e",
                borderDownColor: "#ef4444",
                wickUpColor: "#22c55e",
                wickDownColor: "#ef4444",
            });

            // Volume series
            const volumeSeries = chart.addHistogramSeries({
                color: "#6366f1",
                priceFormat: { type: "volume" },
                priceScaleId: "",
            });
            volumeSeries.priceScale().applyOptions({
                scaleMargins: { top: 0.8, bottom: 0 },
            });

            // Set data if available
            if (chartData?.results?.length) {
                const bars = chartData.results.map((bar: any) => ({
                    time: (tf.timespan === "minute"
                        ? Math.floor(bar.t / 1000)
                        : formatDate(new Date(bar.t))) as any,
                    open: bar.o,
                    high: bar.h,
                    low: bar.l,
                    close: bar.c,
                }));

                const volumes = chartData.results.map((bar: any) => ({
                    time: (tf.timespan === "minute"
                        ? Math.floor(bar.t / 1000)
                        : formatDate(new Date(bar.t))) as any,
                    value: bar.v,
                    color: bar.c >= bar.o ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
                }));

                candleSeries.setData(bars);
                volumeSeries.setData(volumes);
                chart.timeScale().fitContent();
            }

            // Resize handler
            const handleResize = () => {
                if (chartContainerRef.current && chartRef.current) {
                    chartRef.current.applyOptions({
                        width: chartContainerRef.current.clientWidth,
                    });
                }
            };

            window.addEventListener("resize", handleResize);

            return () => {
                window.removeEventListener("resize", handleResize);
            };
        })();

        return () => {
            cancelled = true;
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [chartData, tf.timespan]);

    return (
        <div className="space-y-6">
            {/* Back button + Ticker Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation("/")}
                    className="shrink-0"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">{ticker}</h1>
                        {!snapshotLoading && currentPrice > 0 && (
                            <>
                                <span className="text-2xl font-semibold">
                                    {formatPrice(currentPrice)}
                                </span>
                                <Badge
                                    variant="outline"
                                    className={`text-sm font-medium ${isPositive
                                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                            : "bg-red-500/10 text-red-500 border-red-500/30"
                                        }`}
                                >
                                    {isPositive ? (
                                        <TrendingUp className="w-3.5 h-3.5 mr-1" />
                                    ) : (
                                        <TrendingDown className="w-3.5 h-3.5 mr-1" />
                                    )}
                                    {isPositive ? "+" : ""}
                                    {dayChange.toFixed(2)} ({isPositive ? "+" : ""}
                                    {dayChangePerc.toFixed(2)}%)
                                </Badge>
                            </>
                        )}
                        {snapshotLoading && <Skeleton className="h-8 w-40" />}
                    </div>
                </div>
            </div>

            {/* Chart Card */}
            <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-indigo-400" />
                            Price Chart
                        </CardTitle>
                        <div className="flex gap-1">
                            {TIMEFRAMES.map((t, i) => (
                                <Button
                                    key={t.label}
                                    variant={i === activeTimeframe ? "default" : "ghost"}
                                    size="sm"
                                    className={`text-xs px-3 h-7 ${i === activeTimeframe
                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                            : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    onClick={() => setActiveTimeframe(i)}
                                >
                                    {t.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 px-2 pb-2">
                    {chartLoading ? (
                        <div className="h-[420px] flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3">
                                <Activity className="w-8 h-8 text-indigo-400 animate-pulse" />
                                <span className="text-sm text-muted-foreground">Loading chart data…</span>
                            </div>
                        </div>
                    ) : (
                        <div ref={chartContainerRef} className="w-full" />
                    )}
                </CardContent>
            </Card>

            {/* Stats Cards */}
            {!snapshotLoading && currentPrice > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-4 pb-3 px-4">
                            <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Open</span>
                            </div>
                            <p className="text-lg font-semibold">{formatPrice(dayOpen)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 pb-3 px-4">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-xs text-muted-foreground">High</span>
                            </div>
                            <p className="text-lg font-semibold">{formatPrice(dayHigh)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 pb-3 px-4">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                                <span className="text-xs text-muted-foreground">Low</span>
                            </div>
                            <p className="text-lg font-semibold">{formatPrice(dayLow)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 pb-3 px-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-xs text-muted-foreground">Volume</span>
                            </div>
                            <p className="text-lg font-semibold">{formatVolume(dayVolume)}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Previous Close & Additional Info */}
            {!snapshotLoading && prevClose > 0 && (
                <Card>
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Previous Close</span>
                            </div>
                            <span className="text-sm font-medium">{formatPrice(prevClose)}</span>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
