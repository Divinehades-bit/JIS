import { useMemo, useState } from "react";
import usePortfolioStore, {
  type Position,
} from "../../store/portfolioStore";
import EditPositionModal from "./EditPositionModal";
import PortfolioRow from "./PortfolioRow";

type PortfolioTableProps = {
  searchTerm?: string;
};

type SortKey =
  | "symbol"
  | "marketValue"
  | "gainLoss"
  | "returnPercentage"
  | "allocation";

type SortDirection = "asc" | "desc";

type SortConfig = {
  key: SortKey;
  direction: SortDirection;
};

type SortableHeaderProps = {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
};

type PositionWithMetrics = {
  position: Position;
  marketValue: number;
  gainLoss: number;
  returnPercentage: number;
  allocation: number;
};

const SortableHeader = ({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
  align = "right",
}: SortableHeaderProps) => {
  const isActive = activeSortKey === sortKey;

  const sortIndicator = !isActive
    ? "↕"
    : direction === "asc"
      ? "↑"
      : "↓";

  const ariaSort = isActive
    ? direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
        align === "left" ? "text-left" : "text-right"
      }`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1.5 rounded-md transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 ${
          align === "right" ? "justify-end" : "justify-start"
        }`}
      >
        <span>{label}</span>

        <span
          aria-hidden="true"
          className={
            isActive
              ? "text-slate-900"
              : "text-slate-300"
          }
        >
          {sortIndicator}
        </span>
      </button>
    </th>
  );
};

const getPositionMetrics = (
  position: Position,
  totalPortfolioValue: number,
): PositionWithMetrics => {
  const investedCapital =
    position.shares * position.averageCost;

  const marketValue =
    position.shares * position.price;

  const gainLoss = marketValue - investedCapital;

  const returnPercentage =
    investedCapital > 0
      ? (gainLoss / investedCapital) * 100
      : 0;

  const allocation =
    totalPortfolioValue > 0
      ? (marketValue / totalPortfolioValue) * 100
      : 0;

  return {
    position,
    marketValue,
    gainLoss,
    returnPercentage,
    allocation,
  };
};

const PortfolioTable = ({
  searchTerm = "",
}: PortfolioTableProps) => {
  const positions = usePortfolioStore(
    (state) => state.positions,
  );

  const removePosition = usePortfolioStore(
    (state) => state.removePosition,
  );

  const [selectedPosition, setSelectedPosition] =
    useState<Position | null>(null);

  const [sortConfig, setSortConfig] =
    useState<SortConfig>({
      key: "marketValue",
      direction: "desc",
    });

  const totalPortfolioValue = useMemo(() => {
    return positions.reduce(
      (total, position) =>
        total + position.shares * position.price,
      0,
    );
  }, [positions]);

  const sortedPositions = useMemo(() => {
    const normalizedSearchTerm = searchTerm
      .trim()
      .toUpperCase();

    const filteredPositions = normalizedSearchTerm
      ? positions.filter((position) =>
          position.symbol
            .toUpperCase()
            .includes(normalizedSearchTerm),
        )
      : positions;

    const positionsWithMetrics = filteredPositions.map(
      (position) =>
        getPositionMetrics(
          position,
          totalPortfolioValue,
        ),
    );

    return positionsWithMetrics.sort(
      (firstPosition, secondPosition) => {
        let comparison = 0;

        switch (sortConfig.key) {
          case "symbol":
            comparison =
              firstPosition.position.symbol.localeCompare(
                secondPosition.position.symbol,
              );
            break;

          case "marketValue":
            comparison =
              firstPosition.marketValue -
              secondPosition.marketValue;
            break;

          case "gainLoss":
            comparison =
              firstPosition.gainLoss -
              secondPosition.gainLoss;
            break;

          case "returnPercentage":
            comparison =
              firstPosition.returnPercentage -
              secondPosition.returnPercentage;
            break;

          case "allocation":
            comparison =
              firstPosition.allocation -
              secondPosition.allocation;
            break;

          default:
            comparison = 0;
        }

        if (comparison === 0) {
          comparison =
            firstPosition.position.symbol.localeCompare(
              secondPosition.position.symbol,
            );
        }

        return sortConfig.direction === "asc"
          ? comparison
          : -comparison;
      },
    );
  }, [
    positions,
    searchTerm,
    sortConfig,
    totalPortfolioValue,
  ]);

  const handleSort = (key: SortKey) => {
    setSortConfig((currentSort) => {
      if (currentSort.key === key) {
        return {
          key,
          direction:
            currentSort.direction === "asc"
              ? "desc"
              : "asc",
        };
      }

      return {
        key,
        direction:
          key === "symbol" ? "asc" : "desc",
      };
    });
  };

  const handleEdit = (position: Position) => {
    setSelectedPosition(position);
  };

  const handleCloseEditModal = () => {
    setSelectedPosition(null);
  };

  const handleDelete = (position: Position) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${position.symbol}?`,
    );

    if (!confirmed) {
      return;
    }

    removePosition(position.id);
  };

  if (positions.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          No positions yet
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Add your first investment position to start
          tracking your portfolio.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Portfolio positions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Purchase cost, current value and performance.
            </p>
          </div>

          <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
            Sorted by{" "}
            <span className="font-semibold text-slate-900">
              {sortConfig.key === "returnPercentage"
                ? "return"
                : sortConfig.key === "marketValue"
                  ? "market value"
                  : sortConfig.key === "gainLoss"
                    ? "gain / loss"
                    : sortConfig.key}
            </span>{" "}
            {sortConfig.direction === "asc"
              ? "ascending"
              : "descending"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1370px] divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <SortableHeader
                  label="Symbol"
                  sortKey="symbol"
                  activeSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                  align="left"
                />

                <th
                  scope="col"
                  className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Shares
                </th>

                <th
                  scope="col"
                  className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Average cost
                </th>

                <th
                  scope="col"
                  className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Current price
                </th>

                <th
                  scope="col"
                  className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Invested
                </th>

                <SortableHeader
                  label="Market value"
                  sortKey="marketValue"
                  activeSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />

                <SortableHeader
                  label="Gain / loss"
                  sortKey="gainLoss"
                  activeSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />

                <SortableHeader
                  label="Return"
                  sortKey="returnPercentage"
                  activeSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />

                <SortableHeader
                  label="Allocation"
                  sortKey="allocation"
                  activeSortKey={sortConfig.key}
                  direction={sortConfig.direction}
                  onSort={handleSort}
                />

                <th
                  scope="col"
                  className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {sortedPositions.map(
                ({ position, allocation }) => (
                  <PortfolioRow
                    key={position.id}
                    position={position}
                    allocation={allocation}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ),
              )}
            </tbody>
          </table>
        </div>

        {sortedPositions.length === 0 && (
          <div className="border-t border-slate-200 px-6 py-12 text-center">
            <h3 className="font-semibold text-slate-900">
              No matching positions
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              No symbols match “{searchTerm}”.
            </p>
          </div>
        )}
      </section>

      <EditPositionModal
        position={selectedPosition}
        isOpen={selectedPosition !== null}
        onClose={handleCloseEditModal}
      />
    </>
  );
};

export default PortfolioTable;