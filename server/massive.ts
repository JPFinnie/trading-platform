/**
 * Massive REST API client for market data
 * Docs: https://massive.com/docs/rest/quickstart
 */

const BASE_URL = "https://api.massive.com/v3";

function getApiKey(): string | undefined {
    return process.env.MASSIVE_API_KEY;
}

function buildUrl(path: string, params: Record<string, string> = {}): string {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("MASSIVE_API_KEY is not configured");
    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.set("apiKey", apiKey);
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
            url.searchParams.set(key, value);
        }
    }
    return url.toString();
}

// ─── Response Types ───

export interface AggBar {
    o: number;   // open
    h: number;   // high
    l: number;   // low
    c: number;   // close
    v: number;   // volume
    vw?: number; // volume-weighted avg price
    t: number;   // timestamp (ms)
    n?: number;  // number of transactions
}

export interface AggregatesResponse {
    ticker: string;
    queryCount: number;
    resultsCount: number;
    adjusted: boolean;
    results: AggBar[];
    status: string;
    request_id: string;
}

export interface SnapshotTicker {
    ticker: string;
    todaysChangePerc: number;
    todaysChange: number;
    updated: number;
    day: {
        o: number;
        h: number;
        l: number;
        c: number;
        v: number;
        vw: number;
    };
    prevDay: {
        o: number;
        h: number;
        l: number;
        c: number;
        v: number;
        vw: number;
    };
    min?: {
        av: number;
        t: number;
        n: number;
        o: number;
        h: number;
        l: number;
        c: number;
        v: number;
        vw: number;
    };
    lastTrade?: {
        p: number;
        s: number;
        t: number;
    };
    lastQuote?: {
        P: number;
        S: number;
        p: number;
        s: number;
        t: number;
    };
}

export interface SnapshotResponse {
    status: string;
    request_id: string;
    ticker: SnapshotTicker;
}

export interface PreviousCloseResponse {
    ticker: string;
    queryCount: number;
    resultsCount: number;
    adjusted: boolean;
    results: AggBar[];
    status: string;
    request_id: string;
}

// ─── API Methods ───

/**
 * Get a snapshot of a single ticker — current price, day change, volume
 * GET /v3/snapshot/aggs/ticker/{ticker}
 */
export async function getSnapshot(ticker: string): Promise<SnapshotResponse> {
    const url = buildUrl(`/snapshot/aggs/ticker/${ticker.toUpperCase()}`);
    const res = await fetch(url);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Massive API error (${res.status}): ${text}`);
    }
    return res.json();
}

/**
 * Get aggregate bars (OHLCV) for charting
 * GET /v3/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}
 */
export async function getAggregates(
    ticker: string,
    multiplier: number,
    timespan: string,
    from: string,
    to: string,
    options: { adjusted?: boolean; sort?: string; limit?: number } = {}
): Promise<AggregatesResponse> {
    const params: Record<string, string> = {};
    if (options.adjusted !== undefined) params.adjusted = String(options.adjusted);
    if (options.sort) params.sort = options.sort;
    if (options.limit) params.limit = String(options.limit);

    const url = buildUrl(
        `/aggs/ticker/${ticker.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}`,
        params
    );
    const res = await fetch(url);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Massive API error (${res.status}): ${text}`);
    }
    return res.json();
}

/**
 * Get previous day's close bar
 * GET /v3/aggs/ticker/{ticker}/prev
 */
export async function getPreviousClose(ticker: string): Promise<PreviousCloseResponse> {
    const url = buildUrl(`/aggs/ticker/${ticker.toUpperCase()}/prev`);
    const res = await fetch(url);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Massive API error (${res.status}): ${text}`);
    }
    return res.json();
}
