import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
const browserPath = path.join(root, '.playwright-browsers');
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: root,
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: browserPath,
  },
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
