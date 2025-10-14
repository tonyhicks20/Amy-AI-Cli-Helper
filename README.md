# Bob - AI-Powered CLI Command Tool

Bob is a TypeScript CLI tool that converts natural language commands into executable shell commands using OpenAI's GPT models. Simply describe what you want to do, and Bob will generate and execute the appropriate command for your system.

## 🔒 Security Features

- **Encrypted API Key Storage**: Your OpenAI API key is encrypted using machine-specific keys and stored securely
- **PBKDF2 Encryption**: Uses industry-standard encryption with salt for maximum security
- **Machine-Specific Keys**: Encryption keys are derived from your machine's unique characteristics

## Installation

### Global Installation (Recommended)

```bash
npm install -g bob
```

### Local Development

```bash
git clone <repository-url>
cd bob
npm install
npm run build
npm link
```

## First-Time Setup

On first run, Bob will prompt you to enter your OpenAI API key. This is encrypted and stored securely in `~/.bob-command-tool/config.json` using machine-specific encryption keys.

## Usage

### Basic Usage

```bash
bob "list all files in current directory"
bob "kill process on port 5000"
bob "show disk usage"
bob "find all .js files"
```

### Force Execution (Skip Confirmation)

```bash
bob --force "list files"
```

## Examples

```bash
# File operations
bob "list all files"
bob "find all .js files in this directory"
bob "show disk usage"

# Process management
bob "kill process on port 5000"
bob "show running processes"
bob "restart nginx"

# System information
bob "show system information"
bob "check memory usage"
bob "show network connections"

# Git operations
bob "show git status"
bob "commit all changes with message 'fix bug'"
bob "push to origin main"
```

## Safety Features

- **Confirmation Required**: Bob always asks for confirmation before executing commands
- **Environment Detection**: Automatically detects your OS, shell, and system context
- **Safe Command Generation**: Uses GPT-4o-mini with specific prompts to generate safe commands
- **Error Handling**: Provides clear error messages if commands fail

## Configuration

Configuration is encrypted and stored in `~/.bob-command-tool/config.json`:

```json
{
  "encryptedApiKey": "encrypted-key-here",
  "salt": "salt-for-decryption"
}
```

The API key is encrypted using PBKDF2 with a machine-specific key derived from your system's hostname, platform, and architecture.

## Requirements

- Node.js >= 18.0.0
- OpenAI API key
- macOS, Linux, or Windows
- TypeScript (for development)

## How It Works

1. **Environment Detection**: Bob detects your OS, shell, architecture, and current working directory
2. **AI Command Generation**: Sends your natural language request along with environment context to OpenAI
3. **Safety Confirmation**: Shows you the generated command and asks for confirmation
4. **Execution**: Runs the command and displays the output

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC
