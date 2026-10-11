#!/usr/bin/env node
import { spawn } from "node:child_process";
const child = spawn(process.execPath, ["node_modules/jest/bin/jest.js", "--runInBand", ...process.argv.slice(2)], { stdio: "inherit" });
child.on("error", () => { process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
