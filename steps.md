CLI Natural Language Command Tool — Technical Spec

---

1. Project Initialization

1.1 Create Project Structure

	mkdir bob-command-tool && cd bob-command-tool
	npm init -y

1.2 Install Dependencies

	npm install openai
	npm install --save-dev @types/node

1.3 Directory Layout

	/bob-command-tool
	├─ bin/
	│  └─ cli.js              # Entry point
	├─ src/
	│  ├─ config.js           # API key management
	│  ├─ environment.js      # OS/shell detection
	│  ├─ generator.js        # OpenAI command generation
	│  ├─ executor.js         # Command execution
	│  └─ index.js            # Main orchestration
	├─ package.json
	└─ README.md

1.4 Configure package.json

	{
	  "name": "bob",
	  "version": "1.0.0",
	  "type": "module",
	  "bin": {
	    "toolName": "./bin/cli.js"
	  },
	  "files": ["bin", "src"],
	  "engines": {
	    "node": ">=18.0.0"
	  }
	}


---

2. Configuration Management (src/config.js)

2.1 Define Config Path

- Store at ~/.bob-command-tool/config.json

- Create directory if it doesn't exist

2.2 Implement Config Functions

	import fs from "fs/promises";
	import path from "path";
	import os from "os";
	import readline from "readline/promises";

	const CONFIG_DIR = path.join(os.homedir(), ".bob-command-tool");
	const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

	export async function ensureConfig() {
	  try {
	    await fs.access(CONFIG_PATH);
	    const data = await fs.readFile(CONFIG_PATH, "utf8");
	    return JSON.parse(data);
	  } catch {
	    return await setupConfig();
	  }
	}

	async function setupConfig() {
	  const rl = readline.createInterface({
	    input: process.stdin,
	    output: process.stdout,
	  });

	  console.log("First-time setup required.");
	  const apiKey = await rl.question("Enter your OpenAI API key: ");
	  rl.close();

	  await fs.mkdir(CONFIG_DIR, { recursive: true });
	  const config = { apiKey };
	  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));

	  return config;
	}

	export async function getApiKey() {
	  const config = await ensureConfig();
	  return config.apiKey;
	}


---

3. Environment Detection (src/environment.js)

3.1 Gather System Information

	import os from "os";
	import { exec } from "child_process";
	import { promisify } from "util";

	const execAsync = promisify(exec);

	export async function getEnvironmentContext() {
	  const platform = os.platform();
	  const shell = await detectShell();

	  return {
	    platform,
	    release: os.release(),
	    arch: os.arch(),
	    shell,
	    cwd: process.cwd(),
	    isRoot: process.getuid?.() === 0,
	  };
	}

	async function detectShell() {
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

	export function formatEnvironmentForPrompt(env) {
	  return `
	Environment Details:
	- OS: ${env.platform} (${env.release})
	- Architecture: ${env.arch}
	- Shell: ${env.shell}
	- Working Directory: ${env.cwd}
	- Running as root: ${env.isRoot}
	`.trim();
	}


---

4. Command Generation (src/generator.js)

4.1 Create OpenAI Client

	import OpenAI from "openai";

	export async function generateCommand(userPrompt, environment, apiKey) {
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

	  return extractCommand(response.choices[0].message.content);
	}

	function buildSystemPrompt(env) {
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

	function extractCommand(content) {
	  // Remove markdown code fences if present
	  let cmd = content.trim();
	  cmd = cmd.replace(/^```(?:bash|sh|shell)?\n?/i, "");
	  cmd = cmd.replace(/\n?```$/, "");
	  return cmd.trim();
	}


---

5. Safety & Execution (src/executor.js)

5.1 Implement Confirmation Flow

	import { exec } from "child_process";
	import { promisify } from "util";
	import readline from "readline/promises";

	const execAsync = promisify(exec);

	export async function executeWithConfirmation(command, force = false) {
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

	async function confirmExecution() {
	  const rl = readline.createInterface({
	    input: process.stdin,
	    output: process.stdout,
	  });

	  const answer = await rl.question("Run this? [y/N] ");
	  rl.close();

	  return answer.toLowerCase() === "y";
	}

	async function runCommand(command) {
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
	    console.error(`❌ Error: ${error.message}`);
	    if (error.stderr) {
	      console.error(error.stderr);
	    }
	    return { success: false, error: error.message };
	  }
	}


---

6. Main Orchestration (src/index.js)

6.1 Wire Everything Together

	import { getApiKey } from "./config.js";
	import { getEnvironmentContext } from "./environment.js";
	import { generateCommand } from "./generator.js";
	import { executeWithConfirmation } from "./executor.js";

	export async function run(userPrompt, options = {}) {
	  try {
	    const apiKey = await getApiKey();
	    const environment = await getEnvironmentContext();
	    const command = await generateCommand(
	      userPrompt,
	      environment,
	      apiKey
	    );
	    await executeWithConfirmation(command, options.force);
	  } catch (error) {
	    console.error(`Fatal error: ${error.message}`);
	    process.exit(1);
	  }
	}


---

7. CLI Entry Point (bin/cli.js)

7.1 Parse Arguments and Invoke

	#!/usr/bin/env node

	import { run } from "../src/index.js";

	const args = process.argv.slice(2);

	// Check for flags
	const forceIndex = args.indexOf("--force");
	const force = forceIndex !== -1;
	if (force) args.splice(forceIndex, 1);

	const userPrompt = args.join(" ");

	if (!userPrompt) {
	  console.error("Usage: toolName <natural language command>");
	  console.error("       toolName --force <natural language command>");
	  process.exit(1);
	}

	run(userPrompt, { force });

7.2 Make Executable

	chmod +x bin/cli.js


---

8. Local Testing

8.1 Link Package Locally

	npm link

8.2 Test Commands

	toolName "list all files"
	toolName "kill the process on port 5000"
	toolName --force "show disk usage"


---

9. Publishing to npm

9.1 Pre-publish Checklist

-  Update README with usage examples

-  Test on clean environment

-  Verify files field in package.json

-  Set appropriate version

9.2 Publish

	npm login
	npm publish

9.3 Global Installation

	npm install -g your-tool-name


---

10. Future Enhancements

10.1 Phase 2 Features

- Command history/caching

- Alias support (custom shortcuts)

- Dry-run mode (--dry-run)

- Alternative LLM providers

- Shell completion scripts

- Command templates library

10.2 Safety Improvements

- Destructive command detection

- Sandbox/container execution option

- Rate limiting for API calls

- Local command validation against known-safe patterns