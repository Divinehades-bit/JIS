export type JisBackupVersion = 1 | 2;

export type JisBackupDataV1 = {
  portfolio: unknown;
  transactions: unknown;
  goal: unknown;
  settings: unknown;
};

export type JisBackupDataV2 =
  JisBackupDataV1 & {
    cashAccounts: unknown;
    cashFxRates: unknown;
    portfolioHistory: unknown;
    wealthHistory: unknown;
  };

export type JisBackupV1 = {
  app: "JIS";
  version: 1;
  exportedAt: string;
  data: JisBackupDataV1;
};

export type JisBackupV2 = {
  app: "JIS";
  version: 2;
  exportedAt: string;
  data: JisBackupDataV2;
};

export type JisBackup =
  | JisBackupV1
  | JisBackupV2;

const STORAGE_KEYS = {
  portfolio: "portfolio",

  transactions:
    "portfolio-transactions",

  goal: "jis-financial-goal",

  settings: "jis-settings",

  cashAccounts:
    "jis-cash-accounts",

  cashFxRates:
    "jis-cash-fx-rates",

  portfolioHistory:
    "jis-portfolio-history",

  wealthHistory:
    "jis-wealth-history",

  priceCooldown:
    "jis-market-price-cooldown-until",
} as const;

const safeJsonParse = (
  value: string | null,
): unknown => {
  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const readStorageValue = (
  key: string,
): unknown => {
  return safeJsonParse(
    localStorage.getItem(key),
  );
};

const writeStorageValue = (
  key: string,
  value: unknown,
) => {
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
};

const sanitizeFileName = (
  value: string,
) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(/^-+|-+$/g, "");

  return normalized || "portfolio";
};

const createBackup =
  (): JisBackupV2 => {
    return {
      app: "JIS",

      version: 2,

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
      },
    };
  };

export const exportJisBackup = (
  portfolioName: string,
) => {
  const backup = createBackup();

  const serializedBackup =
    JSON.stringify(
      backup,
      null,
      2,
    );

  const blob = new Blob(
    [serializedBackup],
    {
      type: "application/json",
    },
  );

  const objectUrl =
    URL.createObjectURL(blob);

  const downloadLink =
    document.createElement("a");

  const date =
    new Date()
      .toISOString()
      .slice(0, 10);

  const safePortfolioName =
    sanitizeFileName(
      portfolioName,
    );

  downloadLink.href = objectUrl;

  downloadLink.download =
    `jis-backup-${safePortfolioName}-${date}.json`;

  document.body.appendChild(
    downloadLink,
  );

  downloadLink.click();

  document.body.removeChild(
    downloadLink,
  );

  URL.revokeObjectURL(
    objectUrl,
  );
};

const isRecord = (
  value: unknown,
): value is Record<
  string,
  unknown
> => {
  return (
    typeof value === "object" &&
    value !== null
  );
};

const validateBackup = (
  value: unknown,
): JisBackup => {
  if (!isRecord(value)) {
    throw new Error(
      "The selected file is not a valid JIS backup.",
    );
  }

  if (value.app !== "JIS") {
    throw new Error(
      "This file was not created by JIS.",
    );
  }

  if (
    value.version !== 1 &&
    value.version !== 2
  ) {
    throw new Error(
      "This JIS backup version is not supported.",
    );
  }

  if (!isRecord(value.data)) {
    throw new Error(
      "The backup does not contain valid JIS data.",
    );
  }

  if (value.version === 1) {
    return value as unknown as JisBackupV1;
  }

  return value as unknown as JisBackupV2;
};

const clearNewDataKeys = () => {
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
};

const restoreVersionOneBackup = (
  backup: JisBackupV1,
) => {
  /*
   * A V1 backup existed before cash and
   * wealth-history tracking.
   *
   * Remove newer data first so old and new
   * JIS information are never accidentally
   * mixed together.
   */
  clearNewDataKeys();

  writeStorageValue(
    STORAGE_KEYS.portfolio,
    backup.data.portfolio,
  );

  writeStorageValue(
    STORAGE_KEYS.transactions,
    backup.data.transactions,
  );

  writeStorageValue(
    STORAGE_KEYS.goal,
    backup.data.goal,
  );

  writeStorageValue(
    STORAGE_KEYS.settings,
    backup.data.settings,
  );
};

const restoreVersionTwoBackup = (
  backup: JisBackupV2,
) => {
  writeStorageValue(
    STORAGE_KEYS.portfolio,
    backup.data.portfolio,
  );

  writeStorageValue(
    STORAGE_KEYS.transactions,
    backup.data.transactions,
  );

  writeStorageValue(
    STORAGE_KEYS.goal,
    backup.data.goal,
  );

  writeStorageValue(
    STORAGE_KEYS.settings,
    backup.data.settings,
  );

  writeStorageValue(
    STORAGE_KEYS.cashAccounts,
    backup.data.cashAccounts,
  );

  writeStorageValue(
    STORAGE_KEYS.cashFxRates,
    backup.data.cashFxRates,
  );

  writeStorageValue(
    STORAGE_KEYS.portfolioHistory,
    backup.data.portfolioHistory,
  );

  writeStorageValue(
    STORAGE_KEYS.wealthHistory,
    backup.data.wealthHistory,
  );
};

export const importJisBackup = async (
  file: File,
) => {
  if (
    !file.name
      .toLowerCase()
      .endsWith(".json")
  ) {
    throw new Error(
      "Select a JSON backup file.",
    );
  }

  let fileContent: string;

  try {
    fileContent =
      await file.text();
  } catch {
    throw new Error(
      "JIS could not read the selected file.",
    );
  }

  let parsedBackup: unknown;

  try {
    parsedBackup =
      JSON.parse(fileContent);
  } catch {
    throw new Error(
      "The selected file does not contain valid JSON.",
    );
  }

  const backup =
    validateBackup(parsedBackup);

  if (backup.version === 1) {
    restoreVersionOneBackup(
      backup,
    );
  } else {
    restoreVersionTwoBackup(
      backup,
    );
  }

  /*
   * Cooldown is temporary runtime state.
   * It should never survive an import.
   */
  localStorage.removeItem(
    STORAGE_KEYS.priceCooldown,
  );

  return {
    version: backup.version,
    exportedAt:
      backup.exportedAt,
  };
};

export const resetJisData = () => {
  /*
   * Keep empty portfolio arrays in storage.
   * Removing these keys entirely would cause
   * portfolioStore to recreate the original
   * demo VOO / IXN / VEU positions.
   */
  localStorage.setItem(
    STORAGE_KEYS.portfolio,
    JSON.stringify([]),
  );

  localStorage.setItem(
    STORAGE_KEYS.transactions,
    JSON.stringify([]),
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
    STORAGE_KEYS.priceCooldown,
  );
};