import { getApiKey } from "./config.js";
import { getEnvironmentContext } from "./environment.js";
import { generateCommand } from "./generator.js";
import { executeWithConfirmation } from "./executor.js";

export interface RunOptions {
  force?: boolean;
}

export async function run(userPrompt: string, options: RunOptions = {}): Promise<void> {
  try {
    console.log("Getting API key...");
    const apiKey = await getApiKey();
    console.log("API key retrieved successfully");

    console.log("Getting environment context...");
    const environment = await getEnvironmentContext();
    console.log("Environment context retrieved:", environment);

    console.log("Generating command...");
    const command = await generateCommand(
      userPrompt,
      environment,
      apiKey
    );
    console.log("Command generated:", command);

    await executeWithConfirmation(command, options.force);
  } catch (error) {
    console.error("Error details:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Fatal error: ${errorMessage}`);
    process.exit(1);
  }
}
