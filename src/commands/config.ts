import readline from "readline/promises";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import { getConfig } from "../config.js";
import { LogLevel } from "../logger.js";

const CONFIG_DIR = path.join(os.homedir(), ".amy-command-tool");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

interface Config {
  encryptedApiKey: string;
  salt: string;
  logLevel?: string;
  enableFileLogging?: boolean;
}

// Generate a machine-specific key for encryption
function getMachineKey(): string {
  const machineId = os.hostname() + os.platform() + os.arch();
  return crypto.createHash('sha256').update(machineId).digest('hex');
}

function encryptApiKey(apiKey: string): { encrypted: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.pbkdf2Sync(getMachineKey(), salt, 10000, 32, 'sha256');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return { encrypted: iv.toString('hex') + ':' + encrypted, salt };
}

export async function showConfigMenu(): Promise<void> {
  try {
    const config = await getConfig();

    console.log(`
🔧 Amy Configuration

Current Settings:
  Log Level: ${config.logLevel || 'info'}
  File Logging: ${config.enableFileLogging ? 'enabled' : 'disabled'}
  Config File: ${CONFIG_PATH}

What would you like to change?
1. Change log level
2. Toggle file logging
3. Update API key
4. Show current configuration
5. Exit
`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const choice = await rl.question("Enter your choice (1-5): ");
    rl.close();

    switch (choice.trim()) {
      case '1':
        await changeLogLevel();
        break;
      case '2':
        await toggleFileLogging();
        break;
      case '3':
        await updateApiKey();
        break;
      case '4':
        await showCurrentConfig();
        break;
      case '5':
        console.log("Goodbye!");
        break;
      default:
        console.log("Invalid choice. Please run 'amy -config' again.");
    }
  } catch (error) {
    console.error("Configuration error:", error);
    console.log("Run 'amy -config' to set up configuration.");
  }
}

async function changeLogLevel(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`
Available log levels:
- error: Only show errors
- warn: Show warnings and errors
- info: Show info, warnings, and errors (default)
- debug: Show all messages including debug info
`);

  const newLevel = await rl.question("Enter new log level (error/warn/info/debug) [info]: ");
  rl.close();

  const validLevels = ['error', 'warn', 'info', 'debug'];
  const level = newLevel.trim() || 'info';

  if (!validLevels.includes(level)) {
    console.log("Invalid log level. Must be one of: error, warn, info, debug");
    return;
  }

  await updateConfig({ logLevel: level });
  console.log(`✅ Log level updated to: ${level}`);
}

async function toggleFileLogging(): Promise<void> {
  const config = await getConfig();
  const newValue = !config.enableFileLogging;

  await updateConfig({ enableFileLogging: newValue });
  console.log(`✅ File logging ${newValue ? 'enabled' : 'disabled'}`);
}

async function updateApiKey(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("Enter your new OpenAI API key:");
  const apiKey = await rl.question("API Key: ");
  rl.close();

  if (!apiKey.trim()) {
    console.log("❌ API key cannot be empty");
    return;
  }

  const { encrypted, salt } = encryptApiKey(apiKey);
  await updateConfig({ encryptedApiKey: encrypted, salt });
  console.log("✅ API key updated successfully");
}

async function showCurrentConfig(): Promise<void> {
  const config = await getConfig();

  console.log(`
📋 Current Configuration:
  Log Level: ${config.logLevel || 'info'}
  File Logging: ${config.enableFileLogging ? 'enabled' : 'disabled'}
  Config Directory: ${CONFIG_DIR}
  Config File: ${CONFIG_PATH}
`);
}

async function updateConfig(updates: Partial<Config>): Promise<void> {
  try {
    // Read current config
    const data = await fs.readFile(CONFIG_PATH, "utf8");
    const currentConfig: Config = JSON.parse(data);

    // Merge with updates
    const newConfig = { ...currentConfig, ...updates };

    // Write back to file
    await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
  } catch (error) {
    throw new Error(`Failed to update configuration: ${error instanceof Error ? error.message : String(error)}`);
  }
}
