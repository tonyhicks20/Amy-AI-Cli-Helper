import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildSystemPrompt } from "./prompt.js";
import type { EnvironmentContext } from "./environment.js";

// Mock history module
vi.mock("./history.js", () => ({
  loadHistory: vi.fn(),
}));

import { loadHistory } from "./history.js";

describe("prompt.ts", () => {
  let mockEnvironment: EnvironmentContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEnvironment = {
      platform: "darwin",
      release: "24.0.0",
      arch: "arm64",
      shell: "/bin/zsh",
      cwd: "/test/dir",
      isRoot: false,
    };
  });

  describe("buildSystemPrompt()", () => {
    it("should include environment information", async () => {
      // Arrange
      vi.mocked(loadHistory).mockResolvedValue({ failures: [] });

      // Act
      const result = await buildSystemPrompt(mockEnvironment, false);

      // Assert
      expect(result).toContain("ENVIRONMENT:");
      expect(result).toContain("Operating System: darwin (24.0.0)");
      expect(result).toContain("Architecture: arm64");
      expect(result).toContain("Shell: /bin/zsh");
      expect(result).toContain("Working Directory: /test/dir");
      expect(result).toContain("Running as root: false");
    });

    it("should include base CRITICAL RULES", async () => {
      // Arrange
      vi.mocked(loadHistory).mockResolvedValue({ failures: [] });

      // Act
      const result = await buildSystemPrompt(mockEnvironment, false);

      // Assert
      expect(result).toContain("CRITICAL RULES:");
      expect(result).toContain("ALWAYS output your response as valid JSON");
      expect(result).toContain(
        "Generate the ACTUAL command that should be executed"
      );
      expect(result).toContain("Use syntax appropriate for the detected shell");
      expect(result).toContain("Prefer non-destructive operations");
    });

    it("should include standard examples when explain mode is false", async () => {
      // Arrange
      vi.mocked(loadHistory).mockResolvedValue({ failures: [] });

      // Act
      const result = await buildSystemPrompt(mockEnvironment, false);

      // Assert
      expect(result).toContain("Examples:");
      expect(result).toContain('"command": "ls -l"');
      expect(result).toContain('"command": "lsof -ti:5000 | xargs kill -9"');
      expect(result).toContain('"command": "df -h"');
      expect(result).not.toContain("EXPLANATION MODE:");
    });

    it("should include explanation mode instructions when explain is true", async () => {
      // Arrange
      vi.mocked(loadHistory).mockResolvedValue({ failures: [] });

      // Act
      const result = await buildSystemPrompt(mockEnvironment, true);

      // Assert
      expect(result).toContain("EXPLANATION MODE:");
      expect(result).toContain(
        "provide a concise breakdown with each flag/portion on a separate line"
      );
      expect(result).toContain('"explanation": "detailed_explanation"');
      expect(result).not.toContain("Examples:");
    });

    it("should include failure history when available", async () => {
      // Arrange
      vi.mocked(loadHistory).mockResolvedValue({
        failures: [
          {
            userIntent: "show directory tree",
            failedCommand: "tree",
            error: "command not found: tree",
          },
          {
            userIntent: "list processes",
            failedCommand: "ps aux | grep node",
            error: "grep: invalid option",
          },
        ],
      });

      // Act
      const result = await buildSystemPrompt(mockEnvironment, false);

      // Assert
      expect(result).toContain("LEARNING FROM PAST FAILURES:");
      expect(result).toContain(
        "The following commands have failed in the past"
      );
      expect(result).toContain('Intent: "show directory tree"');
      expect(result).toContain("Failed Command: tree");
      expect(result).toContain("Error: command not found: tree");
      expect(result).toContain('Intent: "list processes"');
      expect(result).toContain("Failed Command: ps aux | grep node");
      expect(result).toContain("Error: grep: invalid option");
    });

    it("should not include failure section when history is empty", async () => {
      // Arrange
      vi.mocked(loadHistory).mockResolvedValue({ failures: [] });

      // Act
      const result = await buildSystemPrompt(mockEnvironment, false);

      // Assert
      expect(result).not.toContain("LEARNING FROM PAST FAILURES:");
    });

    it("should handle root user environment correctly", async () => {
      // Arrange
      const rootEnvironment: EnvironmentContext = {
        ...mockEnvironment,
        isRoot: true,
      };
      vi.mocked(loadHistory).mockResolvedValue({ failures: [] });

      // Act
      const result = await buildSystemPrompt(rootEnvironment, false);

      // Assert
      expect(result).toContain("Running as root: true");
    });

    it("should include explanation field in JSON spec when explain is true", async () => {
      // Arrange
      vi.mocked(loadHistory).mockResolvedValue({ failures: [] });

      // Act
      const result = await buildSystemPrompt(mockEnvironment, true);

      // Assert
      expect(result).toContain(
        '"command": "actual_command", "executable": true/false, "explanation": "detailed_explanation"'
      );
    });

    it("should not include explanation field in JSON spec when explain is false", async () => {
      // Arrange
      vi.mocked(loadHistory).mockResolvedValue({ failures: [] });

      // Act
      const result = await buildSystemPrompt(mockEnvironment, false);

      // Assert
      expect(result).toContain(
        '"command": "actual_command", "executable": true/false }'
      );
      expect(result).not.toContain(', "explanation"');
    });

    it("should format multiple failures with proper numbering", async () => {
      // Arrange
      vi.mocked(loadHistory).mockResolvedValue({
        failures: [
          { userIntent: "cmd1", failedCommand: "fail1", error: "error1" },
          { userIntent: "cmd2", failedCommand: "fail2", error: "error2" },
          { userIntent: "cmd3", failedCommand: "fail3", error: "error3" },
        ],
      });

      // Act
      const result = await buildSystemPrompt(mockEnvironment, false);

      // Assert
      expect(result).toContain("1. Intent:");
      expect(result).toContain("2. Intent:");
      expect(result).toContain("3. Intent:");
    });

    it("should maintain consistent prompt structure across calls", async () => {
      // Arrange
      vi.mocked(loadHistory).mockResolvedValue({ failures: [] });

      // Act
      const result1 = await buildSystemPrompt(mockEnvironment, false);
      const result2 = await buildSystemPrompt(mockEnvironment, false);

      // Assert
      expect(result1).toEqual(result2);
    });
  });
});
