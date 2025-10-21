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
- **Prompt Builder** (`src/prompt.ts`): Centralized prompt construction with environment context and failure history formatting
- **Command History** (`src/history.ts`): Persistent storage of command failures for cross-session learning
- **Configuration** (`src/config.ts`): Manages encrypted API key storage and user preferences using PBKDF2 encryption
- **Environment Detection** (`src/environment.ts`): Detects OS, shell, architecture, and user context
- **Logging** (`src/logger.ts`): Winston-based logging with console and file output options

### Key Features

- **Encrypted API Key Storage**: Uses machine-specific encryption with PBKDF2 for secure API key storage in `~/.amy-command-tool/config.json`
- **Persistent Command Learning**: Records command failures to `~/.amy-command-tool/command-history.json` (max 200 entries) for cross-session learning
- **Conversation History**: Maintains OpenAI conversation context to handle command failures and retry with corrections within a session
- **Environment-Aware**: Generates platform-specific commands based on detected OS, shell, and system context
- **Safety Features**: Always requires user confirmation before executing commands (unless `--force` flag is used)
- **Centralized Prompt Management**: All AI prompt construction logic consolidated in dedicated prompt builder module

### Command Flow

1. User input is parsed in `bin/cli.ts`
2. Configuration and environment context are loaded
3. A `CommandSession` is created with conversation history
4. System prompt is built via `prompt.ts` with environment context and failure history from `history.ts`
5. OpenAI generates a command via `generator.ts`
6. User confirms execution via `executor.ts`
7. If command fails:
   - Failure is recorded to persistent storage via `history.ts`
   - Error context is added to conversation history
   - Process retries with updated context

### Module Responsibilities

Each module has a single, clear responsibility following separation of concerns:

- **`session.ts`**: Session orchestration only - manages conversation flow and retry logic
- **`prompt.ts`**: Prompt construction only - builds system prompts with all context and formatting
- **`history.ts`**: Persistence only - loads and saves command failure records to disk
- **`executor.ts`**: Execution only - handles user confirmation and command execution
- **`generator.ts`**: Generation only - interfaces with OpenAI API to generate commands
- **`config.ts`**: Configuration only - manages encrypted settings storage
- **`environment.ts`**: Detection only - gathers system context information
- **`logger.ts`**: Logging only - provides structured logging capabilities

### TypeScript Configuration

- Uses ESNext modules with ES2022 target
- Strict type checking enabled with comprehensive compiler options
- Outputs to `dist/` directory with source maps and declarations
- Private functions should use underscore prefix per Python conventions

### Testing

The project uses **Vitest** for unit testing with comprehensive coverage:

- **Test Framework**: Vitest (fast, ESM-native, TypeScript-first)
- **Test Files**: `*.test.ts` files co-located with source files
- **Coverage**: 100% coverage on critical modules (session.ts, prompt.ts, history.ts)

**Test Commands**:
- `npm test` - Run all tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Open Vitest UI for interactive testing
- `npm run test:coverage` - Run tests with coverage report

**Test Strategy**:
- **session.ts**: Tests all execution paths including success, failure, retry, cancellation, and error handling
- **history.ts**: Tests file I/O, persistence, history trimming, and error recovery
- **prompt.ts**: Tests prompt construction with various configurations and failure histories

All changes to core logic must maintain passing tests. The test suite ensures session behavior remains consistent across refactoring.

## Command Examples

The tool handles various command categories:
- File operations: `amy "list all files"` → `ls -l`
- Process management: `amy "kill process on port 5000"` → `lsof -ti:5000 | xargs kill -9`
- System information: `amy "show disk usage"` → `df -h`
- Git operations: `amy "show git status"` → `git status`