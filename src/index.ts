import { getConfig } from "./config.js";
import { getEnvironmentContext } from "./environment.js";
import { CommandSession } from "./session.js";
import { initializeLogger, LogLevel } from "./logger.js";

export interface RunOptions {
  force?: boolean;
  explain?: boolean;
}

export async function run(
  userPrompt: string,
  options: RunOptions = {}
): Promise<void> {
  try {
    // Initialize logger with config
    const config = await getConfig();
    const logger = initializeLogger({
      level: (config.logLevel as LogLevel) || LogLevel.INFO,
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
