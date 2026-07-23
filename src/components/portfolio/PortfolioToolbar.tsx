import PriceSyncControl from "../market/PriceSyncControl";
import usePortfolioStore from "../../store/portfolioStore";
import useSettingsStore from "../../store/settingsStore";
import SearchBar from "./SearchBar";

type PortfolioToolbarProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRecordTransaction: () => void;
};

const PortfolioToolbar = ({
  searchTerm,
  onSearchChange,
  onRecordTransaction,
}: PortfolioToolbarProps) => {
  const positions = usePortfolioStore(
    (state) => state.positions,
  );

  const portfolioName = useSettingsStore(
    (state) => state.settings.portfolioName,
  );

  const holdingLabel =
    positions.length === 1
      ? "1 holding"
      : `${positions.length} holdings`;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Portfolio
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {portfolioName}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage positions and record investment
            amounts.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="rounded-full bg-slate-100 px-3 py-2 text-center text-sm font-medium text-slate-600">
            {holdingLabel}
          </div>

          <PriceSyncControl />

          <button
            type="button"
            onClick={onRecordTransaction}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
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
                d="M12 5v14M5 12h14"
              />
            </svg>

            Record transaction
          </button>
        </div>
      </div>

      <div className="mt-5">
        <SearchBar
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Search VOO, IXN, VEU..."
        />
      </div>
    </section>
  );
};

export default PortfolioToolbar;