import { create } from "zustand";
import { fetchFxRates } from "../services/fxRateService";
import {
  isSupportedCurrency,
  type CurrencyCode,
} from "./settingsStore";

export type CashAccount = {
  id: string;
  name: string;
  institution?: string;
  currency: CurrencyCode;
  balance: number;
  annualYield: number;
  createdAt: string;
  updatedAt: string;
};

export type CashAccountInput = {
  name: string;
  institution?: string;
  currency: CurrencyCode;
  balance: number;
  annualYield: number;
};

export type CashMovementType =
  | "opening_balance"
  | "external_deposit"
  | "external_withdrawal"
  | "investment_buy"
  | "investment_sell"
  | "dividend"
  | "adjustment";

export type CashMovement = {
  id: string;

  cashAccountId: string;
  cashAccountName: string;

  currency: CurrencyCode;

  type: CashMovementType;

  /*
   * Signed amount:
   *
   * + money entering cash
   * - money leaving cash
   */
  amount: number;

  date: string;

  relatedId?: string;
  symbol?: string;
  note?: string;

  createdAt: string;
};

export type CashMovementMeta = {
  type?: CashMovementType;
  date?: string;
  relatedId?: string;
  symbol?: string;
  note?: string;
};

export type CashActionResult = {
  success: boolean;
  error?: string;
};

export type FxSyncStatus =
  | "idle"
  | "loading"
  | "success"
  | "error";

export type FxRefreshResult = {
  success: boolean;

  errors: Partial<
    Record<CurrencyCode, string>
  >;

  error?: string;
};

type StoredFxData = {
  baseCurrency: CurrencyCode;

  rates: Partial<
    Record<CurrencyCode, number>
  >;

  updatedAt: string;
};

type CashStore = {
  accounts: CashAccount[];

  movements: CashMovement[];

  fxBaseCurrency: CurrencyCode | null;

  fxRates: Partial<
    Record<CurrencyCode, number>
  >;

  fxUpdatedAt: string | null;

  fxSyncStatus: FxSyncStatus;

  fxSyncError: string | null;

  addAccount: (
    input: CashAccountInput,
  ) => CashActionResult;

  updateAccount: (
    id: string,
    input: CashAccountInput,
  ) => CashActionResult;

  removeAccount: (id: string) => void;

  adjustAccountBalance: (
    id: string,
    amount: number,
    movement?: CashMovementMeta,
  ) => CashActionResult;

  addExternalDeposit: (
    accountId: string,
    amount: number,
    date: string,
    note?: string,
  ) => CashActionResult;

  addExternalWithdrawal: (
    accountId: string,
    amount: number,
    date: string,
    note?: string,
  ) => CashActionResult;

  refreshFxRates: (
    baseCurrency: CurrencyCode,
  ) => Promise<FxRefreshResult>;
};

export const CASH_ACCOUNTS_STORAGE_KEY =
  "jis-cash-accounts";

export const CASH_FX_STORAGE_KEY =
  "jis-cash-fx-rates";

export const CASH_MOVEMENTS_STORAGE_KEY =
  "jis-cash-movements";

const TRANSACTIONS_STORAGE_KEY =
  "portfolio-transactions";

const DIVIDENDS_STORAGE_KEY =
  "jis-dividends";

const BALANCE_TOLERANCE =
  0.00000001;

const movementTypes:
  CashMovementType[] = [
    "opening_balance",
    "external_deposit",
    "external_withdrawal",
    "investment_buy",
    "investment_sell",
    "dividend",
    "adjustment",
  ];

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return (
    typeof value === "object" &&
    value !== null
  );
};

const normalizeNonNegativeNumber = (
  value: unknown,
): number | null => {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return null;
  }

  return parsed;
};

const normalizePositiveNumber = (
  value: unknown,
): number | null => {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
};

const normalizeSignedNumber = (
  value: unknown,
): number | null => {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
};

const normalizeYield = (
  value: unknown,
): number | null => {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > 100
  ) {
    return null;
  }

  return parsed;
};

const normalizeIsoDate = (
  value: unknown,
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const parsedDate =
    new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return null;
  }

  return parsedDate.toISOString();
};

