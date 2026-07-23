import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useCashStore from "../../store/cashStore";
import usePortfolioStore from "../../store/portfolioStore";

type AddTransactionModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const sharesFormatter =
  new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    },
  );

const FLOATING_POINT_TOLERANCE =
  0.00000001;

const getTodayInputValue = () => {
  const now = new Date();

  const localDate =
    new Date(
      now.getTime() -
        now.getTimezoneOffset() *
          60_000,
    );

  return localDate
    .toISOString()
    .slice(0, 10);
};

const AddTransactionModal = ({
  isOpen,
  onClose,
}: AddTransactionModalProps) => {
  const positions =
    usePortfolioStore(
      (state) =>
        state.positions,
    );

  const addTransaction =
    usePortfolioStore(
      (state) =>
        state.addTransaction,
    );

  const cashAccounts =
    useCashStore(
      (state) =>
        state.accounts,
    );

  const {
    formatCurrencyFor,
    getCurrencySymbol,
  } = useCurrencyFormatter();

  const [
    type,
    setType,
  ] = useState<
    "buy" | "sell"
  >("buy");

  const [
    symbol,
    setSymbol,
  ] = useState("");

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    price,
    setPrice,
  ] = useState("");

  const [
    date,
    setDate,
  ] = useState(
    getTodayInputValue(),
  );

  const [
    note,
    setNote,
  ] = useState("");

  const [
    cashAccountId,
    setCashAccountId,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const usdSymbol =
    getCurrencySymbol("USD");

  const usdCashAccounts =
    useMemo(
      () =>
        cashAccounts.filter(
          (account) =>
            account.currency ===
            "USD",
        ),
      [cashAccounts],
    );

  const selectedCashAccount =
    useMemo(
      () =>
        usdCashAccounts.find(
          (account) =>
            account.id ===
            cashAccountId,
        ) ?? null,
      [
        cashAccountId,
        usdCashAccounts,
      ],
    );

  const normalizedSymbol =
    symbol
      .trim()
      .toUpperCase();

  const parsedAmount =
    Number(amount);

  const parsedPrice =
    Number(price);

  const calculatedShares =
    Number.isFinite(
      parsedAmount,
    ) &&
    parsedAmount > 0 &&
    Number.isFinite(
      parsedPrice,
    ) &&
    parsedPrice > 0
      ? parsedAmount /
        parsedPrice
      : 0;

  const currentShares =
    useMemo(() => {
      return positions
        .filter(
          (position) =>
            position.symbol
              .trim()
              .toUpperCase() ===
            normalizedSymbol,
        )
        .reduce(
          (
            total,
            position,
          ) =>
            total +
            position.shares,
          0,
        );
    }, [
      positions,
      normalizedSymbol,
    ]);

  const maximumSellAmount =
    Number.isFinite(
      parsedPrice,
    ) &&
    parsedPrice > 0
      ? currentShares *
        parsedPrice
      : 0;

  const resetForm = () => {
    setType("buy");
    setSymbol("");
    setAmount("");
    setPrice("");

    setDate(
      getTodayInputValue(),
    );

    setNote("");

    setCashAccountId("");

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
      if (
        event.key === "Escape"
      ) {
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
  }, [
    isOpen,
    onClose,
  ]);

  useEffect(() => {
    if (
      type !== "sell"
    ) {
      return;
    }

    if (
      cashAccountId
    ) {
      return;
    }

    const firstUsdAccount =
      usdCashAccounts[0];

    if (
      firstUsdAccount
    ) {
      setCashAccountId(
        firstUsdAccount.id,
      );
    }
  }, [
    type,
    cashAccountId,
    usdCashAccounts,
  ]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (
    event: FormEvent,
  ) => {
    event.preventDefault();

    setError("");

    if (!date) {
      setError(
        "Enter a valid transaction date.",
      );

      return;
    }

    const transactionDate =
      new Date(
        `${date}T12:00:00`,
      );

    if (
      Number.isNaN(
        transactionDate.getTime(),
      )
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
        `At this price, the maximum amount you can sell is ${formatCurrencyFor(
          maximumSellAmount,
          "USD",
        )}.`,
      );

      return;
    }

    if (
      type === "sell" &&
      !cashAccountId
    ) {
      setError(
        "Select a USD cash account that will receive the money from the sale.",
      );

      return;
    }

    if (
      type === "buy" &&
      selectedCashAccount &&
      parsedAmount >
        selectedCashAccount.balance +
          FLOATING_POINT_TOLERANCE
    ) {
      setError(
        `The selected account only has ${formatCurrencyFor(
          selectedCashAccount.balance,
          "USD",
        )} available.`,
      );

      return;
    }

    const result =
      addTransaction({
        type,
        symbol,

        amount:
          parsedAmount,

        price:
          parsedPrice,

        date:
          transactionDate.toISOString(),

        note,

        cashAccountId:
          cashAccountId ||
          undefined,
      });

    if (
      !result.success
    ) {
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
    event: MouseEvent,
  ) => {
    event.stopPropagation();
  };

  return (
    <div
      role="presentation"
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-modal-title"
        onMouseDown={
          stopPropagation
        }
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <h2
              id="transaction-modal-title"
              className="text-xl font-semibold text-slate-900"
            >
              Record transaction
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Enter the amount
              invested or sold. JIS
              calculates the shares and
              moves the cash
              automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-5 p-6"
        >
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Transaction type
            </p>

            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setType("buy");

                  setCashAccountId("");

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
              onChange={(
                event,
              ) => {
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

          <div>
            <label
              htmlFor="transaction-amount"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Total amount
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                {usdSymbol}
              </span>

              <input
                id="transaction-amount"
                type="number"
                value={amount}
                onChange={(
                  event,
                ) => {
                  setAmount(
                    event.target.value,
                  );

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
                {usdSymbol}
              </span>

              <input
                id="transaction-price"
                type="number"
                value={price}
                onChange={(
                  event,
                ) => {
                  setPrice(
                    event.target.value,
                  );

                  setError("");
                }}
                placeholder="570.00"
                min="0"
                step="any"
                className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">
                Calculated shares
              </span>

              <span className="text-sm font-semibold text-slate-900">
                {sharesFormatter.format(
                  calculatedShares,
                )}
              </span>
            </div>

            {type === "sell" &&
              normalizedSymbol && (
                <>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-500">
                      Available shares
                    </span>

                    <span className="text-sm font-semibold text-slate-900">
                      {sharesFormatter.format(
                        currentShares,
                      )}
                    </span>
                  </div>

                  {parsedPrice > 0 && (
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-500">
                        Maximum sale
                      </span>

                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrencyFor(
                          maximumSellAmount,
                          "USD",
                        )}
                      </span>
                    </div>
                  )}
                </>
              )}
          </div>

          <div>
            <label
              htmlFor="transaction-cash-account"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              {type === "sell"
                ? "Cash destination"
                : "Funding source"}
            </label>

            <select
              id="transaction-cash-account"
              value={
                cashAccountId
              }
              onChange={(
                event,
              ) => {
                setCashAccountId(
                  event.target.value,
                );

                setError("");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              {type === "buy" && (
                <option value="">
                  External contribution
                  — new money
                </option>
              )}

              {type === "sell" &&
                usdCashAccounts.length ===
                  0 && (
                  <option value="">
                    No USD cash account
                    available
                  </option>
                )}

              {usdCashAccounts.map(
                (account) => (
                  <option
                    key={
                      account.id
                    }
                    value={
                      account.id
                    }
                  >
                    {account.name} —{" "}
                    {formatCurrencyFor(
                      account.balance,
                      "USD",
                    )}
                  </option>
                ),
              )}
            </select>

            {type === "buy" &&
              !cashAccountId && (
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  External
                  contribution means
                  new money entering
                  your JIS net worth.
                </p>
              )}

            {type === "buy" &&
              selectedCashAccount && (
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  JIS will deduct the
                  purchase from{" "}
                  {
                    selectedCashAccount.name
                  }
                  .
                </p>
              )}

            {type === "sell" &&
              selectedCashAccount && (
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  The sale proceeds
                  will be deposited
                  into{" "}
                  {
                    selectedCashAccount.name
                  }
                  .
                </p>
              )}

            {type === "sell" &&
              usdCashAccounts.length ===
                0 && (
                <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                  Create a USD cash
                  account in Portfolio
                  → Cash accounts
                  before recording a
                  sale.
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
              onChange={(
                event,
              ) => {
                setDate(
                  event.target.value,
                );

                setError("");
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label
                htmlFor="transaction-note"
                className="text-sm font-medium text-slate-700"
              >
                Note
              </label>

              <span className="text-xs text-slate-400">
                Optional
              </span>
            </div>

            <textarea
              id="transaction-note"
              value={note}
              onChange={(
                event,
              ) =>
                setNote(
                  event.target.value,
                )
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