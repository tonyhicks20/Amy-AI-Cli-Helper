import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadHistory, recordFailure } from "./history.js";
import fs from "fs/promises";
import os from "os";
import path from "path";

// Mock fs and logger
vi.mock("fs/promises");
vi.mock("./logger.js", () => ({
  log: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    failure: vi.fn(),
  },
}));

describe("history.ts", () => {
  const CONFIG_DIR = path.join(os.homedir(), ".amy-command-tool");
  const HISTORY_PATH = path.join(CONFIG_DIR, "command-history.json");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadHistory()", () => {
    it("should return empty history when file does not exist", async () => {
      // Arrange
      vi.mocked(fs.open).mockResolvedValue(null as any);

      // Act
      const result = await loadHistory();

      // Assert
      expect(result).toEqual({ failures: [] });
    });

    it("should load and parse existing history file", async () => {
      // Arrange
      const mockFileHandle = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(fs.open).mockResolvedValue(mockFileHandle as any);

      const mockHistory = {
        failures: [
          {
            userIntent: "list files",
            failedCommand: "tree",
            error: "command not found",
          },
        ],
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockHistory));

      // Act
      const result = await loadHistory();

      // Assert
      expect(result).toEqual(mockHistory);
      expect(mockFileHandle.close).toHaveBeenCalled();
    });

    it("should return empty history and log error on invalid JSON", async () => {
      // Arrange
      const mockFileHandle = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(fs.open).mockResolvedValue(mockFileHandle as any);
      vi.mocked(fs.readFile).mockResolvedValue("invalid json{");

      // Act
      const result = await loadHistory();

      // Assert
      expect(result).toEqual({ failures: [] });
    });
  });

  describe("recordFailure()", () => {
    it("should create new history file with single failure", async () => {
      // Arrange
      const mockFileHandle = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(fs.open).mockResolvedValue(null as any); // File doesn't exist
      vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      // Act
      await recordFailure("show tree", "tree", "command not found: tree");

      // Assert
      expect(fs.mkdir).toHaveBeenCalledWith(CONFIG_DIR, { recursive: true });

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenData = writeCall[1] as string;

      expect(writtenData).toContain('"userIntent": "show tree"');
      expect(writtenData).toContain('"failedCommand": "tree"');
      expect(writtenData).toContain('"error": "command not found: tree"');
    });

    it("should append to existing history", async () => {
      // Arrange
      const mockFileHandle = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(fs.open).mockResolvedValue(mockFileHandle as any);

      const existingHistory = {
        failures: [
          {
            userIntent: "old command",
            failedCommand: "old-cmd",
            error: "old error",
          },
        ],
      };
      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify(existingHistory)
      );
      vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      // Act
      await recordFailure("new command", "new-cmd", "new error");

      // Assert
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);

      expect(writtenData.failures).toHaveLength(2);
      expect(writtenData.failures[0]).toEqual(existingHistory.failures[0]);
      expect(writtenData.failures[1]).toEqual({
        userIntent: "new command",
        failedCommand: "new-cmd",
        error: "new error",
      });
    });

    it("should trim history when exceeding MAX_HISTORY_SIZE (200)", async () => {
      // Arrange
      const mockFileHandle = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(fs.open).mockResolvedValue(mockFileHandle as any);

      // Create 200 existing failures
      const existingFailures = Array.from({ length: 200 }, (_, i) => ({
        userIntent: `command ${i}`,
        failedCommand: `cmd-${i}`,
        error: `error ${i}`,
      }));

      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify({ failures: existingFailures })
      );
      vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      // Act
      await recordFailure("command 201", "cmd-201", "error 201");

      // Assert
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);

      expect(writtenData.failures).toHaveLength(200);
      expect(writtenData.failures[0]).toEqual(existingFailures[1]); // First one removed
      expect(writtenData.failures[199]).toEqual({
        userIntent: "command 201",
        failedCommand: "cmd-201",
        error: "error 201",
      });
    });

    it("should properly format JSON with indentation", async () => {
      // Arrange
      const mockFileHandle = {
        close: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(fs.open).mockResolvedValue(null as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      // Act
      await recordFailure("test", "test-cmd", "test error");

      // Assert
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenJson = writeCall[1] as string;

      // Check for proper indentation (2 spaces)
      expect(writtenJson).toContain('  "failures"');
      expect(writtenJson).toContain('    "userIntent"');
    });
  });
});
