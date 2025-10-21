import { EnvironmentContext } from "./environment.js";
import { loadHistory, CommandFailure } from "./history.js";

interface CommandHistory {
  failures: CommandFailure[];
}

/**
 * Format failure history for inclusion in the system prompt
 */
function _formatFailuresForPrompt(history: CommandHistory): string {
  if (history.failures.length === 0) {
    return "";
  }

  let prompt = "\n\nLEARNING FROM PAST FAILURES:\n";
  prompt += "The following commands have failed in the past on this system. Avoid repeating these mistakes:\n\n";

  history.failures.forEach((failure, index) => {
    prompt += `${index + 1}. Intent: "${failure.userIntent}"\n`;
    prompt += `   Failed Command: ${failure.failedCommand}\n`;
    prompt += `   Error: ${failure.error}\n`;
    prompt += "\n";
  });

  return prompt;
}

/**
 * Format environment information for the prompt
 */
function _formatEnvironmentForPrompt(environment: EnvironmentContext): string {
  const { platform, release, arch, shell, cwd, isRoot } = environment;
  return `ENVIRONMENT:
- Operating System: ${platform} (${release})
- Architecture: ${arch}
- Shell: ${shell}
- Working Directory: ${cwd}
- Running as root: ${isRoot}`;
}

/**
 * Build the base system prompt with environment and history
 */
function _buildBasePrompt(
  environment: EnvironmentContext,
  history: CommandHistory,
  includeExplanation: boolean
): string {
  const failuresPrompt = _formatFailuresForPrompt(history);
  const environmentPrompt = _formatEnvironmentForPrompt(environment);

  return `You are a shell command generator for a CLI tool called "amy". The user explicitly requests commands and you generate them for execution in a controlled environment with the user's full consent and supervision.

${environmentPrompt}

CONTEXT: You are operating in a controlled environment where:
- The user has explicitly requested the command
- The user will review and confirm before execution
- The user is in full control and supervision
- This is a CLI tool designed to execute commands

CRITICAL RULES:
1. ALWAYS output your response as valid JSON: { "command": "actual_command", "executable": true/false${
    includeExplanation ? ', "explanation": "detailed_explanation"' : ""
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

IMPORTANT: If a previous command failed, analyze the error message and generate a corrected command. Learn from the failure and try a different approach.${failuresPrompt}`;
}

/**
 * Build the explanation mode addendum
 */
function _buildExplanationModePrompt(): string {
  return `

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
{ "command": "find . -name '*.txt'", "executable": true, "explanation": "The 'find' command searches for files.\\nThe '.' specifies the current directory.\\nThe '-name' flag matches filenames.\\nThe '*.txt' pattern matches all .txt files." }`;
}

/**
 * Build the standard examples addendum
 */
function _buildStandardExamplesPrompt(): string {
  return `

Examples:
Input: "list all files in the current directory"
Output: { "command": "ls -l", "executable": true }

Input: "kill process on port 5000"
Output: { "command": "lsof -ti:5000 | xargs kill -9", "executable": true }

Input: "show disk usage"
Output: { "command": "df -h", "executable": true }

Input: "hello" or "how are you?"
Output: { "command": "echo 'Hello! How can I assist you today?'", "executable": false }`;
}

/**
 * Build the complete system prompt for command generation
 */
export async function buildSystemPrompt(
  environment: EnvironmentContext,
  includeExplanation: boolean
): Promise<string> {
  const history = await loadHistory();
  const basePrompt = _buildBasePrompt(environment, history, includeExplanation);

  if (includeExplanation) {
    return basePrompt + _buildExplanationModePrompt();
  }

  return basePrompt + _buildStandardExamplesPrompt();
}
