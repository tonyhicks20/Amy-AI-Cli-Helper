import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export interface EnvironmentContext {
  platform: string;
  release: string;
  arch: string;
  shell: string;
  cwd: string;
  isRoot: boolean;
}

export async function getEnvironmentContext(): Promise<EnvironmentContext> {
  try {
    const platform = os.platform();
    const shell = await detectShell();

    let isRoot = false;
    try {
      isRoot = process.getuid?.() === 0;
    } catch {
      isRoot = false;
    }

    return {
      platform,
      release: os.release(),
      arch: os.arch(),
      shell,
      cwd: process.cwd(),
      isRoot,
    };
  } catch (error) {
    console.error("Environment detection error:", error);
    throw new Error(`Failed to detect environment: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function detectShell(): Promise<string> {
  // Check environment variable first
  if (process.env.SHELL) {
    return path.basename(process.env.SHELL);
  }

  // Platform-specific fallbacks
  const platform = os.platform();
  if (platform === "win32") return "powershell";
  if (platform === "darwin") return "zsh";
  return "bash";
}

export function formatEnvironmentForPrompt(env: EnvironmentContext): string {
  return `
Environment Details:
- OS: ${env.platform} (${env.release})
- Architecture: ${env.arch}
- Shell: ${env.shell}
- Working Directory: ${env.cwd}
- Running as root: ${env.isRoot}
`.trim();
}
