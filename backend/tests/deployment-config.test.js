import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSafeEmailFrom, parseBooleanEnv, resolveCookieSameSite } from '../config/security.js';
import { buildSmtpTransportOptions } from '../services/emailService.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..');
const repositoryRoot = path.resolve(backendRoot, '..');

test('production sender validation accepts normal mailboxes and display names', () => {
  assert.equal(isSafeEmailFrom('noreply@smartlf.seu.ac.lk'), true);
  assert.equal(isSafeEmailFrom('Smart Lost & Found <noreply@smartlf.seu.ac.lk>'), true);
});

test('production sender validation rejects injection, malformed and placeholder senders', () => {
  assert.equal(isSafeEmailFrom(''), false);
  assert.equal(isSafeEmailFrom('not-an-email'), false);
  assert.equal(isSafeEmailFrom('Smart L&F <noreply@example.invalid>'), false);
  assert.equal(isSafeEmailFrom('noreply@example.com'), false);
  assert.equal(isSafeEmailFrom('noreply@smartlf.seu.ac.lk\r\nBcc: attacker@example.net'), false);
});

test('legacy plaintext refresh-token utility is not present', () => {
  assert.equal(fs.existsSync(path.join(backendRoot, 'utils/generateTokens.js')), false);
});

test('backend container healthcheck follows the runtime PORT variable', () => {
  const dockerfile = fs.readFileSync(path.join(backendRoot, 'Dockerfile'), 'utf8');
  assert.match(dockerfile, /process\.env\.PORT \|\| 5000/);
  assert.doesNotMatch(dockerfile, /fetch\('http:\/\/127\.0\.0\.1:5000\/api\/health\/ready'/);
});

test('cookie same-site defaults support local and split-provider login safely', () => {
  assert.equal(resolveCookieSameSite(undefined, false), 'lax');
  assert.equal(resolveCookieSameSite(undefined, true), 'none');
  assert.equal(resolveCookieSameSite('strict', true), 'strict');
  assert.equal(resolveCookieSameSite('invalid', true), 'none');
});

test('boolean environment parsing accepts explicit values and rejects typos', () => {
  assert.equal(parseBooleanEnv('REQUIRE_REDIS', undefined, true), true);
  assert.equal(parseBooleanEnv('REQUIRE_REDIS', '', false), false);
  assert.equal(parseBooleanEnv('REQUIRE_REDIS', 'true'), true);
  assert.equal(parseBooleanEnv('REQUIRE_REDIS', '0'), false);
  assert.throws(() => parseBooleanEnv('REQUIRE_REDIS', 'tru'), /Invalid boolean environment value for REQUIRE_REDIS/);
  assert.throws(() => parseBooleanEnv('REQUIRE_REDIS', ' true '), /Invalid boolean environment value for REQUIRE_REDIS/);
});

test('production Redis requirement defaults fail closed', () => {
  const securitySource = fs.readFileSync(path.join(backendRoot, 'config/security.js'), 'utf8');
  assert.match(securitySource, /requireRedis = parseBooleanEnv\('REQUIRE_REDIS', process\.env\.REQUIRE_REDIS, isProduction\)/);
});

test('SMTP transport enforces authenticated TLS', () => {
  const startTls = buildSmtpTransportOptions({ host: 'smtp.example.edu', port: 587, user: 'user', pass: 'secret' });
  assert.equal(startTls.secure, false);
  assert.equal(startTls.requireTLS, true);
  assert.equal(startTls.tls.rejectUnauthorized, true);
  assert.equal(startTls.tls.minVersion, 'TLSv1.2');

  const implicitTls = buildSmtpTransportOptions({ host: 'smtp.example.edu', port: 465, user: 'user', pass: 'secret' });
  assert.equal(implicitTls.secure, true);
  assert.equal(implicitTls.requireTLS, false);
  assert.equal(implicitTls.tls.rejectUnauthorized, true);
});

test('security workflow pins gitleaks and grants write permission only to CodeQL', () => {
  const workflow = fs.readFileSync(path.join(repositoryRoot, '.github/workflows/security.yml'), 'utf8');
  assert.match(workflow, /^permissions: \{\}$/m);
  assert.match(workflow, /codeql:\n\s+runs-on: ubuntu-latest\n\s+permissions:\n\s+contents: read\n\s+security-events: write/);
  assert.match(workflow, /secret-scan:\n\s+runs-on: ubuntu-latest\n\s+permissions:\n\s+contents: read/);
  assert.match(workflow, /gitleaks\/gitleaks-action@e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e # v3\.0\.0/);
  assert.doesNotMatch(workflow, /gitleaks\/gitleaks-action@(v\d+|master|main)\b/);
});
