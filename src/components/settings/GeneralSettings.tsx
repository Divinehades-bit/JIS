import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import useSettingsStore, {
  supportedCurrencies,
  type CurrencyCode,
} from "../../store/settingsStore";

const currencyNames: Record<
  CurrencyCode,
  string
> = {
  USD: "US Dollar",
  PEN: "Peruvian Sol",
  EUR: "Euro",
  QAR: "Qatari Riyal",
};

const currencyLocales: Record<
  CurrencyCode,
  string
> = {
  USD: "en-US",
  PEN: "es-PE",
  EUR: "de-DE",
  QAR: "en-QA",
};

const GeneralSettings = () => {
  const settings = useSettingsStore(
    (state) => state.settings,
  );

  const updateSettings = useSettingsStore(
    (state) => state.updateSettings,
  );

  const resetSettings = useSettingsStore(
    (state) => state.resetSettings,
  );

  const [portfolioName, setPortfolioName] =
    useState(settings.portfolioName);

  const [currency, setCurrency] =
    useState<CurrencyCode>(settings.currency);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  useEffect(() => {
    setPortfolioName(settings.portfolioName);
    setCurrency(settings.currency);
  }, [settings]);

  const currencyPreview = useMemo(() => {
    return new Intl.NumberFormat(
      currencyLocales[currency],
      {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(1000);
  }, [currency]);

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    const normalizedName =
      portfolioName.trim();

    if (!normalizedName) {
      setError("Portfolio name is required.");

      return;
    }

    if (normalizedName.length > 40) {
      setError(
        "Portfolio name cannot exceed 40 characters.",
      );

      return;
    }

    updateSettings({
      portfolioName: normalizedName,
      currency,
    });

    setSuccessMessage(
      "Preferences saved successfully.",
    );
  };

  const handleResetPreferences = () => {
    const confirmed = window.confirm(
      "Reset the portfolio name and currency preference?",
    );

    if (!confirmed) {
      return;
    }

    resetSettings();

    setError("");

    setSuccessMessage(
      "Preferences restored to their default values.",
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium text-slate-500">
          General preferences
        </p>

        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          Portfolio settings
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Personalize the portfolio name and
          select the reporting currency used
          for converted cash balances.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5"
      >
        <div>
          <label
            htmlFor="settings-portfolio-name"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Portfolio name
          </label>

          <input
            id="settings-portfolio-name"
            type="text"
            value={portfolioName}
            onChange={(event) => {
              setPortfolioName(
                event.target.value,
              );

              setError("");
              setSuccessMessage("");
            }}
            placeholder="My Portfolio"
            maxLength={40}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />

          <div className="mt-1.5 flex items-center justify-between gap-4 text-xs text-slate-400">
            <span>
              This name appears throughout
              JIS.
            </span>

            <span>
              {portfolioName.length}/40
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="settings-currency"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Reporting currency
          </label>

          <select
            id="settings-currency"
            value={currency}
            onChange={(event) => {
              setCurrency(
                event.target
                  .value as CurrencyCode,
              );

              setError("");
              setSuccessMessage("");
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          >
            {supportedCurrencies.map(
              (currencyCode) => (
                <option
                  key={currencyCode}
                  value={currencyCode}
                >
                  {currencyCode} —{" "}
                  {currencyNames[currencyCode]}
                </option>
              ),
            )}
          </select>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Display preview
            </p>

            <p className="mt-1 text-lg font-semibold text-slate-900">
              {currencyPreview}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Cash accounts will retain their
              original currency and also show
              their equivalent in this reporting
              currency.
            </p>
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

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={handleResetPreferences}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            Reset preferences
          </button>

          <button
            type="submit"
            className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Save preferences
          </button>
        </div>
      </form>
    </section>
  );
};

export default GeneralSettings;