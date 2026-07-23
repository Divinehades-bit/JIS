import {
  useState,
  type FormEvent,
} from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import usePortfolioStore from "../../store/portfolioStore";

const AddPositionForm = () => {
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

  const [successMessage, setSuccessMessage] =
    useState("");

  const resetForm = () => {
    setSymbol("");
    setShares("");
    setAverageCost("");
    setCurrentPrice("");
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

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
      setError("Enter a valid symbol.");
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
        "Current market price must be greater than zero.",
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

    setSuccessMessage(
      `${normalizedSymbol} was added successfully.`,
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Add Position
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Add a new investment to your portfolio.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5"
      >
        <div>
          <label
            htmlFor="position-symbol"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Symbol
          </label>

          <input
            id="position-symbol"
            type="text"
            value={symbol}
            onChange={(event) => {
              setSymbol(
                event.target.value.toUpperCase(),
              );

              setError("");
              setSuccessMessage("");
            }}
            placeholder="VOO"
            maxLength={10}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label
            htmlFor="position-shares"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Shares
          </label>

          <input
            id="position-shares"
            type="number"
            value={shares}
            onChange={(event) => {
              setShares(event.target.value);
              setError("");
              setSuccessMessage("");
            }}
            placeholder="10"
            min="0"
            step="any"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label
            htmlFor="position-average-cost"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Average purchase cost
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              {currencySymbol}
            </span>

            <input
              id="position-average-cost"
              type="number"
              value={averageCost}
              onChange={(event) => {
                setAverageCost(event.target.value);
                setError("");
                setSuccessMessage("");
              }}
              placeholder="500.00"
              min="0"
              step="any"
              className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <p className="mt-1.5 text-xs text-slate-400">
            Average amount originally paid per share.
          </p>
        </div>

        <div>
          <label
            htmlFor="position-current-price"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Current market price
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              {currencySymbol}
            </span>

            <input
              id="position-current-price"
              type="number"
              value={currentPrice}
              onChange={(event) => {
                setCurrentPrice(event.target.value);
                setError("");
                setSuccessMessage("");
              }}
              placeholder="560.00"
              min="0"
              step="any"
              className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          Add position
        </button>
      </form>
    </section>
  );
};

export default AddPositionForm;