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

  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  response.end(
    JSON.stringify(body),
  );
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
          request.method !==
          "GET"
        ) {
          sendJson(
            response,
            405,
            {
              message:
                "Method not allowed.",
            },
          );

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
  };

  return {
    name:
      "jis-local-market-data",

    configureServer(server) {
      registerMiddleware(
        server,
      );
    },

    configurePreviewServer(
      server,
    ) {
      registerMiddleware(
        server,
      );
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

    return {
      plugins: [
        react(),

        tailwindcss(),

        VitePWA({
          /*
           * JIS contains financial
           * forms, so updates should
           * not suddenly reload the
           * application while data is
           * being entered.
           */
          registerType:
            "prompt",

          includeAssets: [
            "favicon.ico",
            "jis-logo.svg",
            "apple-touch-icon-180x180.png",
          ],

          manifest: {
            id: "/",

            name:
              "Jake Investment System",

            short_name:
              "JIS",

            description:
              "Personal investment, cash flow and wealth tracking system.",

            start_url: "/",

            scope: "/",

            display:
              "standalone",

            background_color:
              "#f8fafc",

            theme_color:
              "#0f172a",

            categories: [
              "finance",
              "productivity",
            ],

            icons: [
              {
                src:
                  "pwa-64x64.png",
                sizes:
                  "64x64",
                type:
                  "image/png",
              },
              {
                src:
                  "pwa-192x192.png",
                sizes:
                  "192x192",
                type:
                  "image/png",
              },
              {
                src:
                  "pwa-512x512.png",
                sizes:
                  "512x512",
                type:
                  "image/png",
                purpose: "any",
              },
              {
                src:
                  "maskable-icon-512x512.png",
                sizes:
                  "512x512",
                type:
                  "image/png",
                purpose:
                  "maskable",
              },
            ],
          },

          workbox: {
            globPatterns: [
              "**/*.{js,css,html,ico,png,svg}",
            ],
          },
        }),

        createLocalMarketDataPlugin(
          environment.TWELVE_DATA_API_KEY ??
            "",
        ),
      ],
    };
  },
);