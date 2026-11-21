#!/usr/bin/env node
/**
 * MediBridge Security & Repository Hygiene Verification Script
 *
 * Checks:
 * 1. Git tracked files: ensures no .env files, private keys, or uploaded assets are tracked in git.
 * 2. Production secret validation: ensures production secrets are not placeholders or weak.
 *
 * Usage:
 *   node src/scripts/securityCheck.js
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

console.log('🛡️  Running MediBridge Security Hygiene Verification...\n');

let hasErrors = false;

// 1. Check Git Tracked Files via git ls-files
try {
  const trackedFilesOutput = execSync('git ls-files', { cwd: rootDir, encoding: 'utf8' });
  const trackedFiles = trackedFilesOutput
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);

  const sensitivePatterns = [
    /^\.env$/i,
    /^\.env\.(production|local|test|staging)$/i,
    /^backend\/\.env$/i,
    /^backend\/\.env\.(production|local|test|staging)$/i,
    /^frontend\/\.env$/i,
    /^frontend\/\.env\.(production|local|test|staging)$/i,
    /^uploads\/.*\.(jpg|jpeg|png|webp|pdf)$/i,
    /^backend\/uploads\/.*\.(jpg|jpeg|png|webp|pdf)$/i,
    /\.(pem|key|pfx|pkcs12|secret)$/i,
    /id_rsa/i,
  ];

  const leaks = trackedFiles.filter((filePath) =>
    sensitivePatterns.some((pattern) => pattern.test(filePath))
  );

  if (leaks.length > 0) {
    console.error('❌ SECURITY ALERT: Sensitive files detected in Git repository:');
    leaks.forEach((f) => console.error(`   - ${f}`));
    hasErrors = true;
  } else {
    console.log('✅ Git Hygiene: No sensitive .env files, credentials, or uploaded media tracked in git.');
  }
} catch (err) {
  console.warn('⚠️  Warning: Unable to inspect git tracking:', err.message);
}

// 2. Secret Hygiene & Placeholder Verification
const checkSecretStrength = (name, value, minLen) => {
  if (!value) return true; // not set locally is acceptable if handled by env validation in prod
  const lower = value.toLowerCase();
  const placeholders = ['placeholder', 'change_this', 'replace_with', 'secret_key_here', 'todo'];
  const isPlaceholder = placeholders.some((ph) => lower.includes(ph));

  if (isPlaceholder) {
    console.error(`❌ Security Error: ${name} contains an insecure placeholder value.`);
    return false;
  }

  if (value.length < minLen) {
    console.error(`❌ Security Error: ${name} is too short (length ${value.length}, minimum ${minLen}).`);
    return false;
  }

  return true;
};

const jwtSecret = process.env.JWT_SECRET;
const cronSecret = process.env.CRON_SECRET;
const qrSecret = process.env.QR_SIGNING_SECRET;

if (process.env.NODE_ENV === 'production') {
  if (!checkSecretStrength('JWT_SECRET', jwtSecret, 32)) hasErrors = true;
  if (!checkSecretStrength('CRON_SECRET', cronSecret, 24)) hasErrors = true;
  if (!checkSecretStrength('QR_SIGNING_SECRET', qrSecret, 32)) hasErrors = true;
}

if (hasErrors) {
  console.error('\n❌ Security checks failed! Resolve the above errors before deploying to production.\n');
  process.exit(1);
} else {
  console.log('✅ Security Hygiene: All pre-deployment repository and secret integrity checks passed!\n');
  process.exit(0);
}
