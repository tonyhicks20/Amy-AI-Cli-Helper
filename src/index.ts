import { getConfig } from "./config.js";
import { getEnvironmentContext } from "./environment.js";
import { CommandSession } from "./session.js";
import { initializeLogger, LogLevel } from "./logger.js";
import { checkForUpdates } from "./updateChecker.js";

export interface RunOptions {
  force?: boolean;
  explain?: boolean;
}

export async function run(
  userPrompt: string,
  options: RunOptions = {}
): Promise<void> {
  try {
    // Check for updates (non-blocking, won't interrupt the workflow)
    checkForUpdates().catch(() => {
      // Silently ignore any errors from update check
    });

    // Initialize logger with config
    const config = await getConfig();

    // When file logging is enabled: debug level, file only
    // When file logging is disabled: error level, console only
    const logger = initializeLogger({
      level: config.enableFileLogging ? LogLevel.DEBUG : LogLevel.ERROR,
      enableConsole: !config.enableFileLogging, // Console only when file logging is off
      enableFile: config.enableFileLogging || false,
    });

    logger.debug("Getting API key...");
    const apiKey = config.apiKey;
    logger.debug("API key retrieved successfully");

    logger.debug("Getting environment context...");
    const environment = await getEnvironmentContext();
    logger.debug("Environment context retrieved", environment);

    // Create and run command session
    const session = new CommandSession({
      apiKey,
      environment,
      logger,
      options,
    });

    await session.run(userPrompt);
  } catch (error) {
    const logger = initializeLogger();
    logger.error("Error details", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.failure(`Fatal error: ${errorMessage}`);
    process.exit(1);
  }
}
