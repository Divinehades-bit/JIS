import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import {
  defineConfig,
  loadEnv,
  type Plugin,
  type PreviewServer,
  type ViteDevServer,
} from "vite";
import { VitePWA } from "vite-plugin-pwa";

import { GET as getMarketOpportunities } from "./api/market-opportunities.js";

import {
  getLatestMarketPrices,
  MarketDataError,
} from "./server/marketPrices.js";

type LocalResponse = {
  statusCode: number;
  setHeader: (
    name: string,
    value: string,
  ) => void;
  end: (body?: string) => void;
};

const sendJson = (
  response: LocalResponse,
  statusCode: number,
  body: unknown,
) => {
  response.statusCode = statusCode;

  response.setHeader(
    "Content-Type",
    "application/json; charset=utf-8",
  );

  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  response.end(JSON.stringify(body));
};

const sendWebResponse = async (
  response: LocalResponse,
  webResponse: Response,
) => {
  response.statusCode =
    webResponse.status;

  webResponse.headers.forEach(
    (value, name) => {
      response.setHeader(
        name,
        value,
      );
    },
  );

  const body =
    await webResponse.text();

  response.end(body);
};

const createLocalMarketDataPlugin = (
  apiKey: string,
): Plugin => {
  const registerMiddleware = (
    server:
      | ViteDevServer
      | PreviewServer,
  ) => {
    server.middlewares.use(
      "/api/market-prices",
      async (
        request,
        response,
      ) => {
        if (
          request.method !== "GET"
        ) {
          sendJson(response, 405, {
            message:
              "Method not allowed.",
          });

          return;
        }

        const requestUrl =
          new URL(
            request.url ?? "/",
            "http://localhost",
          );

        const symbolsParameter =
          requestUrl.searchParams.get(
            "symbols",
          ) ?? "";

        try {
          const marketData =
            await getLatestMarketPrices(
              symbolsParameter.split(
                ",",
              ),
              apiKey,
            );

          sendJson(
            response,
            200,
            marketData,
          );
        } catch (error) {
          if (
            error instanceof
            MarketDataError
          ) {
            sendJson(
              response,
              error.statusCode,
              {
                message:
                  error.message,
              },
            );

            return;
          }

          const message =
            error instanceof Error
              ? error.message
              : "Unable to retrieve market prices.";

          sendJson(
            response,
            500,
            {
              message,
            },
          );
        }
      },
    );

    server.middlewares.use(
      "/api/market-opportunities",
      async (
        request,
        response,
      ) => {
        if (
          request.method !== "GET"
        ) {
          sendJson(response, 405, {
            message:
              "Method not allowed.",
          });

          return;
        }

        try {
          const requestUrl =
            new URL(
              request.url ?? "/",
              "http://localhost",
            );

          const apiRequest =
            new Request(
              requestUrl.toString(),
              {
                method: "GET",
                headers: {
                  Accept:
                    "application/json",
                },
              },
            );

          const apiResponse =
            await getMarketOpportunities(
              apiRequest,
            );

          await sendWebResponse(
            response,
            apiResponse,
          );
        } catch (error) {
          sendJson(
            response,
            500,
            {
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to run the local market scanner.",
            },
          );
        }
      },
    );
  };

  return {
    name: "jis-local-market-data",

    configureServer(server) {
      registerMiddleware(server);
    },

    configurePreviewServer(
      server,
    ) {
      registerMiddleware(server);
    },
  };
};

export default defineConfig(
  ({ mode }) => {
    const environment =
      loadEnv(
        mode,
        process.cwd(),
        "",
      );

    const apiKey =
      environment.TWELVE_DATA_API_KEY ??
      process.env
        .TWELVE_DATA_API_KEY ??
      "";

    /*
     * The local Market Opportunities
     * endpoint uses the same server-side
     * environment variable as Vercel.
     */
    if (apiKey) {
      process.env
        .TWELVE_DATA_API_KEY =
        apiKey;
    }

    return {
      plugins: [
        react(),

        tailwindcss(),

        createLocalMarketDataPlugin(
          apiKey,
        ),

        VitePWA({
          registerType: "prompt",

          includeAssets: [
            "jis-logo.svg",
            "apple-touch-icon-180x180.png",
          ],

          manifest: {
            name: "JIS",

            short_name: "JIS",

            description:
              "Jake Investment System",

            theme_color:
              "#0f172a",

            background_color:
              "#f1f5f9",

            display: "standalone",

            start_url: "/",

            icons: [
              {
                src: "/pwa-192x192.png",
                sizes: "192x192",
                type: "image/png",
              },
              {
                src: "/pwa-512x512.png",
                sizes: "512x512",
                type: "image/png",
              },
              {
                src: "/maskable-icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
              },
            ],
          },

          workbox: {
            navigateFallback:
              "/index.html",
          },
        }),
      ],
    };
  },
);