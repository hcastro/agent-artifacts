#!/usr/bin/env npx tsx
/**
 * Auth Verify - Verify your Evernote token is valid
 *
 * Usage:
 *   npx tsx scripts/auth-verify.ts
 */

import { verifyToken } from './evernote-client.js';

async function main() {
  console.log('Verifying Evernote token...\n');

  const result = await verifyToken();

  if (result.valid) {
    console.log('✅ Token is valid!');
    console.log(`   Authenticated as: ${result.username}`);
    process.exit(0);
  } else {
    console.error('❌ Token is invalid or expired');
    console.error(`   Error: ${result.error}`);
    console.error('\nTo fix this:');
    console.error('1. Check that EVERNOTE_TOKEN is set correctly');
    console.error('2. If using OAuth, your token may have expired - re-authorize');
    console.error('3. If using a developer token, verify it hasn\'t been revoked');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
