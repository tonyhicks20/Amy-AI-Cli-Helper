import { getConfig } from "../config.js";
import { getEnvironmentContext } from "../environment.js";
import { generateCommand } from "../generator.js";
import { initializeLogger, LogLevel } from "../logger.js";

export async function explainCommand(userPrompt: string): Promise<void> {
  try {
    // Initialize logger with config
    const config = await getConfig();
    const logger = initializeLogger({
      level: (config.logLevel as LogLevel) || LogLevel.INFO,
      enableFile: config.enableFileLogging || false
    });

    logger.debug("Explain mode: Getting API key...");
    const apiKey = config.apiKey;

    logger.debug("Explain mode: Getting environment context...");
    const environment = await getEnvironmentContext();

    logger.debug("Explain mode: Generating command...");
    const command = await generateCommand(
      userPrompt,
      environment,
      apiKey
    );

    // Display the explanation
    console.log(`
🔍 Command Explanation

📝 Your Request:
  "${userPrompt}"

🌍 Environment Context:
  OS: ${environment.platform} (${environment.release})
  Architecture: ${environment.arch}
  Shell: ${environment.shell}
  Working Directory: ${environment.cwd}
  Running as root: ${environment.isRoot ? 'Yes' : 'No'}

🤖 Generated Command:
  ${command}

💡 What this command does:
  ${getCommandExplanation(command)}

⚠️  Safety Notes:
  ${getSafetyNotes(command)}

🔧 To execute this command:
  bob "${userPrompt}"

  Or skip confirmation:
  bob --force "${userPrompt}"
`);
  } catch (error) {
    const logger = initializeLogger();
    logger.error("Explain command error", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to explain command: ${errorMessage}`);
    process.exit(1);
  }
}

function getCommandExplanation(command: string): string {
  const cmd = command.toLowerCase().trim();

  if (cmd.startsWith('ls')) {
    return "Lists files and directories in the current location";
  } else if (cmd.startsWith('find')) {
    return "Searches for files or directories matching specified criteria";
  } else if (cmd.includes('kill') || cmd.includes('pkill')) {
    return "Terminates running processes";
  } else if (cmd.startsWith('ps')) {
    return "Shows information about running processes";
  } else if (cmd.startsWith('df')) {
    return "Displays disk space usage";
  } else if (cmd.startsWith('du')) {
    return "Shows disk usage of files and directories";
  } else if (cmd.startsWith('grep')) {
    return "Searches for text patterns in files";
  } else if (cmd.startsWith('cat')) {
    return "Displays the contents of files";
  } else if (cmd.startsWith('mkdir')) {
    return "Creates new directories";
  } else if (cmd.startsWith('rm')) {
    return "Removes files or directories";
  } else if (cmd.startsWith('cp')) {
    return "Copies files or directories";
  } else if (cmd.startsWith('mv')) {
    return "Moves or renames files or directories";
  } else if (cmd.startsWith('chmod')) {
    return "Changes file permissions";
  } else if (cmd.startsWith('sudo')) {
    return "Executes command with elevated privileges";
  } else if (cmd.startsWith('git')) {
    return "Git version control operation";
  } else if (cmd.startsWith('npm') || cmd.startsWith('yarn')) {
    return "Package manager operation";
  } else if (cmd.startsWith('docker')) {
    return "Docker container operation";
  } else if (cmd.includes('curl') || cmd.includes('wget')) {
    return "Downloads files or makes HTTP requests";
  } else if (cmd.startsWith('ssh')) {
    return "Connects to remote server via SSH";
  } else if (cmd.startsWith('scp')) {
    return "Copies files over SSH";
  } else {
    return "Custom command - review carefully before execution";
  }
}

function getSafetyNotes(command: string): string {
  const cmd = command.toLowerCase().trim();
  const notes: string[] = [];

  if (cmd.includes('rm -rf') || cmd.includes('rm -r')) {
    notes.push("⚠️  DESTRUCTIVE: This will permanently delete files/directories");
  }

  if (cmd.startsWith('sudo')) {
    notes.push("🔐 Requires elevated privileges - ensure you trust this command");
  }

  if (cmd.includes('kill -9')) {
    notes.push("💀 Force kills processes - may cause data loss");
  }

  if (cmd.includes('chmod 777')) {
    notes.push("🔓 Sets very permissive file permissions - security risk");
  }

  if (cmd.includes('curl') && cmd.includes('| sh')) {
    notes.push("🌐 Downloads and executes remote script - verify source");
  }

  if (cmd.includes('dd')) {
    notes.push("💾 Low-level disk operation - can cause data loss if misused");
  }

  if (cmd.includes('fdisk') || cmd.includes('mkfs')) {
    notes.push("💽 Disk partitioning/formatting - will destroy data");
  }

  if (cmd.includes('passwd') || cmd.includes('useradd')) {
    notes.push("👤 User account modification - affects system security");
  }

  if (cmd.includes('iptables') || cmd.includes('ufw')) {
    notes.push("🔥 Firewall modification - affects network security");
  }

  if (notes.length === 0) {
    notes.push("✅ Generally safe command - review output before proceeding");
  }

  return notes.join('\n  ');
}
