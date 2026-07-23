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
        state.settings
          .portfolioName,
    );

  const fileInputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isImporting,
    setIsImporting,
  ] = useState(false);

  const clearMessages = () => {
    setStatusMessage("");
    setErrorMessage("");
  };

  const handleExport = () => {
    clearMessages();

    try {
      exportJisBackup(
        portfolioName,
      );

      setStatusMessage(
        "Complete JIS backup created successfully.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create the backup.";

      setErrorMessage(message);
    }
  };

  const handleImportClick = () => {
    clearMessages();

    fileInputRef.current?.click();
  };

  const handleImportFile = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    /*
     * Allows selecting the same backup
     * file again later.
     */
    event.target.value = "";

    if (!file) {
      return;
    }

    const confirmed =
      window.confirm(
        [
          "Import this JIS backup?",
          "",
          "Your current portfolio, transactions, cash, goals, settings and history will be replaced.",
        ].join("\n"),
      );

    if (!confirmed) {
      return;
    }

    setIsImporting(true);

    clearMessages();

    try {
      const result =
        await importJisBackup(
          file,
        );

      setStatusMessage(
        `JIS backup version ${result.version} restored successfully.`,
      );

      window.setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to import the backup.";

      setErrorMessage(message);

      setIsImporting(false);
    }
  };

  const handleReset = () => {
    clearMessages();

    const firstConfirmation =
      window.confirm(
        [
          "Reset all JIS data?",
          "",
          "This will remove your portfolio, transactions, cash, goals and history from this browser.",
        ].join("\n"),
      );

    if (!firstConfirmation) {
      return;
    }

    const secondConfirmation =
      window.confirm(
        [
          "This action cannot be undone.",
          "",
          "Create a JSON backup first if you need to preserve your information.",
          "",
          "Continue with reset?",
        ].join("\n"),
      );

    if (!secondConfirmation) {
      return;
    }

    try {
      resetJisData();

      window.location.reload();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to reset JIS data.";

      setErrorMessage(message);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium text-slate-500">
          Data management
        </p>

        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          Backup & restore
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Export a complete copy of
          your JIS information or
          restore a previously saved
          backup.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Backup version 2
        </p>

        <p className="mt-2 text-sm font-semibold text-slate-900">
          Complete JIS backup
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Includes portfolio,
          transactions, goals,
          settings, multicurrency
          cash, FX rates and historical
          net worth data.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v12"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m7 10 5 5 5-5"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 21h14"
              />
            </svg>
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            Export backup
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Download your complete
            JIS data as a JSON file.
          </p>

          <button
            type="button"
            onClick={handleExport}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Export JSON
          </button>
        </article>

        <article className="rounded-2xl border border-slate-200 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21V9"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m7 14 5-5 5 5"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 3h14"
              />
            </svg>
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            Import backup
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Restore a JIS version 1
            or version 2 JSON backup.
          </p>

          <button
            type="button"
            onClick={
              handleImportClick
            }
            disabled={isImporting}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isImporting
              ? "Importing..."
              : "Import backup"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={
              handleImportFile
            }
            className="hidden"
          />
        </article>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="rounded-2xl border border-red-100 bg-red-50/40 p-5">
          <h3 className="font-semibold text-slate-900">
            Reset JIS
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Remove all portfolio,
            transaction, cash, goal,
            FX and historical data
            stored by JIS in this
            browser.
          </p>

          <button
            type="button"
            onClick={handleReset}
            className="mt-4 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            Reset all JIS data
          </button>
        </div>
      </div>
    </section>
  );
};

export default DataManagement;