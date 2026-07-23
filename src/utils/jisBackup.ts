import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  normalizeAppSettings,
  type AppSettings,
} from "../store/settingsStore";

const PORTFOLIO_STORAGE_KEY = "portfolio";

const TRANSACTIONS_STORAGE_KEY =
  "portfolio-transactions";

const GOAL_STORAGE_KEY = "jis-financial-goal";

const BACKUP_VERSION = 1;

type JisBackupData = {
  portfolio: unknown[];
  transactions: unknown[];
  goal: unknown | null;
  settings: AppSettings;
};

type JisBackup = {
  app: "JIS";
  version: number;
  exportedAt: string;
  data: JisBackupData;
};

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const parseStorageValue = (
  key: string,
  fallback: unknown,
): unknown => {
  try {
    const value = localStorage.getItem(key);

    if (value === null) {
      return fallback;
    }

    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const sanitizeFileName = (value: string) => {
  const normalizedValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedValue || "portfolio";
};

const getDateFileName = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(now.getDate()).padStart(
    2,
    "0",
  );

  return `${year}-${month}-${day}`;
};

const createBackup = (): JisBackup => {
  const storedPortfolio = parseStorageValue(
    PORTFOLIO_STORAGE_KEY,
    [],
  );

  const storedTransactions = parseStorageValue(
    TRANSACTIONS_STORAGE_KEY,
    [],
  );

  const storedGoal = parseStorageValue(
    GOAL_STORAGE_KEY,
    null,
  );

  const storedSettings = parseStorageValue(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
  );

  const settings =
    normalizeAppSettings(storedSettings) ??
    DEFAULT_SETTINGS;

  return {
    app: "JIS",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      portfolio: Array.isArray(storedPortfolio)
        ? storedPortfolio
        : [],
      transactions: Array.isArray(
        storedTransactions,
      )
        ? storedTransactions
        : [],
      goal:
        storedGoal === null ||
        isRecord(storedGoal)
          ? storedGoal
          : null,
      settings,
    },
  };
};

export const exportJisBackup = (
  portfolioName: string,
) => {
  const backup = createBackup();

  const backupBlob = new Blob(
    [JSON.stringify(backup, null, 2)],
    {
      type: "application/json",
    },
  );

  const downloadUrl =
    URL.createObjectURL(backupBlob);

  const downloadLink =
    document.createElement("a");

  downloadLink.href = downloadUrl;

  downloadLink.download = `jis-${sanitizeFileName(
    portfolioName,
  )}-${getDateFileName()}.json`;

  document.body.appendChild(downloadLink);

  downloadLink.click();
  downloadLink.remove();

  URL.revokeObjectURL(downloadUrl);
};

const validateBackup = (
  value: unknown,
): JisBackup => {
  if (!isRecord(value)) {
    throw new Error(
      "The selected file is not a valid JIS backup.",
    );
  }

  if (
    value.app !== "JIS" ||
    value.version !== BACKUP_VERSION ||
    !isRecord(value.data)
  ) {
    throw new Error(
      "This backup version is not supported.",
    );
  }

  const backupData = value.data;

  if (
    !Array.isArray(backupData.portfolio) ||
    !Array.isArray(backupData.transactions)
  ) {
    throw new Error(
      "The backup does not contain valid portfolio data.",
    );
  }

  if (
    backupData.goal !== null &&
    !isRecord(backupData.goal)
  ) {
    throw new Error(
      "The backup contains an invalid financial goal.",
    );
  }

  const normalizedSettings =
    normalizeAppSettings(backupData.settings);

  if (!normalizedSettings) {
    throw new Error(
      "The backup contains invalid settings.",
    );
  }

  return {
    app: "JIS",
    version: BACKUP_VERSION,
    exportedAt:
      typeof value.exportedAt === "string"
        ? value.exportedAt
        : new Date().toISOString(),
    data: {
      portfolio: backupData.portfolio,
      transactions: backupData.transactions,
      goal: backupData.goal,
      settings: normalizedSettings,
    },
  };
};

export const importJisBackup = async (
  file: File,
) => {
  const maximumFileSize = 5 * 1024 * 1024;

  if (file.size > maximumFileSize) {
    throw new Error(
      "The backup file cannot exceed 5 MB.",
    );
  }

  const fileContent = await file.text();

  let parsedContent: unknown;

  try {
    parsedContent = JSON.parse(fileContent);
  } catch {
    throw new Error(
      "The selected file does not contain valid JSON.",
    );
  }

  const backup = validateBackup(parsedContent);

  localStorage.setItem(
    PORTFOLIO_STORAGE_KEY,
    JSON.stringify(backup.data.portfolio),
  );

  localStorage.setItem(
    TRANSACTIONS_STORAGE_KEY,
    JSON.stringify(backup.data.transactions),
  );

  if (backup.data.goal === null) {
    localStorage.removeItem(GOAL_STORAGE_KEY);
  } else {
    localStorage.setItem(
      GOAL_STORAGE_KEY,
      JSON.stringify(backup.data.goal),
    );
  }

  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(backup.data.settings),
  );
};

export const resetJisData = () => {
  localStorage.setItem(
    PORTFOLIO_STORAGE_KEY,
    JSON.stringify([]),
  );

  localStorage.setItem(
    TRANSACTIONS_STORAGE_KEY,
    JSON.stringify([]),
  );

  localStorage.removeItem(GOAL_STORAGE_KEY);
  localStorage.removeItem(SETTINGS_STORAGE_KEY);
};