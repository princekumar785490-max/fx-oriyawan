
export default async (request) => {
  const params = new URL(request.url).searchParams;

  const symbol = params.get("symbol") || "EUR/USD";
  const interval = params.get("interval") || "1h";

  const allowedSymbols = [
    "EUR/USD", "GBP/USD", "USD/JPY",
    "AUD/USD", "USD/CAD", "USD/CHF",
    "NZD/USD", "XAU/USD"
  ];

  const allowedIntervals = [
    "1min", "5min", "15min", "1h", "4h", "1day"
  ];

  if (
    !allowedSymbols.includes(symbol) ||
    !allowedIntervals.includes(interval)
  ) {
    return Response.json(
      { error: "Unsupported pair or timeframe" },
      { status: 400 }
    );
  }

  const apiKey = Netlify.env.get("TWELVE_DATA_API_KEY");

  if (!apiKey) {
    return Response.json(
      { error: "API key is not configured in Netlify" },
      { status: 500 }
    );
  }

  const url = new URL(
    "https://api.twelvedata.com/time_series"
  );

  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("outputsize", "5000");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url);
    const result = await response.json();

    if (!response.ok || result.status === "error") {
      return Response.json(
        { error: result.message || "Market data request failed" },
        { status: 502 }
      );
    }

    const candles = (result.values || [])
      .map(item => ({
        time: Math.floor(
          new Date(item.datetime.replace(" ", "T") + "Z").getTime() / 1000
        ),
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close)
      }))
      .filter(c =>
        Number.isFinite(c.time) &&
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close)
      )
      .sort((a, b) => a.time - b.time);

    return Response.json(
      { candles, symbol, interval },
      {
        headers: {
          "Cache-Control": "public, max-age=30"
        }
      }
    );
  } catch {
    return Response.json(
      { error: "Unable to retrieve Forex data" },
      { status: 500 }
    );
  }
};
