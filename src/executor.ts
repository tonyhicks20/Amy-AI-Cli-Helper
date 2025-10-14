import { exec } from "child_process";
import { promisify } from "util";
import readline from "readline/promises";
import { log } from "./logger.js";
import { CommandResponse } from "./generator.js";

const execAsync = promisify(exec);

export interface ExecutionResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
}

export async function executeWithConfirmation(
  commandResponse: CommandResponse,
  force: boolean = false
): Promise<ExecutionResult | null> {

  if (!force) {
    const confirmed = await confirmExecution();
    if (!confirmed) {
      log.debug("Aborted.");
      return null;
    }
  }

  return await runCommand(commandResponse.command);
}

async function confirmExecution(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await rl.question("Do you want to run this? [y/n] ");
  rl.close();

  return answer.toLowerCase() === "y";
}

async function runCommand(command: string): Promise<ExecutionResult> {
  try {
    log.debug("Executing command", { command });
    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      log.warning(`stderr:\n${stderr}`);
    }

    if (stdout) {
      log.success(`Output:\n${stdout}`);
    }

    return { success: true, stdout, stderr };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.failure(`Error: ${errorMessage}`);

    if (error && typeof error === 'object' && 'stderr' in error) {
      log.error("Command stderr", error.stderr);
    }

    return { success: false, error: errorMessage };
  }
}
