import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import usePortfolioStore from "../../store/portfolioStore";

type AddTransactionModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const sharesFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
});

const FLOATING_POINT_TOLERANCE = 0.00000001;

const getTodayInputValue = () => {
  const now = new Date();

  const localDate = new Date(
    now.getTime() -
      now.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 10);
};

const AddTransactionModal = ({
  isOpen,
  onClose,
}: AddTransactionModalProps) => {
  const positions = usePortfolioStore(
    (state) => state.positions,
  );

  const addTransaction = usePortfolioStore(
    (state) => state.addTransaction,
  );

  const {
    currencySymbol,
    formatCurrency,
  } = useCurrencyFormatter();

  const [type, setType] = useState<
    "buy" | "sell"
  >("buy");

  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");

  const [date, setDate] = useState(
    getTodayInputValue(),
  );

  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const normalizedSymbol = symbol
    .trim()
    .toUpperCase();

  const parsedAmount = Number(amount);
  const parsedPrice = Number(price);

  const calculatedShares =
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    Number.isFinite(parsedPrice) &&
    parsedPrice > 0
      ? parsedAmount / parsedPrice
      : 0;

  const currentShares = useMemo(() => {
    return positions
      .filter(
        (position) =>
          position.symbol
            .trim()
            .toUpperCase() === normalizedSymbol,
      )
      .reduce(
        (total, position) =>
          total + position.shares,
        0,
      );
  }, [positions, normalizedSymbol]);

  const maximumSellAmount =
    Number.isFinite(parsedPrice) &&
    parsedPrice > 0
      ? currentShares * parsedPrice
      : 0;

  const resetForm = () => {
    setType("buy");
    setSymbol("");
    setAmount("");
    setPrice("");
    setDate(getTodayInputValue());
    setNote("");
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

    setError("");

    if (!date) {
      setError(
        "Enter a valid transaction date.",
      );

      return;
    }

    const transactionDate = new Date(
      `${date}T12:00:00`,
    );

    if (
      Number.isNaN(transactionDate.getTime())
    ) {
      setError(
        "Enter a valid transaction date.",
      );

      return;
    }

    if (
      type === "sell" &&
      calculatedShares >
        currentShares +
          FLOATING_POINT_TOLERANCE
    ) {
      setError(
        `At this price, the maximum amount you can sell is ${formatCurrency(
          maximumSellAmount,
        )}.`,
      );

      return;
    }

    const result = addTransaction({
      type,
      symbol,
      amount: parsedAmount,
      price: parsedPrice,
      date: transactionDate.toISOString(),
      note,
    });

    if (!result.success) {
      setError(
        result.error ??
          "Unable to record the transaction.",
      );

      return;
    }

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
        aria-labelledby="transaction-modal-title"
        onClick={stopPropagation}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="transaction-modal-title"
              className="text-xl font-semibold text-slate-900"
            >
              Record transaction
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enter the amount invested or sold. JIS
              calculates the shares automatically.
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
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Transaction type
            </span>

            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setType("buy");
                  setError("");
                }}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  type === "buy"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Buy
              </button>

              <button
                type="button"
                onClick={() => {
                  setType("sell");
                  setError("");
                }}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  type === "sell"
                    ? "bg-white text-red-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Sell
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="transaction-symbol"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Symbol
            </label>

            <input
              id="transaction-symbol"
              type="text"
              value={symbol}
              onChange={(event) => {
                setSymbol(
                  event.target.value.toUpperCase(),
                );

                setError("");
              }}
              placeholder="VOO"
              maxLength={10}
              autoFocus
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="transaction-amount"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Total amount
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  {currencySymbol}
                </span>

                <input
                  id="transaction-amount"
                  type="number"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setError("");
                  }}
                  placeholder="1000.00"
                  min="0"
                  step="any"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="transaction-price"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Price per share
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  {currencySymbol}
                </span>

                <input
                  id="transaction-price"
                  type="number"
                  value={price}
                  onChange={(event) => {
                    setPrice(event.target.value);
                    setError("");
                  }}
                  placeholder="570.00"
                  min="0"
                  step="any"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">
                Calculated shares
              </span>

              <span className="text-lg font-semibold text-slate-900">
                {sharesFormatter.format(
                  calculatedShares,
                )}
              </span>
            </div>

            {type === "sell" &&
              normalizedSymbol && (
                <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-slate-500">
                      Available shares
                    </span>

                    <span className="font-semibold text-slate-700">
                      {sharesFormatter.format(
                        currentShares,
                      )}
                    </span>
                  </div>

                  {parsedPrice > 0 && (
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-slate-500">
                        Maximum sale amount
                      </span>

                      <span className="font-semibold text-slate-700">
                        {formatCurrency(
                          maximumSellAmount,
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
          </div>

          <div>
            <label
              htmlFor="transaction-date"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Transaction date
            </label>

            <input
              id="transaction-date"
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setError("");
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label
              htmlFor="transaction-note"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Note
              <span className="ml-1 font-normal text-slate-400">
                Optional
              </span>
            </label>

            <textarea
              id="transaction-note"
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              placeholder="Monthly contribution"
              maxLength={160}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
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
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                type === "buy"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              Record {type}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;