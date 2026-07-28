import { useMemo } from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useCashStore from "../../store/cashStore";
import useDividendStore from "../../store/dividendStore";
import useSettingsStore from "../../store/settingsStore";

type SymbolDividendSummary = {
  symbol: string;
  gross: number;
  tax: number;
  net: number;
  payments: number;
};

type AnnualDividendSummary = {
  year: number;
  gross: number;
  tax: number;
  net: number;
  payments: number;
};

const percentageFormatter =
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const DividendAnalytics = () => {
  const records =
    useDividendStore(
      (state) => state.records,
    );

  const reportingCurrency =
    useSettingsStore(
      (state) =>
        state.settings.currency,
    );

  const fxBaseCurrency =
    useCashStore(
      (state) =>
        state.fxBaseCurrency,
    );

  const fxRates =
    useCashStore(
      (state) =>
        state.fxRates,
    );

  const {
    formatCurrency,
    formatCurrencyFor,
  } = useCurrencyFormatter();

  const usdToReportingRate =
    useMemo(() => {
      if (
        reportingCurrency === "USD"
      ) {
        return 1;
      }

      if (
        fxBaseCurrency !==
        reportingCurrency
      ) {
        return null;
      }

      const rate =
        fxRates.USD;

      if (
        rate === undefined ||
        !Number.isFinite(rate) ||
        rate <= 0
      ) {
        return null;
      }

      return rate;
    }, [
      reportingCurrency,
      fxBaseCurrency,
      fxRates,
    ]);

  const analytics =
    useMemo(() => {
      let gross = 0;
      let tax = 0;
      let net = 0;

      const symbolMap =
        new Map<
          string,
          SymbolDividendSummary
        >();

      const annualMap =
        new Map<
          number,
          AnnualDividendSummary
        >();

      records.forEach(
        (record) => {
          gross +=
            record.grossAmount;

          tax +=
            record.taxWithheld;

          net +=
            record.netAmount;

          const existingSymbol =
            symbolMap.get(
              record.symbol,
            ) ?? {
              symbol:
                record.symbol,

              gross: 0,
              tax: 0,
              net: 0,
              payments: 0,
            };

          existingSymbol.gross +=
            record.grossAmount;

          existingSymbol.tax +=
            record.taxWithheld;

          existingSymbol.net +=
            record.netAmount;

          existingSymbol.payments +=
            1;

          symbolMap.set(
            record.symbol,
            existingSymbol,
          );

          const year =
            new Date(
              record.paymentDate,
            ).getFullYear();

          const existingYear =
            annualMap.get(
              year,
            ) ?? {
              year,
              gross: 0,
              tax: 0,
              net: 0,
              payments: 0,
            };

          existingYear.gross +=
            record.grossAmount;

          existingYear.tax +=
            record.taxWithheld;

          existingYear.net +=
            record.netAmount;

          existingYear.payments +=
            1;

          annualMap.set(
            year,
            existingYear,
          );
        },
      );

      const bySymbol =
        Array.from(
          symbolMap.values(),
        ).sort(
          (first, second) =>
            second.net -
            first.net,
        );

      const byYear =
        Array.from(
          annualMap.values(),
        ).sort(
          (first, second) =>
            first.year -
            second.year,
        );

      const effectiveWithholding =
        gross > 0
          ? (tax / gross) * 100
          : 0;

      const topPayer =
        bySymbol[0] ?? null;

      const maximumSymbolNet =
        Math.max(
          ...bySymbol.map(
            (item) =>
              item.net,
          ),
          0,
        );

      const maximumAnnualNet =
        Math.max(
          ...byYear.map(
            (item) =>
              item.net,
          ),
          0,
        );

      return {
        gross,
        tax,
        net,

        payments:
          records.length,

        effectiveWithholding,

        topPayer,

        bySymbol,

        byYear,

        maximumSymbolNet,

        maximumAnnualNet,
      };
    }, [records]);

  const formatDividendValue = (
    valueUsd: number,
  ) => {
    if (
      usdToReportingRate === null
    ) {
      return formatCurrencyFor(
        valueUsd,
        "USD",
      );
    }

    return formatCurrency(
      valueUsd *
        usdToReportingRate,
    );
  };

  const getWidth = (
    value: number,
    maximum: number,
  ) => {
    if (
      value <= 0 ||
      maximum <= 0
    ) {
      return "0%";
    }

    return `${Math.max(
      (value / maximum) *
        100,
      3,
    )}%`;
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <p className="text-sm font-medium text-slate-500">
          Dividend analytics
        </p>

        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          Dividend income
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Track gross distributions,
          withholding taxes and the
          dividend income that actually
          reaches your cash account.
        </p>
      </div>

      <div className="grid gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Gross dividends
          </p>

          <p className="mt-2 text-xl font-bold text-slate-900">
            {formatDividendValue(
              analytics.gross,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Before withholding tax.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Tax withheld
          </p>

          <p
            className={`mt-2 text-xl font-bold ${
              analytics.tax > 0
                ? "text-red-600"
                : "text-slate-900"
            }`}
          >
            {analytics.tax > 0
              ? "-"
              : ""}
            {formatDividendValue(
              analytics.tax,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Effective rate{" "}
            {percentageFormatter.format(
              analytics.effectiveWithholding,
            )}
            %.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Net dividends
          </p>

          <p
            className={`mt-2 text-xl font-bold ${
              analytics.net > 0
                ? "text-emerald-600"
                : "text-slate-900"
            }`}
          >
            {formatDividendValue(
              analytics.net,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Cash actually received.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Dividend payments
          </p>

          <p className="mt-2 text-xl font-bold text-slate-900">
            {analytics.payments}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {analytics.topPayer
              ? `Top payer: ${analytics.topPayer.symbol}`
              : "No payments recorded yet."}
          </p>
        </article>
      </div>

      {usdToReportingRate ===
        null &&
        reportingCurrency !==
          "USD" && (
          <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-xs text-amber-700">
            Current FX conversion is
            unavailable. Dividend
            analytics are temporarily
            displayed in USD.
          </div>
        )}

      {records.length === 0 ? (
        <div className="flex min-h-72 items-center justify-center p-8 text-center">
          <div className="max-w-lg">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-600">
              D
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              No dividends recorded yet
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              When you record your
              first dividend in
              Portfolio, JIS will begin
              building your dividend
              history automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <div className="min-w-0">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">
                Income by ETF
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Dividend income
                accumulated by
                investment.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[760px] w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      ETF
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Gross
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tax
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Net
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Payments
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {analytics.bySymbol.map(
                    (item) => (
                      <tr
                        key={
                          item.symbol
                        }
                        className="hover:bg-slate-50"
                      >
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-bold text-slate-900">
                              {
                                item.symbol
                              }
                            </p>

                            <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{
                                  width:
                                    getWidth(
                                      item.net,
                                      analytics.maximumSymbolNet,
                                    ),
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium text-slate-700">
                          {formatDividendValue(
                            item.gross,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium text-red-600">
                          {item.tax > 0
                            ? "-"
                            : ""}
                          {formatDividendValue(
                            item.tax,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-bold text-emerald-600">
                          {formatDividendValue(
                            item.net,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-sm text-slate-600">
                          {
                            item.payments
                          }
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">
                Annual dividend income
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Net dividend income by
                payment year.
              </p>
            </div>

            <div className="space-y-3">
              {analytics.byYear.map(
                (item) => (
                  <article
                    key={item.year}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {item.year}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {
                            item.payments
                          }{" "}
                          {item.payments ===
                          1
                            ? "payment"
                            : "payments"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">
                          {formatDividendValue(
                            item.net,
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          net
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width:
                            getWidth(
                              item.net,
                              analytics.maximumAnnualNet,
                            ),
                        }}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          Gross
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatDividendValue(
                            item.gross,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          Tax
                        </p>

                        <p className="mt-1 text-sm font-semibold text-red-600">
                          {item.tax >
                          0
                            ? "-"
                            : ""}
                          {formatDividendValue(
                            item.tax,
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>

            {analytics.topPayer && (
              <article className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                  Top dividend payer
                </p>

                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-2xl font-bold text-emerald-900">
                      {
                        analytics
                          .topPayer
                          .symbol
                      }
                    </p>

                    <p className="mt-1 text-xs text-emerald-700">
                      {
                        analytics
                          .topPayer
                          .payments
                      }{" "}
                      payments
                    </p>
                  </div>

                  <p className="text-xl font-bold text-emerald-700">
                    {formatDividendValue(
                      analytics
                        .topPayer
                        .net,
                    )}
                  </p>
                </div>
              </article>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 px-5 py-4">
        <p className="text-xs leading-5 text-slate-400">
          Dividend Analytics uses the
          payment records entered in
          JIS. Net dividend income is
          gross dividends minus
          withholding tax and is
          already deposited into the
          selected cash account when a
          dividend is recorded.
        </p>
      </div>
    </section>
  );
};

export default DividendAnalytics;