const createId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const normalizeAccount = (
  value: unknown,
): CashAccount | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    typeof value.id === "string"
      ? value.id.trim()
      : "";

  const name =
    typeof value.name === "string"
      ? value.name.trim()
      : "";

  const institution =
    typeof value.institution ===
      "string" &&
    value.institution.trim()
      ? value.institution.trim()
      : undefined;

  const currency =
    isSupportedCurrency(
      value.currency,
    )
      ? value.currency
      : null;

  const balance =
    normalizeNonNegativeNumber(
      value.balance,
    );

  const annualYield =
    normalizeYield(
      value.annualYield,
    );

  const createdAt =
    normalizeIsoDate(
      value.createdAt,
    );

  const updatedAt =
    normalizeIsoDate(
      value.updatedAt,
    );

  if (
    !id ||
    !name ||
    !currency ||
    balance === null ||
    annualYield === null ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,
    name,
    institution,
    currency,
    balance,
    annualYield,
    createdAt,
    updatedAt,
  };
};

const normalizeMovement = (
  value: unknown,
): CashMovement | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    typeof value.id === "string"
      ? value.id.trim()
      : "";

  const cashAccountId =
    typeof value.cashAccountId ===
      "string"
      ? value.cashAccountId.trim()
      : "";

  const cashAccountName =
    typeof value.cashAccountName ===
      "string"
      ? value.cashAccountName.trim()
      : "";

  const currency =
    isSupportedCurrency(
      value.currency,
    )
      ? value.currency
      : null;

  const type =
    typeof value.type === "string" &&
    movementTypes.includes(
      value.type as CashMovementType,
    )
      ? (value.type as CashMovementType)
      : null;

  const amount =
    normalizeSignedNumber(
      value.amount,
    );

  const date =
    normalizeIsoDate(
      value.date,
    );

  const createdAt =
    normalizeIsoDate(
      value.createdAt,
    );

  const relatedId =
    typeof value.relatedId ===
      "string" &&
    value.relatedId.trim()
      ? value.relatedId.trim()
      : undefined;

  const symbol =
    typeof value.symbol === "string" &&
    value.symbol.trim()
      ? value.symbol
          .trim()
          .toUpperCase()
      : undefined;

  const note =
    typeof value.note === "string" &&
    value.note.trim()
      ? value.note.trim()
      : undefined;

  if (
    !id ||
    !cashAccountId ||
    !cashAccountName ||
    !currency ||
    !type ||
    amount === null ||
    !date ||
    !createdAt
  ) {
    return null;
  }

  return {
    id,
    cashAccountId,
    cashAccountName,
    currency,
    type,
    amount,
    date,
    relatedId,
    symbol,
    note,
    createdAt,
  };
};

const saveAccounts = (
  accounts: CashAccount[],
) => {
  localStorage.setItem(
    CASH_ACCOUNTS_STORAGE_KEY,
    JSON.stringify(accounts),
  );
};

const saveMovements = (
  movements: CashMovement[],
) => {
  localStorage.setItem(
    CASH_MOVEMENTS_STORAGE_KEY,
    JSON.stringify(movements),
  );
};

const sortMovements = (
  movements: CashMovement[],
) => {
  return [...movements].sort(
    (first, second) =>
      new Date(
        second.date,
      ).getTime() -
      new Date(
        first.date,
      ).getTime(),
  );
};

const loadAccounts =
  (): CashAccount[] => {
    try {
      const stored =
        localStorage.getItem(
          CASH_ACCOUNTS_STORAGE_KEY,
        );

      if (!stored) {
        return [];
      }

      const parsed: unknown =
        JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        saveAccounts([]);

        return [];
      }

      const accounts =
        parsed
          .map(normalizeAccount)
          .filter(
            (
              account,
            ): account is CashAccount =>
              account !== null,
          );

      saveAccounts(accounts);

      return accounts;
    } catch (error) {
      console.error(
        "Unable to load cash accounts:",
        error,
      );

      return [];
    }
  };

const migrateInvestmentMovements = (
  accounts: CashAccount[],
): CashMovement[] => {
  try {
    const stored =
      localStorage.getItem(
        TRANSACTIONS_STORAGE_KEY,
      );

    if (!stored) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap(
      (value) => {
        if (!isRecord(value)) {
          return [];
        }

        const type =
          value.type === "buy"
            ? "investment_buy"
            : value.type === "sell"
              ? "investment_sell"
              : null;

        if (!type) {
          return [];
        }

        const transactionId =
          typeof value.id === "string"
            ? value.id
            : "";

        const accountId =
          typeof value.cashAccountId ===
            "string"
            ? value.cashAccountId
            : "";

        const amount =
          normalizePositiveNumber(
            value.amount,
          );

        const date =
          normalizeIsoDate(
            value.date,
          );

        if (
          !transactionId ||
          !accountId ||
          amount === null ||
          !date
        ) {
          return [];
        }

        const account =
          accounts.find(
            (item) =>
              item.id === accountId,
          );

        if (!account) {
          return [];
        }

        const symbol =
          typeof value.symbol ===
            "string"
            ? value.symbol
                .trim()
                .toUpperCase()
            : undefined;

        const note =
          typeof value.note ===
            "string" &&
          value.note.trim()
            ? value.note.trim()
            : undefined;

        const movement:
          CashMovement = {
          id:
            `migration-transaction-${transactionId}`,

          cashAccountId:
            account.id,

          cashAccountName:
            account.name,

          currency:
            account.currency,

          type,

          amount:
            type ===
            "investment_buy"
              ? -amount
              : amount,

          date,

          relatedId:
            transactionId,

          symbol,

          note,

          createdAt:
            new Date().toISOString(),
        };

        return [movement];
      },
    );
  } catch (error) {
    console.error(
      "Unable to migrate investment cash movements:",
      error,
    );

    return [];
  }
};

const migrateDividendMovements = (
  accounts: CashAccount[],
): CashMovement[] => {
  try {
    const stored =
      localStorage.getItem(
        DIVIDENDS_STORAGE_KEY,
      );

    if (!stored) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(stored);

    if (!isRecord(parsed)) {
      return [];
    }

    const rawRecords =
      Array.isArray(parsed.records)
        ? parsed.records
        : [];

    return rawRecords.flatMap(
      (value) => {
        if (!isRecord(value)) {
          return [];
        }

        const dividendId =
          typeof value.id === "string"
            ? value.id
            : "";

        const accountId =
          typeof value.cashAccountId ===
            "string"
            ? value.cashAccountId
            : "";

        const netAmount =
          normalizePositiveNumber(
            value.netAmount,
          );

        const paymentDate =
          normalizeIsoDate(
            value.paymentDate,
          );

        if (
          !dividendId ||
          !accountId ||
          netAmount === null ||
          !paymentDate
        ) {
          return [];
        }

        const account =
          accounts.find(
            (item) =>
              item.id === accountId,
          );

        if (!account) {
          return [];
        }

        const symbol =
          typeof value.symbol ===
            "string"
            ? value.symbol
                .trim()
                .toUpperCase()
            : undefined;

        const movement:
          CashMovement = {
          id:
            `migration-dividend-${dividendId}`,

          cashAccountId:
            account.id,

          cashAccountName:
            account.name,

          currency:
            account.currency,

          type: "dividend",

          amount: netAmount,

          date: paymentDate,

          relatedId:
            dividendId,

          symbol,

          note:
            "Migrated dividend payment",

          createdAt:
            new Date().toISOString(),
        };

        return [movement];
      },
    );
  } catch (error) {
    console.error(
      "Unable to migrate dividend cash movements:",
      error,
    );

    return [];
  }
};

const createOpeningMovements = (
  accounts: CashAccount[],
  knownMovements: CashMovement[],
): CashMovement[] => {
  return accounts.flatMap(
    (account) => {
      const knownBalance =
        knownMovements
          .filter(
            (movement) =>
              movement.cashAccountId ===
              account.id,
          )
          .reduce(
            (total, movement) =>
              total +
              movement.amount,
            0,
          );

      const openingBalance =
        account.balance -
        knownBalance;

      if (
        Math.abs(openingBalance) <=
        BALANCE_TOLERANCE
      ) {
        return [];
      }

      const movement:
        CashMovement = {
        id:
          `opening-${account.id}`,

        cashAccountId:
          account.id,

        cashAccountName:
          account.name,

        currency:
          account.currency,

        type:
          "opening_balance",

        amount:
          openingBalance,

        date:
          account.createdAt,

        note:
          "Balance before JIS cash ledger tracking",

        createdAt:
          new Date().toISOString(),
      };

      return [movement];
    },
  );
};

const loadMovements = (
  accounts: CashAccount[],
): CashMovement[] => {
  try {
    const stored =
      localStorage.getItem(
        CASH_MOVEMENTS_STORAGE_KEY,
      );

    /*
     * Existing ledger.
     */
    if (stored !== null) {
      const parsed: unknown =
        JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        saveMovements([]);

        return [];
      }

      const movements =
        sortMovements(
          parsed
            .map(
              normalizeMovement,
            )
            .filter(
              (
                movement,
              ): movement is CashMovement =>
                movement !== null,
            ),
        );

      saveMovements(
        movements,
      );

      return movements;
    }

    /*
     * First ledger launch.
     *
     * Recover known BUY/SELL and
     * dividend movements first.
     */
    const investmentMovements =
      migrateInvestmentMovements(
        accounts,
      );

    const dividendMovements =
      migrateDividendMovements(
        accounts,
      );

    const knownMovements = [
      ...investmentMovements,
      ...dividendMovements,
    ];

    /*
     * Reconcile the remaining account
     * balance as the opening balance.
     *
     * Example:
     *
     * Tyba Cash current = 1,104.88
     * Known IXN sale    = 1,000.00
     *
     * Opening balance   =   104.88
     */
    const openingMovements =
      createOpeningMovements(
        accounts,
        knownMovements,
      );

    const movements =
      sortMovements([
        ...knownMovements,
        ...openingMovements,
      ]);

    saveMovements(
      movements,
    );

    return movements;
  } catch (error) {
    console.error(
      "Unable to load cash movements:",
      error,
    );

    return [];
  }
};

const normalizeRates = (
  value: unknown,
): Partial<
  Record<CurrencyCode, number>
> => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(
    value,
  ).reduce<
    Partial<
      Record<
        CurrencyCode,
        number
      >
    >
  >(
    (
      accumulator,
      [currency, rawRate],
    ) => {
      if (
        !isSupportedCurrency(
          currency,
        )
      ) {
        return accumulator;
      }

      const rate =
        normalizePositiveNumber(
          rawRate,
        );

      if (rate !== null) {
        accumulator[currency] =
          rate;
      }

      return accumulator;
    },
    {},
  );
};

const saveFxData = (
  fxData: StoredFxData,
) => {
  localStorage.setItem(
    CASH_FX_STORAGE_KEY,
    JSON.stringify(fxData),
  );
};

const loadFxData =
  (): StoredFxData | null => {
    try {
      const stored =
        localStorage.getItem(
          CASH_FX_STORAGE_KEY,
        );

      if (!stored) {
        return null;
      }

      const parsed: unknown =
        JSON.parse(stored);

      if (!isRecord(parsed)) {
        return null;
      }

      const baseCurrency =
        isSupportedCurrency(
          parsed.baseCurrency,
        )
          ? parsed.baseCurrency
          : null;

      const updatedAt =
        normalizeIsoDate(
          parsed.updatedAt,
        );

      const rates =
        normalizeRates(
          parsed.rates,
        );

      if (
        !baseCurrency ||
        !updatedAt
      ) {
        return null;
      }

      return {
        baseCurrency,
        rates,
        updatedAt,
      };
    } catch (error) {
      console.error(
        "Unable to load FX rates:",
        error,
      );

      return null;
    }
  };

const normalizeInput = (
  input: CashAccountInput,
): CashAccountInput | null => {
  const name =
    input.name.trim();

  const institution =
    input.institution?.trim() ||
    undefined;

  const balance =
    normalizeNonNegativeNumber(
      input.balance,
    );

  const annualYield =
    normalizeYield(
      input.annualYield,
    );

  if (
    !name ||
    name.length > 60 ||
    !isSupportedCurrency(
      input.currency,
    ) ||
    balance === null ||
    annualYield === null
  ) {
    return null;
  }

  return {
    name,
    institution,
    currency:
      input.currency,
    balance,
    annualYield,
  };
};

const initialAccounts =
  loadAccounts();

const initialMovements =
  loadMovements(
    initialAccounts,
  );

const initialFxData =
  loadFxData();

const useCashStore =
  create<CashStore>(
    (set, get) => ({
      accounts:
        initialAccounts,

      movements:
        initialMovements,

      fxBaseCurrency:
        initialFxData?.baseCurrency ??
        null,

      fxRates:
        initialFxData?.rates ??
        {},

      fxUpdatedAt:
        initialFxData?.updatedAt ??
        null,

      fxSyncStatus:
        "idle",

      fxSyncError:
        null,

      addAccount: (input) => {
        const normalizedInput =
          normalizeInput(input);

        if (!normalizedInput) {
          return {
            success: false,

            error:
              "Enter valid cash account information.",
          };
        }

        const now =
          new Date().toISOString();

        const account:
          CashAccount = {
          id: createId(),

          ...normalizedInput,

          createdAt: now,
          updatedAt: now,
        };

        const nextAccounts = [
          ...get().accounts,
          account,
        ];

        let nextMovements =
          get().movements;

        if (
          account.balance >
          BALANCE_TOLERANCE
        ) {
          const openingMovement:
            CashMovement = {
            id: createId(),

            cashAccountId:
              account.id,

            cashAccountName:
              account.name,

            currency:
              account.currency,

            type:
              "opening_balance",

            amount:
              account.balance,

            date: now,

            note:
              "Initial account balance",

            createdAt: now,
          };

          nextMovements =
            sortMovements([
              openingMovement,
              ...nextMovements,
            ]);
        }

        saveAccounts(
          nextAccounts,
        );

        saveMovements(
          nextMovements,
        );

        set({
          accounts:
            nextAccounts,

          movements:
            nextMovements,
        });

        return {
          success: true,
        };
      },

      updateAccount: (
        id,
        input,
      ) => {
        const normalizedInput =
          normalizeInput(input);

        if (!normalizedInput) {
          return {
            success: false,

            error:
              "Enter valid cash account information.",
          };
        }

        const existing =
          get().accounts.find(
            (account) =>
              account.id === id,
          );

        if (!existing) {
          return {
            success: false,

            error:
              "Cash account not found.",
          };
        }

        const existingMovements =
          get().movements.filter(
            (movement) =>
              movement.cashAccountId ===
              id,
          );

        if (
          existingMovements.length > 0 &&
          normalizedInput.currency !==
            existing.currency
        ) {
          return {
            success: false,

            error:
              "Currency cannot be changed after an account has cash movements.",
          };
        }

        const balanceDifference =
          normalizedInput.balance -
          existing.balance;

        const now =
          new Date().toISOString();

        const nextAccounts =
          get().accounts.map(
            (account) =>
              account.id === id
                ? {
                    ...account,
                    ...normalizedInput,
                    updatedAt: now,
                  }
                : account,
          );

        let nextMovements =
          get().movements.map(
            (movement) =>
              movement.cashAccountId ===
              id
                ? {
                    ...movement,

                    cashAccountName:
                      normalizedInput.name,
                  }
                : movement,
          );

        if (
          Math.abs(
            balanceDifference,
          ) >
          BALANCE_TOLERANCE
        ) {
          const adjustment:
            CashMovement = {
            id: createId(),

            cashAccountId:
              id,

            cashAccountName:
              normalizedInput.name,

            currency:
              normalizedInput.currency,

            type: "adjustment",

            amount:
              balanceDifference,

            date: now,

            note:
              "Manual balance correction",

            createdAt: now,
          };

          nextMovements =
            sortMovements([
              adjustment,
              ...nextMovements,
            ]);
        }

        saveAccounts(
          nextAccounts,
        );

        saveMovements(
          nextMovements,
        );

        set({
          accounts:
            nextAccounts,

          movements:
            nextMovements,
        });

        return {
          success: true,
        };
      },

      removeAccount: (id) => {
        const nextAccounts =
          get().accounts.filter(
            (account) =>
              account.id !== id,
          );

        saveAccounts(
          nextAccounts,
        );

        /*
         * Keep historical movements.
         * They are part of the audit
         * trail even if the account is
         * later removed.
         */
        set({
          accounts:
            nextAccounts,
        });
      },

      adjustAccountBalance: (
        id,
        amount,
        movement = {},
      ) => {
        if (
          !Number.isFinite(amount)
        ) {
          return {
            success: false,

            error:
              "Invalid cash movement.",
          };
        }

        if (
          Math.abs(amount) <=
          BALANCE_TOLERANCE
        ) {
          return {
            success: true,
          };
        }

        const account =
          get().accounts.find(
            (item) =>
              item.id === id,
          );

        if (!account) {
          return {
            success: false,

            error:
              "Cash account not found.",
          };
        }

        const nextBalance =
          account.balance +
          amount;

        if (
          nextBalance <
          -BALANCE_TOLERANCE
        ) {
          return {
            success: false,

            error:
              "The selected cash account does not have enough available balance.",
          };
        }

        const normalizedBalance =
          Math.abs(nextBalance) <=
          BALANCE_TOLERANCE
            ? 0
            : nextBalance;

        const now =
          new Date().toISOString();

        const movementDate =
          normalizeIsoDate(
            movement.date,
          ) ?? now;

        const nextAccounts =
          get().accounts.map(
            (item) =>
              item.id === id
                ? {
                    ...item,

                    balance:
                      normalizedBalance,

                    updatedAt: now,
                  }
                : item,
          );

        const cashMovement:
          CashMovement = {
          id: createId(),

          cashAccountId:
            account.id,

          cashAccountName:
            account.name,

          currency:
            account.currency,

          type:
            movement.type ??
            "adjustment",

          amount,

          date:
            movementDate,

          relatedId:
            movement.relatedId,

          symbol:
            movement.symbol
              ?.trim()
              .toUpperCase() ||
            undefined,

          note:
            movement.note?.trim() ||
            undefined,

          createdAt: now,
        };

        const nextMovements =
          sortMovements([
            cashMovement,
            ...get().movements,
          ]);

        saveAccounts(
          nextAccounts,
        );

        saveMovements(
          nextMovements,
        );

        set({
          accounts:
            nextAccounts,

          movements:
            nextMovements,
        });

        return {
          success: true,
        };
      },

      addExternalDeposit: (
        accountId,
        amount,
        date,
        note,
      ) => {
        const validAmount =
          normalizePositiveNumber(
            amount,
          );

        if (
          validAmount === null
        ) {
          return {
            success: false,

            error:
              "Deposit amount must be greater than zero.",
          };
        }

        return get().adjustAccountBalance(
          accountId,
          validAmount,
          {
            type:
              "external_deposit",

            date,

            note:
              note?.trim() ||
              "External cash contribution",
          },
        );
      },

      addExternalWithdrawal: (
        accountId,
        amount,
        date,
        note,
      ) => {
        const validAmount =
          normalizePositiveNumber(
            amount,
          );

        if (
          validAmount === null
        ) {
          return {
            success: false,

            error:
              "Withdrawal amount must be greater than zero.",
          };
        }

        return get().adjustAccountBalance(
          accountId,
          -validAmount,
          {
            type:
              "external_withdrawal",

            date,

            note:
              note?.trim() ||
              "External cash withdrawal",
          },
        );
      },

      refreshFxRates: async (
        baseCurrency,
      ) => {
        if (
          get().fxSyncStatus ===
          "loading"
        ) {
          return {
            success: false,

            errors: {},

            error:
              "An exchange-rate update is already running.",
          };
        }

        const currencies =
          Array.from(
            new Set(
              get().accounts.map(
                (account) =>
                  account.currency,
              ),
            ),
          );

        set({
          fxSyncStatus:
            "loading",

          fxSyncError:
            null,
        });

        try {
          const response =
            await fetchFxRates(
              currencies,
              baseCurrency,
            );

          const failedCurrencies =
            Object.keys(
              response.errors,
            );

          const partialError =
            failedCurrencies.length >
            0
              ? `Some currencies were not updated: ${failedCurrencies.join(
                  ", ",
                )}.`
              : null;

          const fxData:
            StoredFxData = {
            baseCurrency:
              response.baseCurrency,

            rates:
              response.rates,

            updatedAt:
              response.updatedAt,
          };

          saveFxData(fxData);

          set({
            fxBaseCurrency:
              response.baseCurrency,

            fxRates:
              response.rates,

            fxUpdatedAt:
              response.updatedAt,

            fxSyncStatus:
              partialError
                ? "error"
                : "success",

            fxSyncError:
              partialError,
          });

          return {
            success:
              Object.keys(
                response.rates,
              ).length > 0,

            errors:
              response.errors,

            error:
              partialError ??
              undefined,
          };
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to update exchange rates.";

          set({
            fxSyncStatus:
              "error",

            fxSyncError:
              message,
          });

          return {
            success: false,
            errors: {},
            error: message,
          };
        }
      },
    }),
  );

export default useCashStore;