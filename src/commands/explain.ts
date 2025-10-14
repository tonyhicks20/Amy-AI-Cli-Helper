import { getConfig } from "../config.js";
import { getEnvironmentContext } from "../environment.js";
import { generateCommand } from "../generator.js";
import { initializeLogger, LogLevel } from "../logger.js";

export async function explainCommand(userPrompt: string): Promise<void> {
  try {
    // Initialize logger with config
    const config = await getConfig();
    const logger = initializeLogger({
      level: (config.logLevel as LogLevel) || LogLevel.INFO,
      enableFile: config.enableFileLogging || false
    });

    logger.debug("Explain mode: Getting API key...");
    const apiKey = config.apiKey;

    logger.debug("Explain mode: Getting environment context...");
    const environment = await getEnvironmentContext();

    logger.debug("Explain mode: Generating command with explanation...");
    const commandResponse = await generateCommand(
      userPrompt,
      environment,
      apiKey,
      true // Request explanation
    );

    // Display the explanation
    console.log(`
🔍 Command Explanation

📝 Your Request:
  "${userPrompt}"

🌍 Environment Context:
  OS: ${environment.platform} (${environment.release})
  Architecture: ${environment.arch}
  Shell: ${environment.shell}
  Working Directory: ${environment.cwd}
  Running as root: ${environment.isRoot ? 'Yes' : 'No'}

🤖 Generated Command:
  ${commandResponse.command}

📊 Executable: ${commandResponse.executable ? 'Yes' : 'No'}

💡 AI-Generated Explanation:
  ${commandResponse.explanation || 'No explanation available'}

🔧 To execute this command:
  bob "${userPrompt}"

  Or skip confirmation:
  bob --force "${userPrompt}"
`);
  } catch (error) {
    const logger = initializeLogger();
    logger.error("Explain command error", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to explain command: ${errorMessage}`);
    process.exit(1);
  }
}
