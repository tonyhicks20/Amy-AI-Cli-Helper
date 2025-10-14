import { getConfig } from "./config.js";
import { getEnvironmentContext } from "./environment.js";
import { generateCommand } from "./generator.js";
import { executeWithConfirmation } from "./executor.js";
import { initializeLogger, LogLevel } from "./logger.js";

export interface RunOptions {
  force?: boolean;
}

export async function run(userPrompt: string, options: RunOptions = {}): Promise<void> {
  try {
    // Initialize logger with config
    const config = await getConfig();
    const logger = initializeLogger({
      level: (config.logLevel as LogLevel) || LogLevel.INFO,
      enableFile: config.enableFileLogging || false
    });

    logger.debug("Getting API key...");
    const apiKey = config.apiKey;
    logger.debug("API key retrieved successfully");

    logger.debug("Getting environment context...");
    const environment = await getEnvironmentContext();
    logger.debug("Environment context retrieved", environment);

    logger.debug("Generating command...");
    const command = await generateCommand(
      userPrompt,
      environment,
      apiKey
    );
    logger.debug("Command generated", { command });

    await executeWithConfirmation(command, options.force);
  } catch (error) {
    const logger = initializeLogger();
    logger.error("Error details", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.failure(`Fatal error: ${errorMessage}`);
    process.exit(1);
  }
}
