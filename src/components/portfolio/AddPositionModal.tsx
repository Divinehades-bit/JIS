import {
  useEffect,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import usePortfolioStore from "../../store/portfolioStore";

type AddPositionModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const AddPositionModal = ({
  isOpen,
  onClose,
}: AddPositionModalProps) => {
  const addPosition = usePortfolioStore(
    (state) => state.addPosition,
  );

  const { currencySymbol } =
    useCurrencyFormatter();

  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");

  const [averageCost, setAverageCost] =
    useState("");

  const [currentPrice, setCurrentPrice] =
    useState("");

  const [error, setError] = useState("");

  const resetForm = () => {
    setSymbol("");
    setShares("");
    setAverageCost("");
    setCurrentPrice("");
    setError("");
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    resetForm();

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const normalizedSymbol = symbol
      .trim()
      .toUpperCase();

    const parsedShares = Number(shares);

    const parsedAverageCost = Number(
      averageCost,
    );

    const parsedCurrentPrice = Number(
      currentPrice,
    );

    if (!normalizedSymbol) {
      setError("Symbol is required.");
      return;
    }

    if (
      !Number.isFinite(parsedShares) ||
      parsedShares <= 0
    ) {
      setError(
        "Shares must be greater than zero.",
      );

      return;
    }

    if (
      !Number.isFinite(parsedAverageCost) ||
      parsedAverageCost <= 0
    ) {
      setError(
        "Average purchase cost must be greater than zero.",
      );

      return;
    }

    if (
      !Number.isFinite(parsedCurrentPrice) ||
      parsedCurrentPrice <= 0
    ) {
      setError(
        "Current price must be greater than zero.",
      );

      return;
    }

    addPosition({
      id: Date.now(),
      symbol: normalizedSymbol,
      shares: parsedShares,
      averageCost: parsedAverageCost,
      price: parsedCurrentPrice,
    });

    resetForm();
    onClose();
  };

  const stopPropagation = (
    event: MouseEvent<HTMLDivElement>,
  ) => {
    event.stopPropagation();
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-position-title"
        onClick={stopPropagation}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="add-position-title"
              className="text-xl font-semibold text-slate-900"
            >
              Add position
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add a new investment to your portfolio.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
        >
          <div>
            <label
              htmlFor="add-symbol"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Symbol
            </label>

            <input
              id="add-symbol"
              type="text"
              value={symbol}
              onChange={(event) =>
                setSymbol(
                  event.target.value.toUpperCase(),
                )
              }
              placeholder="VOO"
              maxLength={10}
              autoFocus
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label
              htmlFor="add-shares"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Shares
            </label>

            <input
              id="add-shares"
              type="number"
              value={shares}
              onChange={(event) =>
                setShares(event.target.value)
              }
              placeholder="10"
              min="0"
              step="any"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label
              htmlFor="add-average-cost"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Average purchase cost
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                {currencySymbol}
              </span>

              <input
                id="add-average-cost"
                type="number"
                value={averageCost}
                onChange={(event) =>
                  setAverageCost(event.target.value)
                }
                placeholder="500.00"
                min="0"
                step="any"
                className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <p className="mt-1.5 text-xs text-slate-400">
              Average amount paid for each share.
            </p>
          </div>

          <div>
            <label
              htmlFor="add-current-price"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Current market price
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                {currencySymbol}
              </span>

              <input
                id="add-current-price"
                type="number"
                value={currentPrice}
                onChange={(event) =>
                  setCurrentPrice(event.target.value)
                }
                placeholder="560.00"
                min="0"
                step="any"
                className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Add position
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPositionModal;