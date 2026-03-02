import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT_DIR = process.cwd();
const TARGET_DIR = join(ROOT_DIR, 'src');

const DIR_NAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FILE_STEM_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EXTENSIONS = ['.d.ts', '.ts', '.tsx', '.js', '.jsx', '.css', '.json'];

function stripExtension(fileName) {
  const matched = EXTENSIONS.find(ext => fileName.endsWith(ext));
  if (!matched) {
    return null;
  }
  return fileName.slice(0, -matched.length);
}

function validatePath(fullPath, violations) {
  const relPath = relative(TARGET_DIR, fullPath);
  const parts = relPath.split('/').filter(Boolean);
  if (parts.length === 0) {
    return;
  }

  const fileName = parts[parts.length - 1];
  const stem = stripExtension(fileName);
  if (!stem || !FILE_STEM_REGEX.test(stem)) {
    violations.push(relPath);
  }

  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!DIR_NAME_REGEX.test(parts[i])) {
      violations.push(relPath);
      break;
    }
  }
}

function walk(dirPath, violations) {
  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, violations);
      continue;
    }
    validatePath(fullPath, violations);
  }
}

const violations = [];
walk(TARGET_DIR, violations);

if (violations.length > 0) {
  console.error('File naming violations detected (expected lowercase kebab-case):');
  violations.sort((a, b) => a.localeCompare(b)).forEach(path => console.error(`- ${path}`));
  process.exit(1);
}

console.log('File naming check passed.');
