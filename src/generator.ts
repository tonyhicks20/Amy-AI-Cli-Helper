import OpenAI from "openai";
import { EnvironmentContext } from "./environment.js";

export interface CommandResponse {
  command: string;
  executable: boolean;
  explanation?: string;
}

export async function generateCommandWithHistory(
  conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  apiKey: string,
  includeExplanation: boolean = false
): Promise<CommandResponse> {
  try {
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: conversationHistory,
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
    throw new Error(
      `Failed to generate command: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function parseCommandResponse(
  content: string,
  includeExplanation: boolean = false
): CommandResponse {
  try {
    // Remove markdown code fences if present
    let jsonStr = content.trim();
    jsonStr = jsonStr.replace(/^```(?:json|bash|sh|shell)?\n?/i, "");
    jsonStr = jsonStr.replace(/\n?```$/, "");

    // Try to parse as JSON
    const parsed = JSON.parse(jsonStr);

    if (
      typeof parsed.command !== "string" ||
      typeof parsed.executable !== "boolean"
    ) {
      throw new Error("Invalid JSON structure");
    }

    let result: CommandResponse = {
      command: parsed.command.trim(),
      executable: parsed.executable,
    };

    // Include explanation if present and requested
    if (
      includeExplanation &&
      parsed.explanation &&
      typeof parsed.explanation === "string"
    ) {
      result.explanation = parsed.explanation.trim();
    }

    // Sanitize potential echo commands
    result = sanitizeEchoCommand(result);
    return result;
  } catch (error) {
    // Fallback: treat as old format and assume executable
    console.warn(
      "Failed to parse JSON response, falling back to text parsing:",
      error
    );
    let command = content
      .trim()
      .replace(/^```(?:bash|sh|shell)?\n?/i, "")
      .replace(/\n?```$/, "")
      .trim();

    let result: CommandResponse = {
      command,
      executable: true, // Assume executable for backward compatibility
    };

    // Sanitize potential echo commands
    result = sanitizeEchoCommand(result);
    return result;
  }
}

function sanitizeEchoCommand(result: CommandResponse): CommandResponse {
  const command = result.command.trim();

  // Check if it's an echo command
  const echoMatch = command.match(/^echo\s+(.+)$/i);
  if (!echoMatch) {
    return result;
  }

  // Check if the echo command is piped to another command
  const hasPipe = command.includes("|");

  // If it's executable and has a pipe, keep it as-is (user wants to execute it)
  if (result.executable && hasPipe) {
    return result;
  }

  let echoContent = echoMatch[1];

  // Remove surrounding quotes if present
  if (
    echoContent &&
    ((echoContent.startsWith('"') && echoContent.endsWith('"')) ||
      (echoContent.startsWith("'") && echoContent.endsWith("'")))
  ) {
    echoContent = echoContent.slice(1, -1);
  }

  // Otherwise, replace the command with just the message content
  return {
    ...result,
    command: echoContent || "", // Replace command with just the message
    executable: false, // Don't execute, just show the message
  };
}
