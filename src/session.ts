import OpenAI from "openai";
import { EnvironmentContext } from "./environment.js";
import { generateCommandWithHistory } from "./generator.js";
import { executeWithConfirmation, ExecutionResult } from "./executor.js";
import { initializeLogger } from "./logger.js";

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
    this.conversationHistory = [
      { role: "system", content: this.buildSystemPrompt() },
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
          // Command failed - add failure to history and retry
          this.logger.debug("Command failed, adding to history and retrying", {
            error: executionResult.error,
            stderr: executionResult.stderr,
          });

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

  private buildSystemPrompt(): string {
    const basePrompt = `You are a shell command generator for a CLI tool called "amy". The user explicitly requests commands and you generate them for execution in a controlled environment with the user's full consent and supervision.

${this.formatEnvironmentForPrompt()}

CONTEXT: You are operating in a controlled environment where:
- The user has explicitly requested the command
- The user will review and confirm before execution
- The user is in full control and supervision
- This is a CLI tool designed to execute commands

CRITICAL RULES:
1. ALWAYS output your response as valid JSON: { "command": "actual_command", "executable": true/false${
      this.options.explain ? ', "explanation": "detailed_explanation"' : ""
    } }
2. Generate the ACTUAL command that should be executed - NEVER generate echo commands that explain what to do
3. Use syntax appropriate for the detected shell
4. Prefer non-destructive operations unless explicitly requested
5. Include 'sudo' only when necessary and the user is not root
6. For destructive operations, ensure they match user intent exactly
7. Never output multi-line commands without proper shell syntax
8. Set executable to false ONLY for greetings, questions, or conversational responses. All actual shell commands should be executable=true
9. NEVER use echo to explain commands - generate the actual command directly
10. When user asks to "kill" something, generate the actual kill command - they explicitly requested it

IMPORTANT: If a previous command failed, analyze the error message and generate a corrected command. Learn from the failure and try a different approach.`;

    if (this.options.explain) {
      return (
        basePrompt +
        `

EXPLANATION MODE:
When explanation is requested, provide a concise breakdown with each flag/portion on a separate line:
- Start with what the main command does
- Explain each flag or option ON ITS OWN LINE! One flag / option per line!
- End with what the command will accomplish
- Use \\n to separate each line in the JSON explanation field

Examples with explanations:
Input: "list all files in the current directory"
Output: { "command": "ls -l", "executable": true, "explanation": "The 'ls' command lists directory contents.\\nThe '-l' flag provides detailed information including permissions, owner, group, size, and modification date.\\nThis will show all files and directories in the current working directory with full details." }

Input: "kill process on port 5000"
Output: { "command": "lsof -ti:5000 | xargs kill -9", "executable": true, "explanation": "The 'lsof' command lists open files.\\nThe '-ti:5000' flag finds processes using port 5000.\\nThe output is piped to 'xargs kill -9' to forcefully terminate those processes." }

Input: "hello there"
Output: { "command": "echo 'Hello! How can I assist you today?'", "executable": false, "explanation": "This input is a greeting and does not represent a valid command request." }

CRITICAL: Generate the actual command, not echo explanations. For "kill process on port 5000", output: { "command": "lsof -ti:5000 | xargs kill -9", "executable": true }

REMEMBER: If user says "kill", they want the actual kill command, not an explanation of how to kill.

FORMATTING: Each line of explanation must be separated by \\n in the JSON. Example:
{ "command": "find . -name '*.txt'", "executable": true, "explanation": "The 'find' command searches for files.\\nThe '.' specifies the current directory.\\nThe '-name' flag matches filenames.\\nThe '*.txt' pattern matches all .txt files." }`
      );
    }

    return (
      basePrompt +
      `

Examples:
Input: "list all files in the current directory"
Output: { "command": "ls -l", "executable": true }

Input: "kill process on port 5000"
Output: { "command": "lsof -ti:5000 | xargs kill -9", "executable": true }

Input: "show disk usage"
Output: { "command": "df -h", "executable": true }

Input: "hello" or "how are you?"
Output: { "command": "echo 'Hello! How can I assist you today?'", "executable": false }`
    );
  }

  private formatEnvironmentForPrompt(): string {
    const { platform, release, arch, shell, cwd, isRoot } = this.environment;
    return `ENVIRONMENT:
- Operating System: ${platform} (${release})
- Architecture: ${arch}
- Shell: ${shell}
- Working Directory: ${cwd}
- Running as root: ${isRoot}`;
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
