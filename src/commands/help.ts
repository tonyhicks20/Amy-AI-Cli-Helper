export function showHelp(): void {
  console.log(`
    ██████╗  ██████╗ ██████╗
    ██╔══██╗██╔═══██╗██╔══██╗
    ██████╔╝██║   ██║██████╔╝
    ██╔══██╗██║   ██║██╔══██╗
    ██████╔╝╚██████╔╝██████╔╝
    ╚═════╝  ╚═════╝ ╚═════╝

    ╭─────────────────────────╮
    │  🤖 AI-Powered CLI Tool  │
    ╰─────────────────────────╯

    ╭─────────────────────────╮
    │     👩 Amy says:         │
    │  "Let me help you with   │
    │   those commands!"       │
    ╰─────────────────────────╯

DESCRIPTION:
  Amy converts natural language commands into executable shell commands using AI.
  Simply describe what you want to do, and Amy will generate and execute the appropriate command.

USAGE:
  amy [OPTIONS] <natural language command>
  amy <COMMAND>

COMMANDS:
  -help, --help     Show this help message
  -config, --config Configure Amy settings
  -explain, --explain Show what command would be generated (without executing)

OPTIONS:
  --force          Skip confirmation before executing commands

EXAMPLES:
  # Basic usage
  amy "list all files"
  amy "kill process on port 5000"
  amy "show disk usage"

  # Skip confirmation
  amy --force "list files"

  # Configuration
  amy -config

  # Explain commands
  amy -explain "kill process on port 5000"

FEATURES:
  🔒 Encrypted API key storage
  🛡️  Safety confirmation before execution
  🌍 Cross-platform support (macOS, Linux, Windows)
  📝 Configurable logging levels
  🎯 Environment-aware command generation

CONFIGURATION:
  Amy stores configuration in ~/.amy-command-tool/config.json
  - API key (encrypted)
  - Log level (info/debug/error)
  - File logging preference

FIRST TIME SETUP:
  Run any command to start the setup process:
  amy "list files"

  You'll be prompted for:
  - OpenAI API key
  - Log level preference
  - File logging preference

REQUIREMENTS:
  - Node.js >= 18.0.0
  - OpenAI API key
  - Internet connection for AI processing

For more information, visit: https://github.com/your-repo/amy
`);
}
