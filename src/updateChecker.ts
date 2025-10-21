import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

interface PackageInfo {
  version: string;
}

interface LocalPackageInfo {
  name: string;
  version: string;
}

/**
 * Get the package.json path, trying different locations
 */
function _getPackageJsonPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Try to read package.json from different locations
  let packageJsonPath = join(__dirname, '..', 'package.json');

  try {
    readFileSync(packageJsonPath, 'utf-8');
    return packageJsonPath;
  } catch {
    // Try one more level up (for dist/src/)
    return join(__dirname, '..', '..', 'package.json');
  }
}

/**
 * Get the local package info (name and version) from package.json
 */
function _getLocalPackageInfo(): LocalPackageInfo {
  const packageJsonPath = _getPackageJsonPath();
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  return {
    name: packageJson.name,
    version: packageJson.version
  };
}

/**
 * Fetch the latest version from npm registry
 */
function _fetchLatestVersion(packageName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'registry.npmjs.org',
      path: `/${packageName}/latest`,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const packageInfo: PackageInfo = JSON.parse(data);
          resolve(packageInfo.version);
        } catch (error) {
          reject(new Error('Failed to parse npm registry response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Compare two version strings
 * Returns true if remoteVersion is greater than localVersion
 */
function _isNewerVersion(localVersion: string, remoteVersion: string): boolean {
  const local = localVersion.split('.').map(Number);
  const remote = remoteVersion.split('.').map(Number);

  for (let i = 0; i < Math.max(local.length, remote.length); i++) {
    const localPart = local[i] || 0;
    const remotePart = remote[i] || 0;

    if (remotePart > localPart) return true;
    if (remotePart < localPart) return false;
  }

  return false;
}

/**
 * Check for updates and display a notification if available
 * This function is non-blocking and will not throw errors
 */
export async function checkForUpdates(): Promise<void> {
  try {
    const { name: packageName, version: localVersion } = _getLocalPackageInfo();
    const latestVersion = await _fetchLatestVersion(packageName);

    if (_isNewerVersion(localVersion, latestVersion)) {
      console.log('');
      console.log('╭─────────────────────────────────────────────────╮');
      console.log('│  🔔 Update Available!                           │');
      console.log('│                                                 │');
      console.log(`│  Current version: ${localVersion.padEnd(29)} │`);
      console.log(`│  Latest version:  ${latestVersion.padEnd(29)} │`);
      console.log('│                                                 │');
      console.log('│  Update with:                                   │');
      console.log(`│  npm update -g ${packageName.padEnd(30)} │`);
      console.log('╰─────────────────────────────────────────────────╯');
      console.log('');
    }
  } catch (error) {
    // Silently fail - don't interrupt the user's workflow
    // Updates are a nice-to-have, not critical
  }
}
