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
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
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
  const basePrompt = `You are a shell command generator. Convert natural language requests into safe, executable shell commands.

${formatEnvironmentForPrompt(env)}

Rules:
1. ALWAYS output your response as valid JSON: { "command": "actual_command", "executable": true/false${includeExplanation ? ', "explanation": "detailed_explanation"' : ''} }
2. Use syntax appropriate for the detected shell
3. Prefer non-destructive operations unless explicitly requested
4. Include 'sudo' only when necessary and the user is not root
5. For destructive operations, ensure they match user intent exactly
6. Never output multi-line commands without proper shell syntax
7. If the input is not a valid command request (like greetings, questions, etc.), set executable to false`;

  if (includeExplanation) {
    return basePrompt + `

EXPLANATION MODE:
When explanation is requested, provide a detailed breakdown of the command including:
- What each flag and option does
- What each variable or parameter represents
- The expected output or behavior
- Any potential side effects or considerations
- Safety implications
- Alternative approaches if applicable

Examples with explanations:
Input: "list all files in the current directory"
Output: { "command": "ls -l", "executable": true, "explanation": "The 'ls' command lists directory contents. The '-l' flag provides detailed information including permissions, owner, group, size, and modification date. This will show all files and directories in the current working directory with full details." }

Input: "kill process on port 5000"
Output: { "command": "lsof -ti:5000 | xargs kill -9", "executable": true, "explanation": "This command chain works in two parts: 1) 'lsof -ti:5000' finds all processes listening on port 5000 and outputs only their process IDs (-t flag). 2) The output is piped to 'xargs kill -9' which forcefully terminates those processes. The '-9' flag sends a SIGKILL signal that cannot be ignored, ensuring immediate termination." }`;
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
