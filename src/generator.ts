import OpenAI from "openai";
import { formatEnvironmentForPrompt, EnvironmentContext } from "./environment.js";

export async function generateCommand(
  userPrompt: string,
  environment: EnvironmentContext,
  apiKey: string
): Promise<string> {
  try {
    const client = new OpenAI({ apiKey });

    const systemPrompt = buildSystemPrompt(environment);

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

    return extractCommand(choice.message.content);
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error(`Failed to generate command: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function buildSystemPrompt(env: EnvironmentContext): string {
  return `You are a shell command generator. Convert natural language requests into safe, executable shell commands.

${formatEnvironmentForPrompt(env)}

Rules:
1. Output ONLY the command, no explanations or markdown
2. Use syntax appropriate for the detected shell
3. Prefer non-destructive operations unless explicitly requested
4. Include 'sudo' only when necessary and the user is not root
5. For destructive operations, ensure they match user intent exactly
6. Never output multi-line commands without proper shell syntax`;
}

function extractCommand(content: string): string {
  // Remove markdown code fences if present
  let cmd = content.trim();
  cmd = cmd.replace(/^```(?:bash|sh|shell)?\n?/i, "");
  cmd = cmd.replace(/\n?```$/, "");
  return cmd.trim();
}
