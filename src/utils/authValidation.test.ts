import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeUsername,
  validateUsername,
  validatePassword,
  usernameToEmail,
  emailToUsername,
  FICTITIOUS_EMAIL_DOMAIN,
} from './authValidation.ts';

test('normalizeUsername trims and converts to lowercase', () => {
  assert.equal(normalizeUsername('  Robo_Captain.01  '), 'robo_captain.01');
  assert.equal(normalizeUsername('LUCAS-M'), 'lucas-m');
});

test('validateUsername enforces 3-20 chars and allowed characters only', () => {
  // Valid cases
  assert.equal(validateUsername('lucas_99').valid, true);
  assert.equal(validateUsername('robo.sumo-3k').valid, true);
  assert.equal(validateUsername('abc').valid, true);
  assert.equal(validateUsername('12345678901234567890').valid, true); // 20 chars

  // Too short
  assert.equal(validateUsername('ab').valid, false);
  assert.match(validateUsername('ab').error!, /pelo menos 3 caracteres/);

  // Too long
  assert.equal(validateUsername('123456789012345678901').valid, false);
  assert.match(validateUsername('123456789012345678901').error!, /máximo 20 caracteres/);

  // Disallowed characters (spaces, accents, symbols)
  assert.equal(validateUsername('carlos silva').valid, false);
  assert.equal(validateUsername('robô').valid, false);
  assert.equal(validateUsername('user@domain').valid, false);
  assert.equal(validateUsername('admin!').valid, false);
});

test('validatePassword enforces minimum 8 characters', () => {
  assert.equal(validatePassword('12345678').valid, true);
  assert.equal(validatePassword('senhaSegura123').valid, true);
  assert.equal(validatePassword('1234567').valid, false);
  assert.match(validatePassword('1234567').error!, /no mínimo 8 caracteres/);
});

test('usernameToEmail formats email correctly with internal domain', () => {
  assert.equal(
    usernameToEmail('Capitao_Robo'),
    `capitao_robo@${FICTITIOUS_EMAIL_DOMAIN}`
  );
});

test('emailToUsername extracts clean username from internal email', () => {
  assert.equal(
    emailToUsername(`capitao_robo@${FICTITIOUS_EMAIL_DOMAIN}`),
    'capitao_robo'
  );
  assert.equal(emailToUsername('test@gmail.com'), 'test');
});
