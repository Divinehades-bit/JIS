import {
  useCallback,
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

const REFRESH_COOLDOWN_MS =
  60 * 1000;

const COOLDOWN_STORAGE_KEY =
  "jis-market-price-cooldown-until";

const COOLDOWN_EVENT_NAME =
  "jis-market-price-cooldown-change";

const dateTimeFormatter =
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const readCooldownEnd = () => {
  if (
    typeof window === "undefined"
  ) {
    return 0;
  }

  const storedValue =
    window.localStorage.getItem(
      COOLDOWN_STORAGE_KEY,
    );

  if (!storedValue) {
    return 0;
  }

  const parsedValue =
    Number(storedValue);

  if (
    !Number.isFinite(parsedValue)
  ) {
    window.localStorage.removeItem(
      COOLDOWN_STORAGE_KEY,
    );

    return 0;
  }

  return parsedValue;
};

const saveCooldownEnd = (
  cooldownEndsAt: number,
) => {
  window.localStorage.setItem(
    COOLDOWN_STORAGE_KEY,
    String(cooldownEndsAt),
  );

  window.dispatchEvent(
    new CustomEvent<number>(
      COOLDOWN_EVENT_NAME,
      {
        detail: cooldownEndsAt,
      },
    ),
  );
};

const getRelativeTime = (
  dateValue: string,
  now: number,
) => {
  const timestamp = new Date(
    dateValue,
  ).getTime();

  if (
    !Number.isFinite(timestamp)
  ) {
    return "Unknown time";
  }

  const difference = Math.max(
    now - timestamp,
    0,
  );

  const seconds = Math.floor(
    difference / 1000,
  );

  const minutes = Math.floor(
    seconds / 60,
  );

  const hours = Math.floor(
    minutes / 60,
  );

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

  const priceSyncStatus =
    usePortfolioStore(
      (state) =>
        state.priceSyncStatus,
    );

  const priceSyncError =
    usePortfolioStore(
      (state) =>
        state.priceSyncError,
    );

  const lastPriceSyncAt =
    usePortfolioStore(
      (state) =>
        state.lastPriceSyncAt,
    );

  const deferredPriceSymbols =
    usePortfolioStore(
      (state) =>
        state.deferredPriceSymbols,
    );

  const refreshMarketPrices =
    usePortfolioStore(
      (state) =>
        state.refreshMarketPrices,
    );

  const [now, setNow] = useState(
    Date.now(),
  );

  const [
    cooldownEndsAt,
    setCooldownEndsAt,
  ] = useState(readCooldownEnd);

  const uniqueSymbolCount =
    useMemo(() => {
      return new Set(
        positions
          .map((position) =>
            position.symbol
              .trim()
              .toUpperCase(),
          )
          .filter(Boolean),
      ).size;
    }, [positions]);

  const hasPositions =
    uniqueSymbolCount > 0;

  const isLoading =
    priceSyncStatus === "loading";

  const cooldownSeconds =
    Math.max(
      Math.ceil(
        (cooldownEndsAt - now) /
          1000,
      ),
      0,
    );

  const isCoolingDown =
    cooldownSeconds > 0;

  const lastUpdateLabel =
    lastPriceSyncAt
      ? getRelativeTime(
          lastPriceSyncAt,
          now,
        )
      : "Never updated";

  const beginCooldown =
    useCallback(() => {
      const nextCooldownEnd =
        Date.now() +
        REFRESH_COOLDOWN_MS;

      setCooldownEndsAt(
        nextCooldownEnd,
      );

      saveCooldownEnd(
        nextCooldownEnd,
      );
    }, []);

  const executeRefresh =
    useCallback(async () => {
      const currentCooldownEnd =
        readCooldownEnd();

      if (
        currentCooldownEnd >
        Date.now()
      ) {
        setCooldownEndsAt(
          currentCooldownEnd,
        );

        return;
      }

      if (
        usePortfolioStore
          .getState()
          .priceSyncStatus ===
        "loading"
      ) {
        return;
      }

      beginCooldown();

      await refreshMarketPrices();
    }, [
      beginCooldown,
      refreshMarketPrices,
    ]);

  useEffect(() => {
    const clockInterval =
      window.setInterval(() => {
        const currentTime =
          Date.now();

        setNow(currentTime);

        if (
          cooldownEndsAt > 0 &&
          cooldownEndsAt <=
            currentTime
        ) {
          window.localStorage.removeItem(
            COOLDOWN_STORAGE_KEY,
          );

          setCooldownEndsAt(0);
        }
      }, 1000);

    return () => {
      window.clearInterval(
        clockInterval,
      );
    };
  }, [cooldownEndsAt]);

  useEffect(() => {
    const handleStorageChange = (
      event: StorageEvent,
    ) => {
      if (
        event.key !==
        COOLDOWN_STORAGE_KEY
      ) {
        return;
      }

      setCooldownEndsAt(
        event.newValue
          ? Number(event.newValue)
          : 0,
      );
    };

    const handleCooldownEvent = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<number>;

      setCooldownEndsAt(
        customEvent.detail,
      );
    };

    window.addEventListener(
      "storage",
      handleStorageChange,
    );

    window.addEventListener(
      COOLDOWN_EVENT_NAME,
      handleCooldownEvent,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange,
      );

      window.removeEventListener(
        COOLDOWN_EVENT_NAME,
        handleCooldownEvent,
      );
    };
  }, []);

  useEffect(() => {
    if (!hasPositions) {
      return;
    }

    const shouldRefresh = () => {
      const state =
        usePortfolioStore.getState();

      if (
        state.priceSyncStatus ===
        "loading"
      ) {
        return;
      }

      if (
        readCooldownEnd() >
        Date.now()
      ) {
        return;
      }

      const latestSync =
        state.lastPriceSyncAt;

      if (!latestSync) {
        void executeRefresh();
        return;
      }

      const latestTimestamp =
        new Date(
          latestSync,
        ).getTime();

      const invalidTimestamp =
        !Number.isFinite(
          latestTimestamp,
        );

      const refreshDue =
        Date.now() -
          latestTimestamp >=
        AUTO_REFRESH_INTERVAL_MS;

      if (
        invalidTimestamp ||
        refreshDue
      ) {
        void executeRefresh();
      }
    };

    shouldRefresh();

    const automaticChecker =
      window.setInterval(
        shouldRefresh,
        60_000,
      );

    return () => {
      window.clearInterval(
        automaticChecker,
      );
    };
  }, [
    executeRefresh,
    hasPositions,
  ]);

  const buttonLabel = (() => {
    if (isLoading) {
      return "Updating...";
    }

    if (isCoolingDown) {
      return `Refresh in ${cooldownSeconds}s`;
    }

    return "Refresh prices";
  })();

  const statusText = (() => {
    if (!hasPositions) {
      return "No positions to update";
    }

    if (isLoading) {
      return "Updating market prices...";
    }

    if (
      priceSyncStatus ===
      "success"
    ) {
      return `Prices updated · ${lastUpdateLabel}`;
    }

    if (
      priceSyncStatus ===
      "error"
    ) {
      return lastPriceSyncAt
        ? `Last successful update · ${lastUpdateLabel}`
        : "Price update failed";
    }

    return `Last update · ${lastUpdateLabel}`;
  })();

  return (
    <div className={className}>
      <div className="flex min-w-0 flex-col gap-2">
        <button
          type="button"
          onClick={() =>
            void executeRefresh()
          }
          disabled={
            !hasPositions ||
            isLoading ||
            isCoolingDown
          }
          className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-80 sm:w-auto"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className={`h-4 w-4 shrink-0 ${
              isLoading
                ? "animate-spin"
                : ""
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

          {buttonLabel}
        </button>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span role="status">
            {statusText}
          </span>

          <span className="text-slate-300">
            •
          </span>

          <span>
            Auto refresh every 15 min
          </span>
        </div>

        {deferredPriceSymbols.length >
          0 &&
          priceSyncStatus !==
            "error" && (
            <p className="text-xs text-slate-400">
              {
                deferredPriceSymbols.length
              }{" "}
              {deferredPriceSymbols.length ===
              1
                ? "asset will"
                : "assets will"}{" "}
              refresh on the next cycle.
            </p>
          )}

        {priceSyncError && (
          <div
            role="alert"
            className="max-w-md rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700"
          >
            {priceSyncError}
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceSyncControl;