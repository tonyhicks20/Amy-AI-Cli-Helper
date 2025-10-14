import OpenAI from "openai";
import { formatEnvironmentForPrompt, EnvironmentContext } from "./environment.js";

export interface CommandResponse {
  command: string;
  executable: boolean;
  explanation?: string;
}

export async function generateCommand(
  userPrompt: string,
  environment: EnvironmentContext,
  apiKey: string,
  includeExplanation: boolean = false
): Promise<CommandResponse> {
  try {
    const client = new OpenAI({ apiKey });

    const systemPrompt = buildSystemPrompt(environment, includeExplanation);

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("No choices returned from OpenAI API");
    }

    const choice = response.choices[0];
    if (!choice || !choice.message || !choice.message.content) {
      throw new Error("No message content in OpenAI response");
    }

    return parseCommandResponse(choice.message.content, includeExplanation);
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error(`Failed to generate command: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function buildSystemPrompt(env: EnvironmentContext, includeExplanation: boolean = false): string {
  const basePrompt = `You are a shell command generator for a CLI tool called "bob". The user explicitly requests commands and you generate them for execution in a controlled environment with the user's full consent and supervision.

${formatEnvironmentForPrompt(env)}

CONTEXT: You are operating in a controlled environment where:
- The user has explicitly requested the command
- The user will review and confirm before execution
- The user is in full control and supervision
- This is a CLI tool designed to execute commands

CRITICAL RULES:
1. ALWAYS output your response as valid JSON: { "command": "actual_command", "executable": true/false${includeExplanation ? ', "explanation": "detailed_explanation"' : ''} }
2. Generate the ACTUAL command that should be executed - NEVER generate echo commands that explain what to do
3. Use syntax appropriate for the detected shell
4. Prefer non-destructive operations unless explicitly requested
5. Include 'sudo' only when necessary and the user is not root
6. For destructive operations, ensure they match user intent exactly
7. Never output multi-line commands without proper shell syntax
8. Set executable to false ONLY for greetings, questions, or conversational responses. All actual shell commands should be executable=true
9. NEVER use echo to explain commands - generate the actual command directly
10. When user asks to "kill" something, generate the actual kill command - they explicitly requested it

EXAMPLES OF WHAT TO DO:
- "list files" → { "command": "ls", "executable": true }
- "kill process on port 5000" → { "command": "lsof -ti:5000 | xargs kill -9", "executable": true }
- "show disk usage" → { "command": "df -h", "executable": true }

EXAMPLES OF WHAT NOT TO DO:
- "list files" → { "command": "echo 'Use ls command'", "executable": false } ❌
- "kill process on port 5000" → { "command": "echo 'Use lsof and kill'", "executable": false } ❌`;

  if (includeExplanation) {
    return basePrompt + `

EXPLANATION MODE:
When explanation is requested, provide a concise breakdown with each flag/portion on a separate line:
- Start with what the main command does
- Explain each flag or option ON ITS OWN LINE! One flag / option per line!
- End with what the command will accomplish
- Use \\n to separate each line in the JSON explanation field

Examples with explanations:
Input: "list all files in the current directory"
Output: { "command": "ls -l", "executable": true, "explanation": "The 'ls' command lists directory contents.\nThe '-l' flag provides detailed information including permissions, owner, group, size, and modification date.\nThis will show all files and directories in the current working directory with full details." }

Input: "kill process on port 5000"
Output: { "command": "lsof -ti:5000 | xargs kill -9", "executable": true, "explanation": "The 'lsof' command lists open files.\nThe '-ti:5000' flag finds processes using port 5000.\nThe output is piped to 'xargs kill -9' to forcefully terminate those processes." }

Input: "hello there"
Output: { "command": "echo 'Hello! How can I assist you today?'", "executable": false, "explanation": "This input is a greeting and does not represent a valid command request." }

CRITICAL: Generate the actual command, not echo explanations. For "kill process on port 5000", output: { "command": "lsof -ti:5000 | xargs kill -9", "executable": true }

REMEMBER: If user says "kill", they want the actual kill command, not an explanation of how to kill.

FORMATTING: Each line of explanation must be separated by \\n in the JSON. Example:
{ "command": "find . -name '*.txt'", "executable": true, "explanation": "The 'find' command searches for files.\\nThe '.' specifies the current directory.\\nThe '-name' flag matches filenames.\\nThe '*.txt' pattern matches all .txt files." }`;
  }

  return basePrompt + `

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

function parseCommandResponse(content: string, includeExplanation: boolean = false): CommandResponse {
  try {
    // Remove markdown code fences if present
    let jsonStr = content.trim();
    jsonStr = jsonStr.replace(/^```(?:json|bash|sh|shell)?\n?/i, "");
    jsonStr = jsonStr.replace(/\n?```$/, "");

    // Try to parse as JSON
    const parsed = JSON.parse(jsonStr);

    if (typeof parsed.command !== 'string' || typeof parsed.executable !== 'boolean') {
      throw new Error("Invalid JSON structure");
    }

    const result: CommandResponse = {
      command: parsed.command.trim(),
      executable: parsed.executable
    };

    // Include explanation if present and requested
    if (includeExplanation && parsed.explanation && typeof parsed.explanation === 'string') {
      result.explanation = parsed.explanation.trim();
    }

    return result;
  } catch (error) {
    // Fallback: treat as old format and assume executable
    console.warn("Failed to parse JSON response, falling back to text parsing:", error);
    const command = content.trim()
      .replace(/^```(?:bash|sh|shell)?\n?/i, "")
      .replace(/\n?```$/, "")
      .trim();

    return {
      command,
      executable: true // Assume executable for backward compatibility
    };
  }
}
