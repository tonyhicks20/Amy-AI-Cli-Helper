import winston from 'winston';
import path from 'path';
import os from 'os';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logFile?: string;
}

class Logger {
  private winston: winston.Logger;
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.winston = this.createWinstonLogger();
  }

  private createWinstonLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} [${level}]: ${message}${metaStr}`;
            })
          )
        })
      );
    }

    // File transport
    if (this.config.enableFile && this.config.logFile) {
      transports.push(
        new winston.transports.File({
          filename: this.config.logFile,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );
    }

    return winston.createLogger({
      level: this.config.level,
      transports,
      exitOnError: false
    });
  }

  error(message: string, meta?: any): void {
    this.winston.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.winston.warn(message, meta);
  }

  info(message: string, meta?: any): void {
    this.winston.info(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.winston.debug(message, meta);
  }

  // Convenience methods for CLI output
  success(message: string): void {
    this.info(`✅ ${message}`);
  }

  failure(message: string): void {
    this.error(`❌ ${message}`);
  }

  warning(message: string): void {
    this.warn(`⚠️  ${message}`);
  }

  command(message: string): void {
    this.info(`📋 ${message}`);
  }

  // Update log level at runtime
  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.winston.level = level;
  }

  // Get current configuration
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Default configuration
const defaultConfig: LoggerConfig = {
  level: LogLevel.INFO,
  enableConsole: true,
  enableFile: false
};

// Create default logger instance
let logger: Logger;

export function initializeLogger(config?: Partial<LoggerConfig>): Logger {
  const finalConfig = { ...defaultConfig, ...config };

  // Set default log file if file logging is enabled but no file specified
  if (finalConfig.enableFile && !finalConfig.logFile) {
    finalConfig.logFile = path.join(os.homedir(), '.amy-command-tool', 'amy.log');
  }

  logger = new Logger(finalConfig);
  return logger;
}

export function getLogger(): Logger {
  if (!logger) {
    logger = initializeLogger();
  }
  return logger;
}

// Export convenience functions
export const log = {
  error: (message: string, meta?: any) => getLogger().error(message, meta),
  warn: (message: string, meta?: any) => getLogger().warn(message, meta),
  info: (message: string, meta?: any) => getLogger().info(message, meta),
  debug: (message: string, meta?: any) => getLogger().debug(message, meta),
  success: (message: string) => getLogger().success(message),
  failure: (message: string) => getLogger().failure(message),
  warning: (message: string) => getLogger().warning(message),
  command: (message: string) => getLogger().command(message)
};
