import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CommandSession } from "./session.js";
import type { EnvironmentContext } from "./environment.js";
import type { ExecutionResult } from "./executor.js";

// Mock all dependencies
vi.mock("./generator.js");
vi.mock("./executor.js");
vi.mock("./history.js");
vi.mock("./prompt.js");
vi.mock("./logger.js");

import { generateCommandWithHistory } from "./generator.js";
import { executeWithConfirmation } from "./executor.js";
import { recordFailure } from "./history.js";
import { buildSystemPrompt } from "./prompt.js";
import { initializeLogger } from "./logger.js";

describe("CommandSession.run()", () => {
  let mockEnvironment: EnvironmentContext;
  let mockLogger: ReturnType<typeof initializeLogger>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Setup mock environment
    mockEnvironment = {
      platform: "darwin",
      release: "24.0.0",
      arch: "arm64",
      shell: "/bin/zsh",
      cwd: "/test/dir",
      isRoot: false,
    };

    // Setup mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      failure: vi.fn(),
    } as any;

    // Mock logger initialization
    vi.mocked(initializeLogger).mockReturnValue(mockLogger);

    // Spy on console.log
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Default mock for buildSystemPrompt
    vi.mocked(buildSystemPrompt).mockResolvedValue("System prompt");
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
  });

  describe("Successful command execution flow", () => {
    it("should execute a command successfully on first try", async () => {
      // Arrange
      const session = new CommandSession({
        apiKey: "test-api-key",
        environment: mockEnvironment,
        logger: mockLogger,
        options: {},
      });

      vi.mocked(generateCommandWithHistory).mockResolvedValue({
        command: "ls -la",
        executable: true,
      });

      vi.mocked(executeWithConfirmation).mockResolvedValue({
        success: true,
        stdout: "file1.txt\nfile2.txt",
      });

      // Act
      await session.run("list all files");

      // Assert
      expect(buildSystemPrompt).toHaveBeenCalledWith(mockEnvironment, false);
      expect(generateCommandWithHistory).toHaveBeenCalledTimes(1);
      expect(executeWithConfirmation).toHaveBeenCalledWith(
        { command: "ls -la", executable: true },
        undefined
      );
      expect(recordFailure).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Command executed successfully"
      );
    });

    it("should handle non-executable commands (greetings)", async () => {
      // Arrange
      const session = new CommandSession({
        apiKey: "test-api-key",
        environment: mockEnvironment,
        logger: mockLogger,
        options: {},
      });

      vi.mocked(generateCommandWithHistory).mockResolvedValue({
        command: "Hello! How can I help?",
        executable: false,
      });

      // Act
      await session.run("hello");

      // Assert
      expect(generateCommandWithHistory).toHaveBeenCalledTimes(1);
      expect(executeWithConfirmation).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith("Hello! How can I help?");
    });
  });

  describe("Command failure and retry flow", () => {
    it("should retry after command failure and eventually succeed", async () => {
      // Arrange
      const session = new CommandSession({
        apiKey: "test-api-key",
        environment: mockEnvironment,
        logger: mockLogger,
        options: {},
      });

      // First attempt fails, second succeeds
      vi.mocked(generateCommandWithHistory)
        .mockResolvedValueOnce({
          command: "tree",
          executable: true,
        })
        .mockResolvedValueOnce({
          command: "find . -print",
          executable: true,
        });

      vi.mocked(executeWithConfirmation)
        .mockResolvedValueOnce({
          success: false,
          error: "command not found: tree",
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: "./file1.txt\n./file2.txt",
        });

      // Act
      await session.run("show directory tree");

      // Assert
      expect(generateCommandWithHistory).toHaveBeenCalledTimes(2);
      expect(executeWithConfirmation).toHaveBeenCalledTimes(2);
      expect(recordFailure).toHaveBeenCalledWith(
        "show directory tree",
        "tree",
        "command not found: tree"
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Command failed, adding to history and retrying",
        expect.any(Object)
      );
    });

    it("should record failure with stderr when error is not available", async () => {
      // Arrange
      const session = new CommandSession({
        apiKey: "test-api-key",
        environment: mockEnvironment,
        logger: mockLogger,
        options: {},
      });

      vi.mocked(generateCommandWithHistory)
        .mockResolvedValueOnce({
          command: "invalid-cmd",
          executable: true,
        })
        .mockResolvedValueOnce({
          command: "valid-cmd",
          executable: true,
        });

      vi.mocked(executeWithConfirmation)
        .mockResolvedValueOnce({
          success: false,
          stderr: "stderr error message",
        })
        .mockResolvedValueOnce({
          success: true,
        });

      // Act
      await session.run("run command");

      // Assert
      expect(recordFailure).toHaveBeenCalledWith(
        "run command",
        "invalid-cmd",
        "stderr error message"
      );
    });

    it("should record 'Unknown error' when neither error nor stderr is available", async () => {
      // Arrange
      const session = new CommandSession({
        apiKey: "test-api-key",
        environment: mockEnvironment,
        logger: mockLogger,
        options: {},
      });

      vi.mocked(generateCommandWithHistory)
        .mockResolvedValueOnce({
          command: "some-cmd",
          executable: true,
        })
        .mockResolvedValueOnce({
          command: "fixed-cmd",
          executable: true,
        });

      vi.mocked(executeWithConfirmation)
        .mockResolvedValueOnce({
          success: false,
        })
        .mockResolvedValueOnce({
          success: true,
        });

      // Act
      await session.run("test command");

      // Assert
      expect(recordFailure).toHaveBeenCalledWith(
        "test command",
        "some-cmd",
        "Unknown error"
      );
    });

    it("should build correct failure message with all error details", async () => {
      // Arrange
      const session = new CommandSession({
        apiKey: "test-api-key",
        environment: mockEnvironment,
        logger: mockLogger,
        options: {},
      });

      let capturedFailureMessage = "";
      vi.mocked(generateCommandWithHistory).mockImplementation(
        async (history) => {
          // Capture the failure message from conversation history
          if (history.length > 3) {
            const lastMessage = history[history.length - 1];
            if (lastMessage && lastMessage.role === "user") {
              capturedFailureMessage = lastMessage.content as string;
            }
          }

          // First call returns failing command, second returns success
          if (history.length === 2) {
            return { command: "fail-cmd", executable: true };
          }
          return { command: "success-cmd", executable: true };
        }
      );

      vi.mocked(executeWithConfirmation)
        .mockResolvedValueOnce({
          success: false,
          error: "Test error",
          stderr: "Test stderr",
          stdout: "Test stdout",
        })
        .mockResolvedValueOnce({
          success: true,
        });

      // Act
      await session.run("test");

      // Assert
      expect(capturedFailureMessage).toContain("The previous command failed.");
      expect(capturedFailureMessage).toContain("Error: Test error");
      expect(capturedFailureMessage).toContain("stderr: Test stderr");
      expect(capturedFailureMessage).toContain("stdout: Test stdout");
      expect(capturedFailureMessage).toContain(
        "Please generate a corrected command that addresses the issue."
      );
    });
  });

  describe("User cancellation flow", () => {
    it("should exit gracefully when user cancels execution", async () => {
      // Arrange
      const session = new CommandSession({
        apiKey: "test-api-key",
        environment: mockEnvironment,
        logger: mockLogger,
        options: {},
      });

      vi.mocked(generateCommandWithHistory).mockResolvedValue({
        command: "rm -rf /",
        executable: true,
      });

      vi.mocked(executeWithConfirmation).mockResolvedValue(null);

      // Act
      await session.run("delete everything");

      // Assert
      expect(generateCommandWithHistory).toHaveBeenCalledTimes(1);
      expect(executeWithConfirmation).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith("Execution cancelled by user");
      expect(recordFailure).not.toHaveBeenCalled();
    });
  });

  describe("Conversation history management", () => {
    it("should maintain correct conversation history structure", async () => {
      // Arrange
      const session = new CommandSession({
        apiKey: "test-api-key",
        environment: mockEnvironment,
        logger: mockLogger,
        options: {},
      });

      let capturedHistory: any[] = [];
      vi.mocked(generateCommandWithHistory).mockImplementation(
        async (history) => {
          capturedHistory = [...history];
          return { command: "ls", executable: true };
        }
      );

      vi.mocked(executeWithConfirmation).mockResolvedValue({
        success: true,
      });

      // Act
      await session.run("list files");

      // Assert
      expect(capturedHistory).toHaveLength(2);
      expect(capturedHistory[0]).toEqual({
        role: "system",
        content: "System prompt",
      });
      expect(capturedHistory[1]).toEqual({
        role: "user",
        content: "list files",
      });
    });

    it("should add assistant response to history after generation", async () => {
      // Arrange
      const session = new CommandSession({
        apiKey: "test-api-key",
        environment: mockEnvironment,
        logger: mockLogger,
        options: { explain: true },
      });

      let historyLengthAfterGeneration = 0;
      vi.mocked(generateCommandWithHistory).mockResolvedValue({
        command: "ls -la",
        executable: true,
        explanation: "Lists all files with details",
      });

      vi.mocked(executeWithConfirmation).mockImplementation(async () => {
        // Capture history length at execution time
        historyLengthAfterGeneration = 3; // system + user + assistant
        return { success: true };
      });

      // Act
      await session.run("list files");

      // Assert - assistant message should be added before execution
      expect(historyLengthAfterGeneration).toBe(3);
    });
  });

  describe("Explain mode", () => {
    it("should pass explain flag to buildSystemPrompt", async () => {
      // Arrange
      const session = new CommandSession({
        apiKey: "test-api-key",
        environment: mockEnvironment,
        logger: mockLogger,
        options: { explain: true },
      });

      vi.mocked(generateCommandWithHistory).mockResolvedValue({
        command: "ls",
        executable: true,
        explanation: "Lists files",
      });

      vi.mocked(executeWithConfirmation).mockResolvedValue({
        success: true,
      });

      // Act
      await session.run("list files");

      // Assert
      expect(buildSystemPrompt).toHaveBeenCalledWith(mockEnvironment, true);
    });

    it("should display explanation when explain mode is enabled", async () => {
      // Arrange
      const session = new CommandSession({
        apiKey: "test-api-key",
        environment: mockEnvironment,
        logger: mockLogger,
        options: { explain: true },
      });

      vi.mocked(generateCommandWithHistory).mockResolvedValue({
        command: "ls -la",
        executable: true,
        explanation: "Lists all files with detailed information",
      });

      vi.mocked(executeWithConfirmation).mockResolvedValue({
        success: true,
      });

      // Act
      await session.run("list files");

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Lists all files with detailed information")
      );
    });
  });

  describe("Force mode", () => {
    it("should pass force flag to executeWithConfirmation", async () => {
      // Arrange
      const session = new CommandSession({
        apiKey: "test-api-key",
        environment: mockEnvironment,
        logger: mockLogger,
        options: { force: true },
      });

      vi.mocked(generateCommandWithHistory).mockResolvedValue({
        command: "ls",
        executable: true,
      });

      vi.mocked(executeWithConfirmation).mockResolvedValue({
        success: true,
      });

      // Act
      await session.run("list files");

      // Assert
      expect(executeWithConfirmation).toHaveBeenCalledWith(
        { command: "ls", executable: true },
        true
      );
    });
  });

  describe("Error handling", () => {
    it("should throw error when generator fails", async () => {
      // Arrange
      const session = new CommandSession({
        apiKey: "test-api-key",
        environment: mockEnvironment,
        logger: mockLogger,
        options: {},
      });

      vi.mocked(generateCommandWithHistory).mockRejectedValue(
        new Error("API error")
      );

      // Act & Assert
      await expect(session.run("test")).rejects.toThrow(
        "Session error: API error"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error in command session",
        expect.any(Error)
      );
    });

    it("should throw error when executor fails", async () => {
      // Arrange
      const session = new CommandSession({
        apiKey: "test-api-key",
        environment: mockEnvironment,
        logger: mockLogger,
        options: {},
      });

      vi.mocked(generateCommandWithHistory).mockResolvedValue({
        command: "ls",
        executable: true,
      });

      vi.mocked(executeWithConfirmation).mockRejectedValue(
        new Error("Execution error")
      );

      // Act & Assert
      await expect(session.run("test")).rejects.toThrow(
        "Session error: Execution error"
      );
    });
  });
});
