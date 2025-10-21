import fs from "fs/promises";
import path from "path";
import os from "os";
import { log } from "./logger.js";

const CONFIG_DIR = path.join(os.homedir(), ".amy-command-tool");
const HISTORY_PATH = path.join(CONFIG_DIR, "command-history.json");

// Maximum number of failure records to keep
const MAX_HISTORY_SIZE = 200;

export interface CommandFailure {
  userIntent: string;
  failedCommand: string;
  error: string;
}

interface CommandHistory {
  failures: CommandFailure[];
}

/**
 * Load the persistent command failure history from disk
 */
export async function loadHistory(): Promise<CommandHistory> {
  try {
    // Check if file exists without using exceptions
    const fileHandle = await fs.open(HISTORY_PATH, "r").catch(() => null);
    if (!fileHandle) {
      // File doesn't exist yet, return empty history
      return { failures: [] };
    }
    await fileHandle.close();

    // File exists, read and parse it
    const data = await fs.readFile(HISTORY_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // True error (e.g., invalid JSON) - log it
    log.error("Error loading command history", error);
    // Return empty history as fallback
    return { failures: [] };
  }
}

/**
 * Save the command failure history to disk
 */
async function _saveHistory(history: CommandHistory): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });

  // Trim history to max size if needed
  if (history.failures.length > MAX_HISTORY_SIZE) {
    history.failures = history.failures.slice(-MAX_HISTORY_SIZE);
  }

  await fs.writeFile(HISTORY_PATH, JSON.stringify(history, null, 2));
}

/**
 * Record a command failure for future learning
 */
export async function recordFailure(
  userIntent: string,
  failedCommand: string,
  error: string
): Promise<void> {
  const history = await loadHistory();

  const failure: CommandFailure = {
    userIntent,
    failedCommand,
    error,
  };

  history.failures.push(failure);
  await _saveHistory(history);
}

