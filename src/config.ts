import fs from "fs/promises";
import path from "path";
import os from "os";
import readline from "readline/promises";
import crypto from "crypto";

const CONFIG_DIR = path.join(os.homedir(), ".amy-command-tool");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

interface Config {
  encryptedApiKey: string;
  salt: string;
  logLevel?: string;
  enableFileLogging?: boolean;
}

interface DecryptedConfig {
  apiKey: string;
  logLevel: string | undefined;
  enableFileLogging: boolean | undefined;
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

function decryptApiKey(encryptedApiKey: string, salt: string): string {
  const key = crypto.pbkdf2Sync(getMachineKey(), salt, 10000, 32, 'sha256');
  const parts = encryptedApiKey.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format');
  }
  const ivHex = parts[0]!;
  const encrypted = parts[1]!;
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function ensureConfig(): Promise<DecryptedConfig> {
  try {
    await fs.access(CONFIG_PATH);
    const data = await fs.readFile(CONFIG_PATH, "utf8");
    const config: Config = JSON.parse(data);

    const apiKey = decryptApiKey(config.encryptedApiKey, config.salt);
    return {
      apiKey,
      logLevel: config.logLevel,
      enableFileLogging: config.enableFileLogging
    };
  } catch {
    return await setupConfig();
  }
}

async function setupConfig(): Promise<DecryptedConfig> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("First-time setup required.");
  const apiKey = await rl.question("Enter your OpenAI API key: ");

  // Ask for file logging preference only
  const enableFileLogging = (await rl.question("Enable file logging? (y/N): ")).toLowerCase() === "y";

  rl.close();

  if (!apiKey.trim()) {
    throw new Error("API key is required");
  }

  const { encrypted, salt } = encryptApiKey(apiKey);

  await fs.mkdir(CONFIG_DIR, { recursive: true });
  const config: Config = {
    encryptedApiKey: encrypted,
    salt,
    logLevel: "error", // Fixed default log level
    enableFileLogging
  };
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));

  return {
    apiKey,
    logLevel: "error",
    enableFileLogging
  };
}

export async function getApiKey(): Promise<string> {
  const config = await ensureConfig();
  return config.apiKey;
}

export async function getConfig(): Promise<DecryptedConfig> {
  return await ensureConfig();
}
