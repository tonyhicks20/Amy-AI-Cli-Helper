#!/usr/bin/env node

import { run } from "../src/index.js";
import { showHelp, showConfigMenu } from "../src/commands/index.js";

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
const explain = explainFlagIndex !== -1;
if (explain) {
  // Remove the explain flag and get the remaining arguments
  const explainArgs = args.filter((arg, index) => index !== explainFlagIndex);
  const userPrompt = explainArgs.join(" ");

  if (!userPrompt) {
    console.error("Usage: amy -explain <natural language command>");
    console.error("       amy --explain <natural language command>");
    process.exit(1);
  }
}

// Check for force flag
const forceIndex = args.indexOf("--force");
const force = forceIndex !== -1;
if (force) args.splice(forceIndex, 1);

const userPrompt = args.join(" ");

if (!userPrompt) {
  console.error("Usage: amy <natural language command>");
  console.error("       amy --force <natural language command>");
  console.error("       amy -help");
  console.error("       amy -config");
  console.error("       amy -explain <natural language command>");
  process.exit(1);
}

run(userPrompt, { force, explain });
