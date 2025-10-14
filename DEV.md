# Bob CLI Tool - Local Development Commands

## How npm link Works

`npm link` creates a symbolic link from your global npm packages to your local development directory.

## Installation Commands

```bash
cd /Users/tonyhicks/Projects/AIConsole
npm link
```

This creates:
- Global command: `bob`
- Symbolic link: `/opt/homebrew/bin/bob` → `../lib/node_modules/bob/dist/bin/cli.js`

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
npm unlink bob
```

## Check Status Commands

```bash
# Check if bob is installed
which bob

# Check the link target
ls -la /opt/homebrew/bin/bob
```

## Complete Workflow

1. Make changes to TypeScript files
2. Run `npm run build`
3. Test with `bob "your command"`
4. Changes are immediately available since it's linked