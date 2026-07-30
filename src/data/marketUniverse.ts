export type MarketUniverseItem = {
  symbol: string;
  name: string;
  sector: string;
};

export const MARKET_UNIVERSE: readonly MarketUniverseItem[] = [
  {
    symbol: "AAPL",
    name: "Apple",
    sector: "Technology",
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    sector: "Technology",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    sector: "Semiconductors",
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    sector: "Consumer",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet",
    sector: "Communication",
  },
  {
    symbol: "META",
    name: "Meta Platforms",
    sector: "Communication",
  },
  {
    symbol: "AVGO",
    name: "Broadcom",
    sector: "Semiconductors",
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    sector: "Automotive",
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase",
    sector: "Financials",
  },
  {
    symbol: "V",
    name: "Visa",
    sector: "Financials",
  },
  {
    symbol: "MA",
    name: "Mastercard",
    sector: "Financials",
  },
  {
    symbol: "WMT",
    name: "Walmart",
    sector: "Consumer Defensive",
  },
  {
    symbol: "COST",
    name: "Costco",
    sector: "Consumer Defensive",
  },
  {
    symbol: "HD",
    name: "Home Depot",
    sector: "Consumer",
  },
  {
    symbol: "NFLX",
    name: "Netflix",
    sector: "Communication",
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices",
    sector: "Semiconductors",
  },
  {
    symbol: "CRM",
    name: "Salesforce",
    sector: "Technology",
  },
  {
    symbol: "ORCL",
    name: "Oracle",
    sector: "Technology",
  },
  {
    symbol: "QCOM",
    name: "Qualcomm",
    sector: "Semiconductors",
  },
  {
    symbol: "IBM",
    name: "IBM",
    sector: "Technology",
  },
  {
    symbol: "LLY",
    name: "Eli Lilly",
    sector: "Healthcare",
  },
  {
    symbol: "UNH",
    name: "UnitedHealth",
    sector: "Healthcare",
  },
  {
    symbol: "XOM",
    name: "Exxon Mobil",
    sector: "Energy",
  },
  {
    symbol: "CVX",
    name: "Chevron",
    sector: "Energy",
  },
  {
    symbol: "CAT",
    name: "Caterpillar",
    sector: "Industrials",
  },
  {
    symbol: "GE",
    name: "GE Aerospace",
    sector: "Industrials",
  },
  {
    symbol: "BA",
    name: "Boeing",
    sector: "Industrials",
  },
  {
    symbol: "DIS",
    name: "Walt Disney",
    sector: "Communication",
  },
  {
    symbol: "NKE",
    name: "Nike",
    sector: "Consumer",
  },
  {
    symbol: "SBUX",
    name: "Starbucks",
    sector: "Consumer",
  },
];

export const MARKET_UNIVERSE_SYMBOLS =
  MARKET_UNIVERSE.map((item) => item.symbol);

export const getMarketUniverseItem = (
  symbol: string,
): MarketUniverseItem | undefined => {
  const normalizedSymbol = symbol.trim().toUpperCase();

  return MARKET_UNIVERSE.find(
    (item) => item.symbol === normalizedSymbol,
  );
};