# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build**: `npm run build` - Compiles TypeScript to JavaScript in `dist/` directory
- **Development**: `npm run dev` - Runs the CLI tool in development mode using `tsx`
- **Publish preparation**: `npm run prepublishOnly` - Automatically runs build before publishing

## Project Architecture

Amy is a TypeScript-based CLI tool that converts natural language commands into executable shell commands using OpenAI's API. The architecture follows a modular design:

### Core Components

- **CLI Entry Point** (`bin/cli.ts`): Handles command-line argument parsing and routing to help, config, or main execution
- **Main Controller** (`src/index.ts`): Orchestrates the overall flow with configuration, environment detection, and session management
- **Command Session** (`src/session.ts`): Manages conversation history with OpenAI and retry logic for failed commands
- **Command Generator** (`src/generator.ts`): Interfaces with OpenAI API to generate shell commands from natural language
- **Command Executor** (`src/executor.ts`): Handles user confirmation and actual command execution
- **Configuration** (`src/config.ts`): Manages encrypted API key storage and user preferences using PBKDF2 encryption
- **Environment Detection** (`src/environment.ts`): Detects OS, shell, architecture, and user context
- **Logging** (`src/logger.ts`): Winston-based logging with console and file output options

### Key Features

- **Encrypted API Key Storage**: Uses machine-specific encryption with PBKDF2 for secure API key storage in `~/.amy-command-tool/config.json`
- **Conversation History**: Maintains OpenAI conversation context to handle command failures and retry with corrections
- **Environment-Aware**: Generates platform-specific commands based on detected OS, shell, and system context
- **Safety Features**: Always requires user confirmation before executing commands (unless `--force` flag is used)
- **Echo Command Sanitization**: Automatically detects and handles echo commands appropriately

### Command Flow

1. User input is parsed in `bin/cli.ts`
2. Configuration and environment context are loaded
3. A `CommandSession` is created with conversation history
4. OpenAI generates a command via `generator.ts`
5. User confirms execution via `executor.ts`
6. If command fails, error context is added to conversation history and the process retries

### TypeScript Configuration

- Uses ESNext modules with ES2022 target
- Strict type checking enabled with comprehensive compiler options
- Outputs to `dist/` directory with source maps and declarations
- Private functions should use underscore prefix per Python conventions

## Command Examples

The tool handles various command categories:
- File operations: `amy "list all files"` → `ls -l`
- Process management: `amy "kill process on port 5000"` → `lsof -ti:5000 | xargs kill -9`
- System information: `amy "show disk usage"` → `df -h`
- Git operations: `amy "show git status"` → `git status`