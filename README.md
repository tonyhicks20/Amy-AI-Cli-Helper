# Amy - AI-Powered CLI Command Tool

Amy is an intelligent command-line assistant that converts natural language into executable shell commands using OpenAI's API. Simply describe what you want to do in plain English, and Amy will generate the appropriate command for your system, ask for confirmation, and execute it.

**Key Features:**
- 🤖 **AI-Powered**: Leverages OpenAI's GPT models to understand natural language
- 🔄 **Auto-Retry**: Automatically retries failed commands with corrections
- 🧠 **Learning**: Remembers failed commands across sessions to avoid repeating mistakes
- 🔒 **Secure**: Encrypted API key storage with machine-specific encryption
- ✅ **Safe**: Always asks for confirmation before executing commands
- 🌍 **Cross-Platform**: Works on macOS, Linux, and Windows

## 🔒 Security Features

- **Encrypted API Key Storage**: Your OpenAI API key is encrypted using machine-specific keys and stored securely in `~/.amy-command-tool/config.json`
- **PBKDF2 Encryption**: Industry-standard encryption with salt for maximum security
- **Machine-Specific Keys**: Encryption keys derived from your machine's unique characteristics (hostname, platform, architecture)
- **No Hardcoded Secrets**: API keys never stored in plain text
- **User Confirmation**: Every command requires explicit user approval before execution (unless `--force` flag is used)

## Installation

### Global Installation (Recommended)

```bash
npm install -g @prodfact/amy
```

### Local Development

```bash
git clone <repository-url>
cd amy
npm install
npm run build
npm link
```

## 🚀 First-Time Setup

When you run Amy for the first time, it will guide you through a quick setup:

```bash
amy "list files"
```

You'll be prompted to:
1. **Enter your OpenAI API key** - Get one from [OpenAI's platform](https://platform.openai.com/api-keys)
2. **Choose file logging preference** - Enable/disable logging to `~/.amy-command-tool/logs/`

Your API key will be encrypted and stored securely. You only need to do this once per machine.

## 📖 Usage

### Basic Usage

```bash
amy "your natural language command here"
```

**Examples:**
```bash
amy "list all files in current directory"
amy "kill process on port 5000"
amy "show disk usage"
amy "find all .js files"
```

### Command Options

#### `--force` - Skip Confirmation

Execute commands without prompting for confirmation (use with caution):

```bash
amy --force "list files"
```

#### `--explain` - Get Detailed Explanations

Show detailed explanations of what each part of the command does:

```bash
amy --explain "list all files"
```

Output:
```
====================================================
Command:   ls -la
====================================================
Explanation:
The 'ls' command lists directory contents.
The '-l' flag provides detailed information including permissions, owner, group, size, and modification date.
The '-a' flag shows hidden files (those starting with '.').
This will show all files and directories in the current working directory with full details.
```

### Configuration Commands

#### View Help

```bash
amy --help
```

#### Reconfigure API Key

```bash
amy config
```

This allows you to update your API key or logging preferences.

## 💡 Examples

### File Operations
```bash
amy "list all files"
amy "find all .js files in this directory"
amy "show disk usage"
amy "create a directory called projects"
amy "copy all .txt files to backup folder"
```

### Process Management
```bash
amy "kill process on port 5000"
amy "show running processes"
amy "restart nginx"
amy "find which process is using port 3000"
```

### System Information
```bash
amy "show system information"
amy "check memory usage"
amy "show network connections"
amy "what's my IP address"
amy "show disk space"
```

### Git Operations
```bash
amy "show git status"
amy "commit all changes with message 'fix bug'"
amy "push to origin main"
amy "create a new branch called feature-x"
amy "show recent commits"
```

### Package Management
```bash
amy "install express using npm"
amy "update all npm packages"
amy "list globally installed npm packages"
```

### Text Processing
```bash
amy "search for TODO in all .js files"
amy "count lines in all Python files"
amy "find files modified in the last 24 hours"
```

## 🧠 How Amy Learns

Amy includes a **persistent learning system** that remembers failed commands across sessions:

1. **First Time**: You ask Amy to "show directory tree", and it suggests `tree`
2. **Command Fails**: The `tree` command isn't installed on your system
3. **Auto-Retry**: Amy automatically retries with an alternative like `find . -print | sed -e 's;[^/]*/;|____;g'`
4. **Learns**: The failure is recorded to `~/.amy-command-tool/command-history.json`
5. **Next Time**: When you ask for a directory tree again, Amy will skip `tree` and suggest the working alternative immediately

This means Amy gets smarter the more you use it, learning what works on your specific system.

## ⚙️ How It Works

1. **Environment Detection**: Amy detects your OS, shell, architecture, current directory, and user permissions
2. **Context Loading**: Loads previous command failures from history to avoid repeating mistakes
3. **AI Prompt Building**: Constructs a detailed prompt with environment context and failure history
4. **Command Generation**: Sends your request to OpenAI's API (GPT-4o-mini)
5. **Safety Review**: Shows you the generated command and asks for confirmation
6. **Execution**: Runs the command and displays the output
7. **Failure Handling**: If the command fails, records the failure and automatically retries with corrections
8. **Learning**: Saves failures to persistent storage for future sessions

## 📁 Configuration Files

Amy stores configuration and data in `~/.amy-command-tool/`:

### `config.json` - Encrypted Configuration
```json
{
  "encryptedApiKey": "iv:encrypted-key-here",
  "salt": "random-salt-for-decryption",
  "logLevel": "error",
  "enableFileLogging": false
}
```
- API key encrypted using PBKDF2 with machine-specific keys
- Salt is unique per installation
- Log level: `error`, `warning`, `info`, or `debug`

### `command-history.json` - Learning Database
```json
{
  "failures": [
    {
      "userIntent": "show directory tree",
      "failedCommand": "tree",
      "error": "command not found: tree"
    }
  ]
}
```
- Stores up to 200 most recent command failures
- Used to avoid repeating failed commands
- Automatically managed by Amy

### `logs/` - Application Logs
- `combined.log` - All log entries
- `error.log` - Error-level logs only
- Only created if file logging is enabled

## ⚠️ Gotchas & Tips

### Common Issues

**"Command not found: amy"**
- Solution: Make sure you installed globally with `-g` flag or ran `npm link` for local development

**"API key not configured"**
- Solution: Run `amy config` to set up your API key

**"Session error: API error"**
- Cause: OpenAI API issues (rate limits, invalid key, network)
- Solution: Check your API key and OpenAI account status

### Best Practices

✅ **DO:**
- Review commands before confirming execution
- Use `--explain` when learning new commands
- Let Amy retry failed commands (it learns from failures)
- Use natural, descriptive language for better results

❌ **DON'T:**
- Use `--force` for destructive operations
- Share your `~/.amy-command-tool/config.json` file (contains encrypted API key)
- Expect Amy to know about files/projects specific to your system (be descriptive)

### Performance Tips

- **First run is slower**: Initial setup requires API key configuration
- **Learning improves speed**: Amy gets faster as it learns what works on your system
- **History cleanup**: If needed, manually delete old entries from `command-history.json`

## 📋 Requirements

- **Node.js** >= 18.0.0
- **OpenAI API key** - Get one from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Supported OS**: macOS, Linux, Windows
- **Internet connection**: Required for OpenAI API calls

## 🧪 Development

### Running Tests

```bash
npm test                  # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:ui           # Open Vitest UI
npm run test:coverage     # Run tests with coverage report
```

### Building from Source

```bash
git clone <repository-url>
cd amy
npm install
npm run build
npm link
```

### Project Structure

```
amy/
├── src/
│   ├── session.ts      # Main command session logic
│   ├── prompt.ts       # AI prompt construction
│   ├── history.ts      # Persistent failure storage
│   ├── generator.ts    # OpenAI API interface
│   ├── executor.ts     # Command execution
│   ├── config.ts       # Encrypted configuration
│   ├── environment.ts  # System context detection
│   └── logger.ts       # Logging utilities
├── bin/
│   └── cli.ts         # CLI entry point
└── dist/              # Compiled output
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes
4. **Test** thoroughly (`npm test`)
5. **Commit** your changes (`git commit -m 'Add amazing feature'`)
6. **Push** to your branch (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

### Testing Requirements

All changes to core logic must include tests. We maintain 100% test coverage on critical modules:
- `session.ts` - Command execution logic
- `prompt.ts` - Prompt building
- `history.ts` - Failure persistence

## 📄 License

ISC

## 🙏 Acknowledgments

- Built with [OpenAI's GPT API](https://openai.com/)
- Powered by [TypeScript](https://www.typescriptlang.org/)
- Tested with [Vitest](https://vitest.dev/)

---

**Made with ❤️ by developers, for developers**
