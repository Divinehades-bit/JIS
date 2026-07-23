import {
  useEffect,
  useMemo,
  useState,
} from "react";
import usePortfolioStore from "../../store/portfolioStore";

type PriceSyncControlProps = {
  className?: string;
};

const AUTO_REFRESH_INTERVAL_MS =
  15 * 60 * 1000;

const CLOCK_UPDATE_INTERVAL_MS = 30_000;

const dateTimeFormatter =
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const getRelativeTime = (
  dateValue: string,
  now: number,
) => {
  const timestamp = new Date(dateValue).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Unknown time";
  }

  const difference = Math.max(
    now - timestamp,
    0,
  );

  const seconds = Math.floor(difference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 30) {
    return "Just now";
  }

  if (minutes < 1) {
    return "Less than a minute ago";
  }

  if (minutes === 1) {
    return "1 minute ago";
  }

  if (minutes < 60) {
    return `${minutes} minutes ago`;
  }

  if (hours === 1) {
    return "1 hour ago";
  }

  if (hours < 24) {
    return `${hours} hours ago`;
  }

  return dateTimeFormatter.format(
    new Date(dateValue),
  );
};

const PriceSyncControl = ({
  className = "",
}: PriceSyncControlProps) => {
  const positions = usePortfolioStore(
    (state) => state.positions,
  );

  const priceSyncStatus = usePortfolioStore(
    (state) => state.priceSyncStatus,
  );

  const priceSyncError = usePortfolioStore(
    (state) => state.priceSyncError,
  );

  const lastPriceSyncAt = usePortfolioStore(
    (state) => state.lastPriceSyncAt,
  );

  const refreshMarketPrices = usePortfolioStore(
    (state) => state.refreshMarketPrices,
  );

  const [now, setNow] = useState(Date.now());

  const uniqueSymbolCount = useMemo(() => {
    return new Set(
      positions
        .map((position) =>
          position.symbol.trim().toUpperCase(),
        )
        .filter(Boolean),
    ).size;
  }, [positions]);

  const isLoading =
    priceSyncStatus === "loading";

  const hasPositions = uniqueSymbolCount > 0;

  const lastUpdateLabel = lastPriceSyncAt
    ? getRelativeTime(lastPriceSyncAt, now)
    : "Never updated";

  useEffect(() => {
    const clockInterval = window.setInterval(
      () => {
        setNow(Date.now());
      },
      CLOCK_UPDATE_INTERVAL_MS,
    );

    return () => {
      window.clearInterval(clockInterval);
    };
  }, []);

  useEffect(() => {
    if (!hasPositions) {
      return;
    }

    const shouldRefresh = () => {
      if (
        usePortfolioStore.getState()
          .priceSyncStatus === "loading"
      ) {
        return;
      }

      const latestSync =
        usePortfolioStore.getState()
          .lastPriceSyncAt;

      if (!latestSync) {
        void refreshMarketPrices();
        return;
      }

      const latestSyncTimestamp =
        new Date(latestSync).getTime();

      if (
        !Number.isFinite(latestSyncTimestamp) ||
        Date.now() - latestSyncTimestamp >=
          AUTO_REFRESH_INTERVAL_MS
      ) {
        void refreshMarketPrices();
      }
    };

    shouldRefresh();

    const refreshChecker = window.setInterval(
      shouldRefresh,
      60_000,
    );

    return () => {
      window.clearInterval(refreshChecker);
    };
  }, [hasPositions, refreshMarketPrices]);

  const handleRefresh = async () => {
    await refreshMarketPrices();
  };

  const statusText = (() => {
    if (!hasPositions) {
      return "No positions to update";
    }

    if (isLoading) {
      return "Updating market prices...";
    }

    if (priceSyncStatus === "success") {
      return `Prices updated · ${lastUpdateLabel}`;
    }

    if (priceSyncStatus === "error") {
      return lastPriceSyncAt
        ? `Partially updated · ${lastUpdateLabel}`
        : "Price update failed";
    }

    return `Last update: ${lastUpdateLabel}`;
  })();

  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={!hasPositions || isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className={`h-4 w-4 ${
              isLoading ? "animate-spin" : ""
            }`}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 11a8 8 0 0 0-14.9-4M4 4v5h5"
            />

            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 13a8 8 0 0 0 14.9 4M20 20v-5h-5"
            />
          </svg>

          {isLoading
            ? "Updating..."
            : "Refresh prices"}
        </button>

        <div
          role="status"
          className="text-xs text-slate-500"
        >
          {statusText}
        </div>

        {priceSyncError && (
          <div
            role="alert"
            className="max-w-sm rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700"
          >
            {priceSyncError}
          </div>
        )}

        {uniqueSymbolCount > 8 && (
          <div className="max-w-sm rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
            The current safe refresh limit is 8 unique
            symbols. Your portfolio contains{" "}
            {uniqueSymbolCount}.
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceSyncControl;