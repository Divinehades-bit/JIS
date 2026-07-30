export type JisBackupVersion =
  | 1
  | 2
  | 3
  | 4
  | 5;

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

type JisBackupV4Data =
  JisBackupV3Data & {
    cashMovements: unknown;
  };

type JisBackupV5Data =
  JisBackupV4Data & {
    marketOpportunities: unknown;
    tradingLab: unknown;
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

type JisBackupV4 = {
  app: "JIS";
  version: 4;
  exportedAt: string;
  data: JisBackupV4Data;
};

type JisBackupV5 = {
  app: "JIS";
  version: 5;
  exportedAt: string;
  data: JisBackupV5Data;
};

export type JisBackup =
  | JisBackupV1
  | JisBackupV2
  | JisBackupV3
  | JisBackupV4
  | JisBackupV5;

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

  cashMovements:
    "jis-cash-movements",

  portfolioHistory:
    "jis-portfolio-history",

  wealthHistory:
    "jis-wealth-history",

  dividends:
    "jis-dividends",

  marketOpportunities:
    "jis-market-opportunities",

  tradingLab:
    "jis-trading-lab",

  priceCooldown:
    "jis-market-price-cooldown-until",
} as const;

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
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
): void => {
  try {
    if (
      value === null ||
      value === undefined
    ) {
      localStorage.removeItem(key);

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

const clearKeys = (
  keys: string[],
): void => {
  keys.forEach((key) => {
    localStorage.removeItem(key);
  });
};

const clearDataAfterV1 =
  (): void => {
    clearKeys([
      STORAGE_KEYS.cashAccounts,
      STORAGE_KEYS.cashFxRates,
      STORAGE_KEYS.cashMovements,
      STORAGE_KEYS.portfolioHistory,
      STORAGE_KEYS.wealthHistory,
      STORAGE_KEYS.dividends,
      STORAGE_KEYS.marketOpportunities,
      STORAGE_KEYS.tradingLab,
    ]);
  };

const clearDataAfterV2 =
  (): void => {
    clearKeys([
      STORAGE_KEYS.cashMovements,
      STORAGE_KEYS.dividends,
      STORAGE_KEYS.marketOpportunities,
      STORAGE_KEYS.tradingLab,
    ]);
  };

const clearDataAfterV3 =
  (): void => {
    clearKeys([
      STORAGE_KEYS.cashMovements,
      STORAGE_KEYS.marketOpportunities,
      STORAGE_KEYS.tradingLab,
    ]);
  };

const clearDataAfterV4 =
  (): void => {
    clearKeys([
      STORAGE_KEYS.marketOpportunities,
      STORAGE_KEYS.tradingLab,
    ]);
  };

const sanitizeFilename = (
  value: string,
): string => {
  const sanitized =
    value
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "",
      );

  return sanitized || "portfolio";
};

const getDateString =
  (): string => {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1,
      ).padStart(2, "0");

    const day =
      String(
        now.getDate(),
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

export const createBackup =
  (): JisBackupV5 => {
    return {
      app: "JIS",

      version: 5,

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

        cashMovements:
          readStorageValue(
            STORAGE_KEYS.cashMovements,
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

        marketOpportunities:
          readStorageValue(
            STORAGE_KEYS.marketOpportunities,
          ),

        tradingLab:
          readStorageValue(
            STORAGE_KEYS.tradingLab,
          ),
      },
    };
  };

export const exportJisBackup = (
  portfolioName: string,
): void => {
  const backup =
    createBackup();

  const blob =
    new Blob(
      [
        JSON.stringify(
          backup,
          null,
          2,
        ),
      ],
      {
        type:
          "application/json",
      },
    );

  const url =
    URL.createObjectURL(
      blob,
    );

  const anchor =
    document.createElement(
      "a",
    );

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
    value.version !== 3 &&
    value.version !== 4 &&
    value.version !== 5
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
): void => {
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
): void => {
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

const restoreV3Data = (
  data: JisBackupV3Data,
): void => {
  restoreV2Data(data);

  writeStorageValue(
    STORAGE_KEYS.dividends,
    data.dividends,
  );
};

const restoreV4Data = (
  data: JisBackupV4Data,
): void => {
  restoreV3Data(data);

  writeStorageValue(
    STORAGE_KEYS.cashMovements,
    data.cashMovements,
  );
};

const restoreV5Data = (
  data: JisBackupV5Data,
): void => {
  restoreV4Data(data);

  writeStorageValue(
    STORAGE_KEYS.marketOpportunities,
    data.marketOpportunities,
  );

  writeStorageValue(
    STORAGE_KEYS.tradingLab,
    data.tradingLab,
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
        JSON.parse(
          fileContent,
        );
    } catch {
      throw new Error(
        "Unable to read this JSON backup.",
      );
    }

    const backup =
      validateBackup(
        parsedValue,
      );

    /*
     * Never preserve temporary
     * price-refresh cooldown state
     * when importing a backup.
     */
    localStorage.removeItem(
      STORAGE_KEYS.priceCooldown,
    );

    if (
      backup.version === 1
    ) {
      clearDataAfterV1();

      restoreBaseData(
        backup.data,
      );

      return backup;
    }

    if (
      backup.version === 2
    ) {
      clearDataAfterV2();

      restoreV2Data(
        backup.data,
      );

      return backup;
    }

    if (
      backup.version === 3
    ) {
      clearDataAfterV3();

      restoreV3Data(
        backup.data,
      );

      return backup;
    }

    if (
      backup.version === 4
    ) {
      clearDataAfterV4();

      restoreV4Data(
        backup.data,
      );

      return backup;
    }

    restoreV5Data(
      backup.data,
    );

    return backup;
  };

export const resetJisData =
  (): void => {
    /*
     * Keep these two keys as empty
     * arrays. Removing portfolio
     * completely could recreate the
     * original demonstration data.
     */
    writeStorageValue(
      STORAGE_KEYS.portfolio,
      [],
    );

    writeStorageValue(
      STORAGE_KEYS.transactions,
      [],
    );

    clearKeys([
      STORAGE_KEYS.goal,
      STORAGE_KEYS.settings,
      STORAGE_KEYS.cashAccounts,
      STORAGE_KEYS.cashFxRates,
      STORAGE_KEYS.cashMovements,
      STORAGE_KEYS.portfolioHistory,
      STORAGE_KEYS.wealthHistory,
      STORAGE_KEYS.dividends,
      STORAGE_KEYS.marketOpportunities,
      STORAGE_KEYS.tradingLab,
      STORAGE_KEYS.priceCooldown,
    ]);
  };