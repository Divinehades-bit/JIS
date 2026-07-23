import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import {
  defineConfig,
  loadEnv,
  type Plugin,
  type PreviewServer,
  type ViteDevServer,
} from "vite";
import {
  getLatestMarketPrices,
  MarketDataError,
} from "./server/marketPrices.js";

const sendJson = (
  response: {
    statusCode: number;
    setHeader: (
      name: string,
      value: string,
    ) => void;
    end: (body?: string) => void;
  },
  statusCode: number,
  body: unknown,
) => {
  response.statusCode = statusCode;

  response.setHeader(
    "Content-Type",
    "application/json; charset=utf-8",
  );

  response.setHeader("Cache-Control", "no-store");

  response.end(JSON.stringify(body));
};

const createLocalMarketDataPlugin = (
  apiKey: string,
): Plugin => {
  const registerMiddleware = (
    server: ViteDevServer | PreviewServer,
  ) => {
    server.middlewares.use(
      "/api/market-prices",
      async (request, response) => {
        if (request.method !== "GET") {
          sendJson(response, 405, {
            message: "Method not allowed.",
          });

          return;
        }

        const requestUrl = new URL(
          request.url ?? "/",
          "http://localhost",
        );

        const symbolsParameter =
          requestUrl.searchParams.get("symbols") ?? "";

        try {
          const marketData =
            await getLatestMarketPrices(
              symbolsParameter.split(","),
              apiKey,
            );

          sendJson(response, 200, marketData);
        } catch (error) {
          if (error instanceof MarketDataError) {
            sendJson(
              response,
              error.statusCode,
              {
                message: error.message,
              },
            );

            return;
          }

          const message =
            error instanceof Error
              ? error.message
              : "Unable to retrieve market prices.";

          sendJson(response, 500, {
            message,
          });
        }
      },
    );
  };

  return {
    name: "jis-local-market-data",

    configureServer(server) {
      registerMiddleware(server);
    },

    configurePreviewServer(server) {
      registerMiddleware(server);
    },
  };
};

export default defineConfig(({ mode }) => {
  const environment = loadEnv(
    mode,
    process.cwd(),
    "",
  );

  return {
    plugins: [
      react(),
      tailwindcss(),
      createLocalMarketDataPlugin(
        environment.TWELVE_DATA_API_KEY ?? "",
      ),
    ],
  };
});