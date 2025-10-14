#!/usr/bin/env node

import { run } from "../src/index.js";

const args = process.argv.slice(2);

// Check for flags
const forceIndex = args.indexOf("--force");
const force = forceIndex !== -1;
if (force) args.splice(forceIndex, 1);

const userPrompt = args.join(" ");

if (!userPrompt) {
  console.error("Usage: bob <natural language command>");
  console.error("       bob --force <natural language command>");
  process.exit(1);
}

run(userPrompt, { force });
