import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
function readEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return {};
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const env = {};
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        const separator = trimmed.indexOf('=');
        if (separator <= 0) {
            continue;
        }
        const key = trimmed.slice(0, separator).trim();
        const value = trimmed.slice(separator + 1).trim();
        env[key] = value;
    }
    return env;
}
const [, , scriptPath, ...extraArgs] = process.argv;
if (!scriptPath) {
    console.error('Usage: node performance/k6/run-k6.mjs <compiled-script-path> [k6 args...]');
    process.exit(1);
}
const rootDir = process.cwd();
const envPath = path.join(rootDir, 'performance/k6/.env.k6');
const fileEnv = readEnvFile(envPath);
const mergedEnv = { ...process.env, ...fileEnv };
const run = spawnSync('k6', ['run', scriptPath, ...extraArgs], {
    stdio: 'inherit',
    env: mergedEnv,
});
if (run.error) {
    console.error(run.error.message);
    process.exit(1);
}
process.exit(run.status ?? 1);
