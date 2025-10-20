# Amy CLI Tool - Local Development Commands

## How npm link Works

`npm link` creates a symbolic link from your global npm packages to your local development directory.

## Installation Commands

```bash
cd /Users/tonyhicks/Projects/AIConsole
npm link
```

This creates:
- Global command: `amy`
- Symbolic link: `/opt/homebrew/bin/amy` → `../lib/node_modules/amy/dist/bin/cli.js`

## Update Commands

### Method 1: Rebuild only (usually sufficient)
```bash
cd /Users/tonyhicks/Projects/AIConsole
npm run build
```

### Method 2: Complete refresh
```bash
cd /Users/tonyhicks/Projects/AIConsole
npm run build
npm unlink
npm link
```

## Remove Commands

```bash
npm unlink amy
```

## Check Status Commands

```bash
# Check if amy is installed
which amy

# Check the link target
ls -la /opt/homebrew/bin/amy
```

## Complete Workflow

1. Make changes to TypeScript files
2. Run `npm run build`
3. Test with `amy "your command"`
4. Changes are immediately available since it's linked