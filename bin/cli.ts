#!/usr/bin/env node

import { run } from "../src/index.js";
import { showHelp, showConfigMenu, explainCommand } from "../src/commands/index.js";

const args = process.argv.slice(2);

// Handle help command
if (args.length === 0 || args.includes('-help') || args.includes('--help')) {
  showHelp();
  process.exit(0);
}

// Handle config command
if (args.includes('-config') || args.includes('--config')) {
  showConfigMenu();
  process.exit(0);
}

// Handle explain command
const explainIndex = args.indexOf('-explain');
const explainLongIndex = args.indexOf('--explain');
const explainFlagIndex = explainIndex !== -1 ? explainIndex : explainLongIndex;

if (explainFlagIndex !== -1) {
  // Remove the explain flag and get the remaining arguments
  const explainArgs = args.filter((arg, index) => index !== explainFlagIndex);
  const userPrompt = explainArgs.join(" ");

  if (!userPrompt) {
    console.error("Usage: bob -explain <natural language command>");
    console.error("       bob --explain <natural language command>");
    process.exit(1);
  }

  explainCommand(userPrompt);
  process.exit(0);
}

// Check for force flag
const forceIndex = args.indexOf("--force");
const force = forceIndex !== -1;
if (force) args.splice(forceIndex, 1);

const userPrompt = args.join(" ");

if (!userPrompt) {
  console.error("Usage: bob <natural language command>");
  console.error("       bob --force <natural language command>");
  console.error("       bob -help");
  console.error("       bob -config");
  console.error("       bob -explain <natural language command>");
  process.exit(1);
}

run(userPrompt, { force });
