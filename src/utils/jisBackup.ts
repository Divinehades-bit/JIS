export type JisBackupVersion =
  | 1
  | 2
  | 3;

type JisBackupV1Data = {
  portfolio: unknown;
  transactions: unknown;
  goal: unknown;
  settings: unknown;
};

type JisBackupV2Data =
  JisBackupV1Data & {
    cashAccounts: unknown;
    cashFxRates: unknown;
    portfolioHistory: unknown;
    wealthHistory: unknown;
  };

type JisBackupV3Data =
  JisBackupV2Data & {
    dividends: unknown;
  };

type JisBackupV1 = {
  app: "JIS";
  version: 1;
  exportedAt: string;
  data: JisBackupV1Data;
};

type JisBackupV2 = {
  app: "JIS";
  version: 2;
  exportedAt: string;
  data: JisBackupV2Data;
};

type JisBackupV3 = {
  app: "JIS";
  version: 3;
  exportedAt: string;
  data: JisBackupV3Data;
};

export type JisBackup =
  | JisBackupV1
  | JisBackupV2
  | JisBackupV3;

const STORAGE_KEYS = {
  portfolio: "portfolio",

  transactions:
    "portfolio-transactions",

  goal:
    "jis-financial-goal",

  settings:
    "jis-settings",

  cashAccounts:
    "jis-cash-accounts",

  cashFxRates:
    "jis-cash-fx-rates",

  portfolioHistory:
    "jis-portfolio-history",

  wealthHistory:
    "jis-wealth-history",

  dividends:
    "jis-dividends",

  priceCooldown:
    "jis-market-price-cooldown-until",
} as const;

const isRecord = (
  value: unknown,
): value is Record<
  string,
  unknown
> => {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
};

const readStorageValue = (
  key: string,
): unknown => {
  try {
    const storedValue =
      localStorage.getItem(key);

    if (storedValue === null) {
      return null;
    }

    return JSON.parse(
      storedValue,
    ) as unknown;
  } catch (error) {
    console.error(
      `Unable to read ${key}:`,
      error,
    );

    return null;
  }
};

const writeStorageValue = (
  key: string,
  value: unknown,
) => {
  try {
    if (
      value === null ||
      value === undefined
    ) {
      localStorage.removeItem(
        key,
      );

      return;
    }

    localStorage.setItem(
      key,
      JSON.stringify(value),
    );
  } catch (error) {
    console.error(
      `Unable to restore ${key}:`,
      error,
    );

    throw new Error(
      `Unable to restore ${key}.`,
    );
  }
};

const clearModernData = () => {
  localStorage.removeItem(
    STORAGE_KEYS.cashAccounts,
  );

  localStorage.removeItem(
    STORAGE_KEYS.cashFxRates,
  );

  localStorage.removeItem(
    STORAGE_KEYS.portfolioHistory,
  );

  localStorage.removeItem(
    STORAGE_KEYS.wealthHistory,
  );

  localStorage.removeItem(
    STORAGE_KEYS.dividends,
  );
};

const sanitizeFilename = (
  value: string,
) => {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(/^-+|-+$/g, "");

  return (
    sanitized || "portfolio"
  );
};

const getDateString = () => {
  const now = new Date();

  const year =
    now.getFullYear();

  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    now.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const createBackup =
  (): JisBackupV3 => {
    return {
      app: "JIS",

      version: 3,

      exportedAt:
        new Date().toISOString(),

      data: {
        portfolio:
          readStorageValue(
            STORAGE_KEYS.portfolio,
          ),

        transactions:
          readStorageValue(
            STORAGE_KEYS.transactions,
          ),

        goal:
          readStorageValue(
            STORAGE_KEYS.goal,
          ),

        settings:
          readStorageValue(
            STORAGE_KEYS.settings,
          ),

        cashAccounts:
          readStorageValue(
            STORAGE_KEYS.cashAccounts,
          ),

        cashFxRates:
          readStorageValue(
            STORAGE_KEYS.cashFxRates,
          ),

        portfolioHistory:
          readStorageValue(
            STORAGE_KEYS.portfolioHistory,
          ),

        wealthHistory:
          readStorageValue(
            STORAGE_KEYS.wealthHistory,
          ),

        dividends:
          readStorageValue(
            STORAGE_KEYS.dividends,
          ),
      },
    };
  };

export const exportJisBackup = (
  portfolioName: string,
) => {
  const backup =
    createBackup();

  const blob = new Blob(
    [
      JSON.stringify(
        backup,
        null,
        2,
      ),
    ],
    {
      type: "application/json",
    },
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;

  anchor.download =
    `jis-backup-${sanitizeFilename(
      portfolioName,
    )}-${getDateString()}.json`;

  document.body.appendChild(
    anchor,
  );

  anchor.click();

  anchor.remove();

  URL.revokeObjectURL(url);
};

const validateBackup = (
  value: unknown,
): JisBackup => {
  if (!isRecord(value)) {
    throw new Error(
      "Invalid JIS backup file.",
    );
  }

  if (value.app !== "JIS") {
    throw new Error(
      "This file is not a JIS backup.",
    );
  }

  if (
    value.version !== 1 &&
    value.version !== 2 &&
    value.version !== 3
  ) {
    throw new Error(
      "Unsupported JIS backup version.",
    );
  }

  if (!isRecord(value.data)) {
    throw new Error(
      "The backup data is invalid.",
    );
  }

  if (
    typeof value.exportedAt !==
    "string"
  ) {
    throw new Error(
      "The backup export date is invalid.",
    );
  }

  return value as JisBackup;
};

const restoreBaseData = (
  data: JisBackupV1Data,
) => {
  writeStorageValue(
    STORAGE_KEYS.portfolio,
    data.portfolio,
  );

  writeStorageValue(
    STORAGE_KEYS.transactions,
    data.transactions,
  );

  writeStorageValue(
    STORAGE_KEYS.goal,
    data.goal,
  );

  writeStorageValue(
    STORAGE_KEYS.settings,
    data.settings,
  );
};

const restoreV2Data = (
  data: JisBackupV2Data,
) => {
  restoreBaseData(data);

  writeStorageValue(
    STORAGE_KEYS.cashAccounts,
    data.cashAccounts,
  );

  writeStorageValue(
    STORAGE_KEYS.cashFxRates,
    data.cashFxRates,
  );

  writeStorageValue(
    STORAGE_KEYS.portfolioHistory,
    data.portfolioHistory,
  );

  writeStorageValue(
    STORAGE_KEYS.wealthHistory,
    data.wealthHistory,
  );
};

export const importJisBackup =
  async (
    file: File,
  ): Promise<JisBackup> => {
    let parsedValue: unknown;

    try {
      const fileContent =
        await file.text();

      parsedValue =
        JSON.parse(fileContent);
    } catch {
      throw new Error(
        "Unable to read this JSON backup.",
      );
    }

    const backup =
      validateBackup(parsedValue);

    /*
     * Never preserve transient
     * market-refresh cooldown state
     * when importing a backup.
     */
    localStorage.removeItem(
      STORAGE_KEYS.priceCooldown,
    );

    if (
      backup.version === 1
    ) {
      /*
       * Avoid combining an old backup
       * with newer cash, history or
       * dividend data that already exists
       * in this browser.
       */
      clearModernData();

      restoreBaseData(
        backup.data,
      );

      return backup;
    }

    if (
      backup.version === 2
    ) {
      /*
       * Version 2 predates dividends.
       * Remove existing dividend data so
       * an older backup produces exactly
       * the state it originally contained.
       */
      localStorage.removeItem(
        STORAGE_KEYS.dividends,
      );

      restoreV2Data(
        backup.data,
      );

      return backup;
    }

    restoreV2Data(
      backup.data,
    );

    writeStorageValue(
      STORAGE_KEYS.dividends,
      backup.data.dividends,
    );

    return backup;
  };

export const resetJisData = () => {
  /*
   * Keep these keys as empty arrays.
   * Removing portfolio completely would
   * cause portfolioStore to recreate its
   * original demo positions.
   */
  writeStorageValue(
    STORAGE_KEYS.portfolio,
    [],
  );

  writeStorageValue(
    STORAGE_KEYS.transactions,
    [],
  );

  localStorage.removeItem(
    STORAGE_KEYS.goal,
  );

  localStorage.removeItem(
    STORAGE_KEYS.settings,
  );

  localStorage.removeItem(
    STORAGE_KEYS.cashAccounts,
  );

  localStorage.removeItem(
    STORAGE_KEYS.cashFxRates,
  );

  localStorage.removeItem(
    STORAGE_KEYS.portfolioHistory,
  );

  localStorage.removeItem(
    STORAGE_KEYS.wealthHistory,
  );

  localStorage.removeItem(
    STORAGE_KEYS.dividends,
  );

  localStorage.removeItem(
    STORAGE_KEYS.priceCooldown,
  );
};