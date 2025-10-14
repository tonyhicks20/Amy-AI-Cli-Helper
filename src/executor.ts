import { exec } from "child_process";
import { promisify } from "util";
import readline from "readline/promises";

const execAsync = promisify(exec);

export interface ExecutionResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
}

export async function executeWithConfirmation(
  command: string,
  force: boolean = false
): Promise<ExecutionResult | null> {
  console.log(`\n📋 Generated command:\n  ${command}\n`);

  if (!force) {
    const confirmed = await confirmExecution();
    if (!confirmed) {
      console.log("❌ Aborted.");
      return null;
    }
  }

  return await runCommand(command);
}

async function confirmExecution(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await rl.question("Run this? [y/N] ");
  rl.close();

  return answer.toLowerCase() === "y";
}

async function runCommand(command: string): Promise<ExecutionResult> {
  try {
    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.error(`⚠️  stderr:\n${stderr}`);
    }

    if (stdout) {
      console.log(`✅ Output:\n${stdout}`);
    }

    return { success: true, stdout, stderr };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error: ${errorMessage}`);

    if (error && typeof error === 'object' && 'stderr' in error) {
      console.error(error.stderr);
    }

    return { success: false, error: errorMessage };
  }
}
