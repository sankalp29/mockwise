/**
 * Pure-logic checks for resolveAuthBypass (no Vitest / Vite required).
 * Run: node src/utils/authBypass.resolve.test.mjs
 */
import { resolveAuthBypass } from './authBypassLogic.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('OK:', msg);
  }
}

assert(resolveAuthBypass('true', false).bypass === true, 'dev + flag => bypass on');
assert(resolveAuthBypass('TRUE', false).bypass === true, 'case-insensitive flag');
assert(resolveAuthBypass('true', true).bypass === false, 'prod + flag => bypass off');
assert(resolveAuthBypass('true', true).blockedInProd === true, 'prod + flag => blockedInProd');
assert(resolveAuthBypass('false', false).bypass === false, 'dev + false => off');
assert(resolveAuthBypass(undefined, false).bypass === false, 'missing flag => off');
assert(resolveAuthBypass('', true).bypass === false, 'prod + empty => off');

if (!process.exitCode) {
  console.log('All resolveAuthBypass checks passed.');
}
