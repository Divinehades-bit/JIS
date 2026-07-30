import {
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import useSettingsStore from "../../store/settingsStore";

import {
  exportJisBackup,
  importJisBackup,
  resetJisData,
} from "../../utils/jisBackup";

const DataManagement = () => {
  const portfolioName =
    useSettingsStore(
      (state) =>
        state.settings.portfolioName,
    );

  const fileInputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    isImporting,
    setIsImporting,
  ] = useState(false);

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  const handleExport = () => {
    clearMessages();

    try {
      exportJisBackup(
        portfolioName,
      );

      setMessage(
        "Backup version 6 exported successfully.",
      );
    } catch (exportError) {
      console.error(
        exportError,
      );

      setError(
        "Unable to export the JIS backup.",
      );
    }
  };

  const handleImportClick =
    () => {
      clearMessages();

      fileInputRef.current?.click();
    };

  const handleImport = async (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const confirmed =
      window.confirm(
        "Importing this backup will replace your current JIS portfolio, transactions, cash, cash movements, goals, settings, history, dividends, Market Radar, Watchlist, Watchlist Trends and Paper Tracking data.\n\nContinue?",
      );

    if (!confirmed) {
      return;
    }

    clearMessages();

    setIsImporting(true);

    try {
      const backup =
        await importJisBackup(
          file,
        );

      setMessage(
        `JIS backup version ${backup.version} restored successfully. Reloading...`,
      );

      window.setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (importError) {
      console.error(
        importError,
      );

      setError(
        importError instanceof
          Error
          ? importError.message
          : "Unable to import the JIS backup.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    clearMessages();

    const firstConfirmation =
      window.confirm(
        "Reset all JIS data?\n\nThis will remove your investments, transactions, cash accounts, cash movements, dividends, goals, settings, historical data, Market Radar results, Watchlist, Watchlist Trends and Paper Tracking.",
      );

    if (!firstConfirmation) {
      return;
    }

    const secondConfirmation =
      window.confirm(
        "This action cannot be undone unless you have exported a backup.\n\nAre you absolutely sure?",
      );

    if (!secondConfirmation) {
      return;
    }

    try {
      resetJisData();

      setMessage(
        "JIS data reset successfully. Reloading...",
      );

      window.setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (resetError) {
      console.error(
        resetError,
      );

      setError(
        "Unable to reset JIS data.",
      );
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium text-slate-500">
          Data protection
        </p>

        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          Backup & restore
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Export a complete copy of
          your JIS financial, Market
          Radar and Trading Lab data or
          restore a previous backup.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white font-bold text-blue-600 shadow-sm">
            6
          </div>

          <div>
            <p className="font-semibold text-blue-900">
              Backup version 6
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-700">
              Includes portfolio,
              transactions, goals,
              settings, multicurrency
              cash, FX rates, net worth
              history, dividends,
              withholding taxes, Cash
              Ledger, Market Radar,
              Watchlist, Watchlist
              Trends and Paper Tracking.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            ↓
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            Export backup
          </h3>

          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
            Download your complete JIS
            financial, Radar, trend and
            Trading Lab data as JSON.
          </p>

          <button
            type="button"
            onClick={handleExport}
            className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Export JSON
          </button>
        </article>

        <article className="rounded-2xl border border-slate-200 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            ↑
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            Import backup
          </h3>

          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
            Restore JIS from a version
            1, 2, 3, 4, 5 or 6 backup.
          </p>

          <button
            type="button"
            onClick={
              handleImportClick
            }
            disabled={
              isImporting
            }
            className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isImporting
              ? "Importing..."
              : "Import backup"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            className="hidden"
          />
        </article>

        <article className="rounded-2xl border border-red-100 bg-red-50/40 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-bold text-red-500 shadow-sm">
            !
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            Reset JIS
          </h3>

          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
            Delete all locally stored
            financial, Radar, trend and
            Trading Lab information.
          </p>

          <button
            type="button"
            onClick={handleReset}
            className="mt-5 w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            Reset all JIS data
          </button>
        </article>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Cash Ledger included
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Preserves deposits,
            withdrawals, purchases,
            sales, dividends, opening
            balances, reversals and
            adjustments.
          </p>
        </article>

        <article className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
          <h3 className="text-sm font-semibold text-violet-900">
            Trading Lab included
          </h3>

          <p className="mt-2 text-sm leading-6 text-violet-700">
            Preserves Watchlist items,
            active simulations, closed
            trades and their 5, 10 and
            20-session results.
          </p>
        </article>

        <article className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="text-sm font-semibold text-blue-900">
            Watchlist Trends included
          </h3>

          <p className="mt-2 text-sm leading-6 text-blue-700">
            Preserves one-year price
            histories, moving averages,
            trend classifications and
            Base 100 comparison data.
          </p>
        </article>
      </div>

      {message && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <p className="mt-5 text-xs leading-5 text-slate-400">
        JIS backups do not contain
        environment variables, Twelve
        Data API keys or other
        credentials.
      </p>
    </section>
  );
};

export default DataManagement;