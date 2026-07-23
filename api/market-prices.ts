import {
  getLatestMarketPrices,
  MarketDataError,
} from "../server/marketPrices";

const createJsonResponse = (
  body: unknown,
  status: number,
) => {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
};

export default {
  async fetch(request: Request) {
    if (request.method !== "GET") {
      return createJsonResponse(
        {
          message: "Method not allowed.",
        },
        405,
      );
    }

    const requestUrl = new URL(request.url);

    const symbolsParameter =
      requestUrl.searchParams.get("symbols") ?? "";

    const symbols = symbolsParameter.split(",");

    try {
      const marketData =
        await getLatestMarketPrices(
          symbols,
          process.env.TWELVE_DATA_API_KEY ?? "",
        );

      return createJsonResponse(
        marketData,
        200,
      );
    } catch (error) {
      if (error instanceof MarketDataError) {
        return createJsonResponse(
          {
            message: error.message,
          },
          error.statusCode,
        );
      }

      const message =
        error instanceof Error
          ? error.message
          : "Unable to retrieve market prices.";

      return createJsonResponse(
        {
          message,
        },
        500,
      );
    }
  },
};