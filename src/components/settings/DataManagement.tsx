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
  const portfolioName = useSettingsStore(
    (state) => state.settings.portfolioName,
  );

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState("");

  const handleExport = () => {
    setError("");

    try {
      exportJisBackup(portfolioName);
    } catch (exportError) {
      console.error(
        "Unable to export JIS backup:",
        exportError,
      );

      setError(
        "JIS could not create the backup file.",
      );
    }
  };

  const handleOpenFilePicker = () => {
    setError("");
    fileInputRef.current?.click();
  };

  const handleImport = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const confirmed = window.confirm(
      "Importing this backup will replace the current portfolio, transactions, goal and settings. Continue?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await importJisBackup(file);

      window.alert(
        "Backup imported successfully. JIS will now reload.",
      );

      window.location.reload();
    } catch (importError) {
      const message =
        importError instanceof Error
          ? importError.message
          : "JIS could not import the selected backup.";

      setError(message);
    }
  };

  const handleResetAllData = () => {
    const firstConfirmation = window.confirm(
      "This will permanently delete all positions, transactions, goals and settings stored in this browser. Continue?",
    );

    if (!firstConfirmation) {
      return;
    }

    const secondConfirmation = window.confirm(
      "This action cannot be undone unless you exported a backup. Delete all JIS data?",
    );

    if (!secondConfirmation) {
      return;
    }

    resetJisData();

    window.alert(
      "All JIS data was deleted. The application will now reload.",
    );

    window.location.reload();
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium text-slate-500">
          Data management
        </p>

        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          Backup and recovery
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Export your complete JIS data or restore it from
          a previous backup.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <article className="rounded-2xl border border-slate-200 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">
                Export backup
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Download positions, transactions, goal and
                preferences in one JSON file.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v12m0 0 4-4m-4 4-4-4"
                />

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 19h14"
                />
              </svg>

              Export JSON
            </button>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">
                Import backup
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Restore JIS using a valid backup file. The
                current data will be replaced.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenFilePicker}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21V9m0 0 4 4m-4-4-4 4"
                />

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 5h14"
                />
              </svg>

              Select backup
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            className="hidden"
          />
        </article>

        <article className="rounded-2xl border border-red-200 bg-red-50/40 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-red-800">
                Reset all JIS data
              </h3>

              <p className="mt-1 text-sm leading-6 text-red-600">
                Permanently delete positions,
                transactions, financial goal and
                preferences from this browser.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetAllData}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              Delete all data
            </button>
          </div>
        </article>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
      </div>
    </section>
  );
};

export default DataManagement;