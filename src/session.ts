import OpenAI from "openai";
import { EnvironmentContext } from "./environment.js";
import { generateCommandWithHistory } from "./generator.js";
import { executeWithConfirmation, ExecutionResult } from "./executor.js";
import { initializeLogger } from "./logger.js";
import { recordFailure } from "./history.js";
import { buildSystemPrompt } from "./prompt.js";

export interface RunOptions {
  force?: boolean;
  explain?: boolean;
}

export interface CommandSessionOptions {
  apiKey: string;
  environment: EnvironmentContext;
  logger: ReturnType<typeof initializeLogger>;
  options: RunOptions;
}

export class CommandSession {
  private apiKey: string;
  private environment: EnvironmentContext;
  private logger: ReturnType<typeof initializeLogger>;
  private options: RunOptions;
  private conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    [];

  constructor(options: CommandSessionOptions) {
    this.apiKey = options.apiKey;
    this.environment = options.environment;
    this.logger = options.logger;
    this.options = options.options;
  }

  async run(userPrompt: string): Promise<void> {
    this.logger.debug("Starting command session", { userPrompt });

    // Initialize conversation with system prompt and user request
    const systemPrompt = await buildSystemPrompt(
      this.environment,
      this.options.explain || false
    );
    this.conversationHistory = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    // Main retry loop
    while (true) {
      try {
        // Generate command using conversation history
        this.logger.debug("Generating command with history", {
          historyLength: this.conversationHistory.length,
        });

        const commandResponse = await generateCommandWithHistory(
          this.conversationHistory,
          this.apiKey,
          this.options.explain
        );

        this.logger.debug("Command generated", {
          command: commandResponse.command,
          executable: commandResponse.executable,
        });


        // Add assistant's response to history
        this.conversationHistory.push({
          role: "assistant",
          content: JSON.stringify({
            command: commandResponse.command,
            executable: commandResponse.executable,
            ...(commandResponse.explanation && {
              explanation: commandResponse.explanation,
            }),
          }),
        });

        // Check if command is executable
        if (!commandResponse.executable) {
          console.log(commandResponse.command);
          return;
        }

        // Display command and explanation
        console.log(`====================================================`);
        console.log(`Command:   ${commandResponse.command}`);
        console.log(`====================================================`);

        if (this.options.explain && commandResponse.explanation) {
          console.log(`Explanation:
${commandResponse.explanation}`);
        }

        // Execute command with confirmation
        const executionResult = await executeWithConfirmation(
          commandResponse,
          this.options.force
        );

        if (!executionResult) {
          // User cancelled execution
          this.logger.debug("Execution cancelled by user");
          return;
        }

        if (executionResult.success) {
          // Command succeeded - we're done!
          this.logger.debug("Command executed successfully");
          return;
        } else {
          // Command failed - persist failure to disk for future sessions
          this.logger.debug("Command failed, adding to history and retrying", {
            error: executionResult.error,
            stderr: executionResult.stderr,
          });

          const errorMessage =
            executionResult.error || executionResult.stderr || "Unknown error";
          await recordFailure(
            userPrompt,
            commandResponse.command,
            errorMessage
          );
          this.logger.debug("Recorded failure to persistent history", {
            command: commandResponse.command,
            error: errorMessage,
          });

          // Add failure to conversation history and retry
          const failureMessage = this.buildFailureMessage(executionResult);
          this.conversationHistory.push({
            role: "user",
            content: failureMessage,
          });

          // Continue loop to retry
        }
      } catch (error) {
        this.logger.error("Error in command session", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(`Session error: ${errorMessage}`);
      }
    }
  }

  private buildFailureMessage(executionResult: ExecutionResult): string {
    let message = "The previous command failed. ";

    if (executionResult.error) {
      message += `Error: ${executionResult.error}`;
    }

    if (executionResult.stderr) {
      message += `\nstderr: ${executionResult.stderr}`;
    }

    if (executionResult.stdout) {
      message += `\nstdout: ${executionResult.stdout}`;
    }

    message +=
      "\n\nPlease generate a corrected command that addresses the issue.";

    return message;
  }
}
