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
    │     👨🏿‍🦱 Bob says:        │
    │  "Let me help you with   │
    │   those commands!"       │
    ╰─────────────────────────╯

DESCRIPTION:
  Bob converts natural language commands into executable shell commands using AI.
  Simply describe what you want to do, and Bob will generate and execute the appropriate command.

USAGE:
  bob [OPTIONS] <natural language command>
  bob <COMMAND>

COMMANDS:
  -help, --help     Show this help message
  -config, --config Configure Bob settings
  -explain, --explain Show what command would be generated (without executing)

OPTIONS:
  --force          Skip confirmation before executing commands

EXAMPLES:
  # Basic usage
  bob "list all files"
  bob "kill process on port 5000"
  bob "show disk usage"

  # Skip confirmation
  bob --force "list files"

  # Configuration
  bob -config

  # Explain commands
  bob -explain "kill process on port 5000"

FEATURES:
  🔒 Encrypted API key storage
  🛡️  Safety confirmation before execution
  🌍 Cross-platform support (macOS, Linux, Windows)
  📝 Configurable logging levels
  🎯 Environment-aware command generation

CONFIGURATION:
  Bob stores configuration in ~/.bob-command-tool/config.json
  - API key (encrypted)
  - Log level (info/debug/error)
  - File logging preference

FIRST TIME SETUP:
  Run any command to start the setup process:
  bob "list files"

  You'll be prompted for:
  - OpenAI API key
  - Log level preference
  - File logging preference

REQUIREMENTS:
  - Node.js >= 18.0.0
  - OpenAI API key
  - Internet connection for AI processing

For more information, visit: https://github.com/your-repo/bob
`);
}
