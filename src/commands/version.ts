import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export function showVersion(): void {
  try {
    // Get the directory of the current module
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Read package.json from the project root
    // In development: src/commands/version.ts -> ../../package.json
    // In production: dist/src/commands/version.js -> ../../../package.json
    let packageJsonPath = join(__dirname, '..', '..', 'package.json');

    // Check if we're running from dist directory
    try {
      readFileSync(packageJsonPath, 'utf-8');
    } catch {
      // Try one more level up (for dist/src/commands/)
      packageJsonPath = join(__dirname, '..', '..', '..', 'package.json');
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    console.log(`Amy version ${packageJson.version}`);
  } catch (error) {
    console.error('Error reading version:', error);
    process.exit(1);
  }
}
